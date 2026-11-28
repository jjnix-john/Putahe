import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";
import {
  enforceRateLimit,
  fetchWithTimeout,
  toSafeErrorMessage,
  validateImageUpload,
} from "@/lib/security";
import type { SnapResult } from "@/types/index";

// ─── Image compression ────────────────────────────────────────────────────────

/**
 * Resize and compress an image URI to reduce upload size (<= 500 KB JPEG).
 * Returns a new URI for the compressed image and its base64 representation.
 */
export async function compressImage(uri: string): Promise<{
  uri: string;
  base64: string;
}> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    {
      compress: 0.6,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!result.base64) {
    throw new Error("Could not prepare image for analysis.");
  }

  validateImageUpload(result.base64, "image/jpeg");

  return { uri: result.uri, base64: result.base64 };
}

// ─── Edge Function call ───────────────────────────────────────────────────────

/**
 * Send a base64-encoded image to the Supabase Edge Function for dish identification.
 * Enforces rate limiting, file type/size validation, auth headers, and a 15s timeout.
 */
export async function identifyDish(base64: string): Promise<SnapResult> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl.includes("placeholder.supabase.co")) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  enforceRateLimit("snap_identify_dish", 8, 60_000);
  validateImageUpload(base64, "image/jpeg");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearerToken = session?.access_token || supabaseAnonKey || "";

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/identify-dish`;

  let response: Response;
  try {
    response = await fetchWithTimeout(
      edgeFunctionUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
          ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        },
        body: JSON.stringify({ base64, mimeType: "image/jpeg" }),
      },
      16_000
    );
  } catch (err) {
    throw new Error(
      toSafeErrorMessage(
        err,
        "Dish analysis timed out. Please check your connection and try again."
      )
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "Too many dish scans in a short time. Please wait a minute and try again."
      );
    }
    if (response.status === 413 || response.status === 415) {
      throw new Error(
        "Unsupported or oversized image file. Please use a JPEG or PNG photo under 1.5 MB."
      );
    }
    throw new Error(
      "Unable to analyze the dish right now. Please try again in a moment."
    );
  }

  const data = (await response.json()) as SnapResult;
  return data;
}
