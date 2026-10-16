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

// True when a product may be shown to customers: it must not be explicitly
// deleted/hidden/deactivated, and it must pass the publishable check on the
// same fields isPublishable uses (name, category, price, images).
export function isProductActive(doc: any): boolean {
  if (doc?.deleted === true || doc?.hidden === true || doc?.isActive === false) return false

  return isPublishable({
    name: doc?.name ?? doc?.title,
    category: doc?.category,
    price: Number(doc?.price),
    images: normalizeImages(doc),
  }).ok
}

// The publishable fields a product doc is missing (same mapping as
// isProductActive): "name", "category", "price" and/or "images".
export function getMissingForPublish(doc: any): string[] {
  return isPublishable({
    name: doc?.name ?? doc?.title,
    category: doc?.category,
    price: Number(doc?.price),
    images: normalizeImages(doc),
  }).missing
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

// The three v1 product categories. Shared by the public catalog filter, the
// admin product form and the homepage category cards.
export const PRODUCT_CATEGORIES = ["Sneakers", "Bags & Luggage", "Watches"] as const

// True only when value exactly matches one of PRODUCT_CATEGORIES.
export function isValidCategory(value: unknown): boolean {
  return typeof value === "string" && (PRODUCT_CATEGORIES as readonly string[]).includes(value)
}

// Homepage category cards. `image` is null for now, so the card falls back to a
// gradient with the category name until a real image is provided.
export const CATEGORY_CARDS: {
  name: (typeof PRODUCT_CATEGORIES)[number]
  slug: string
  image: string | null
  blurb: string
}[] = [
  {
    name: "Sneakers",
    slug: "sneakers",
    image: null,
    blurb: "Authentic kicks, verified and priced below market.",
  },
  {
    name: "Bags & Luggage",
    slug: "bags-luggage",
    image: null,
    blurb: "Premium bags and travel-ready luggage.",
  },
  {
    name: "Watches",
    slug: "watches",
    image: null,
    blurb: "Timeless timepieces, legit and guaranteed.",
  },
]

// Target audience options accepted by the admin product form.
export const PRODUCT_GENDERS = ["Men", "Women", "Kids", "Unisex"] as const

// Limits for the free-text product fields.
export const MAX_KEY_FEATURES = 10
export const MAX_KEY_FEATURE_LENGTH = 120
export const MAX_LONG_TEXT_LENGTH = 1000

// Normalizes key features from a form value. Accepts either a string with one
// feature per line or an array of strings. Trims each entry, drops empty lines,
// cuts each item to MAX_KEY_FEATURE_LENGTH and keeps at most MAX_KEY_FEATURES.
export function parseKeyFeatures(input: unknown): string[] {
  let items: unknown[]
  if (typeof input === "string") {
    items = input.split(/\r?\n/)
  } else if (Array.isArray(input)) {
    items = input
  } else {
    return []
  }

  return items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .map((item) => item.slice(0, MAX_KEY_FEATURE_LENGTH))
    .slice(0, MAX_KEY_FEATURES)
}

// Trims a string field and cuts it to `max` characters; anything that is not a
// string becomes "".
export function cleanText(input: unknown, max: number): string {
  if (typeof input !== "string") return ""
  return input.trim().slice(0, max)
}

// The price actually charged for a product doc: the discount price when it is
// valid, otherwise the base price, otherwise 0 (same rule as getEffectivePrice).
export function getChargedPrice(doc: any): number {
  return getEffectivePrice(Number(doc?.price), doc?.discountPrice)
}

// --- Optional product size system -----------------------------------------
// A product may carry a size system with a per-size stock list. A product with
// no sizeSystem is a legacy product that keeps the single numeric stock field.

// Builds evenly spaced shoe labels: "US 6", "US 6.5", ... "US 14".
function buildShoeLabels(start: number, end: number): string[] {
  const labels: string[] = []
  for (let value = start; value <= end + 1e-9; value += 0.5) {
    labels.push(`US ${Number.isInteger(value) ? value : value.toFixed(1)}`)
  }
  return labels
}

// Allowed size labels per size system.
export const SIZE_SYSTEMS = {
  "us-mens-shoe": buildShoeLabels(6, 14),
  "us-womens-shoe": buildShoeLabels(5, 12),
  apparel: ["XS", "S", "M", "L", "XL", "XXL"],
}

export type SizeSystem = keyof typeof SIZE_SYSTEMS

// Human-readable name for each size system.
export const SIZE_SYSTEM_NAMES: Record<SizeSystem, string> = {
  "us-mens-shoe": "US Men's Shoe",
  "us-womens-shoe": "US Women's Shoe",
  apparel: "Apparel",
}

// One size option on a sized product: the label, whether customers can pick it
// and the stock available for that label.
export type ProductSize = { label: string; active: boolean; stock: number }

// Validates and normalizes a product's sizes for a given size system. Returns
// the sizes sorted in the system's own order on success, or a clear error.
// Defaults: stock 10 when missing, active true when missing.
export function normalizeSizes(
  sizeSystem: unknown,
  rawSizes: unknown
): { ok: true; sizes: ProductSize[] } | { ok: false; error: string } {
  if (
    typeof sizeSystem !== "string" ||
    !Object.prototype.hasOwnProperty.call(SIZE_SYSTEMS, sizeSystem)
  ) {
    return { ok: false, error: "Invalid size system" }
  }

  const labels: string[] = SIZE_SYSTEMS[sizeSystem as SizeSystem]

  if (!Array.isArray(rawSizes)) {
    return { ok: false, error: "Sizes must be an array" }
  }

  const seen = new Set<string>()
  const sizes: ProductSize[] = []

  for (const raw of rawSizes) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Each size must be an object" }
    }

    const rawLabel = (raw as any).label
    if (typeof rawLabel !== "string") {
      return { ok: false, error: "Each size needs a label" }
    }
    const label = rawLabel.trim()
    if (!labels.includes(label)) {
      return { ok: false, error: `Invalid size label: ${label}` }
    }
    if (seen.has(label)) {
      return { ok: false, error: `Duplicate size label: ${label}` }
    }
    seen.add(label)

    const rawStock = (raw as any).stock
    const stock = rawStock === undefined || rawStock === null ? 10 : Number(rawStock)
    if (!Number.isInteger(stock) || stock < 0 || stock > 9999) {
      return { ok: false, error: `Invalid stock for size ${label}` }
    }

    const rawActive = (raw as any).active
    let active = true
    if (rawActive !== undefined && rawActive !== null) {
      if (typeof rawActive !== "boolean") {
        return { ok: false, error: `Invalid active flag for size ${label}` }
      }
      active = rawActive
    }

    sizes.push({ label, active, stock })
  }

  // Sort into the system's own order (the raw input order is not trusted).
  sizes.sort((a, b) => labels.indexOf(a.label) - labels.indexOf(b.label))

  return { ok: true, sizes }
}

// True when a product doc uses a valid size system and carries a sizes array.
export function hasSizeSystem(product: any): boolean {
  return (
    !!product &&
    typeof product.sizeSystem === "string" &&
    Object.prototype.hasOwnProperty.call(SIZE_SYSTEMS, product.sizeSystem) &&
    Array.isArray(product.sizes)
  )
}

// Total stock for a product: the sum of the active sizes' stock for a sized
// product, otherwise the legacy single numeric stock field.
export function getTotalStock(product: any): number {
  if (hasSizeSystem(product)) {
    return product.sizes.reduce((sum: number, size: any) => {
      if (!size || size.active === false) return sum
      const stock = Number(size.stock)
      return sum + (Number.isFinite(stock) ? stock : 0)
    }, 0)
  }

  return Number(product?.stock) || 0
}
