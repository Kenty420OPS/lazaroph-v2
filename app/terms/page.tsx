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
          When you submit your order with proof of payment, the order is created and starts as
          Pending Payment. Our staff verifies your payment, and we confirm the order only after
          that. Shipping or pickup preparation starts after verification. For more details, see
          our{" "}
          <Link href="/shipping-policy" className="underline">
            Shipping Policy
          </Link>
          .
        </p>
      </PolicySection>

      <PolicySection heading="Cancelling an order">
        <p className="text-sm leading-relaxed">
          An order is final once we have confirmed and shipped it (for store pickup, once we
          have confirmed it and marked it ready for pickup). Before that, you may ask us to
          cancel it by contacting us with your order ID. If an order is cancelled, the payment is
          returned right away, as long as the account details you send us are correct. For eligible
          replacements after you receive your order, please see our{" "}
          <Link href="/returns" className="underline">Return and Exchange Policy</Link>.
        </p>
      </PolicySection>

      {/* TODO: lawyer review before launch */}
      <PolicySection heading="Our right to cancel">
        <p className="text-sm leading-relaxed">
          We may cancel an order due to stock or pricing errors. If we cancel for these reasons
          and you have already paid, we will return your full payment.
        </p>
      </PolicySection>

      {/* TODO: lawyer review before launch */}
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
