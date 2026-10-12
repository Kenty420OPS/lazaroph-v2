export const BRAND_NAME_MAX = 60;

const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/;
const BRAND_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BRAND_ID_MAX = 80;

// Trims and collapses internal whitespace to single spaces.
// Returns "" when the input is not a string.
export function normalizeBrandName(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/\s+/g, " ");
}

// Lowercase, strip diacritics, then reduce every run of non [a-z0-9]
// characters to a single "-" and trim leading/trailing "-".
export function brandSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Validates + normalizes a raw brand name.
// The slug doubles as the Firestore document id.
export function validateBrandName(input: unknown):
  | { ok: true; name: string; slug: string; nameLower: string }
  | { ok: false; error: string } {
  if (typeof input !== "string") {
    return { ok: false, error: "Brand name must be a string" };
  }

  const name = normalizeBrandName(input);
  if (name.length < 1) {
    return { ok: false, error: "Brand name is required" };
  }
  if (name.length > BRAND_NAME_MAX) {
    return { ok: false, error: `Brand name must be at most ${BRAND_NAME_MAX} characters` };
  }
  if (CONTROL_CHARS_RE.test(name)) {
    return { ok: false, error: "Brand name must not contain control characters" };
  }

  const slug = brandSlug(name);
  if (slug.length < 1) {
    return { ok: false, error: "Brand name must contain letters or numbers" };
  }

  return { ok: true, name, slug, nameLower: name.toLowerCase() };
}

// Firestore-safe brand document id (also the brand slug).
export function isValidBrandId(id: unknown): boolean {
  return (
    typeof id === "string" &&
    id.length <= BRAND_ID_MAX &&
    BRAND_ID_RE.test(id)
  );
}
