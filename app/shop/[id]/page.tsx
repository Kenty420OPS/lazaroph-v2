"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
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
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [productRatings, setProductRatings] = useState<Record<string, { average: number; count: number }>>({});

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

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.ratings) setProductRatings(data.ratings);
      })
      .catch(() => {});
  }, []);

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
    <div className="min-h-screen bg-white text-[#0A0A0A] flex flex-col font-sans selection:bg-[#0A0A0A] selection:text-white">
      {/* Top Header / Navigation */}
      <SiteHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white text-[#0A0A0A]">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 min-h-11 text-xs font-bold text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to shop
        </Link>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
            <div className="space-y-3">
              <div className="w-full h-96 bg-[#0A0A0A]/5 rounded-xl border border-[#0A0A0A]/10"></div>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-full h-20 bg-[#0A0A0A]/5 rounded-lg border border-[#0A0A0A]/10"></div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-[#0A0A0A]/10 rounded w-1/3"></div>
              <div className="h-7 bg-[#0A0A0A]/10 rounded w-3/4"></div>
              <div className="h-4 bg-[#0A0A0A]/10 rounded w-1/4"></div>
              <div className="h-6 bg-[#0A0A0A]/10 rounded w-1/2"></div>
            </div>
          </div>
        ) : notFound || !product ? (
          <div className="text-center py-20 bg-[#0A0A0A]/5 rounded-2xl border border-[#0A0A0A]/10">
            <svg
              className="w-12 h-12 text-[#6B6B6B] mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-[#6B6B6B] font-medium text-sm">Product not found</p>
            <p className="text-xs text-[#6B6B6B] mt-1">This product may have been removed or is no longer available.</p>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center min-h-11 mt-4 px-4 py-2 bg-[#0A0A0A] text-white rounded-lg text-xs font-bold hover:bg-[#0A0A0A]/90 transition-colors"
            >
              Back to shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gallery */}
            <div>
              <div className="relative w-full h-80 sm:h-96 bg-white rounded-xl border border-[#0A0A0A]/10 overflow-hidden flex items-center justify-center">
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
                  <div className="flex flex-col items-center justify-center text-[#6B6B6B]">
                    <svg className="w-12 h-12 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] text-[#6B6B6B]">LAZAROPH Genuine Product</span>
                  </div>
                )}

                {product.category && (
                  <span className="absolute top-3 left-3 bg-[#0A0A0A] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
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
                        className={`w-full h-20 rounded-lg overflow-hidden bg-white border transition-colors ${
                          active ? "border-[#0A0A0A]" : "border-[#0A0A0A]/20 hover:border-[#0A0A0A]/40"
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
                <p className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-widest mb-1">
                  {product.brand}
                </p>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
                {product.name || "Untitled Product"}
              </h1>
              {product.id && productRatings[product.id] && productRatings[product.id].count > 0 && (
                <p className="mt-1 text-xs text-[#6B6B6B]">
                  &#9733; {productRatings[product.id].average} ({productRatings[product.id].count} rating{productRatings[product.id].count !== 1 ? "s" : ""})
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#6B6B6B]">
                {product.sku && (
                  <span className="px-2 py-0.5 rounded bg-white border border-[#0A0A0A]/20 text-[#0A0A0A]">
                    SKU: {product.sku}
                  </span>
                )}
                {product.gender && (
                  <span className="px-2 py-0.5 rounded bg-white border border-[#0A0A0A]/20 text-[#0A0A0A]">
                    {product.gender}
                  </span>
                )}
                {product.subcategory && (
                  <span className="px-2 py-0.5 rounded bg-white border border-[#0A0A0A]/20 text-[#0A0A0A]">
                    {product.subcategory}
                  </span>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#0A0A0A]/10">
                <span className="text-[10px] text-[#6B6B6B] block uppercase font-medium mb-1">Price</span>
                {discounted ? (
                  <span className="text-2xl font-extrabold text-[#0A0A0A]">
                    {formattedChargedPrice}{" "}
                    <span className="text-sm font-normal text-[#6B6B6B] line-through ml-1">{formattedPrice}</span>
                  </span>
                ) : (
                  <span className="text-2xl font-extrabold text-[#0A0A0A]">{formattedPrice}</span>
                )}
              </div>

              {isSized && (
                <div className="mt-6 pt-4 border-t border-[#0A0A0A]/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A]">
                      Select size
                    </span>
                    {sizeSystemName && (
                      <span className="text-xs text-[#6B6B6B]">{sizeSystemName}</span>
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
                                ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                                : outOfStock
                                ? "border-[#0A0A0A]/20 text-[#6B6B6B] line-through cursor-not-allowed"
                                : "border-[#0A0A0A]/20 text-[#0A0A0A] hover:border-[#0A0A0A]/40 hover:text-[#0A0A0A]"
                            }`}
                          >
                            {size.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-[#6B6B6B]">Sold out</p>
                  )}

                  {selectedSizeStock > 0 && selectedSizeStock <= 5 && (
                    <p className="mt-2 text-sm text-[#6B6B6B]">Only {selectedSizeStock} left</p>
                  )}
                </div>
              )}

              {isSized ? (
                <>
                  {hasSelectableSize && !selectedSize && (
                    <p className="mt-4 text-sm text-[#6B6B6B]">Please select a size</p>
                  )}
                  <button
                    className="mt-6 w-full sm:w-auto min-h-11 px-6 py-3 rounded-lg bg-[#0A0A0A] text-white text-sm font-bold transition-colors shadow-sm enabled:hover:bg-[#0A0A0A]/90 disabled:bg-[#0A0A0A]/30 disabled:text-white disabled:cursor-not-allowed"
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
                  className="mt-6 w-full sm:w-auto min-h-11 px-6 py-3 rounded-lg bg-[#0A0A0A] hover:bg-[#0A0A0A]/90 text-white text-sm font-bold transition-colors shadow-sm"
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
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A] mb-2">Description</h2>
                  <p className="text-sm text-[#6B6B6B] whitespace-pre-line">{product.description}</p>
                </section>
              )}

              {/* Key Features */}
              {Array.isArray(product.keyFeatures) && product.keyFeatures.length > 0 && (
                <section className="mt-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A] mb-2">Key Features</h2>
                  <ul className="list-disc list-inside space-y-1 text-sm text-[#6B6B6B]">
                    {product.keyFeatures.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Materials */}
              {product.materials && (
                <section className="mt-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A] mb-2">Materials</h2>
                  <p className="text-sm text-[#6B6B6B] whitespace-pre-line">{product.materials}</p>
                </section>
              )}

              {/* Care Instructions */}
              {product.careInstructions && (
                <section className="mt-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#0A0A0A] mb-2">Care Instructions</h2>
                  <p className="text-sm text-[#6B6B6B] whitespace-pre-line">{product.careInstructions}</p>
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
