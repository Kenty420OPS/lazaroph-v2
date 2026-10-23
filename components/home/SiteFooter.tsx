import Link from "next/link";
import { getBranch, DEFAULT_PICKUP_BRANCH_ID } from "@/lib/branches";
import { FOOTER_SHOP_NAV } from "@/lib/storefront-nav";

const CUSTOMER_LINKS = [
  { label: "Track order", href: "/track-order" },
  { label: "Sign in", href: "/sign-in" },
  { label: "Create account", href: "/sign-up" },
];

const POLICY_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms and Conditions", href: "/terms" },
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Return and Exchange", href: "/returns" },
  { label: "Contact", href: "/contact" },
];

// Homepage footer. Server-rendered: links and the pickup branch details only,
// no client state. The logo sits on a white tile so the black artwork shows.
export default function SiteFooter() {
  const branch = getBranch(DEFAULT_PICKUP_BRANCH_ID);

  return (
    <footer className="bg-[#0A0A0A] text-white border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand */}
          <div className="lg:col-span-1">
            <div className="inline-flex bg-white rounded-xl p-4">
              <img src="/images/logo.png" alt="LAZAROPH" className="h-14 w-auto" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.25em] text-[#B3B3B3]">
              EST. 2016 &nbsp; MARIKINA
            </p>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-[#B3B3B3]">
              Authentic. Legit. Below Market Price.
            </p>
          </div>

          {/* Column 2: Shop */}
          <nav aria-label="Shop">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Shop</h2>
            <ul className="mt-2 space-y-1">
              {FOOTER_SHOP_NAV.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center min-h-11 text-base text-[#B3B3B3] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 3: Customer */}
          <nav aria-label="Customer">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Customer</h2>
            <ul className="mt-2 space-y-1">
              {CUSTOMER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center min-h-11 text-base text-[#B3B3B3] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 4: Visit us */}
          {branch && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                Visit us
              </h2>
              <address className="mt-3 not-italic space-y-2">
                <p className="text-base text-white font-semibold">{branch.name}</p>
                <p className="text-base text-[#B3B3B3] leading-relaxed">{branch.address}</p>
                <p className="text-base text-[#B3B3B3]">{branch.hours}</p>
                {branch.phones?.map((phone) => (
                  <p key={phone} className="text-base text-[#B3B3B3]">
                    {phone}
                  </p>
                )) ?? (
                  <p className="text-base text-[#B3B3B3]">{branch.phone}</p>
                )}
                <p className="pt-2 text-base text-[#B3B3B3] leading-relaxed">
                  Store pickup is available after your payment is confirmed.
                </p>
                <p className="pt-1 text-sm font-bold uppercase tracking-wider text-white">
                  Authenticity guaranteed
                </p>
              </address>
            </div>
          )}
        </div>

        <nav aria-label="Policies" className="mt-10 pt-6 border-t border-white/10">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Policies</h2>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            {POLICY_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center min-h-11 text-base text-[#B3B3B3] hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-base text-[#B3B3B3]">
            © 2026 LAZAROPH — AUTHENTIC. LEGIT. BELOW MARKET PRICE. Retail Platform. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
