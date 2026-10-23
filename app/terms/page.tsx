import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage, { PolicySection } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms and Conditions | LAZAROPH",
};

export default function TermsPage() {
  return (
    <PolicyPage title="Terms and Conditions">
      <PolicySection heading="Use of this site">
        <p className="text-sm leading-relaxed">
          By using this site, you agree to these terms. If you do not agree, please do not use
          it.
        </p>
      </PolicySection>

      <PolicySection heading="Authenticity">
        <p className="text-sm leading-relaxed">
          All products sold on this site are 100% authentic.
        </p>
      </PolicySection>

      <PolicySection heading="Prices and availability">
        <p className="text-sm leading-relaxed">
          Prices and stock may change without notice. A product may go out of stock even if it
          is shown on the site.
        </p>
      </PolicySection>

      <PolicySection heading="Orders and payment">
        <p className="text-sm leading-relaxed">
          Orders are confirmed only after payment verification. Proof of payment is required
          before we process your order. For more details, see our{" "}
          <Link href="/shipping-policy" className="underline">
            Shipping Policy
          </Link>
          .
        </p>
      </PolicySection>

      <PolicySection heading="Online orders are final">
        <p className="text-sm leading-relaxed">
          Confirmed online orders are final and cannot be reversed or cancelled. For eligible
          replacements, please see our <Link href="/returns" className="underline">Return and Exchange Policy</Link>
          .
        </p>
      </PolicySection>

      <PolicySection heading="Our right to cancel">
        <p className="text-sm leading-relaxed">
          We may cancel an order due to stock or pricing errors. If we cancel for these reasons
          and you have already paid, we will return your full payment.
        </p>
      </PolicySection>

      <PolicySection heading="Limitation of liability">
        <p className="text-sm leading-relaxed">
          To the fullest extent allowed by law, LAZAROPH will not be liable for any indirect or
          incidental loss that may arise from using this site or receiving your order, beyond
          what is required by law.
        </p>
      </PolicySection>

      <PolicySection heading="Governing law">
        <p className="text-sm leading-relaxed">
          These terms are governed by the laws of the Republic of the Philippines.
        </p>
      </PolicySection>

      <PolicySection heading="Contact">
        <p className="text-sm leading-relaxed">
          If you have questions about these terms, please see our{" "}
          <Link href="/contact" className="underline">Contact page</Link>
          .
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
