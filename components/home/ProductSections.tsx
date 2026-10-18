"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { getChargedPrice, getCoverUrl, hasValidDiscount } from "@/lib/product";

// Trending + New arrivals on the homepage. Both rails come from the existing
// public catalog route (/api/products) with a single fetch — no direct
// Firestore access from the client (AGENTS.md Rule #1).

interface HomeProduct {
  id: string;
  name?: string;
  title?: string;
  price?: number | string;
  discountPrice?: number | null;
  category?: string;
  brand?: string;
  createdAt?: string;
  mainImageUrl?: string;
  imageUrl?: string;
  image?: string;
  images?: { imageUrl: string; isMain?: boolean }[];
}

const RAIL_LIMIT = 8;

function formatPrice(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

// Newest first when createdAt is present; docs without it keep their order
// (same comparator the admin product list uses).
function byNewestFirst(a: HomeProduct, b: HomeProduct): number {
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : NaN;
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : NaN;
  const aValid = !Number.isNaN(aTime);
  const bValid = !Number.isNaN(bTime);
  if (!aValid && !bValid) return 0;
  if (!aValid) return 1;
  if (!bValid) return -1;
  return bTime - aTime;
}

function ProductCard({ product }: { product: HomeProduct }) {
  const cover = getCoverUrl(product);
  const price = Number(product.price) || 0;
  const discounted = hasValidDiscount(price, product.discountPrice);
  const charged = getChargedPrice(product);
  const title = product.name || product.title || "Untitled Product";

  return (
    <Link
      href={`/shop/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[#0A0A0A]/10 bg-white hover:border-[#0A0A0A] transition-colors"
    >
      <div className="relative w-full aspect-square bg-white overflow-hidden flex items-center justify-center">
        {cover && cover.startsWith("http") ? (
          <img
            src={cover}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B]">
            LAZAROPH
          </span>
        )}
        {product.category && (
          <span className="absolute top-2 left-2 bg-[#0A0A0A] text-white text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md">
            {product.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.brand && (
          <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] mb-1">
            {product.brand}
          </p>
        )}
        <h3 className="text-base font-semibold leading-snug text-[#0A0A0A] line-clamp-2">
          {title}
        </h3>

        <div className="mt-auto pt-3">
          <span className="block text-base font-black text-[#0A0A0A]">
            {formatPrice(charged)}
          </span>
          {discounted && (
            <span className="block text-xs text-[#6B6B6B] line-through">
              {formatPrice(price)}
            </span>
          )}
          <span className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg bg-[#0A0A0A] px-3 text-sm font-bold text-white">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}

function RailSection({
  tone,
  eyebrow,
  title,
  children,
}: {
  tone: "dark" | "light";
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const dark = tone === "dark";

  return (
    <section className={dark ? "bg-[#0A0A0A] text-white" : "bg-white text-[#0A0A0A]"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className={`text-sm font-bold uppercase tracking-[0.25em] ${
                dark ? "text-[#B3B3B3]" : "text-[#6B6B6B]"
              }`}
            >
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-wide">
              {title}
            </h2>
          </div>
          <Link
            href="/shop"
            className={`inline-flex items-center min-h-11 px-5 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors ${
              dark
                ? "bg-white text-black hover:bg-white/90"
                : "bg-[#0A0A0A] text-white hover:bg-[#0A0A0A]/90"
            }`}
          >
            View all
          </Link>
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function CardSkeleton({ dark }: { dark: boolean }) {
  return (
    <div
      className={`rounded-xl border animate-pulse ${
        dark ? "border-white/10 bg-white/5" : "border-[#0A0A0A]/10 bg-[#0A0A0A]/5"
      }`}
    >
      <div className={`w-full aspect-square ${dark ? "bg-white/10" : "bg-[#0A0A0A]/10"}`} />
      <div className="p-3 sm:p-4 space-y-2">
        <div className={`h-4 w-2/3 rounded ${dark ? "bg-white/10" : "bg-[#0A0A0A]/10"}`} />
        <div className={`h-4 w-1/3 rounded ${dark ? "bg-white/10" : "bg-[#0A0A0A]/10"}`} />
      </div>
    </div>
  );
}

export default function ProductSections() {
  const [products, setProducts] = useState<HomeProduct[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (cancelled) return;
        setProducts(data?.success && Array.isArray(data.products) ? data.products : []);
      } catch {
        if (cancelled) return;
        setProducts([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = products === null;
  const trending = loading ? [] : products.slice(0, RAIL_LIMIT);
  const newArrivals = loading ? [] : [...products].sort(byNewestFirst).slice(0, RAIL_LIMIT);

  const grid = (items: HomeProduct[], dark: boolean, emptyText: string) => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} dark={dark} />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <p className={`text-base ${dark ? "text-[#B3B3B3]" : "text-[#6B6B6B]"}`}>{emptyText}</p>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  };

  return (
    <>
      <RailSection tone="dark" eyebrow="Popular right now" title="Trending now">
        {grid(trending, true, "Trending pieces land here as soon as they drop.")}
      </RailSection>

      <RailSection tone="light" eyebrow="Fresh stock" title="New arrivals">
        {grid(newArrivals, false, "New arrivals are on the way — check back soon.")}
      </RailSection>
    </>
  );
}
