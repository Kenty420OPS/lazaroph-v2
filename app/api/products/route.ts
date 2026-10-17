import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { isProductActive, normalizeImages } from "@/lib/product";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
    const genderParam = searchParams.get("gender");
    const searchParam = searchParams.get("search");

    const querySnapshot = await getDocs(collection(db, "products"));
    let products: any[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        ...data,
      });
    });

    // Drop drafts / hidden / deleted products from the public catalog.
    products = products.filter((p) => isProductActive(p));

    // Category filter
    if (categoryParam && categoryParam !== "All") {
      const catLower = categoryParam.toLowerCase();
      products = products.filter((p) => {
        const pCat = (p.category || "").toLowerCase();
        return pCat === catLower || (catLower === "sneakers" && !p.category);
      });
    }

    // Gender filter — Unisex (and a missing gender) matches every gender.
    if (genderParam && ["Men", "Women", "Kids"].includes(genderParam)) {
      const genderLower = genderParam.toLowerCase();
      products = products.filter((p) => {
        const pGender = (p.gender || "").toLowerCase();
        return pGender === genderLower || pGender === "" || pGender === "unisex";
      });
    }

    // Search filter
    if (searchParam) {
      const searchLower = searchParam.toLowerCase();
      products = products.filter((p) => {
        const name = (p.name || p.title || "").toLowerCase();
        const brand = (p.brand || "").toLowerCase();
        const cat = (p.category || "").toLowerCase();
        return name.includes(searchLower) || brand.includes(searchLower) || cat.includes(searchLower);
      });
    }

    return NextResponse.json({
      success: true,
      count: products.length,
      products: products.map((p) => ({ ...p, images: normalizeImages(p) })),
    });
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch products",
      },
      { status: 500 }
    );
  }
}
