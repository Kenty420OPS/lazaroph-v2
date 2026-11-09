import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LAZAROPH — Coming Soon",
  description: "Authentic. Legit. Below market price.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function ComingSoonPage() {
  return (
    <main className="fixed inset-0 z-[99999] flex min-h-[100dvh] flex-col items-center justify-center bg-[#0A0A0A] px-6 py-12 text-center text-white select-none pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-[calc(3rem+env(safe-area-inset-bottom,0px))] pl-[calc(1.5rem+env(safe-area-inset-left,0px))] pr-[calc(1.5rem+env(safe-area-inset-right,0px))]">
      <div className="flex flex-col items-center max-w-lg mx-auto">
        {/* Logo tile + Wordmark */}
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl p-4 sm:p-5 shadow-2xl">
            <img
              src="/images/logo.png"
              alt="LAZAROPH"
              className="h-16 w-auto sm:h-20 object-contain rounded-full"
            />
          </div>
          <span className="text-xl sm:text-2xl font-black tracking-[0.25em] text-white">
            LAZAROPH
          </span>
        </div>

        {/* Eyebrow */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className="h-px w-6 sm:w-10 bg-white/20" aria-hidden="true" />
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-[#B3B3B3]">
            Est. 2016 • Marikina
          </p>
          <span className="h-px w-6 sm:w-10 bg-white/20" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h1 className="mt-6 text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-tight">
          Coming soon
        </h1>

        {/* Tagline */}
        <p className="mt-4 text-sm sm:text-base font-semibold uppercase tracking-[0.18em] text-[#B3B3B3] max-w-md">
          Authentic. Legit. Below market price.
        </p>

        {/* Subtle status indicator */}
        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-[#B3B3B3]">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Launch preparation in progress</span>
        </div>
      </div>
    </main>
  );
}

