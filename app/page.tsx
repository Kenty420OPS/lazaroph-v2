import Link from "next/link";
import { CATEGORY_CARDS } from "@/lib/product";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-black text-white selection:bg-white selection:text-black">
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white uppercase max-w-3xl">
          AUTHENTIC. LEGIT. BELOW MARKET PRICE.
        </h1>

        <Link
          href="/shop"
          className="mt-8 px-6 py-3 rounded-xl bg-white text-black hover:bg-neutral-200 font-bold text-sm transition-all shadow-lg"
        >
          Shop now
        </Link>
      </section>

      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-6">
          Shop by category
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORY_CARDS.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop?category=${encodeURIComponent(cat.name)}`}
              className="group rounded-2xl overflow-hidden border border-neutral-800 hover:border-neutral-500 transition-colors"
            >
              <div className="relative w-full h-52 flex items-center justify-center">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-black flex items-center justify-center">
                    <span className="text-lg font-bold uppercase tracking-wider text-neutral-200">
                      {cat.name}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-neutral-800 bg-neutral-950">
                <h3 className="text-sm font-semibold text-white group-hover:text-neutral-300 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">{cat.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
