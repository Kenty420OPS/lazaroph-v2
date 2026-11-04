// Shared shipping fee rules — single source of truth for client and server.

export const LBC_REGION_FEES: Record<string, number> = {
  Luzon: 250,
  Visayas: 320,
  Mindanao: 320,
};

export const VALID_COURIERS = ["Lalamove", "LBC", "Pickup"] as const;
export const VALID_REGIONS = Object.keys(LBC_REGION_FEES);

export function getLbcRate(
  region?: string | null,
  rates: Record<string, number> = LBC_REGION_FEES
): number {
  return rates[region || ""] ?? 0;
}

// LBC is charged per pair/piece: the regional rate multiplied by the total
// quantity of every item in the cart (regardless of product price).
// Lalamove (paid to the rider) and Pickup are always 0.
export function calculateShippingFee(
  courier: string,
  region: string | null | undefined,
  totalQuantity: number,
  rates: Record<string, number> = LBC_REGION_FEES
): number {
  if (courier === "Pickup") {
    return 0;
  }
  if (courier === "LBC") {
    if (!Number.isInteger(totalQuantity) || totalQuantity < 1) {
      return 0;
    }
    return getLbcRate(region, rates) * totalQuantity;
  }
  // Lalamove and other couriers: delivery fee paid directly to courier.
  return 0;
}

// ---- B1: central shipping definitions (appended; existing exports above are unchanged) ----

export type Courier = (typeof VALID_COURIERS)[number];
export type Region = "Luzon" | "Visayas" | "Mindanao";

export type ShippingFeeMode = "region" | "paid_to_rider" | "free";

export interface ShippingMethodConfig {
  label: string;
  description: string;
  requiresAddress: boolean;
  feeMode: ShippingFeeMode;
  note: string;
}

export const SHIPPING_METHODS: Record<Courier, ShippingMethodConfig> = {
  LBC: {
    label: "LBC",
    description: "Nationwide delivery",
    requiresAddress: true,
    feeMode: "region",
    note: "Charged per pair by region (Luzon, Visayas, Mindanao).",
  },
  Lalamove: {
    label: "Lalamove",
    description: "Same-day delivery in select cities",
    requiresAddress: true,
    feeMode: "paid_to_rider",
    note: "Delivery fee is paid directly to the rider and is not part of the online total.",
  },
  Pickup: {
    label: "Store Pickup",
    description: "Pickup at store location",
    requiresAddress: false,
    feeMode: "free",
    note: "Free pickup at our store.",
  },
};

export interface LalamoveCityGroup {
  province: string;
  cities: readonly string[];
}

// Single source of truth for Lalamove coverage. Grouped by province for the
// checkout dropdown; the server matches against this same list.
export const LALAMOVE_CITY_GROUPS: readonly LalamoveCityGroup[] = [
  {
    province: "Metro Manila",
    cities: [
      "Caloocan",
      "Las Piñas",
      "Makati",
      "Malabon",
      "Mandaluyong",
      "Manila",
      "Marikina",
      "Muntinlupa",
      "Navotas",
      "Parañaque",
      "Pasay",
      "Pasig",
      "Pateros",
      "Quezon City",
      "San Juan",
      "Taguig",
      "Valenzuela",
    ],
  },
  {
    province: "Rizal",
    cities: [
      "Taytay",
      "Cainta",
      "Binangonan",
      "Antipolo",
      "San Mateo",
      "Rodriguez (Montalban)",
    ],
  },
  {
    province: "Bulacan",
    cities: ["San Jose del Monte"],
  },
  {
    province: "Cavite",
    cities: [
      "Imus",
      "Trece Martires",
      "Cavite City",
      "Dasmariñas",
      "General Trias",
    ],
  },
];

// Flat lists kept for callers that only need the names.
export const LALAMOVE_CITIES: readonly string[] = LALAMOVE_CITY_GROUPS.flatMap(
  (group) => group.cities
);
export const METRO_MANILA_CITIES: readonly string[] = LALAMOVE_CITY_GROUPS[0].cities;

function normalizePlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Explicit aliases where the generated ones would be ambiguous (a province
// name or a former name).
const CITY_ALIAS_OVERRIDES: Record<string, readonly string[]> = {
  "Quezon City": ["Quezon City"],
  "Cavite City": ["Cavite City"],
  "Rodriguez (Montalban)": ["Rodriguez (Montalban)", "Rodriguez", "Montalban"],
};

function getCityAliases(city: string): readonly string[] {
  const override = CITY_ALIAS_OVERRIDES[city];
  if (override) return override;
  const base = city.replace(/ city$/i, "");
  return [city, `${base} City`, `City of ${base}`];
}

export interface LalamoveCityMatch {
  city: string;
  province: string;
}

const LALAMOVE_CITY_LOOKUP: Map<string, LalamoveCityMatch> = (() => {
  const lookup = new Map<string, LalamoveCityMatch>();
  for (const group of LALAMOVE_CITY_GROUPS) {
    for (const city of group.cities) {
      const match: LalamoveCityMatch = { city, province: group.province };
      for (const alias of getCityAliases(city)) {
        const key = normalizePlace(alias);
        if (key) lookup.set(key, match);
      }
    }
  }
  return lookup;
})();

// Returns the canonical city (with its original spelling, e.g. "Dasmariñas")
// and province, or null when the input is not in the coverage list.
export function findLalamoveCity(input: string): LalamoveCityMatch | null {
  if (typeof input !== "string") return null;
  const key = normalizePlace(input);
  if (!key) return null;
  return LALAMOVE_CITY_LOOKUP.get(key) ?? null;
}

export function isLalamoveCity(input: string): boolean {
  return findLalamoveCity(input) !== null;
}

// Kept for older callers: true only for the Metro Manila group.
export function isMetroManila(city: string): boolean {
  return findLalamoveCity(city)?.province === "Metro Manila";
}

// ---- Editable LBC rates (admin Store Settings) ----

export type ShippingRates = {
  Luzon: number;
  Visayas: number;
  Mindanao: number;
};

export const DEFAULT_SHIPPING_RATES: ShippingRates = {
  Luzon: LBC_REGION_FEES.Luzon,
  Visayas: LBC_REGION_FEES.Visayas,
  Mindanao: LBC_REGION_FEES.Mindanao,
};

export const MAX_LBC_RATE = 5000;
export const RATE_GRACE_MS = 30 * 60 * 1000;
export const SHIPPING_RATE_CHANGED_MESSAGE =
  "Shipping rates were updated. Please review your new total and submit again.";

// Server-side validator: only JSON numbers are accepted. Strings, booleans,
// null, NaN, Infinity and decimals are rejected.
export function parseRateValue(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isInteger(value)) return null;
  if (value < 0 || value > MAX_LBC_RATE) return null;
  return value;
}

// Client-side parser: the inputs are strings, so trim and require digits only
// before converting. The server still re-validates as a number.
export function parseRateInput(value: string): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return parseRateValue(Number(trimmed));
}

export type ShippingRatesInput = {
  luzon: number;
  visayasMindanao: number;
};

export type ShippingRatesValidationResult =
  | { ok: true; value: ShippingRatesInput }
  | { ok: false; error: string };

export function validateShippingRatesInput(input: unknown): ShippingRatesValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid request body" };
  }

  const body = input as Record<string, unknown>;
  const luzon = parseRateValue(body.luzon);
  if (luzon === null) {
    return {
      ok: false,
      error: "Luzon rate must be a whole number between 0 and 5000.",
    };
  }

  const visayasMindanao = parseRateValue(body.visayasMindanao);
  if (visayasMindanao === null) {
    return {
      ok: false,
      error: "Visayas and Mindanao rate must be a whole number between 0 and 5000.",
    };
  }

  return { ok: true, value: { luzon, visayasMindanao } };
}

export function normalizeShippingRates(value: unknown): ShippingRates {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    Luzon: parseRateValue(raw.Luzon) ?? DEFAULT_SHIPPING_RATES.Luzon,
    Visayas: parseRateValue(raw.Visayas) ?? DEFAULT_SHIPPING_RATES.Visayas,
    Mindanao: parseRateValue(raw.Mindanao) ?? DEFAULT_SHIPPING_RATES.Mindanao,
  };
}

export type ShippingRateSettingsLike = {
  lbcLuzon?: unknown;
  lbcVisayasMindanao?: unknown;
  previousLbcLuzon?: unknown;
  previousLbcVisayasMindanao?: unknown;
  ratesChangedAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: unknown;
  updatedByEmail?: unknown;
};

export type ResolvedShippingRates = {
  rates: ShippingRates;
  previousRates: ShippingRates | null;
  ratesChangedAt: Date | null;
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByEmail: string | null;
  source: "firestore" | "default";
};

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Missing document or invalid fields fall back to the hardcoded defaults per
// field. The grace window is only available when both previous values and
// ratesChangedAt are valid.
export function resolveShippingRatesFromSettings(data: unknown): ResolvedShippingRates {
  const raw = data && typeof data === "object" ? (data as ShippingRateSettingsLike) : null;

  const luzon = parseRateValue(raw?.lbcLuzon);
  const visayasMindanao = parseRateValue(raw?.lbcVisayasMindanao);

  const rates: ShippingRates = {
    Luzon: luzon ?? DEFAULT_SHIPPING_RATES.Luzon,
    Visayas: visayasMindanao ?? DEFAULT_SHIPPING_RATES.Visayas,
    Mindanao: visayasMindanao ?? DEFAULT_SHIPPING_RATES.Mindanao,
  };

  const previousLuzon = parseRateValue(raw?.previousLbcLuzon);
  const previousVisayasMindanao = parseRateValue(raw?.previousLbcVisayasMindanao);
  const ratesChangedAt = parseIsoDate(raw?.ratesChangedAt);
  const previousRates =
    previousLuzon !== null && previousVisayasMindanao !== null && ratesChangedAt
      ? {
          Luzon: previousLuzon,
          Visayas: previousVisayasMindanao,
          Mindanao: previousVisayasMindanao,
        }
      : null;

  const hasStoredRates = luzon !== null || visayasMindanao !== null;

  return {
    rates,
    previousRates,
    ratesChangedAt: previousRates ? ratesChangedAt : null,
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null,
    updatedBy: typeof raw?.updatedBy === "string" ? raw.updatedBy : null,
    updatedByEmail: typeof raw?.updatedByEmail === "string" ? raw.updatedByEmail : null,
    source: raw && hasStoredRates ? "firestore" : "default",
  };
}

export type ShippingFeeDecision =
  | { status: "ok"; fee: number; lbcRate: number | null; graceApplied: boolean }
  | { status: "conflict"; shippingFee: number; rates: ShippingRates; message: string };

// Pure stale-fee decision. Only LBC is compared; Pickup and Lalamove always
// resolve to 0 and ignore expectedFee entirely.
export function decideShippingFee(params: {
  courier: string;
  region: string | null | undefined;
  totalQuantity: number;
  expectedFee: number | null;
  currentRates: ShippingRates;
  previousRates: ShippingRates | null;
  ratesChangedAt: Date | null;
  now: number;
}): ShippingFeeDecision {
  const {
    courier,
    region,
    totalQuantity,
    expectedFee,
    currentRates,
    previousRates,
    ratesChangedAt,
    now,
  } = params;

  if (courier !== "LBC") {
    return {
      status: "ok",
      fee: calculateShippingFee(courier, region, totalQuantity, currentRates),
      lbcRate: null,
      graceApplied: false,
    };
  }

  const currentRate = getLbcRate(region, currentRates);
  const currentFee = calculateShippingFee("LBC", region, totalQuantity, currentRates);

  if (expectedFee === null || expectedFee === currentFee) {
    return {
      status: "ok",
      fee: currentFee,
      lbcRate: currentRate,
      graceApplied: false,
    };
  }

  if (previousRates && ratesChangedAt) {
    const previousRate = getLbcRate(region, previousRates);
    const previousFee = calculateShippingFee("LBC", region, totalQuantity, previousRates);
    const elapsed = now - ratesChangedAt.getTime();

    if (elapsed >= 0 && elapsed <= RATE_GRACE_MS && expectedFee === previousFee) {
      return {
        status: "ok",
        fee: expectedFee,
        lbcRate: previousRate,
        graceApplied: true,
      };
    }
  }

  return {
    status: "conflict",
    shippingFee: currentFee,
    rates: currentRates,
    message: SHIPPING_RATE_CHANGED_MESSAGE,
  };
}
