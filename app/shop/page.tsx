"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import { hasValidDiscount, getChargedPrice, PRODUCT_CATEGORIES } from "@/lib/product";
import { CATEGORY_NAME_MAX } from "@/lib/categories";
import { STOREFRONT_CATEGORIES, STOREFRONT_GENDERS } from "@/lib/storefront-nav";

interface Product {
  id: string;
  name?: string;
  title?: string;
  price?: number | string;
  discountPrice?: number | null;
  category?: string;
  brand?: string;
  image?: string;
  imageUrl?: string;
  mainImageUrl?: string;
  images?: { imageUrl: string; isMain?: boolean }[];
  description?: string;
  stock?: number;
  sizeSystem?: string;
  sizes?: Array<{ label: string; active: boolean; stock: number }>;
}

// Fallback used for the pills until (or unless) /api/categories loads.
const FALLBACK_CATEGORIES: string[] = [...STOREFRONT_CATEGORIES];

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ShopPageContent />
    </Suspense>
  );
}

function ShopPageContent() {
  const { addToCart } = useCart();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryNames, setCategoryNames] = useState<string[]>(FALLBACK_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const param = searchParams.get("category");
    return param && param.length > 0 && param.length <= CATEGORY_NAME_MAX ? param : "All";
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("default");
  const [selectedGender, setSelectedGender] = useState<string>(() => {
    const param = searchParams.get("gender");
    return param && (STOREFRONT_GENDERS as readonly string[]).includes(param) ? param : "All";
  });

  // Fetch products exclusively through the API Route Handler (/api/products)
  // Strict compliance with AGENTS.md Rule #1: No direct Firestore calls in client components.
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCategory !== "All") params.append("category", selectedCategory);
      if (selectedGender !== "All") params.append("gender", selectedGender);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load products.");
      }

      setProducts(data.products || []);
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(err.message || "Something went wrong while fetching products.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch the managed category list once on mount, through the API Route
  // Handler only (AGENTS.md Rule #1). When it fails or comes back empty we
  // keep the STOREFRONT_CATEGORIES fallback so the pills are never empty.
  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        const names: string[] = Array.isArray(data?.categories)
          ? data.categories
              .filter((c: any) => c?.disabled !== true)
              .map((c: any) => (typeof c?.name === "string" ? c.name.trim() : ""))
              .filter((name: string) => name !== "")
          : [];

        if (!data?.success) {
          throw new Error("Failed to load categories");
        }
        if (cancelled) return;

        // If the response was successful but every category is disabled,
        // use an empty list (do not fall back to STOREFRONT_CATEGORIES).
        setCategoryNames(names);
        // A ?category= value that is not in the enabled list is reset to "All".
        setSelectedCategory((current) =>
          current === "All" || names.includes(current) ? current : "All"
        );
      } catch {
        if (cancelled) return;

        // Fallback pills stay; validate the ?category= param against the
        // known product categories (filter logic unchanged).
        setSelectedCategory((current) =>
          current === "All" || (PRODUCT_CATEGORIES as readonly string[]).includes(current)
            ? current
            : "All"
        );
      }
    };

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedGender]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  // Sorting
  const sortedProducts = [...products].sort((a, b) => {
    const priceA = getChargedPrice(a);
    const priceB = getChargedPrice(b);
    const nameA = (a.name || a.title || "").toLowerCase();
    const nameB = (b.name || b.title || "").toLowerCase();

    if (sortBy === "price-low") return priceA - priceB;
    if (sortBy === "price-high") return priceB - priceA;
    if (sortBy === "name-asc") return nameA.localeCompare(nameB);
    return 0;
  });

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Top Header / Navigation */}
      <SiteHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B]">
            Inventory
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-wide text-white">
            Shop all
          </h1>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
          {/* Category & Gender Pills */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <div className="flex items-center gap-2 whitespace-nowrap">
              {["All", ...categoryNames].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center justify-center min-h-11 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-white text-black shadow-md"
                      : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Gender Pills */}
            <div className="flex items-center gap-2 whitespace-nowrap border-l border-neutral-800 pl-4">
              {["All", ...STOREFRONT_GENDERS].map((gender) => (
                <button
                  key={gender}
                  onClick={() => setSelectedGender(gender)}
                  className={`inline-flex items-center justify-center min-h-11 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    selectedGender === gender
                      ? "bg-white text-black shadow-md"
                      : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
              />
              <svg
                className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-white"
            >
              <option value="default">Sort by: Default</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-asc">Name: A-Z</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-neutral-900/60 rounded-xl p-4 border border-neutral-800 animate-pulse space-y-3">
                <div className="w-full h-48 bg-neutral-800 rounded-lg"></div>
                <div className="h-4 bg-neutral-800 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <p className="text-white font-semibold mb-2">Error loading products</p>
            <p className="text-xs text-neutral-400 mb-4">{error}</p>
            <button
              onClick={fetchProducts}
              className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/40 rounded-2xl border border-neutral-800">
            <svg
              className="w-12 h-12 text-neutral-600 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-neutral-300 font-medium text-sm">No products found in Firestore</p>
            <p className="text-xs text-neutral-500 mt-1">Try selecting a different category or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => {
              const displayImage = product.mainImageUrl || product.imageUrl || product.image || (product.images && product.images[0]?.imageUrl) || "";
              const priceNumber = Number(product.price) || 0;
              const formattedPrice = `₱${priceNumber.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
              const discounted = hasValidDiscount(Number(product.price), product.discountPrice);
              const chargedPriceNumber = getChargedPrice(product);
              const formattedChargedPrice = `₱${chargedPriceNumber.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
              const isSized = !!product.sizeSystem;
              const hasSelectableSize =
                isSized && (product.sizes ?? []).some((size) => size.active && size.stock > 0);

              return (
                <div
                  key={product.id}
                  className="group bg-neutral-900/60 rounded-xl border border-neutral-800 overflow-hidden hover:border-neutral-500 hover:shadow-xl hover:shadow-neutral-900 transition-all duration-300 flex flex-col"
                >
                  {/* Product Image Container */}
                  <div className="relative w-full h-52 bg-black flex items-center justify-center overflow-hidden">
                    <Link href={`/shop/${product.id}`} className="w-full h-full flex items-center justify-center">
                      {displayImage && displayImage.startsWith("http") ? (
                        <img
                          src={displayImage}
                          alt={product.name || product.title || "Product"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-600">
                          <svg className="w-12 h-12 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[10px] text-neutral-500">LAZAROPH Genuine Product</span>
                        </div>
                      )}
                    </Link>

                    {/* Category Badge */}
                    <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-neutral-700 text-neutral-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {product.category || "Sneakers"}
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {product.brand && (
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                          {product.brand}
                        </p>
                      )}
                      <Link href={`/shop/${product.id}`} className="block">
                        <h3 className="text-sm font-semibold text-white group-hover:text-neutral-300 transition-colors line-clamp-2">
                          {product.name || product.title || "Untitled Product"}
                        </h3>
                      </Link>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-neutral-400 block uppercase font-medium">Price</span>
                        {discounted ? (
                          <span className="text-base font-extrabold text-white">
                            {formattedChargedPrice}{" "}
                            <span className="text-xs font-normal text-neutral-500 line-through ml-1">{formattedPrice}</span>
                          </span>
                        ) : (
                          <span className="text-base font-extrabold text-white">{formattedPrice}</span>
                        )}
                      </div>

                      {isSized ? (
                        hasSelectableSize ? (
                          <Link
                            href={`/shop/${product.id}`}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors shadow-sm"
                          >
                            Select size
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-500 text-xs font-bold cursor-not-allowed"
                          >
                            Sold out
                          </button>
                        )
                      ) : (
                        <button
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors shadow-sm"
                          onClick={() => {
                            addToCart({
                              id: product.id,
                              name: product.name || product.title || "Untitled Product",
                              price: getChargedPrice(product),
                              imageUrl: displayImage
                            });
                          }}
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}

