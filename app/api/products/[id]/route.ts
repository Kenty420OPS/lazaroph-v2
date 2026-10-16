import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  isProductActive,
  normalizeImages,
  getCoverUrl,
  hasSizeSystem,
  type ProductSize,
} from "@/lib/product";

export const revalidate = 60; // ISR: revalidate a product every 60 s

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const docSnap = await getDoc(doc(db, "products", params.id));
    const data = docSnap.data();

    // Same response for a missing doc and an inactive one so drafts/hidden/
    // deleted products are never exposed to customers.
    if (!docSnap.exists() || !isProductActive(data)) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Only public fields may leave the server (no admin-only/internal fields).
    const product = {
      id: docSnap.id,
      name: data?.name ?? data?.title ?? "",
      brand: data?.brand ?? "",
      category: data?.category ?? "",
      subcategory: data?.subcategory ?? "",
      gender: data?.gender ?? "",
      sku: data?.sku ?? "",
      price: data?.price ?? 0,
      discountPrice: data?.discountPrice ?? null,
      description: data?.description ?? "",
      keyFeatures: Array.isArray(data?.keyFeatures) ? data.keyFeatures : [],
      materials: data?.materials ?? "",
      careInstructions: data?.careInstructions ?? "",
      imageUrl: getCoverUrl(data),
      images: normalizeImages(data),
      // Sized products also expose which sizes are selectable and their stock.
      // Products without a valid size system keep the exact same shape as before.
      ...(hasSizeSystem(data)
        ? {
            sizeSystem: data?.sizeSystem ?? "",
            sizes: (data?.sizes ?? []).map((size: ProductSize) => ({
              label: size.label,
              active: size.active,
              stock: size.stock,
            })),
          }
        : {}),
    };

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
