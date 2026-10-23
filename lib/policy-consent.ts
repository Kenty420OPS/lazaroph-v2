export const POLICY_CONSENT_KEY = "lazaroph_policy_accepted";

// Every storage touch is wrapped: private mode, a full quota or browser
// settings can make localStorage throw, and a visitor must never get stuck on
// the gate because of it. This module-level copy keeps the consent for the
// current page session when storage is unavailable or returns nothing.
let memoryConsent: { version: string; acceptedAt: string } | null = null;

export function readPolicyConsent(): { version: string; acceptedAt: string } | null {
  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(POLICY_CONSENT_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const record = parsed as { version?: unknown; acceptedAt?: unknown };
          if (
            typeof record.version === "string" &&
            record.version.trim().length > 0 &&
            typeof record.acceptedAt === "string" &&
            record.acceptedAt.trim().length > 0
          ) {
            return { version: record.version, acceptedAt: record.acceptedAt };
          }
        }
      }
    }
  } catch {
    // Storage unavailable: fall back to the in-memory consent below.
  }

  return memoryConsent;
}

export function writePolicyConsent(version: string): void {
  // Set memory first: even if storage throws, the rest of this page session
  // still knows the visitor accepted.
  memoryConsent = { version, acceptedAt: new Date().toISOString() };

  try {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(POLICY_CONSENT_KEY, JSON.stringify(memoryConsent));
  } catch {
    // Storage unavailable: the in-memory consent above still covers the session.
  }
}
