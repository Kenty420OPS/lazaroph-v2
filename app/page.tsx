import Link from "next/link";
import type { ReactNode } from "react";
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

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A] font-sans selection:bg-[#0A0A0A] selection:text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* 1. Hero — black */}
        <section className="bg-[#0A0A0A] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col items-center text-center">
            <div className="bg-white rounded-2xl p-6 sm:p-8">
              <img src="/images/logo.png" alt="LAZAROPH" className="h-24 sm:h-36 w-auto max-w-full object-contain" />
            </div>

            <div className="mt-8 flex items-center justify-center gap-4 w-full max-w-xs text-xs font-bold uppercase tracking-[0.25em] text-[#B3B3B3]">
              <span className="h-px flex-1 bg-white/20" />
              <span>EST. 2016 &nbsp; MARIKINA</span>
              <span className="h-px flex-1 bg-white/20" />
            </div>

            <h1 className="mt-6 max-w-3xl text-3xl sm:text-5xl font-black uppercase tracking-wide leading-tight">
              Authentic. Legit. Below Market Price.
            </h1>
            <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#B3B3B3] leading-relaxed">
              Original sneakers, premium bags and luggage, and luxury watches — curated,
              verified, and priced below market.
            </p>

            <div className="mt-8">
              <Link
                href="/shop"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-8 py-3 text-sm font-black uppercase tracking-widest text-[#0A0A0A] hover:bg-white/90 transition-colors"
              >
                Shop now
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Trending (black) + 3. New arrivals (white) */}
        <ProductSections />

        {/* 4. Shop by brand — white */}
        <section className="border-t border-[#0A0A0A]/10 bg-white text-[#0A0A0A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6B6B6B]">
                  Authentic houses and partners
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-wide">
                  Shop by brand
                </h2>
              </div>
              <Link
                href="/shop"
                className="inline-flex items-center min-h-11 px-5 rounded-lg text-sm font-bold uppercase tracking-widest transition-colors bg-[#0A0A0A] text-white hover:bg-[#0A0A0A]/90"
              >
                View all brands
              </Link>
            </div>

            <div className="mt-8">
              <BrandTiles />
            </div>
          </div>
        </section>

        {/* 5. Salmon installment (white box) */}
        <section className="border-t border-[#0A0A0A]/10 bg-white text-[#0A0A0A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="rounded-2xl border border-[#0A0A0A]/15 p-6 sm:p-10 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start lg:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6B6B6B]">
                    Installment financing
                  </p>
                  <div className="mt-4">
                    <img
                      src="/images/salmon-logo.png"
                      alt="Salmon"
                      className="h-8 sm:h-10 w-auto object-contain"
                    />
                  </div>
                  <h2 className="mt-4 text-2xl sm:text-3xl font-black uppercase tracking-wide">
                    Installment Financing via Salmon
                  </h2>
                  <p className="mt-3 text-base text-[#6B6B6B] leading-relaxed">
                    Walk in to our store for the approval process.
                  </p>
                </div>

                <div className="border-t border-[#0A0A0A]/10 pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:border-[#0A0A0A]/10 lg:pl-10">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A0A0A]">
                    Bring:
                  </h3>
                  <ul className="mt-4 space-y-3">
                    <li className="flex items-center gap-3 text-base text-[#0A0A0A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] shrink-0" />
                      <span>Download the Salmon app</span>
                    </li>
                    <li className="flex items-center gap-3 text-base text-[#0A0A0A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] shrink-0" />
                      <span>2 valid IDs</span>
                    </li>
                    <li className="flex items-center gap-3 text-base text-[#0A0A0A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] shrink-0" />
                      <span>2 contact references</span>
                    </li>
                    <li className="flex items-center gap-3 text-base text-[#0A0A0A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] shrink-0" />
                      <span>Must be GCash verified</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. The Lazaroph promise (black) */}
        <section className="bg-[#0A0A0A] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#B3B3B3]">
              Why shop here
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-wide">
              The LAZAROPH promise
            </h2>

            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {TRUST_POINTS.map((point) => (
                <div key={point.title} className="flex flex-col gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#0A0A0A]">
                    {point.icon}
                  </span>
                  <h3 className="text-lg font-black uppercase tracking-wide">{point.title}</h3>
                  <p className="text-base leading-relaxed text-[#B3B3B3]">{point.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer (black) */}
      <SiteFooter />
    </div>
  );
}
