"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import AuthMenu from "@/components/AuthMenu";
import { hasValidDiscount, getChargedPrice, SIZE_SYSTEM_NAMES } from "@/lib/product";

interface Product {
  id: string;
  name?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  gender?: string;
  sku?: string;
  price?: number | string;
  discountPrice?: number | null;
  description?: string;
  keyFeatures?: string[];
  materials?: string;
  careInstructions?: string;
  imageUrl?: string;
  images?: { imageUrl: string; isMain?: boolean }[];
  sizeSystem?: string;
  sizes?: Array<{ label: string; active: boolean; stock: number }>;
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { addToCart, cartCount } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Fetch the product exclusively through the API Route Handler
  // (/api/products/[id]). AGENTS.md Rule #1: no direct Firestore calls in client components.
  const fetchProduct = async () => {
    try {
      setLoading(true);
      setNotFound(false);

      const res = await fetch(`/api/products/${params.id}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setNotFound(true);
        return;
      }

      setProduct(data.product);
      setSelectedImage(data.product?.imageUrl || data.product?.images?.[0]?.imageUrl || "");
    } catch (err: any) {
      console.error("Error fetching product:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  // Price display
  const priceNumber = Number(product?.price) || 0;
  const formattedPrice = `₱${priceNumber.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  const discounted = hasValidDiscount(Number(product?.price), product?.discountPrice);
  const formattedChargedPrice = `₱${getChargedPrice(product).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  const galleryImages = product?.images?.slice(0, 4) ?? [];
  const mainImage = selectedImage || product?.imageUrl || galleryImages[0]?.imageUrl || "";

  // Size selection (only for sized products; legacy products have no sizeSystem).
  const isSized = !!product?.sizeSystem;
  const activeSizes = isSized ? (product?.sizes ?? []).filter((size) => size.active) : [];
  const hasSelectableSize = activeSizes.some((size) => size.stock > 0);
  const selectedSizeStock = activeSizes.find((size) => size.label === selectedSize)?.stock ?? 0;
  const sizeSystemName = product?.sizeSystem
    ? SIZE_SYSTEM_NAMES[product.sizeSystem as keyof typeof SIZE_SYSTEM_NAMES] ?? product.sizeSystem
    : "";

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/90 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/shop" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-white text-black font-black flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <span className="text-lg">L</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-neutral-300 transition-colors">
                LAZAROPH <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">v2</span>
              </span>
              <p className="text-[10px] text-neutral-400 hidden sm:block">AUTHENTIC. LEGIT. BELOW MARKET PRICE.</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/shop"
              className="hidden sm:inline-flex text-xs font-bold px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors shadow-sm"
            >
              Public Catalog
            </Link>
            <Link href="/cart" className="relative p-2 text-white hover:text-neutral-300 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            <AuthMenu />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to shop
        </Link>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
            <div className="space-y-3">
              <div className="w-full h-96 bg-neutral-900/60 rounded-xl border border-neutral-800"></div>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-full h-20 bg-neutral-900/60 rounded-lg border border-neutral-800"></div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-neutral-900/60 rounded w-1/3"></div>
              <div className="h-7 bg-neutral-900/60 rounded w-3/4"></div>
              <div className="h-4 bg-neutral-900/60 rounded w-1/4"></div>
              <div className="h-6 bg-neutral-900/60 rounded w-1/2"></div>
            </div>
          </div>
        ) : notFound || !product ? (
          <div className="text-center py-20 bg-neutral-900/40 rounded-2xl border border-neutral-800">
            <svg
              className="w-12 h-12 text-neutral-600 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-neutral-300 font-medium text-sm">Product not found</p>
            <p className="text-xs text-neutral-500 mt-1">This product may have been removed or is no longer available.</p>
            <Link
              href="/shop"
              className="inline-block mt-4 px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors"
            >
              Back to shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gallery */}
            <div>
              <div className="relative w-full h-80 sm:h-96 bg-neutral-900/60 rounded-xl border border-neutral-800 overflow-hidden flex items-center justify-center">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={product.name || "Product"}
                    className="w-full h-full object-cover"
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

                {product.category && (
                  <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-neutral-700 text-neutral-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {product.category}
                  </span>
                )}
              </div>

              {galleryImages.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {galleryImages.map((img, i) => {
                    const active = img.imageUrl === mainImage;
                    return (
                      <button
                        key={`${img.imageUrl}-${i}`}
                        type="button"
                        onClick={() => setSelectedImage(img.imageUrl)}
                        className={`w-full h-20 rounded-lg overflow-hidden bg-black border transition-colors ${
                          active ? "border-white" : "border-neutral-800 hover:border-neutral-500"
                        }`}
                      >
                        <img
                          src={img.imageUrl}
                          alt={`${product.name || "Product"} view ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col">
              {product.brand && (
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                  {product.brand}
                </p>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {product.name || "Untitled Product"}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                {product.sku && (
                  <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                    SKU: {product.sku}
                  </span>
                )}
                {product.gender && (
                  <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                    {product.gender}
                  </span>
                )}
                {product.subcategory && (
                  <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                    {product.subcategory}
                  </span>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-800">
                <span className="text-[10px] text-neutral-400 block uppercase font-medium mb-1">Price</span>
                {discounted ? (
                  <span className="text-2xl font-extrabold text-white">
                    {formattedChargedPrice}{" "}
                    <span className="text-sm font-normal text-neutral-500 line-through ml-1">{formattedPrice}</span>
                  </span>
                ) : (
                  <span className="text-2xl font-extrabold text-white">{formattedPrice}</span>
                )}
              </div>

              {isSized && (
                <div className="mt-6 pt-4 border-t border-neutral-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">
                      Select size
                    </span>
                    {sizeSystemName && (
                      <span className="text-xs text-neutral-500">{sizeSystemName}</span>
                    )}
                  </div>

                  {hasSelectableSize ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                      {activeSizes.map((size) => {
                        const outOfStock = size.stock <= 0;
                        const selected = size.label === selectedSize;
                        return (
                          <button
                            key={size.label}
                            type="button"
                            disabled={outOfStock}
                            onClick={() => setSelectedSize(size.label)}
                            className={`min-h-11 text-sm font-semibold text-center rounded-lg border transition-colors ${
                              selected
                                ? "bg-white text-black border-white"
                                : outOfStock
                                ? "border-neutral-800 text-neutral-600 line-through cursor-not-allowed"
                                : "border-neutral-700 text-neutral-200 hover:border-neutral-500 hover:text-white"
                            }`}
                          >
                            {size.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-red-500">Sold out</p>
                  )}

                  {selectedSizeStock > 0 && selectedSizeStock <= 5 && (
                    <p className="mt-2 text-sm text-neutral-400">Only {selectedSizeStock} left</p>
                  )}
                </div>
              )}

              {isSized ? (
                <>
                  {hasSelectableSize && !selectedSize && (
                    <p className="mt-4 text-sm text-neutral-500">Please select a size</p>
                  )}
                  <button
                    className="mt-6 w-full sm:w-auto px-6 py-3 rounded-lg bg-white text-black text-sm font-bold transition-colors shadow-sm enabled:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!selectedSize || selectedSizeStock <= 0}
                    onClick={() => {
                      addToCart({
                        id: product.id,
                        name: product.name || "Untitled Product",
                        price: getChargedPrice(product),
                        imageUrl: product.imageUrl || galleryImages[0]?.imageUrl || "",
                        size: selectedSize,
                      });
                    }}
                  >
                    {hasSelectableSize ? "Add to Cart" : "Sold out"}
                  </button>
                </>
              ) : (
                <button
                  className="mt-6 w-full sm:w-auto px-6 py-3 rounded-lg bg-white hover:bg-neutral-200 text-black text-sm font-bold transition-colors shadow-sm"
                  onClick={() => {
                    addToCart({
                      id: product.id,
                      name: product.name || "Untitled Product",
                      price: getChargedPrice(product),
                      imageUrl: product.imageUrl || galleryImages[0]?.imageUrl || "",
                    });
                  }}
                >
                  Add to Cart
                </button>
              )}

              {/* Description */}
              {product.description && (
                <section className="mt-8">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-300 mb-2">Description</h2>
                  <p className="text-sm text-neutral-400 whitespace-pre-line">{product.description}</p>
                </section>
              )}

              {/* Key Features */}
              {Array.isArray(product.keyFeatures) && product.keyFeatures.length > 0 && (
                <section className="mt-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-300 mb-2">Key Features</h2>
                  <ul className="list-disc list-inside space-y-1 text-sm text-neutral-400">
                    {product.keyFeatures.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Materials */}
              {product.materials && (
                <section className="mt-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-300 mb-2">Materials</h2>
                  <p className="text-sm text-neutral-400 whitespace-pre-line">{product.materials}</p>
                </section>
              )}

              {/* Care Instructions */}
              {product.careInstructions && (
                <section className="mt-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-300 mb-2">Care Instructions</h2>
                  <p className="text-sm text-neutral-400 whitespace-pre-line">{product.careInstructions}</p>
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-800 bg-black py-6 text-center text-xs text-neutral-500">
        <p>© 2026 LAZAROPH — AUTHENTIC. LEGIT. BELOW MARKET PRICE. Retail Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
