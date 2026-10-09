import { NextResponse } from "next/server";
import { adminDb, adminAuth, adminStorage } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { validateImageUpload } from "@/lib/image-validation";
import {
  REQUIRED_IMAGE_COUNT,
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES_TOTAL_BYTES,
  normalizeImages,
  isPublishable,
  type ProductImage,
} from "@/lib/product";

type ValidatedUpload = { buffer: Buffer; contentType: string; ext: string };

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
    let newFiles: File[] = [];
    let simulateUploadFailure = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      name = (formData.get("name") as string) || "";
      brand = (formData.get("brand") as string) || "";
      category = (formData.get("category") as string) || "Sneakers";
      price = Number((formData.get("price") as string) || "0") || 0;
      stock = parseInt((formData.get("stock") as string) || "10", 10);
      description = (formData.get("description") as string) || "";
      simulateUploadFailure = formData.get("simulateUploadFailure") === "true";

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
      simulateUploadFailure = Boolean(body.simulateUploadFailure);
    }

    if (!name.trim()) {
      return NextResponse.json(
        { success: false, error: "Product name is required" },
        { status: 400 }
      );
    }

    if (simulateUploadFailure) {
      console.error("[Admin Products API] Simulated image upload failure requested.");
      return NextResponse.json(
        {
          success: false,
          error: "Image upload failed (Simulated Upload Failure). Product was NOT saved to Firestore.",
        },
        { status: 500 }
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
    const mergedCategory = category.trim();
    const mergedPrice = Number(price);
    const mergedStock = Number(stock);
    const mergedDescription = description.trim();

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

      const finalImages = buildProductImages(finalUrls);
      const coverUrl = finalImages[0]?.imageUrl ?? "";
      const isActive = isPublishable({
        name: mergedName,
        category: mergedCategory,
        price: mergedPrice,
        images: finalImages,
      }).ok;

      const now = new Date().toISOString();
      const productPayload = {
        name: mergedName,
        title: mergedName,
        brand: mergedBrand,
        category: mergedCategory,
        price: mergedPrice,
        stock: mergedStock,
        description: mergedDescription,
        images: finalImages,
        imageUrl: coverUrl,
        mainImageUrl: coverUrl,
        isActive,
        createdAt: now,
        updatedAt: now,
      };

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
    let newFiles: File[] = [];
    let imageOrder: string[] | null = null;
    let simulateUploadFailure = false;
    let nameSent = false;
    let brandSent = false;
    let categorySent = false;
    let priceSent = false;
    let stockSent = false;
    let descriptionSent = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      id = (formData.get("id") as string) || "";
      nameSent = formData.has("name");
      brandSent = formData.has("brand");
      categorySent = formData.has("category");
      priceSent = formData.has("price");
      stockSent = formData.has("stock");
      descriptionSent = formData.has("description");
      name = (formData.get("name") as string) || "";
      brand = (formData.get("brand") as string) || "";
      category = (formData.get("category") as string) || "Sneakers";
      price = Number((formData.get("price") as string) || "0") || 0;
      stock = parseInt((formData.get("stock") as string) || "10", 10);
      description = (formData.get("description") as string) || "";
      simulateUploadFailure = formData.get("simulateUploadFailure") === "true";

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
      name = body.name || "";
      brand = body.brand || "";
      category = body.category || "Sneakers";
      price = Number(body.price) || 0;
      stock = Number(body.stock) || 10;
      description = body.description || "";
      simulateUploadFailure = Boolean(body.simulateUploadFailure);

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

    if (simulateUploadFailure) {
      return NextResponse.json(
        {
          success: false,
          error: "Image upload failed (Simulated Upload Failure). Product update aborted.",
        },
        { status: 500 }
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
    const mergedCategory = (categorySent ? category : storedCategory).trim();
    const mergedDescription = (descriptionSent ? description : storedDescription).trim();
    const mergedPrice = toNumber(priceSent ? price : stored.price, 0);
    const mergedStock = toNumber(stockSent ? stock : stored.stock, Number(stock) || 10);

    if (!mergedName) {
      return NextResponse.json(
        { success: false, error: "Product name is required" },
        { status: 400 }
      );
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

      const updatePayload = {
        name: mergedName,
        title: mergedName,
        brand: mergedBrand,
        category: mergedCategory,
        price: mergedPrice,
        stock: mergedStock,
        description: mergedDescription,
        images: finalImages,
        imageUrl: coverUrl,
        mainImageUrl: coverUrl,
        isActive,
        updatedAt: new Date().toISOString(),
      };

      await docRef.update(updatePayload);

      // Best-effort cleanup of images that were removed or replaced.
      const finalUrlSet = new Set(finalUrls);
      const removedUrls = currentImageUrls.filter((url) => !finalUrlSet.has(url));
      await bestEffortDeleteStoragePaths(productStoragePathsForCleanup(removedUrls));

      return NextResponse.json({
        success: true,
        message: "Product updated successfully",
        product: { id, ...updatePayload },
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
      { success: false, error: globalError.message || "Failed to delete product" },
      { status: 500 }
    );
  }
}
