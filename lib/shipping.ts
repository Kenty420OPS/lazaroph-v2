// Shared shipping fee rules — single source of truth for client and server.

export const LBC_REGION_FEES: Record<string, number> = {
  Luzon: 250,
  Visayas: 320,
  Mindanao: 320,
};

export const VALID_COURIERS = ["Lalamove", "LBC", "Pickup"] as const;
export const VALID_REGIONS = Object.keys(LBC_REGION_FEES);

export function getShippingFee(courier: string, region?: string | null): number {
  if (courier === "Pickup") {
    return 0;
  }
  if (courier === "LBC") {
    return LBC_REGION_FEES[region || ""] ?? 0;
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
    note: "Fixed shipping fee by region (Luzon, Visayas, Mindanao).",
  },
  Lalamove: {
    label: "Lalamove",
    description: "Metro Manila same-day delivery",
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

export const METRO_MANILA_CITIES = [
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
] as const;

function normalizePlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const METRO_MANILA_ALIASES: Set<string> = (() => {
  const set = new Set<string>();
  for (const city of METRO_MANILA_CITIES) {
    const base = normalizePlace(city).replace(/ city$/, "");
    if (base === "quezon") {
      // "Quezon" alone is also a province, so only accept "Quezon City".
      set.add("quezon city");
      continue;
    }
    set.add(base);
    set.add(`${base} city`);
    set.add(`city of ${base}`);
  }
  return set;
})();

export function isMetroManila(city: string): boolean {
  if (typeof city !== "string") return false;
  return METRO_MANILA_ALIASES.has(normalizePlace(city));
}
