import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative w-full min-h-[560px] flex flex-col items-center justify-center text-center bg-[#0A0A0A] text-white overflow-hidden py-20 lg:py-28">
      {/* Centered hero content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        {/* Logo on a white tile so the black artwork shows */}
        <div className="bg-white rounded-2xl p-6">
          <img
            src="/images/logo.png"
            alt="LAZAROPH"
            className="h-[120px] sm:h-[160px] w-auto max-w-full object-contain"
          />
        </div>

        {/* Eyebrow with thin rules on each side */}
        <div className="mt-8 flex items-center justify-center gap-4 w-full max-w-xs text-xs font-bold uppercase tracking-widest text-[#B3B3B3]">
          <span className="h-px flex-1 bg-white/20" />
          <span className="whitespace-nowrap">EST. 2016 • MARIKINA</span>
          <span className="h-px flex-1 bg-white/20" />
        </div>

        {/* Headline in bold uppercase */}
        <h1 className="mt-6 max-w-3xl text-[30px] sm:text-[48px] lg:text-[60px] font-black uppercase tracking-wide leading-[1.15] text-white">
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
            className="inline-flex w-full sm:w-auto min-h-11 items-center justify-center rounded-xl bg-white px-8 py-3 text-sm font-black uppercase tracking-widest text-[#0A0A0A] hover:bg-white/90 transition-colors"
          >
            Shop now
          </Link>
          <Link
            href="/shop"
            className="inline-flex w-full sm:w-auto min-h-11 items-center justify-center rounded-xl border border-white px-8 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
          >
            Explore categories
          </Link>
        </div>
      </div>
    </section>
  );
}
