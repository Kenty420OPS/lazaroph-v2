import Link from "next/link";
import type { ReactNode } from "react";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { getPublicCategories, type PublicCategory } from "@/lib/categories-server";
import { getBranch, DEFAULT_PICKUP_BRANCH_ID } from "@/lib/branches";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import BrandTiles from "@/components/home/BrandTiles";
import ProductSections from "@/components/home/ProductSections";

export const dynamic = "force-dynamic";

// Black and white only: sections alternate between #0A0A0A and #FFFFFF, body
// copy is #6B6B6B on white and #B3B3B3 on black.
const TRUST_POINTS: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "100% Authentic",
    body: "Every item is checked for authenticity before it leaves us.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    title: "Below Market Price",
    body: "Original sneakers, bags and watches priced under standard retail.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
    ),
  },
  {
    title: "Nationwide Delivery",
    body: "LBC across the Philippines, Lalamove in Metro Manila, or store pickup.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
        />
      </svg>
    ),
  },
  {
    title: "Track Your Order",
    body: "Follow your order from confirmation all the way to delivery.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
];

export default async function Home() {
  let categories: PublicCategory[];

  try {
    categories = await getPublicCategories();
  } catch (error) {
    console.error("Home: failed to load categories:", error);
    categories = DEFAULT_CATEGORIES;
  }

  // The homepage only shows the categories the admin left enabled. The managed
  // image, tagline and homepage toggle all come from the category document.
  const homepageCategories = categories.filter(
    (cat) => cat.disabled !== true && cat.showOnHomepage !== false
  );

  const branch = getBranch(DEFAULT_PICKUP_BRANCH_ID);

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A] font-sans selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — black */}
        <section className="bg-[#0A0A0A] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col items-center text-center">
            <div className="bg-white rounded-2xl p-6 sm:p-8">
              <img src="/images/logo.png" alt="LAZAROPH" className="h-24 sm:h-36 w-auto max-w-full object-contain" />
            </div>

            <h1 className="mt-8 max-w-3xl text-3xl sm:text-5xl font-black uppercase tracking-wide leading-tight">
              Authentic. Legit. Below Market Price.
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#B3B3B3] leading-relaxed">
              Original sneakers, premium bags and luggage, and luxury watches — curated,
              verified, and priced below market.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-8 py-3 text-sm font-black uppercase tracking-widest text-[#0A0A0A] hover:bg-white/90 transition-colors"
              >
                Shop now
              </Link>
              <Link
                href="/track-order"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/40 px-8 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
              >
                Track order
              </Link>
            </div>
          </div>
        </section>

        {/* Trust points — white */}
        <section className="bg-white text-[#0A0A0A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6B6B6B]">
              Why shop here
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-wide">
              The LAZAROPH promise
            </h2>

            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {TRUST_POINTS.map((point) => (
                <div key={point.title} className="flex flex-col gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A0A0A] text-white">
                    {point.icon}
                  </span>
                  <h3 className="text-lg font-black uppercase tracking-wide">{point.title}</h3>
                  <p className="text-base leading-relaxed text-[#6B6B6B]">{point.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured categories — white */}
        {homepageCategories.length > 0 && (
          <section className="border-t border-[#0A0A0A]/10 bg-white text-[#0A0A0A]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6B6B6B]">
                Collections
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-wide">
                Featured categories
              </h2>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {homepageCategories.map((cat) => {
                  const image = cat.imageUrl ?? null;
                  // An empty tagline or blurb falls back, hence the || chain.
                  const blurb = cat.tagline || cat.blurb || `Shop ${cat.name}`;

                  return (
                    <Link
                      key={cat.id}
                      href={`/shop?category=${encodeURIComponent(cat.name)}`}
                      className="group overflow-hidden rounded-2xl border border-[#0A0A0A]/15 bg-white transition-colors hover:border-[#0A0A0A]"
                    >
                      <div className="relative flex h-52 w-full items-center justify-center overflow-hidden sm:h-56">
                        {image ? (
                          <img
                            src={image}
                            alt={cat.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#0A0A0A]">
                            <span className="text-lg font-black uppercase tracking-[0.2em] text-white">
                              {cat.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-[#0A0A0A]/15 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-bold uppercase tracking-wide text-[#0A0A0A] group-hover:underline">
                            {cat.name}
                          </h3>
                          <span className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] px-3 text-sm font-bold text-white">
                            Shop
                          </span>
                        </div>
                        <p className="mt-2 text-base leading-relaxed text-[#6B6B6B]">{blurb}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Shop by brand — white */}
        <section className="border-t border-[#0A0A0A]/10 bg-white text-[#0A0A0A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6B6B6B]">
              Curated labels
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-wide">
              Shop by brand
            </h2>

            <div className="mt-8">
              <BrandTiles />
            </div>
          </div>
        </section>

        {/* Trending (black) + New arrivals (white) */}
        <ProductSections />

        {/* Store info — white */}
        <section className="border-t border-[#0A0A0A]/10 bg-white text-[#0A0A0A]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 items-start gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 py-14 sm:py-20">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6B6B6B]">
                Visit us
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-wide">
                Store pickup in Marikina
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#6B6B6B]">
                Order online and pick it up at our branch, have it delivered by Lalamove anywhere
                in Metro Manila, or ship anywhere in the Philippines with LBC.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/shop"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0A0A0A] px-8 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-[#0A0A0A]/90 transition-colors"
                >
                  Continue shopping
                </Link>
                <Link
                  href="/track-order"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#0A0A0A] px-8 py-3 text-sm font-black uppercase tracking-widest text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors"
                >
                  Track your order
                </Link>
              </div>
            </div>

            {branch && (
              <div className="rounded-2xl bg-[#0A0A0A] p-6 text-white sm:p-8">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#B3B3B3]">
                  Pickup branch
                </p>
                <h3 className="mt-3 text-lg font-black uppercase tracking-wide">{branch.name}</h3>
                <address className="mt-4 space-y-3 not-italic">
                  <p className="text-base leading-relaxed text-[#B3B3B3]">{branch.address}</p>
                  <p className="text-base text-[#B3B3B3]">
                    <span className="block text-xs font-bold uppercase tracking-widest text-white">
                      Hours
                    </span>
                    {branch.hours}
                  </p>
                  <p className="text-base text-[#B3B3B3]">
                    <span className="block text-xs font-bold uppercase tracking-widest text-white">
                      Phone
                    </span>
                    {branch.phone}
                  </p>
                </address>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
