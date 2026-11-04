// Shared shipping fee rules — single source of truth for client and server.

export const LBC_REGION_FEES: Record<string, number> = {
  Luzon: 250,
  Visayas: 320,
  Mindanao: 320,
};

export const VALID_COURIERS = ["Lalamove", "LBC", "Pickup"] as const;
export const VALID_REGIONS = Object.keys(LBC_REGION_FEES);

export function getLbcRate(region?: string | null): number {
  return LBC_REGION_FEES[region || ""] ?? 0;
}

// LBC is charged per pair/piece: the regional rate multiplied by the total
// quantity of every item in the cart (regardless of product price).
// Lalamove (paid to the rider) and Pickup are always 0.
export function calculateShippingFee(
  courier: string,
  region: string | null | undefined,
  totalQuantity: number
): number {
  if (courier === "Pickup") {
    return 0;
  }
  if (courier === "LBC") {
    if (!Number.isInteger(totalQuantity) || totalQuantity < 1) {
      return 0;
    }
    return getLbcRate(region) * totalQuantity;
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
