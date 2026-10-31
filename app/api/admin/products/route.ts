import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminAuth, adminStorage } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { brandSlug } from "@/lib/brands";
import { DEFAULT_CATEGORIES, categorySlug } from "@/lib/categories";
import { isCategoryDisabled } from "@/lib/categories-server";
import { validateImageUpload } from "@/lib/image-validation";
import {
  REQUIRED_IMAGE_COUNT,
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES_TOTAL_BYTES,
  MAX_LONG_TEXT_LENGTH,
  PRODUCT_GENDERS,
  normalizeImages,
  isPublishable,
  isProductActive,
  getMissingForPublish,
  hasValidDiscount,
  parseKeyFeatures,
  cleanText,
  generateSkuCandidate,
  normalizeSizes,
  getTotalStock,
  hasSizeSystem,
  type ProductImage,
  type ProductSize,
} from "@/lib/product";

export const dynamic = "force-dynamic";

type ValidatedUpload = { buffer: Buffer; contentType: string; ext: string };

// Finds a SKU that is not already used by another product. Tries up to 8
// random candidates; returns null when every attempt collides.
async function generateUniqueSku(): Promise<string | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateSkuCandidate();
    const existing = await adminDb
      .collection("products")
      .where("sku", "==", candidate)
      .limit(1)
      .get();
    if (existing.empty) return candidate;
  }
  return null;
}

// True only when a brand document for name's slug exists and its stored name
// matches name exactly. Never true for an empty name.
async function isKnownBrand(name: string): Promise<boolean> {
  const slug = brandSlug(name);
  if (slug.length < 1) return false;
  const snap = await adminDb.collection("brands").doc(slug).get();
  if (!snap.exists) return false;
  const storedName = (snap.data() as any)?.name;
  return typeof storedName === "string" && storedName === name;
}

// True when name is one of the built-in categories, or a category document for
// name's slug exists and its stored name matches name exactly. Never true for
// an empty name or when the slug is empty.
async function isKnownCategory(name: string): Promise<boolean> {
  if (name === "") return false;
  if (DEFAULT_CATEGORIES.some((c) => c.name === name)) return true;
  const slug = categorySlug(name);
  if (slug.length < 1) return false;
  const snap = await adminDb.collection("categories").doc(slug).get();
  if (!snap.exists) return false;
  const storedName = (snap.data() as any)?.name;
  return typeof storedName === "string" && storedName === name;
}

// Duck-typed check for a usable (non-empty) multipart file entry.
function isUsableFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as File).size === "number" &&
    (value as File).size > 0
  );
}

// Collects usable File entries from formData.getAll(...) results.
function collectFiles(entries: unknown[]): File[] {
  return entries.filter(isUsableFile);
}

function hasOwn(obj: any, key: string): boolean {
  return !!obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, key);
}

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Parses a raw "sizes" value: multipart sends a JSON string, JSON bodies may
// send the array directly. Absent values stay undefined so normalizeSizes
// reports the error.
function parseSizesPayload(
  raw: unknown
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: undefined };
  }
  if (typeof raw === "string") {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch {
      return { ok: false, error: "Invalid sizes" };
    }
  }
  return { ok: true, value: raw };
}

// Builds the stored ProductImage[] shape; isMain is true only on index 0.
function buildProductImages(urls: string[]): ProductImage[] {
  return urls.map((imageUrl, index) => ({ imageUrl, isMain: index === 0 }));
}

// Validates every new file (magic bytes via validateImageUpload) and the total
// combined size. Error messages include which image number failed.
async function validateNewFiles(
  files: File[]
): Promise<{ ok: true; validations: ValidatedUpload[] } | { ok: false; error: string }> {
  const validations: ValidatedUpload[] = [];
  let totalBytes = 0;

  for (let i = 0; i < files.length; i++) {
    const result = await validateImageUpload(files[i], MAX_PRODUCT_IMAGE_BYTES);
    if (!result.ok) {
      return { ok: false, error: `Image ${i + 1}: ${result.error}` };
    }
    totalBytes += files[i].size;
    validations.push(result);
  }

  if (totalBytes > MAX_PRODUCT_IMAGES_TOTAL_BYTES) {
    return { ok: false, error: "Images are too large together (max 4MB total)" };
  }

  return { ok: true, validations };
}

// Uploads one validated image under products/<productId>/ and returns the
// storage path plus the public URL format these routes use (?alt=media).
async function uploadProductImage(
  productId: string,
  validation: ValidatedUpload
): Promise<{ path: string; url: string }> {
  const bucket = adminStorage.bucket();
  const storagePath = `products/${productId}/${crypto.randomUUID()}.${validation.ext}`;
  const file = bucket.file(storagePath);

  await file.save(validation.buffer, {
    metadata: {
      contentType: validation.contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
  return { path: storagePath, url };
}

// Best-effort delete; never throws. Only touches objects under products/.
async function bestEffortDeleteStoragePaths(paths: string[]) {
  if (paths.length === 0) return;
  const bucket = adminStorage.bucket();
  for (const path of paths) {
    if (typeof path !== "string" || !path.startsWith("products/")) continue;
    try {
      await bucket.file(path).delete();
    } catch (error) {
      console.error("Best-effort delete of product image failed:", path, error);
    }
  }
}

// Parses a Firestore Storage download URL into { bucket, path }, or null when
// the URL is not a readable Storage URL. Never throws.
function parseStorageObjectUrl(url: string): { bucket: string; path: string } | null {
  const match = url.match(
    /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)/
  );
  if (!match) return null;
  let path: string;
  try {
    path = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  return { bucket: match[1], path };
}

// Storage paths safe to clean up: this project's bucket and under products/.
function productStoragePathsForCleanup(urls: string[]): string[] {
  const bucketName = adminStorage.bucket().name;
  const paths: string[] = [];
  for (const url of urls) {
    const parsed = parseStorageObjectUrl(url);
    if (!parsed) continue;
    if (parsed.bucket !== bucketName) continue;
    if (!parsed.path.startsWith("products/")) continue;
    paths.push(parsed.path);
  }
  return paths;
}

// GET /api/admin/products - List all products for the admin table (Admin authorized only)
export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase();

    const snapshot = await adminDb.collection("products").get();
    let products = snapshot.docs.map((doc) => {
      const data = (doc.data() as any) || {};
      return {
        id: doc.id,
        ...data,
        images: normalizeImages(data),
        isActive: isProductActive(data),
        missing: getMissingForPublish(data),
      };
    });

    // Newest first when createdAt is present; docs without it keep their order.
    products.sort((a: any, b: any) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : NaN;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : NaN;
      const aValid = !Number.isNaN(aTime);
      const bValid = !Number.isNaN(bTime);
      if (!aValid && !bValid) return 0;
      if (!aValid) return 1;
      if (!bValid) return -1;
      return bTime - aTime;
    });

    if (q) {
      products = products.filter((p: any) => {
        const name = String(p.name || p.title || "").toLowerCase();
        const brand = String(p.brand || "").toLowerCase();
        const sku = String(p.sku || "").toLowerCase();
        const id = String(p.id || "").toLowerCase();
        return name.includes(q) || brand.includes(q) || sku.includes(q) || id.includes(q);
      });
    }

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error("GET /api/admin/products error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load products" },
      { status: 500 }
    );
  }
}

// POST /api/admin/products - Add a new product (Admin authorized only)
export async function POST(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let name = "";
    let brand = "";
    let category = "Sneakers";
    let price = 0;
    let stock = 10;
    let description = "";
    let discountPriceRaw: unknown = undefined;
    let subcategory = "";
    let gender = "";
    let keyFeaturesRaw: unknown = undefined;
    let materials = "";
    let careInstructions = "";
    let newFiles: File[] = [];
    let sizeSystemRaw: unknown = undefined;
    let sizesRaw: unknown = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      name = (formData.get("name") as string) || "";
      brand = (formData.get("brand") as string) || "";
      category = (formData.get("category") as string) || "Sneakers";
      price = Number((formData.get("price") as string) || "0") || 0;
      stock = parseInt((formData.get("stock") as string) || "10", 10);
      description = (formData.get("description") as string) || "";
      discountPriceRaw = formData.get("discountPrice");
      subcategory = (formData.get("subcategory") as string) || "";
      gender = (formData.get("gender") as string) || "";
      keyFeaturesRaw = formData.get("keyFeatures");
      materials = (formData.get("materials") as string) || "";
      careInstructions = (formData.get("careInstructions") as string) || "";

      sizeSystemRaw = formData.get("sizeSystem");
      sizesRaw = formData.get("sizes");

      // New files arrive as repeated "newImages" entries; the legacy single
      // "image" file is treated as one extra new file appended after them.
      newFiles = collectFiles(formData.getAll("newImages"));
      const legacyFile = formData.get("image");
      if (isUsableFile(legacyFile)) newFiles.push(legacyFile);
    } else {
      const body = await request.json();
      name = body.name || "";
      brand = body.brand || "";
      category = body.category || "Sneakers";
      price = Number(body.price) || 0;
      stock = Number(body.stock) || 10;
      description = body.description || "";
      discountPriceRaw = body.discountPrice;
      subcategory = body.subcategory || "";
      gender = body.gender || "";
      keyFeaturesRaw = body.keyFeatures;
      materials = body.materials || "";
      careInstructions = body.careInstructions || "";
      sizeSystemRaw = body.sizeSystem;
      sizesRaw = body.sizes;
    }

    if (!name.trim()) {
      return NextResponse.json(
        { success: false, error: "Product name is required" },
        { status: 400 }
      );
    }

    if (newFiles.length > REQUIRED_IMAGE_COUNT) {
      return NextResponse.json(
        { success: false, error: "A product can have at most 4 images" },
        { status: 400 }
      );
    }

    const mergedName = name.trim();
    const mergedBrand = brand.trim();

    // Non-empty brands must be a known managed brand on create.
    if (mergedBrand !== "" && (mergedBrand.length > 60 || !(await isKnownBrand(mergedBrand)))) {
      return NextResponse.json({ success: false, error: "Invalid brand" }, { status: 400 });
    }

    const mergedCategory = category.trim();
    if (!(await isKnownCategory(mergedCategory))) {
      return NextResponse.json({ success: false, error: "Invalid category" }, { status: 400 });
    }
    // A disabled category cannot be chosen for a new product.
    if (await isCategoryDisabled(mergedCategory)) {
      return NextResponse.json(
        { success: false, error: "Category is not available" },
        { status: 400 }
      );
    }
    const mergedPrice = Number(price);
    const mergedStock = Number(stock);
    const mergedDescription = description.trim();

    // Optional size system. A valid system derives stock from the active sizes;
    // "none"/empty (or absent) means a legacy product with a single stock.
    const sizeSystemValue = typeof sizeSystemRaw === "string" ? sizeSystemRaw.trim() : "";
    let mergedSizeSystem: string | null = null;
    let mergedSizes: ProductSize[] | null = null;
    let finalStock = mergedStock;

    if (sizeSystemValue !== "" && sizeSystemValue !== "none") {
      const parsedSizes = parseSizesPayload(sizesRaw);
      if (!parsedSizes.ok) {
        return NextResponse.json({ success: false, error: parsedSizes.error }, { status: 400 });
      }
      const normalized = normalizeSizes(sizeSystemValue, parsedSizes.value);
      if (!normalized.ok) {
        return NextResponse.json({ success: false, error: normalized.error }, { status: 400 });
      }
      mergedSizeSystem = sizeSystemValue;
      mergedSizes = normalized.sizes;
      finalStock = getTotalStock({ sizeSystem: mergedSizeSystem, sizes: mergedSizes });
    }
    const mergedSubcategory = cleanText(subcategory, 60);
    const mergedGender = cleanText(gender, 60);
    if (mergedGender !== "" && !PRODUCT_GENDERS.includes(mergedGender as any)) {
      return NextResponse.json({ success: false, error: "Invalid gender" }, { status: 400 });
    }
    const mergedKeyFeatures = parseKeyFeatures(keyFeaturesRaw);
    const mergedMaterials = cleanText(materials, MAX_LONG_TEXT_LENGTH);
    const mergedCareInstructions = cleanText(careInstructions, MAX_LONG_TEXT_LENGTH);

    // Empty/missing means no discount; otherwise it must be a finite number
    // greater than 0 and strictly lower than the merged base price.
    const discountRawTrimmed =
      typeof discountPriceRaw === "string" ? discountPriceRaw.trim() : discountPriceRaw;
    let mergedDiscountPrice: number | null = null;
    if (discountRawTrimmed !== undefined && discountRawTrimmed !== null && discountRawTrimmed !== "") {
      const parsedDiscount = Number(discountRawTrimmed);
      if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0 || !(parsedDiscount < mergedPrice)) {
        return NextResponse.json(
          { success: false, error: "Discount price must be lower than the price" },
          { status: 400 }
        );
      }
      mergedDiscountPrice = parsedDiscount;
    }

    const validation = await validateNewFiles(newFiles);
    if (!validation.ok) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    // Pre-generate the product id so the Storage path can use it.
    const docRef = adminDb.collection("products").doc();
    const productId = docRef.id;

    const uploadedPaths: string[] = [];
    try {
      const finalUrls: string[] = [];
      for (const valid of validation.validations) {
        const uploaded = await uploadProductImage(productId, valid);
        uploadedPaths.push(uploaded.path);
        finalUrls.push(uploaded.url);
      }

      // Unique SKU; a throw here rolls back the uploads via the catch below.
      const sku = await generateUniqueSku();
      if (!sku) {
        throw new Error("Failed to generate a unique SKU after 8 attempts");
      }

      const finalImages = buildProductImages(finalUrls);
      const coverUrl = finalImages[0]?.imageUrl ?? "";
      const isActive = isPublishable({
        name: mergedName,
        category: mergedCategory,
        price: mergedPrice,
        images: finalImages,
      }).ok;

      const now = new Date().toISOString();
      const productPayload: Record<string, any> = {
        name: mergedName,
        title: mergedName,
        brand: mergedBrand,
        category: mergedCategory,
        subcategory: mergedSubcategory,
        gender: mergedGender,
        price: mergedPrice,
        discountPrice: mergedDiscountPrice,
        sku,
        stock: finalStock,
        description: mergedDescription,
        keyFeatures: mergedKeyFeatures,
        materials: mergedMaterials,
        careInstructions: mergedCareInstructions,
        images: finalImages,
        imageUrl: coverUrl,
        mainImageUrl: coverUrl,
        isActive,
        createdAt: now,
        updatedAt: now,
      };

      if (mergedSizeSystem) {
        productPayload.sizeSystem = mergedSizeSystem;
        productPayload.sizes = mergedSizes;
      }

      await docRef.set(productPayload);

      return NextResponse.json({
        success: true,
        message: "Product created successfully",
        product: {
          id: productId,
          ...productPayload,
        },
      });
    } catch (saveError) {
      console.error("POST /api/admin/products failed after uploads; rolling back:", saveError);
      await bestEffortDeleteStoragePaths(uploadedPaths);
      return NextResponse.json(
        { success: false, error: "Failed to save product" },
        { status: 500 }
      );
    }
  } catch (globalError: any) {
    console.error("POST /api/admin/products global error:", globalError);
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/products - Edit product (Admin authorized only)
export async function PUT(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let id = "";
    let name = "";
    let brand = "";
    let category = "Sneakers";
    let price = 0;
    let stock = 10;
    let description = "";
    let discountPriceRaw: unknown = undefined;
    let subcategory = "";
    let gender = "";
    let keyFeaturesRaw: unknown = undefined;
    let materials = "";
    let careInstructions = "";
    let newFiles: File[] = [];
    let imageOrder: string[] | null = null;
    let nameSent = false;
    let brandSent = false;
    let categorySent = false;
    let priceSent = false;
    let stockSent = false;
    let descriptionSent = false;
    let discountPriceSent = false;
    let subcategorySent = false;
    let genderSent = false;
    let keyFeaturesSent = false;
    let materialsSent = false;
    let careInstructionsSent = false;
    let sizeSystemSent = false;
    let sizeSystemRaw: unknown = undefined;
    let sizesRaw: unknown = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      id = (formData.get("id") as string) || "";
      nameSent = formData.has("name");
      brandSent = formData.has("brand");
      categorySent = formData.has("category");
      priceSent = formData.has("price");
      stockSent = formData.has("stock");
      descriptionSent = formData.has("description");
      discountPriceSent = formData.has("discountPrice");
      subcategorySent = formData.has("subcategory");
      genderSent = formData.has("gender");
      keyFeaturesSent = formData.has("keyFeatures");
      materialsSent = formData.has("materials");
      careInstructionsSent = formData.has("careInstructions");
      name = (formData.get("name") as string) || "";
      brand = (formData.get("brand") as string) || "";
      category = (formData.get("category") as string) || "Sneakers";
      price = Number((formData.get("price") as string) || "0") || 0;
      stock = parseInt((formData.get("stock") as string) || "10", 10);
      description = (formData.get("description") as string) || "";
      discountPriceRaw = formData.get("discountPrice");
      subcategory = (formData.get("subcategory") as string) || "";
      gender = (formData.get("gender") as string) || "";
      keyFeaturesRaw = formData.get("keyFeatures");
      materials = (formData.get("materials") as string) || "";
      careInstructions = (formData.get("careInstructions") as string) || "";

      sizeSystemSent = formData.has("sizeSystem");
      sizeSystemRaw = formData.get("sizeSystem");
      sizesRaw = formData.get("sizes");

      newFiles = collectFiles(formData.getAll("newImages"));
      const legacyFile = formData.get("image");
      if (isUsableFile(legacyFile)) newFiles.push(legacyFile);

      const rawImageOrder = formData.get("imageOrder");
      if (typeof rawImageOrder === "string" && rawImageOrder.trim() !== "") {
        let parsed: unknown;
        try {
          parsed = JSON.parse(rawImageOrder);
        } catch {
          return NextResponse.json(
            { success: false, error: "Invalid imageOrder" },
            { status: 400 }
          );
        }
        if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
          return NextResponse.json(
            { success: false, error: "Invalid imageOrder" },
            { status: 400 }
          );
        }
        if (parsed.length > REQUIRED_IMAGE_COUNT) {
          return NextResponse.json(
            { success: false, error: "A product can have at most 4 images" },
            { status: 400 }
          );
        }
        imageOrder = parsed as string[];
      }
    } else {
      const body = await request.json();
      id = body.id || "";
      nameSent = hasOwn(body, "name");
      brandSent = hasOwn(body, "brand");
      categorySent = hasOwn(body, "category");
      priceSent = hasOwn(body, "price");
      stockSent = hasOwn(body, "stock");
      descriptionSent = hasOwn(body, "description");
      discountPriceSent = hasOwn(body, "discountPrice");
      subcategorySent = hasOwn(body, "subcategory");
      genderSent = hasOwn(body, "gender");
      keyFeaturesSent = hasOwn(body, "keyFeatures");
      materialsSent = hasOwn(body, "materials");
      careInstructionsSent = hasOwn(body, "careInstructions");
      name = body.name || "";
      brand = body.brand || "";
      category = body.category || "Sneakers";
      price = Number(body.price) || 0;
      stock = Number(body.stock) || 10;
      description = body.description || "";
      discountPriceRaw = body.discountPrice;
      subcategory = body.subcategory || "";
      gender = body.gender || "";
      keyFeaturesRaw = body.keyFeatures;
      materials = body.materials || "";
      careInstructions = body.careInstructions || "";

      sizeSystemSent = hasOwn(body, "sizeSystem");
      sizeSystemRaw = body.sizeSystem;
      sizesRaw = body.sizes;

      if (body.imageOrder !== undefined) {
        if (!Array.isArray(body.imageOrder) || !body.imageOrder.every((item: unknown) => typeof item === "string")) {
          return NextResponse.json(
            { success: false, error: "Invalid imageOrder" },
            { status: 400 }
          );
        }
        if (body.imageOrder.length > REQUIRED_IMAGE_COUNT) {
          return NextResponse.json(
            { success: false, error: "A product can have at most 4 images" },
            { status: 400 }
          );
        }
        imageOrder = body.imageOrder as string[];
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product ID is required for editing" },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection("products").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }
    const stored = (snap.data() as any) || {};
    const currentImageUrls = normalizeImages(stored).map((img) => img.imageUrl);

    // Merge new values where they were sent, otherwise keep the stored ones.
    const storedName = typeof stored.name === "string" ? stored.name : name;
    const storedBrand = typeof stored.brand === "string" ? stored.brand : brand;
    const storedCategory = typeof stored.category === "string" ? stored.category : category;
    const storedDescription = typeof stored.description === "string" ? stored.description : description;

    const mergedName = (nameSent ? name : storedName).trim();
    const mergedBrand = (brandSent ? brand : storedBrand).trim();

    // A brand change must point at a known managed brand; keeping the stored
    // value is always accepted so legacy free-text brands stay editable.
    if (mergedBrand !== "" && mergedBrand !== storedBrand) {
      if (mergedBrand.length > 60 || !(await isKnownBrand(mergedBrand))) {
        return NextResponse.json({ success: false, error: "Invalid brand" }, { status: 400 });
      }
    }

    const mergedCategory = (categorySent ? category : storedCategory).trim();
    // A category change must be a known, enabled category; keeping the stored
    // value is always accepted so legacy categories stay editable unchanged,
    // even when that stored category is disabled.
    if (mergedCategory !== storedCategory.trim()) {
      if (!(await isKnownCategory(mergedCategory))) {
        return NextResponse.json({ success: false, error: "Invalid category" }, { status: 400 });
      }
      if (await isCategoryDisabled(mergedCategory)) {
        return NextResponse.json(
          { success: false, error: "Category is not available" },
          { status: 400 }
        );
      }
    }
    const mergedDescription = (descriptionSent ? description : storedDescription).trim();
    const mergedPrice = toNumber(priceSent ? price : stored.price, 0);
    const mergedStock = toNumber(stockSent ? stock : stored.stock, Number(stock) || 10);

    // Optional size system. When sizeSystem is sent and valid the stock is
    // derived from the active sizes. "none"/empty clears the stored system and
    // falls back to a single stock. When it is not sent the stored system (and
    // the stock derived from its sizes) is left untouched.
    const sizeSystemValue = typeof sizeSystemRaw === "string" ? sizeSystemRaw.trim() : "";
    const storedIsSized = hasSizeSystem(stored);
    let finalStock = mergedStock;
    let mergedSizes: ProductSize[] | null = null; // set only when a system is chosen
    let applySizeSystem = false; // true when a system is being stored
    let clearSizeSystem = false; // true when the stored system is being removed

    if (sizeSystemSent) {
      if (sizeSystemValue === "" || sizeSystemValue === "none") {
        clearSizeSystem = true;
      } else {
        const parsedSizes = parseSizesPayload(sizesRaw);
        if (!parsedSizes.ok) {
          return NextResponse.json({ success: false, error: parsedSizes.error }, { status: 400 });
        }
        const normalized = normalizeSizes(sizeSystemValue, parsedSizes.value);
        if (!normalized.ok) {
          return NextResponse.json({ success: false, error: normalized.error }, { status: 400 });
        }
        applySizeSystem = true;
        mergedSizes = normalized.sizes;
        finalStock = getTotalStock({ sizeSystem: sizeSystemValue, sizes: mergedSizes });
      }
    } else if (storedIsSized) {
      // Never overwrite a sized product's derived stock with a sent/default
      // value while its size system is left in place.
      finalStock = getTotalStock(stored);
    }

    if (!mergedName) {
      return NextResponse.json(
        { success: false, error: "Product name is required" },
        { status: 400 }
      );
    }

    const mergedSubcategory = subcategorySent
      ? cleanText(subcategory, 60)
      : cleanText(stored.subcategory, 60);
    const mergedGender = genderSent ? cleanText(gender, 60) : cleanText(stored.gender, 60);
    if (mergedGender !== "" && !PRODUCT_GENDERS.includes(mergedGender as any)) {
      return NextResponse.json({ success: false, error: "Invalid gender" }, { status: 400 });
    }
    const mergedKeyFeatures = keyFeaturesSent
      ? parseKeyFeatures(keyFeaturesRaw)
      : parseKeyFeatures(stored.keyFeatures);
    const mergedMaterials = materialsSent
      ? cleanText(materials, MAX_LONG_TEXT_LENGTH)
      : cleanText(stored.materials, MAX_LONG_TEXT_LENGTH);
    const mergedCareInstructions = careInstructionsSent
      ? cleanText(careInstructions, MAX_LONG_TEXT_LENGTH)
      : cleanText(stored.careInstructions, MAX_LONG_TEXT_LENGTH);

    // Discount: not sent keeps the stored value; sent empty clears it (null);
    // sent with a value must be finite, > 0 and strictly lower than the price.
    let mergedDiscountPrice: number | null;
    if (!discountPriceSent) {
      mergedDiscountPrice = stored.discountPrice ?? null;
    } else {
      const discountRawTrimmed =
        typeof discountPriceRaw === "string" ? discountPriceRaw.trim() : discountPriceRaw;
      if (discountRawTrimmed === undefined || discountRawTrimmed === null || discountRawTrimmed === "") {
        mergedDiscountPrice = null;
      } else {
        const parsedDiscount = Number(discountRawTrimmed);
        if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0 || !(parsedDiscount < mergedPrice)) {
          return NextResponse.json(
            { success: false, error: "Discount price must be lower than the price" },
            { status: 400 }
          );
        }
        mergedDiscountPrice = parsedDiscount;
      }
    }

    // Invariant: a carried-over discount must still be a real discount
    // (greater than 0 and strictly lower than the merged price). If a price
    // change made it equal, higher, or zero, clear it instead of keeping a
    // meaningless value that would still be charged. Values the admin actually
    // sends are still rejected with the 400 above when invalid.
    if (
      mergedDiscountPrice !== null &&
      mergedDiscountPrice !== undefined &&
      !hasValidDiscount(mergedPrice, mergedDiscountPrice)
    ) {
      mergedDiscountPrice = null
    }

    // imageOrder entries: existing URL on this product, or "new:<k>".
    if (imageOrder) {
      for (const entry of imageOrder) {
        if (entry.startsWith("new:")) {
          const index = Number(entry.slice(4));
          if (!Number.isInteger(index) || index < 0 || index >= newFiles.length) {
            return NextResponse.json(
              { success: false, error: "imageOrder references a missing new image" },
              { status: 400 }
            );
          }
        } else if (!currentImageUrls.includes(entry)) {
          return NextResponse.json(
            { success: false, error: "imageOrder contains an image that is not part of this product" },
            { status: 400 }
          );
        }
      }
      if (new Set(imageOrder).size !== imageOrder.length) {
        return NextResponse.json(
          { success: false, error: "imageOrder contains duplicate images" },
          { status: 400 }
        );
      }
    }

    // Final list must never exceed REQUIRED_IMAGE_COUNT.
    const plannedFinalCount = imageOrder
      ? imageOrder.length
      : currentImageUrls.length + newFiles.length;
    if (plannedFinalCount > REQUIRED_IMAGE_COUNT) {
      return NextResponse.json(
        { success: false, error: "A product can have at most 4 images" },
        { status: 400 }
      );
    }

    const validation = await validateNewFiles(newFiles);
    if (!validation.ok) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    // Only upload new files that the final list actually references.
    const uploadIndices: number[] = [];
    if (imageOrder) {
      for (const entry of imageOrder) {
        if (entry.startsWith("new:")) {
          const index = Number(entry.slice(4));
          if (!uploadIndices.includes(index)) uploadIndices.push(index);
        }
      }
    } else {
      for (let i = 0; i < newFiles.length; i++) uploadIndices.push(i);
    }

    const uploadedPaths: string[] = [];
    try {
      const urlByIndex = new Map<number, string>();
      for (const index of uploadIndices) {
        const uploaded = await uploadProductImage(id, validation.validations[index]);
        uploadedPaths.push(uploaded.path);
        urlByIndex.set(index, uploaded.url);
      }

      let finalUrls: string[];
      if (imageOrder) {
        finalUrls = imageOrder.map((entry) =>
          entry.startsWith("new:") ? urlByIndex.get(Number(entry.slice(4)))! : entry
        );
      } else if (newFiles.length > 0) {
        // No order supplied but new files were sent: current images then new.
        finalUrls = [...currentImageUrls, ...uploadIndices.map((i) => urlByIndex.get(i)!)];
      } else {
        // Nothing changed: keep the product's current images.
        finalUrls = currentImageUrls;
      }

      const finalImages = buildProductImages(finalUrls);
      const coverUrl = finalImages[0]?.imageUrl ?? "";
      const isActive = isPublishable({
        name: mergedName,
        category: mergedCategory,
        price: mergedPrice,
        images: finalImages,
      }).ok;

      // Never change an existing SKU; generate one only when the stored product
      // has none. A throw here rolls back the uploads via the catch below.
      let sku = typeof stored.sku === "string" ? stored.sku.trim() : "";
      if (!sku) {
        const generated = await generateUniqueSku();
        if (!generated) {
          throw new Error("Failed to generate a unique SKU after 8 attempts");
        }
        sku = generated;
      }

      const updatePayload: Record<string, any> = {
        name: mergedName,
        title: mergedName,
        brand: mergedBrand,
        category: mergedCategory,
        subcategory: mergedSubcategory,
        gender: mergedGender,
        price: mergedPrice,
        discountPrice: mergedDiscountPrice,
        sku,
        stock: finalStock,
        description: mergedDescription,
        keyFeatures: mergedKeyFeatures,
        materials: mergedMaterials,
        careInstructions: mergedCareInstructions,
        images: finalImages,
        imageUrl: coverUrl,
        mainImageUrl: coverUrl,
        isActive,
        updatedAt: new Date().toISOString(),
      };

      // Store the chosen system, remove it when cleared, otherwise leave the
      // stored sizeSystem/sizes fields untouched.
      if (applySizeSystem) {
        updatePayload.sizeSystem = sizeSystemValue;
        updatePayload.sizes = mergedSizes;
      } else if (clearSizeSystem) {
        updatePayload.sizeSystem = FieldValue.delete();
        updatePayload.sizes = FieldValue.delete();
      }

      await docRef.update(updatePayload);

      // Best-effort cleanup of images that were removed or replaced.
      const finalUrlSet = new Set(finalUrls);
      const removedUrls = currentImageUrls.filter((url) => !finalUrlSet.has(url));
      await bestEffortDeleteStoragePaths(productStoragePathsForCleanup(removedUrls));

      // Never leak the FieldValue.delete() sentinels in the JSON response.
      const responsePayload: Record<string, any> = { ...updatePayload };
      if (clearSizeSystem) {
        delete responsePayload.sizeSystem;
        delete responsePayload.sizes;
      }

      return NextResponse.json({
        success: true,
        message: "Product updated successfully",
        product: { id, ...responsePayload },
      });
    } catch (saveError) {
      console.error("PUT /api/admin/products failed after uploads; rolling back:", saveError);
      await bestEffortDeleteStoragePaths(uploadedPaths);
      return NextResponse.json(
        { success: false, error: "Failed to save product" },
        { status: 500 }
      );
    }
  } catch (globalError: any) {
    console.error("PUT /api/admin/products global error:", globalError);
    return NextResponse.json(
      { success: false, error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products - Delete product (Admin authorized only)
export async function DELETE(request: Request) {
  try {
    const auth = await verifyAdminRequest(request);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product ID is required for deletion" },
        { status: 400 }
      );
    }

    // Use Admin SDK to delete bypassing rules
    await adminDb.collection("products").doc(id).delete();

    return NextResponse.json({
      success: true,
      message: `Product ${id} deleted successfully`,
    });
  } catch (globalError: any) {
    console.error("DELETE /api/admin/products global error:", globalError);
    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
