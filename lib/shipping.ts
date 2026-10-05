// Shared shipping fee rules — single source of truth for client and server.

export const LBC_REGION_FEES: Record<string, number> = {
  Luzon: 250,
  Visayas: 320,
  Mindanao: 320,
};

export const VALID_COURIERS = ["Lalamove", "LBC"] as const;
export const VALID_REGIONS = Object.keys(LBC_REGION_FEES);

export function getShippingFee(courier: string, region?: string | null): number {
  if (courier === "LBC") {
    return LBC_REGION_FEES[region || ""] ?? 0;
  }
  // Lalamove and any other courier: delivery fee paid directly to courier.
  return 0;
}
