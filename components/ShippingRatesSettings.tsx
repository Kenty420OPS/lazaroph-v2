"use client";

import { useEffect, useState, FormEvent } from "react";
import { auth } from "@/lib/firebase";
import { getUserErrorMessage } from "@/lib/user-error";
import { parseRateInput, type ShippingRates } from "@/lib/shipping";

const RATE_ERROR = "Enter a whole number between 0 and 5000.";

function formatUpdatedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ShippingRatesSettings() {
  const [luzon, setLuzon] = useState("");
  const [visayasMindanao, setVisayasMindanao] = useState("");
  const [saved, setSaved] = useState<ShippingRates | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [updatedByEmail, setUpdatedByEmail] = useState<string | null>(null);
  const [source, setSource] = useState<"firestore" | "default" | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getAuthHeader = async () => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    return "Bearer " + token;
  };

  const loadRates = async () => {
    setLoading(true);
    setError("");
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) {
        setError("Not authenticated");
        return;
      }

      const res = await fetch("/api/admin/shipping-rates", {
        headers: { Authorization: authHeader },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load shipping rates");
      }

      const rates: ShippingRates = data.rates || data.defaults;
      if (!rates) throw new Error("Failed to load shipping rates");

      setSaved(rates);
      setLuzon(String(rates.Luzon));
      setVisayasMindanao(String(rates.Visayas));
      setUpdatedAt(typeof data.updatedAt === "string" ? data.updatedAt : null);
      setUpdatedBy(typeof data.updatedBy === "string" ? data.updatedBy : null);
      setUpdatedByEmail(
        typeof data.updatedByEmail === "string" ? data.updatedByEmail : null
      );
      setSource(data.source === "firestore" ? "firestore" : "default");
    } catch (err) {
      console.error(err);
      setError(getUserErrorMessage(err, "Failed to load shipping rates"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const luzonRate = parseRateInput(luzon);
  const visayasMindanaoRate = parseRateInput(visayasMindanao);
  const invalid = luzonRate === null || visayasMindanaoRate === null;
  const lastUpdatedLabel = formatUpdatedAt(updatedAt);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (luzonRate === null || visayasMindanaoRate === null) {
      setError(RATE_ERROR);
      return;
    }

    if (
      saved &&
      luzonRate === saved.Luzon &&
      visayasMindanaoRate === saved.Visayas
    ) {
      setError("No changes to save.");
      return;
    }

    const oldLabel = saved
      ? `Luzon: ₱${saved.Luzon}, Visayas and Mindanao: ₱${saved.Visayas}`
      : "default rates";
    const confirmed = confirm(
      `Update LBC shipping rates?\n\nOld: ${oldLabel}\nNew: Luzon: ₱${luzonRate}, Visayas and Mindanao: ₱${visayasMindanaoRate}\n\nExisting orders keep the fee they were charged. Customers who already saw the old price have 30 minutes to complete their order at that price.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("Not authenticated");

      const res = await fetch("/api/admin/shipping-rates", {
        method: "PATCH",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          luzon: luzonRate,
          visayasMindanao: visayasMindanaoRate,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to update shipping rates");
      }

      const rates: ShippingRates = data.rates;
      setSaved(rates);
      setLuzon(String(rates.Luzon));
      setVisayasMindanao(String(rates.Visayas));
      setUpdatedAt(typeof data.updatedAt === "string" ? data.updatedAt : null);
      setUpdatedBy(typeof data.updatedBy === "string" ? data.updatedBy : null);
      setUpdatedByEmail(
        typeof data.updatedByEmail === "string" ? data.updatedByEmail : null
      );
      setSource("firestore");
      setSuccess("Shipping rates updated.");
    } catch (err) {
      console.error(err);
      setError(getUserErrorMessage(err, "Failed to update shipping rates"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      <div className="max-w-2xl w-full">
        <form
          onSubmit={handleSubmit}
          className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-2">
            <h2 className="text-base font-bold uppercase tracking-wider">
              LBC Shipping Rates
            </h2>
            <button
              type="button"
              onClick={loadRates}
              disabled={loading || submitting}
              className="min-h-11 px-3 text-xs text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-lg disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-200 text-xs flex items-start justify-between gap-3">
              <span className="min-w-0 break-words">{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 px-2 underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          )}
          {success && (
            <div className="p-3 bg-[#171717] border border-[#262626] rounded-lg text-white text-xs">
              {success}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              <div className="h-11 bg-neutral-900 rounded-lg animate-pulse"></div>
              <div className="h-11 bg-neutral-900 rounded-lg animate-pulse"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label
                    htmlFor="lbc-luzon"
                    className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1"
                  >
                    Luzon (per pair)
                  </label>
                  <input
                    id="lbc-luzon"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={luzon}
                    onChange={(e) => setLuzon(e.target.value)}
                    disabled={submitting}
                    className="w-full min-h-11 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
                  />
                </div>
                <div className="min-w-0">
                  <label
                    htmlFor="lbc-visayas-mindanao"
                    className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1"
                  >
                    Visayas and Mindanao (per pair)
                  </label>
                  <input
                    id="lbc-visayas-mindanao"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={visayasMindanao}
                    onChange={(e) => setVisayasMindanao(e.target.value)}
                    disabled={submitting}
                    className="w-full min-h-11 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
                  />
                </div>
              </div>

              {invalid && <p className="text-xs text-red-300">{RATE_ERROR}</p>}

              <p className="text-xs text-neutral-500 leading-relaxed">
                Per pair, in pesos. Existing orders keep the fee they were
                charged. Customers who already saw the old price have 30 minutes
                to complete their order at that price. Lalamove and Pickup stay
                at 0.
              </p>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading || submitting || invalid}
                  className="w-full sm:w-auto min-h-11 px-6 bg-white text-black font-bold text-xs rounded-lg uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Rates"}
                </button>
              </div>

              <p className="text-xs text-neutral-500">
                {lastUpdatedLabel
                  ? `Last updated by ${
                      updatedByEmail || updatedBy || "unknown"
                    } on ${lastUpdatedLabel}.`
                  : source === "default"
                  ? "Using default rates. No saved rates yet."
                  : "No saved rates yet."}
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
