import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
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

    // Category filter
    if (categoryParam && categoryParam !== "All") {
      const catLower = categoryParam.toLowerCase();
      products = products.filter((p) => {
        const pCat = (p.category || "").toLowerCase();
        return pCat === catLower || (catLower === "sneakers" && !p.category);
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
      products,
    });
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch products from Firestore",
      },
      { status: 500 }
    );
  }
}
