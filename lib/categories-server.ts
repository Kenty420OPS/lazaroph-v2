// Server-only category helpers.
//
// IMPORTANT: this module imports the Firebase Admin SDK, so it must NEVER be
// imported from a client component (a file with "use client"). Client
// components must read categories through the /api/categories route handler
// instead. Keep this file free of any browser-safe assumptions.

import { adminDb } from "./firebase-admin";
import { DEFAULT_CATEGORIES, isDefaultCategorySlug } from "./categories";

export type PublicCategory = {
  id: string;
  name: string;
  blurb?: string;
  builtIn: boolean;
};

// Returns the public category list: the built-in categories first, in their
// fixed order (with their blurb), followed by the admin-created Firestore
// categories sorted case-insensitively by name.
//
// Errors are intentionally NOT caught here — callers decide how to degrade
// (the API returns a 500, the homepage falls back to DEFAULT_CATEGORIES).
export async function getPublicCategories(): Promise<PublicCategory[]> {
  const snap = await adminDb.collection("categories").get();

  const custom: PublicCategory[] = snap.docs
    .filter((d) => !isDefaultCategorySlug(d.id))
    .map((d) => ({
      id: d.id,
      name: String((d.data() as { name?: unknown }).name ?? ""),
      builtIn: false,
    }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  return [...DEFAULT_CATEGORIES, ...custom];
}
