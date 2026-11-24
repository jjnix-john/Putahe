// Supabase Edge Function — identify-dish
// Runtime: Deno (deployed via `supabase functions deploy identify-dish`)
// Secret required: OPENROUTER_API_KEY (set via `supabase secrets set OPENROUTER_API_KEY=...`)
// Model: qwen/qwen-2.5-vl-72b-instruct:free via OpenRouter

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─── CORS headers (required for Expo client) ─────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Response shape ───────────────────────────────────────────────────────────

interface IdentifyResult {
  is_food: boolean;
  dish_name: string;
  confidence_note: string;
  ingredients: Array<{ name: string; quantity: string }>;
  steps: string[];
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  `You are a culinary AI. Analyze the food image and respond ONLY with a valid JSON object — no markdown, no code fences, no commentary.

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

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY secret is not configured" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // ─── Parse request body ───────────────────────────────────────────────────

  let base64Image: string;
  let mimeType: string;

  try {
    const body = await req.json() as { base64: string; mimeType?: string };
    if (!body.base64) throw new Error("Missing base64 field");
    base64Image = body.base64;
    mimeType = body.mimeType ?? "image/jpeg";
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Invalid request body: ${(e as Error).message}` }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // ─── Call OpenRouter (OpenAI-compatible chat completions) ─────────────────

  const payload = {
    model: "qwen/qwen-2.5-vl-72b-instruct:free",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 2048,
  };

  let openRouterResponse: Response;
  try {
    openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://putahe.app",
          "X-Title": "Putahe",
        },
        body: JSON.stringify(payload),
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `OpenRouter request failed: ${(e as Error).message}` }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  if (!openRouterResponse.ok) {
    const errText = await openRouterResponse.text();
    return new Response(
      JSON.stringify({
        error: `OpenRouter API error ${openRouterResponse.status}: ${errText}`,
      }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // ─── Parse and validate response ──────────────────────────────────────────

  try {
    const orData = await openRouterResponse.json() as {
      choices?: Array<{
        message?: { content?: string };
      }>;
      error?: { message: string };
    };

    // Surface model-level errors (e.g. rate limit on free tier)
    if (orData.error) {
      throw new Error(orData.error.message);
    }

    const rawText = orData.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if the model wraps JSON anyway
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const result = JSON.parse(jsonText) as IdentifyResult;

    if (typeof result.is_food !== "boolean") {
      throw new Error("Invalid response shape: missing is_food");
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: `Failed to parse model response: ${(e as Error).message}`,
      }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
