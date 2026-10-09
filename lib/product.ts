// Shared, pure TypeScript helpers for product image handling and validation.
// No server-only imports here so both client components and API routes can use it.

// Every publishable product needs exactly 4 images (mission: 4 photos per product).
export const REQUIRED_IMAGE_COUNT = 4

// Max size for a single product image (1 MB).
// The Vercel request body limit is about 4.5 MB, so four images must stay under about 4 MB total.
export const MAX_PRODUCT_IMAGE_BYTES = 1_000_000

// Max combined size of all product images in one request (4 x 1 MB).
export const MAX_PRODUCT_IMAGES_TOTAL_BYTES = 4_000_000

// One product image: the URL plus whether it is the cover (main) image.
export type ProductImage = { imageUrl: string; isMain?: boolean }

// Normalizes a Firestore product doc's images into a clean ProductImage[]:
// keeps only entries with a non-empty string imageUrl, preserving order,
// with isMain true only on index 0. Falls back to the first non-empty string
// among mainImageUrl / imageUrl / image, otherwise returns [].
export function normalizeImages(doc: any): ProductImage[] {
  // 1) Prefer the images array: keep entries with a non-empty string imageUrl, in order.
  if (Array.isArray(doc?.images)) {
    const cleaned = doc.images
      .filter((img: any) => img && typeof img.imageUrl === "string" && img.imageUrl !== "")
      .map((img: any, i: number) => ({ imageUrl: img.imageUrl as string, isMain: i === 0 }))
    if (cleaned.length > 0) return cleaned
  }

  // 2) Otherwise fall back to the first non-empty string among the legacy single-image fields.
  const fallback = [doc?.mainImageUrl, doc?.imageUrl, doc?.image].find(
    (v: any) => typeof v === "string" && v !== ""
  )
  if (fallback !== undefined) return [{ imageUrl: fallback, isMain: true }]

  // 3) Nothing usable.
  return []
}

// Cover (main) image URL for a product doc, or "" when it has none.
export function getCoverUrl(doc: any): string {
  return normalizeImages(doc)[0]?.imageUrl ?? ""
}

// Checks whether a product can be published. Missing/invalid fields are
// collected in `missing`: "name" (non-empty trimmed string), "category"
// (non-empty trimmed string), "price" (finite number > 0) and "images"
// (exactly REQUIRED_IMAGE_COUNT items). ok is true only when nothing is missing.
export function isPublishable(p: {
  name?: unknown
  category?: unknown
  price?: unknown
  images?: unknown[]
}): { ok: boolean; missing: string[] } {
  const missing: string[] = []

  if (typeof p.name !== "string" || p.name.trim() === "") missing.push("name")
  if (typeof p.category !== "string" || p.category.trim() === "") missing.push("category")
  if (typeof p.price !== "number" || !Number.isFinite(p.price) || p.price <= 0) missing.push("price")
  if (!Array.isArray(p.images) || p.images.length !== REQUIRED_IMAGE_COUNT) missing.push("images")

  return { ok: missing.length === 0, missing }
}

// The price actually shown/charged: the discount price when it is a finite
// number > 0 and less than a valid price; otherwise the base price when it is
// a finite number > 0; otherwise 0.
export function getEffectivePrice(price: unknown, discountPrice?: unknown): number {
  const base = typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null
  const discount =
    typeof discountPrice === "number" && Number.isFinite(discountPrice) && discountPrice > 0
      ? discountPrice
      : null

  if (discount !== null && base !== null && discount < base) return discount
  if (base !== null) return base
  return 0
}

// True when the discount price is actually usable (finite, > 0 and below a
// valid base price); same rule as getEffectivePrice.
export function hasValidDiscount(price: unknown, discountPrice?: unknown): boolean {
  const base = typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null
  const discount =
    typeof discountPrice === "number" && Number.isFinite(discountPrice) && discountPrice > 0
      ? discountPrice
      : null

  return discount !== null && base !== null && discount < base
}

// Builds a candidate SKU like "LZPH-XXXXX" using 5 characters from an
// unambiguous alphabet (no 0/O/1/I). Uses globalThis.crypto.getRandomValues,
// which works in both the browser and Node (never Math.random).
// NOTE: uniqueness against Firestore is NOT checked here; the server route
// that saves the product must check/retry on collision (done in a later step).
export function generateSkuCandidate(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(5)
  globalThis.crypto.getRandomValues(bytes)

  let sku = "LZPH-"
  for (let i = 0; i < bytes.length; i++) {
    sku += alphabet[bytes[i] % alphabet.length]
  }
  return sku
}
