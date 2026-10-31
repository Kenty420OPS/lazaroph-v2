// Shared, pure helpers and constants for chat image messages.
// No server-only imports here so both client components and API routes can use it.

// Max size of a chat image after the browser compresses it (1 MB).
// The client uses lib/client-image.ts compressImage, which caps output at
// MAX_PRODUCT_IMAGE_BYTES (the same 1 MB value).
export const CHAT_IMAGE_MAX_BYTES = 1_000_000;

// Client-side pre-check before compression. Larger files are rejected with a
// clear message instead of wasting time on an image that will not fit.
export const CHAT_IMAGE_INPUT_MAX_BYTES = 5 * 1024 * 1024;

// The only formats chat images may use. The server re-checks this from magic
// bytes, never from the client-provided file name or file.type.
export const CHAT_ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// Same limit as the Firestore rules for a message.
export const CHAT_MAX_TEXT_LENGTH = 1000;

// Per-conversation image upload cap. Text-only messages are not limited here.
export const CHAT_IMAGE_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 1000,
} as const;

// Firebase UIDs (including anonymous UIDs) are URL-safe. Keep the same shape
// for conversation document ids so they can be used as Storage path segments.
const CONVERSATION_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;
const CHAT_IMAGE_PATH_REGEX = /^chat\/([A-Za-z0-9_-]{1,128})\/([A-Za-z0-9._-]{1,200})$/;

export function isValidConversationId(value: unknown): value is string {
  return typeof value === "string" && CONVERSATION_ID_REGEX.test(value);
}

// Returns the conversation id encoded in a chat image path, or null when the
// path is not exactly chat/<conversationId>/<file>.
export function getConversationIdFromImagePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = CHAT_IMAGE_PATH_REGEX.exec(value);
  return match ? match[1] : null;
}
