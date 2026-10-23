export const STORE_INFO = {
  name: "LAZAROPH",
  address: "Max Bldg, 911 J. P. Rizal St, Concepcion Uno, Marikina, 1805 Metro Manila",
  phones: ["0917 109 3557", "(02) 8294 8572"],
  email: "lazarophilippines20@gmail.com",
  facebook: "Lazaro PH",
  instagram: "lazarophilippine",
};

// Single review date for every policy page, kept as an ISO date string so it
// sorts and compares cleanly, plus a display form used by the pages.
export const POLICY_LAST_UPDATED = "2026-10-23";
export const POLICY_LAST_UPDATED_DISPLAY = "October 23, 2026";

// Version stamped into the storefront policy agreement, so the gate re-opens
// whenever the policies above get a new review date.
export const POLICY_VERSION = POLICY_LAST_UPDATED;

export function formatPolicyLastUpdated(isoDate: string = POLICY_LAST_UPDATED): string {
  if (isoDate === POLICY_LAST_UPDATED) {
    return POLICY_LAST_UPDATED_DISPLAY;
  }
  return isoDate;
}

// Digits only (plus a leading +) so the numbers work inside tel: links.
export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}
