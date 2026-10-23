import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import { POLICY_LAST_UPDATED, formatPolicyLastUpdated } from "@/lib/store-info";

interface PolicyPageProps {
  title: string;
  children: React.ReactNode;
}

// Static policy layout shared by /privacy, /terms, /shipping-policy, /returns
// and /contact. Same white palette as the other customer-facing pages; the
// header and footer stay black.
export default function PolicyPage({ title, children }: PolicyPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0A0A0A]">
      <SiteHeader />
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wide">
            {title}
          </h1>
          <p className="mt-3 mb-10 text-xs text-[#6B6B6B]">
            Last updated: {formatPolicyLastUpdated(POLICY_LAST_UPDATED)}
          </p>
          <div className="space-y-8">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

interface PolicySectionProps {
  heading: string;
  children: React.ReactNode;
}

export function PolicySection({ heading, children }: PolicySectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">{heading}</h2>
      {children}
    </section>
  );
}
