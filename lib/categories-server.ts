// Server-only category helpers.
//
// IMPORTANT: this module imports the Firebase Admin SDK, so it must NEVER be
// imported from a client component (a file with "use client"). Client
// components must read categories through the /api/categories route handler
// instead. Keep this file free of any browser-safe assumptions.

import { adminDb } from "./firebase-admin";
import {
  DEFAULT_CATEGORIES,
  isDefaultCategorySlug,
  type CategoryOptionalFields,
} from "./categories";

export type PublicCategory = {
  id: string;
  name: string;
  blurb?: string;
  builtIn: boolean;
} & CategoryOptionalFields;

// Reads only the public presentation fields off a stored category document.
// imagePath and any other internal field are deliberately never surfaced.
function readOptionalFields(
  data: Record<string, unknown> | undefined
): CategoryOptionalFields {
  const source = data ?? {};
  return {
    imageUrl: typeof source.imageUrl === "string" ? source.imageUrl : null,
    tagline: typeof source.tagline === "string" ? source.tagline : undefined,
    showOnHomepage:
      typeof source.showOnHomepage === "boolean" ? source.showOnHomepage : true,
    disabled: typeof source.disabled === "boolean" ? source.disabled : false,
  };
}

// Returns the public category list: the built-in categories first, in their
// fixed order (with their blurb), followed by the admin-created Firestore
// categories sorted case-insensitively by name.
//
// A document stored under a built-in slug may only customise imageUrl, tagline,
// showOnHomepage and disabled — its name and builtIn flag always come from code, so a
// built-in can never be renamed or turned into a custom category through its
// doc. A built-in with no doc returns exactly the code-defined entry with the
// default presentation fields.
//
// Errors are intentionally NOT caught here — callers decide how to degrade
// (the API returns a 500, the homepage falls back to DEFAULT_CATEGORIES).
export async function getPublicCategories(): Promise<PublicCategory[]> {
  const snap = await adminDb.collection("categories").get();
  const docs = new Map(
    snap.docs.map((d) => [d.id, (d.data() as Record<string, unknown>) || {}])
  );

  const builtIn: PublicCategory[] = DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    ...readOptionalFields(docs.get(category.id)),
  }));

  const custom: PublicCategory[] = snap.docs
    .filter((d) => !isDefaultCategorySlug(d.id))
    .map((d) => {
      const data = (d.data() as Record<string, unknown>) || {};
      return {
        id: d.id,
        name: String(data.name ?? ""),
        builtIn: false,
        ...readOptionalFields(data),
      };
    })
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  return [...builtIn, ...custom];
}

// True only when a category with exactly this name (case-sensitive) exists in
// the public list and has disabled === true. Unknown names return false.
export async function isCategoryDisabled(name: string): Promise<boolean> {
  const categories = await getPublicCategories();
  const match = categories.find((category) => category.name === name);
  return match?.disabled === true;
}
