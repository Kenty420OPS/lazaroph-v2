export function getUserErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const err = error as { message?: unknown };
  if (typeof err.message !== "string") {
    return fallback;
  }

  const message = err.message.trim();
  if (message.length === 0 || message.length > 140) {
    return fallback;
  }

  const lower = message.toLowerCase();
  if (
    lower.includes("firebase") ||
    lower.includes("firestore") ||
    lower.includes("auth/") ||
    lower.includes("fetch") ||
    lower.includes("unexpected token") ||
    lower.includes("network") ||
    lower.includes("json") ||
    lower.includes("undefined") ||
    lower.includes("null") ||
    lower.includes("typeerror") ||
    lower.includes("networkerror") ||
    /at\s+\S+:\d+/.test(message)
  ) {
    return fallback;
  }

  return message;
}
