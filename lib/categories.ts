import { CATEGORY_CARDS } from "./product";

export const CATEGORY_NAME_MAX = 40;
export const CATEGORY_TAGLINE_MAX = 80;

const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/;
const CATEGORY_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CATEGORY_ID_MAX = 60;

// Trims and collapses internal whitespace to single spaces.
// Returns "" when the input is not a string.
export function normalizeCategoryName(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/\s+/g, " ");
}

// Lowercase, strip diacritics, then reduce every run of non [a-z0-9]
// characters to a single "-" and trim leading/trailing "-".
export function categorySlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Validates + normalizes a raw category name.
// The slug doubles as the Firestore document id.
export function validateCategoryName(input: unknown):
  | { ok: true; name: string; slug: string; nameLower: string }
  | { ok: false; error: string } {
  if (typeof input !== "string") {
    return { ok: false, error: "Category name must be a string" };
  }

  const name = normalizeCategoryName(input);
  if (name.length < 1) {
    return { ok: false, error: "Category name is required" };
  }
  if (name.length > CATEGORY_NAME_MAX) {
    return { ok: false, error: `Category name must be at most ${CATEGORY_NAME_MAX} characters` };
  }
  if (CONTROL_CHARS_RE.test(name)) {
    return { ok: false, error: "Category name must not contain control characters" };
  }

  const slug = categorySlug(name);
  if (slug.length < 1) {
    return { ok: false, error: "Category name must contain letters or numbers" };
  }

  return { ok: true, name, slug, nameLower: name.toLowerCase() };
}

// Firestore-safe category document id (also the category slug).
export function isValidCategoryId(id: unknown): boolean {
  return (
    typeof id === "string" &&
    id.length <= CATEGORY_ID_MAX &&
    CATEGORY_ID_RE.test(id)
  );
}

// Optional per-category presentation fields. They are stored on the
// categories/<slug> document and merged onto the public list. imagePath is an
// internal Storage detail and is intentionally NOT part of this type.
export type CategoryOptionalFields = {
  imageUrl?: string | null;
  tagline?: string;
  showOnHomepage?: boolean;
};

// Validates + normalizes a raw category tagline. Reports errors the same way
// validateCategoryName does: a discriminated union, never throws.
// Empty (or whitespace-only) input is allowed and normalizes to "".
export function normalizeTagline(
  input: unknown
): { ok: true; tagline: string } | { ok: false; error: string } {
  if (typeof input !== "string") {
    return { ok: false, error: "Tagline must be a string" };
  }

  const tagline = input.trim().replace(/\s+/g, " ");

  if (tagline.length > CATEGORY_TAGLINE_MAX) {
    return {
      ok: false,
      error: `Tagline must be at most ${CATEGORY_TAGLINE_MAX} characters`,
    };
  }
  if (CONTROL_CHARS_RE.test(tagline)) {
    return { ok: false, error: "Tagline must not contain control characters" };
  }

  return { ok: true, tagline };
}

// Built-in categories, derived from the homepage category cards. These always
// appear first in the public list and can never be created or deleted through
// the admin API.
export const DEFAULT_CATEGORIES: {
  id: string;
  name: string;
  blurb: string;
  builtIn: true;
}[] = CATEGORY_CARDS.map((card) => ({
  id: card.slug,
  name: card.name,
  blurb: card.blurb,
  builtIn: true,
}));

// True only when slug is one of the built-in category slugs.
export function isDefaultCategorySlug(slug: unknown): boolean {
  return (
    typeof slug === "string" &&
    DEFAULT_CATEGORIES.some((category) => category.id === slug)
  );
}
