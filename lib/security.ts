// ─── Security, Input Validation, Rate Limiting, Moderation & Safe Error Masking

const RATE_LIMIT_MAP = new Map<string, number[]>();

/**
 * Sliding-window client/form rate limiter.
 * Throws a user-safe error if `maxRequests` within `windowMs` is exceeded for `actionKey`.
 */
export function enforceRateLimit(
  actionKey: string,
  maxRequests = 5,
  windowMs = 60_000
): void {
  const now = Date.now();
  const history = RATE_LIMIT_MAP.get(actionKey) ?? [];
  const valid = history.filter((ts) => now - ts < windowMs);

  if (valid.length >= maxRequests) {
    throw new Error(
      "Too many requests. Please wait a moment before trying again."
    );
  }

  valid.push(now);
  RATE_LIMIT_MAP.set(actionKey, valid);
}

/**
 * Sanitize user-provided text:
 * - Strip control characters, zero-width spoofing characters, and HTML/script tags
 * - Collapse excessive whitespace and enforce maximum character length
 */
export function sanitizeUserText(input: string, maxLength = 2000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<\s*\/?\s*(script|iframe|object|embed|style|link|meta)[^>]*>/gi, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Automated content moderation check for user-generated forum posts and comments.
 * Blocks abusive, spam, or malicious payloads before submission.
 */
const BLOCKED_PATTERNS: RegExp[] = [
  /\b(javascript:|data:text\/html|vbscript:|onload=|onerror=)\b/i,
  /\b(viagra|crypto\s*airdrop|free\s*bitcoin|whatsapp\s*\+\d{8,})\b/i,
];

export function validateModeratedContent(
  text: string,
  fieldLabel = "Content",
  minLength = 2,
  maxLength = 2000
): string {
  const cleaned = sanitizeUserText(text, maxLength);
  if (cleaned.length < minLength) {
    throw new Error(
      `${fieldLabel} must be at least ${minLength} characters long.`
    );
  }
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cleaned)) {
      throw new Error(
        `${fieldLabel} contains restricted or unsafe content and cannot be posted.`
      );
    }
  }
  return cleaned;
}

/**
 * Validate uploaded image MIME type and maximum byte size (default <= 1.5 MB).
 */
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function validateImageUpload(
  base64: string,
  mimeType = "image/jpeg",
  maxBytes = 1_500_000
): void {
  const normalizedMime = mimeType.toLowerCase().trim();
  if (!ALLOWED_IMAGE_MIMES.has(normalizedMime)) {
    throw new Error(
      "Unsupported file format. Only JPEG, PNG, and WebP images are allowed."
    );
  }
  if (!base64 || typeof base64 !== "string") {
    throw new Error("Invalid image data.");
  }
  // Approximate byte size of base64 payload
  const approxBytes = Math.ceil((base64.length * 3) / 4);
  if (approxBytes > maxBytes) {
    throw new Error(
      "Image file is too large. Please select an image under 1.5 MB."
    );
  }
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64)) {
    throw new Error("Corrupted image encoding.");
  }
}

/**
 * Convert any internal exception into a generic, user-safe message.
 * Strips stack traces, SQL/PostgreSQL schema names, file paths, and raw status payloads.
 */
export function toSafeErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again later."
): string {
  if (!(err instanceof Error)) return fallback;
  const raw = err.message || "";

  // Preserve explicit user-facing validation or rate-limit messages
  if (
    raw.startsWith("Too many requests") ||
    raw.startsWith("Please ") ||
    raw.startsWith("Passwords ") ||
    raw.startsWith("Password ") ||
    raw.startsWith("Unsupported file") ||
    raw.startsWith("Image file is too large") ||
    raw.includes("contains restricted or unsafe content") ||
    raw.includes("must be at least") ||
    raw === "SUPABASE_NOT_CONFIGURED"
  ) {
    return raw;
  }

  const lower = raw.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists.";
  }
  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("429")
  ) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("abort") ||
    lower.includes("timeout")
  ) {
    return "Network connection timed out. Please check your internet connection.";
  }
  if (
    lower.includes("jwt") ||
    lower.includes("unauthorized") ||
    lower.includes("not authenticated") ||
    lower.includes("row-level security") ||
    lower.includes("pgrst") ||
    lower.includes("postgres") ||
    lower.includes("sql")
  ) {
    return "You do not have permission to perform this action. Please sign in and try again.";
  }

  return fallback;
}

/**
 * Fetch wrapper with an enforced AbortController timeout so third-party APIs
 * never hang the UI indefinitely.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 9_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
