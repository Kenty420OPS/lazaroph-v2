export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Something went wrong. Please try again.";
  }

  const err = error as { code?: unknown; message?: unknown };
  const code = typeof err.code === "string" ? err.code : "";

  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-email") {
    return "Invalid email or password.";
  }

  if (code === "auth/email-already-in-use") {
    return "Could not create the account. Please try again or sign in.";
  }

  if (code === "auth/weak-password") {
    return "Password is too weak. Please use a stronger password.";
  }

  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please try again later.";
  }

  if (code === "auth/network-request-failed") {
    return "Network error. Please check your connection and try again.";
  }

  if (code === "auth/user-disabled") {
    return "This account has been disabled.";
  }

  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "";
  }

  return "Something went wrong. Please try again.";
}
