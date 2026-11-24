import * as ImageManipulator from "expo-image-manipulator";
import type { SnapResult } from "@/types/index";

// ─── Image compression ────────────────────────────────────────────────────────

/**
 * Resize and compress an image URI to reduce upload size.
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
    throw new Error("Image compression did not return base64 data");
  }

  return { uri: result.uri, base64: result.base64 };
}

// ─── Edge Function call ───────────────────────────────────────────────────────

/**
 * Send a base64-encoded image to the Supabase Edge Function for dish identification.
 * Returns the structured SnapResult from the Gemini Vision model.
 *
 * Returns null if the Supabase URL is not configured yet (graceful no-op).
 */
export async function identifyDish(base64: string): Promise<SnapResult> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/identify-dish`;

  const response = await fetch(edgeFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
    },
    body: JSON.stringify({ base64, mimeType: "image/jpeg" }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Edge Function error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as SnapResult;
  return data;
}
