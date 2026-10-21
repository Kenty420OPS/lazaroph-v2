"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// "Shop by brand" tiles. Brands come from the existing public brand route
// (/api/brands). Older catalogs kept brand names free-text on the product
// itself, so when the managed list is empty we fall back to the distinct
// brands on live products (/api/products). No direct Firestore access (Rule #1).

interface BrandTile {
  id: string;
  name: string;
  // Optional: present when an admin uploaded a logo through the admin Brands
  // page (public GET /api/brands). Legacy product-derived brands have none.
  logoUrl?: string | null;
}

// "New Balance" -> "new-balance". Logo files under /images/brands are named
// with this slug (anta.png, new-balance.png, ...).
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// One brand tile. Shows the uploaded brand logo (logoUrl from the admin
// Brands page) when there is one; otherwise the static
// /images/brands/{slug}.png file. If the src 404s (onError) it steps down the
// chain — logoUrl -> static file -> brand name as text.
function BrandTileLink({ brand }: { brand: BrandTile }) {
  const [stage, setStage] = useState<0 | 1 | 2>(brand.logoUrl ? 0 : 1);
  const slugSrc = `/images/brands/${slugify(brand.name)}.png`;
  const src = stage === 0 && brand.logoUrl ? brand.logoUrl : slugSrc;

  return (
    <Link
      href={`/shop?brand=${encodeURIComponent(brand.name)}`}
      className="group flex items-center justify-center min-h-16 px-4 py-4 rounded-xl border border-[#0A0A0A] bg-white text-center hover:bg-[#0A0A0A] transition-colors"
    >
      {stage < 2 ? (
        // Black logo on white; inverted to white on hover to match the tile.
        <img
          key={src}
          src={src}
          alt={brand.name}
          onError={() => setStage((s) => (s === 0 && brand.logoUrl ? 1 : 2))}
          className="max-h-10 max-w-[80%] object-contain group-hover:invert transition-[filter]"
        />
      ) : (
        <span className="text-sm font-black uppercase tracking-widest break-words text-[#0A0A0A] group-hover:text-white transition-colors">
          {brand.name}
        </span>
      )}
    </Link>
  );
}

export default function BrandTiles() {
  const [brands, setBrands] = useState<BrandTile[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/brands");
        const data = await res.json();
        if (cancelled) return;

        let list: BrandTile[] =
          data?.success && Array.isArray(data.brands)
            ? data.brands.filter((b: any) => b && typeof b.name === "string" && b.name.trim() !== "")
            : [];

        // Legacy products may carry brand names that were never added to the
        // managed list — surface those too so the section is never needlessly
        // empty.
        if (list.length === 0) {
          const productRes = await fetch("/api/products");
          const productData = await productRes.json();
          if (cancelled) return;

          if (productData?.success && Array.isArray(productData.products)) {
            const seen = new Map<string, string>();
            for (const p of productData.products) {
              const raw = typeof p?.brand === "string" ? p.brand.trim() : "";
              if (!raw) continue;
              const key = raw.toLowerCase();
              if (!seen.has(key)) seen.set(key, raw);
            }
            list = Array.from(seen.entries())
              .sort((a, b) => a[1].toLowerCase().localeCompare(b[1].toLowerCase()))
              .map(([id, name]) => ({ id, name }));
          }
        }

        setBrands(list);
      } catch {
        if (!cancelled) setBrands([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (brands === null) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl border border-[#0A0A0A]/10 bg-[#0A0A0A]/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <p className="text-base text-[#6B6B6B]">
        Brand list is being curated — new labels are added every week.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {brands.map((brand) => (
        <BrandTileLink key={brand.id} brand={brand} />
      ))}
    </div>
  );
}
