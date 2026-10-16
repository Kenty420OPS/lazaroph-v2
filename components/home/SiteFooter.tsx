import Link from "next/link";
import { getBranch, DEFAULT_PICKUP_BRANCH_ID } from "@/lib/branches";

// Homepage footer. Server-rendered: links and the pickup branch details only,
// no client state. The logo sits on a white tile so the black artwork shows.
export default function SiteFooter() {
  const branch = getBranch(DEFAULT_PICKUP_BRANCH_ID);

  return (
    <footer className="bg-[#0A0A0A] text-white border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div className="inline-flex bg-white rounded-xl p-4">
              <img src="/images/logo.png" alt="LAZAROPH" className="h-14 w-auto" />
            </div>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-[#B3B3B3]">
              Authentic. Legit. Below Market Price.
            </p>
            <p className="mt-3 text-base text-[#B3B3B3] leading-relaxed">
              Original sneakers, bags and luggage, and watches — verified and shipped from
              Marikina.
            </p>
          </div>

          <nav aria-label="Shop">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Shop</h2>
            <ul className="mt-2">
              <li>
                <Link
                  href="/shop"
                  className="inline-flex items-center min-h-11 text-base text-[#B3B3B3] hover:text-white transition-colors"
                >
                  Browse all products
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="inline-flex items-center min-h-11 text-base text-[#B3B3B3] hover:text-white transition-colors"
                >
                  Your cart
                </Link>
              </li>
              <li>
                <Link
                  href="/track-order"
                  className="inline-flex items-center min-h-11 text-base text-[#B3B3B3] hover:text-white transition-colors"
                >
                  Track your order
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Account">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Account</h2>
            <ul className="mt-2">
              <li>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center min-h-11 text-base text-[#B3B3B3] hover:text-white transition-colors"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center min-h-11 text-base text-[#B3B3B3] hover:text-white transition-colors"
                >
                  Create account
                </Link>
              </li>
            </ul>
          </nav>

          {branch && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                Store pickup
              </h2>
              <address className="mt-3 not-italic space-y-2">
                <p className="text-base text-white font-semibold">{branch.name}</p>
                <p className="text-base text-[#B3B3B3] leading-relaxed">{branch.address}</p>
                <p className="text-base text-[#B3B3B3]">{branch.hours}</p>
                <p className="text-base text-[#B3B3B3]">{branch.phone}</p>
              </address>
            </div>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-white/10">
          <p className="text-base text-[#B3B3B3]">
            © 2026 LAZAROPH — AUTHENTIC. LEGIT. BELOW MARKET PRICE. Retail Platform. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
