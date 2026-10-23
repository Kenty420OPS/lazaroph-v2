export const POLICY_CONSENT_KEY = "lazaroph_policy_accepted";

// Every storage touch is wrapped: private mode, a full quota or browser
// settings can make localStorage throw, and a visitor must never get stuck on
// the gate because of it.
export function readPolicyConsent(): { version: string; acceptedAt: string } | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(POLICY_CONSENT_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as { version?: unknown; acceptedAt?: unknown };
    if (typeof record.version !== "string" || record.version.trim().length === 0) {
      return null;
    }
    if (typeof record.acceptedAt !== "string" || record.acceptedAt.trim().length === 0) {
      return null;
    }

    return { version: record.version, acceptedAt: record.acceptedAt };
  } catch {
    return null;
  }
}

export function writePolicyConsent(version: string): void {
  try {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      POLICY_CONSENT_KEY,
      JSON.stringify({ version, acceptedAt: new Date().toISOString() })
    );
  } catch {
    // Storage unavailable: the gate keeps the consent in memory for the session.
  }
}
