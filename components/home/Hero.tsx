"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCoverUrl } from "@/lib/product";

export default function Hero() {
  const [coverImage, setCoverImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCover = async () => {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (cancelled) return;

        if (data?.success && Array.isArray(data.products)) {
          for (const product of data.products) {
            const url = getCoverUrl(product);
            if (url && typeof url === "string" && url.trim() !== "") {
              setCoverImage(url);
              break;
            }
          }
        }
      } catch {
        // Fall back to plain black if request fails
      }
    };

    loadCover();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative w-full min-h-[560px] lg:min-h-[80vh] flex flex-col items-center justify-center text-center bg-[#0A0A0A] text-white overflow-hidden">
      {/* Background cover image with grayscale & 60% black overlay */}
      {coverImage && (
        <>
          <img
            src={coverImage}
            alt="Hero product background"
            className="absolute inset-0 w-full h-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}

      {/* Centered hero content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center text-center">
        {/* Eyebrow with thin rules on each side */}
        <div className="flex items-center justify-center gap-4 w-full max-w-xs text-xs font-bold uppercase tracking-[0.25em] text-[#B3B3B3]">
          <span className="h-px flex-1 bg-white/20" />
          <span>EST. 2016 &nbsp; MARIKINA</span>
          <span className="h-px flex-1 bg-white/20" />
        </div>

        {/* Headline in bold uppercase */}
        <h1 className="mt-6 max-w-3xl text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-wide leading-tight text-white">
          Authentic. Legit. Below Market Price.
        </h1>

        {/* Subline */}
        <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#B3B3B3] leading-relaxed">
          Original sneakers, premium bags and luggage, and luxury watches — curated,
          verified, and priced below market.
        </p>

        {/* Action buttons */}
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row justify-center">
          <Link
            href="/shop"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-8 py-3 text-sm font-black uppercase tracking-widest text-[#0A0A0A] hover:bg-white/90 transition-colors"
          >
            Shop now
          </Link>
          <Link
            href="/shop"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white px-8 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
          >
            Explore categories
          </Link>
        </div>
      </div>
    </section>
  );
}
