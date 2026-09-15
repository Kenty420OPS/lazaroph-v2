import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white selection:bg-white selection:text-black">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-block p-4 rounded-2xl bg-white text-black shadow-2xl mb-2">
          <span className="text-4xl font-black tracking-wider">LAZAROPH</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white uppercase">
          AUTHENTIC. LEGIT. BELOW MARKET PRICE.
        </h1>

        <p className="text-base sm:text-lg text-neutral-400 font-normal">
          Next.js 14 App Router + TypeScript + Tailwind CSS + Firebase
        </p>

        <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/shop"
            className="px-6 py-3 rounded-xl bg-white text-black hover:bg-neutral-200 font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span>Explore Public Catalog (/shop)</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}

