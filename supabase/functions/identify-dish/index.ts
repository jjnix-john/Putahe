// Supabase Edge Function — identify-dish
// Runtime: Deno (deployed via `supabase functions deploy identify-dish`)
// Secret required: OPENROUTER_API_KEY (set via `supabase secrets set OPENROUTER_API_KEY=...`)
// Security practices enforced:
// - Backend authentication verification via Supabase Auth (or anon key + rate limit)
// - Sliding-window IP/user rate limiting (10 requests / minute)
// - Strict MIME type and payload size validation (<= 1.5 MB)
// - Server-side output sanitization
// - Upstream timeout (15s) and generic error responses (never leaks stack traces or keys)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_BASE64_LENGTH = 2_000_000; // ~1.5 MB decoded
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const rateBuckets = new Map<string, number[]>();

interface IdentifyResult {
  is_food: boolean;
  dish_name: string;
  confidence_note: string;
  ingredients: Array<{ name: string; quantity: string }>;
  steps: string[];
}

function sanitizeText(val: unknown, maxLen = 300): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .trim()
    .slice(0, maxLen);
}

function checkRateLimit(clientKey: string): boolean {
  const now = Date.now();
  const timestamps = (rateBuckets.get(clientKey) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  timestamps.push(now);
  rateBuckets.set(clientKey, timestamps);
  return true;
}

const SYSTEM_PROMPT = `You are a culinary AI. Analyze the food image and respond ONLY with a valid JSON object — no markdown, no code fences, no commentary.

Schema:
{
  "is_food": boolean,
  "dish_name": string,
  "confidence_note": string,
  "ingredients": [{ "name": string, "quantity": string }],
  "steps": [string]
}

Rules:
- If the image is not food, set is_food to false and leave other fields as empty strings/arrays.
- dish_name: the most likely name of the dish (e.g. "Chicken Adobo").
- confidence_note: brief certainty note (e.g. "High confidence — classic adobo presentation").
- ingredients: visible and inferred ingredients with estimated quantities.
- steps: cooking steps as an array of plain imperative strings.
- Output valid JSON only. No other text.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // ─── 1. Fail-closed Auth / API Key Header Verification ────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKeyHeader = req.headers.get("apikey") ?? "";
  if (!authHeader.startsWith("Bearer ") && !apiKeyHeader) {
    return new Response(
      JSON.stringify({ error: "Authentication required." }),
      {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // ─── 2. Server-Side Rate Limiting ─────────────────────────────────────────
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    authHeader.slice(-24) ||
    "anon";
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded. Please wait a minute before trying again.",
      }),
      {
        status: 429,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Dish identification service is temporarily unavailable.",
      }),
      {
        status: 503,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // ─── 3. Validate & Sanitize Input Body (MIME type + Size checks) ──────────
  let base64Image: string;
  let mimeType: string;

  try {
    const body = (await req.json()) as { base64?: unknown; mimeType?: unknown };
    if (typeof body.base64 !== "string" || body.base64.length < 32) {
      throw new Error("Invalid image payload");
    }
    if (body.base64.length > MAX_BASE64_LENGTH) {
      return new Response(
        JSON.stringify({
          error: "Image exceeds the 1.5 MB maximum upload size.",
        }),
        {
          status: 413,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(body.base64)) {
      throw new Error("Malformed base64 payload");
    }

    const rawMime =
      typeof body.mimeType === "string"
        ? body.mimeType.toLowerCase().trim()
        : "image/jpeg";
    if (!ALLOWED_MIMES.has(rawMime)) {
      return new Response(
        JSON.stringify({
          error: "Unsupported image format. Use JPEG, PNG, or WebP.",
        }),
        {
          status: 415,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    base64Image = body.base64;
    mimeType = rawMime;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request payload." }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // ─── 4. Call AI Vision Service with 15s Timeout ───────────────────────────
  const payload = {
    model: "qwen/qwen-2.5-vl-72b-instruct:free",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: SYSTEM_PROMPT },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 2048,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let openRouterResponse: Response;
  try {
    openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://putahe.app",
          "X-Title": "Putahe",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );
  } catch {
    clearTimeout(timeout);
    return new Response(
      JSON.stringify({
        error: "AI analysis timed out. Please try again with a clearer photo.",
      }),
      {
        status: 504,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!openRouterResponse.ok) {
    return new Response(
      JSON.stringify({
        error: "Unable to analyze dish right now. Please try again later.",
      }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // ─── 5. Parse, Validate, and Sanitize Output ──────────────────────────────
  try {
    const orData = (await openRouterResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message: string };
    };

    if (orData.error) {
      throw new Error("Upstream model error");
    }

    const rawText = orData.choices?.[0]?.message?.content ?? "";
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(jsonText) as IdentifyResult;
    if (typeof parsed.is_food !== "boolean") {
      throw new Error("Invalid response schema");
    }

    const safeResult: IdentifyResult = {
      is_food: parsed.is_food,
      dish_name: sanitizeText(parsed.dish_name, 120),
      confidence_note: sanitizeText(parsed.confidence_note, 240),
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients.slice(0, 30).map((ing) => ({
            name: sanitizeText(ing?.name, 100),
            quantity: sanitizeText(ing?.quantity, 60),
          }))
        : [],
      steps: Array.isArray(parsed.steps)
        ? parsed.steps
            .slice(0, 25)
            .map((s) => sanitizeText(s, 500))
            .filter(Boolean)
        : [],
    };

    return new Response(JSON.stringify(safeResult), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: "Could not process the dish analysis. Please try another photo.",
      }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
