import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#0b0f19] text-white">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-block p-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 shadow-xl shadow-blue-500/20 mb-2">
          <span className="text-4xl font-extrabold text-white">LAZAROPH</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Authentic Sportswear & Lifestyle
        </h1>
        
        <p className="text-base sm:text-lg text-gray-300">
          Welcome to LAZAROPH v2 — powered by Next.js 14 App Router, TypeScript, Tailwind CSS, and Firebase Firestore.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/shop"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            <span>Explore Public Catalog (/shop)</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
