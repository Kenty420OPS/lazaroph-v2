import { adminDb } from "./firebase-admin";
import {
  resolveShippingRatesFromSettings,
  type ResolvedShippingRates,
  type ShippingRates,
  type ShippingRatesInput,
} from "./shipping";

const SETTINGS_COLLECTION = "settings";
const SETTINGS_DOC = "shipping";
const CHANGES_SUBCOLLECTION = "changes";

// Reads the current settings document. Throws when Firestore is unavailable so
// the order route can fail closed instead of silently charging defaults.
export async function readShippingRates(): Promise<ResolvedShippingRates> {
  if (!adminDb) {
    throw new Error("Firestore is not initialized");
  }

  const snap = await adminDb
    .collection(SETTINGS_COLLECTION)
    .doc(SETTINGS_DOC)
    .get();

  return resolveShippingRatesFromSettings(snap.exists ? snap.data() : null);
}

// Explicit name for the order route: this read must never be swallowed.
export async function getShippingRatesForOrder(): Promise<ResolvedShippingRates> {
  return readShippingRates();
}

// Public checkout may fall back to the hardcoded defaults on a read error.
export async function getPublicShippingRates(): Promise<ResolvedShippingRates> {
  try {
    return await readShippingRates();
  } catch (error) {
    console.error("Failed to read shipping rates for public API:", error);
    return resolveShippingRatesFromSettings(null);
  }
}

export type SaveShippingRatesResult = ResolvedShippingRates & {
  previousRates: ShippingRates;
};

// Writes the settings document and the audit entry in ONE transaction so the
// audit trail can never diverge from the stored rates. The previous values are
// the effective values before this write (defaults when the doc was missing).
export async function saveShippingRates(
  input: ShippingRatesInput & { updatedBy: string; updatedByEmail: string }
): Promise<SaveShippingRatesResult> {
  if (!adminDb) {
    throw new Error("Firestore is not initialized");
  }

  const settingsRef = adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);
  const changeRef = settingsRef.collection(CHANGES_SUBCOLLECTION).doc();
  const now = new Date().toISOString();

  return adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(settingsRef);
    const before = resolveShippingRatesFromSettings(snap.exists ? snap.data() : null);
    const beforeRates = before.rates;

    const afterRates: ShippingRates = {
      Luzon: input.luzon,
      Visayas: input.visayasMindanao,
      Mindanao: input.visayasMindanao,
    };

    const payload = {
      lbcLuzon: input.luzon,
      lbcVisayasMindanao: input.visayasMindanao,
      updatedAt: now,
      updatedBy: input.updatedBy,
      updatedByEmail: input.updatedByEmail,
      previousLbcLuzon: beforeRates.Luzon,
      previousLbcVisayasMindanao: beforeRates.Visayas,
      ratesChangedAt: now,
    };

    transaction.set(settingsRef, payload);
    transaction.set(changeRef, {
      at: now,
      by: input.updatedBy,
      byEmail: input.updatedByEmail,
      before: {
        luzon: beforeRates.Luzon,
        visayasMindanao: beforeRates.Visayas,
      },
      after: {
        luzon: input.luzon,
        visayasMindanao: input.visayasMindanao,
      },
    });

    return {
      rates: afterRates,
      previousRates: beforeRates,
      ratesChangedAt: new Date(now),
      updatedAt: now,
      updatedBy: input.updatedBy,
      updatedByEmail: input.updatedByEmail,
      source: "firestore" as const,
    };
  });
}
