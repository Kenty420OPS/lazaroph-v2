import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage, { PolicySection } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Return and Exchange Policy | LAZAROPH",
};

export default function ReturnsPage() {
  return (
    <PolicyPage title="Return and Exchange Policy">
      <PolicySection heading="General rule">
        <p className="text-sm leading-relaxed">
          We offer replacement within 7 days for ELIGIBLE items only.
        </p>
      </PolicySection>

      <PolicySection heading="When an item is eligible">
        <p className="text-sm leading-relaxed">
          For a replacement to be considered, the item must be:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>Unworn and unwashed</li>
          <li>Complete with all accessories</li>
          <li>Complete with the box, packaging, and receipt</li>
        </ul>
        <p className="text-sm leading-relaxed">
          Walk-in customers in store may change size if the same conditions are met.
        </p>
      </PolicySection>

      <PolicySection heading="When we cannot return or replace">
        <p className="text-sm leading-relaxed">
          We cannot return or replace items for the following reasons:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>Change of mind</li>
          <li>Defect due to mishandling by the buyer</li>
          <li>The item had no defect at the time of purchase</li>
        </ul>
        <p className="text-sm leading-relaxed">All items are sold &quot;as-is-where-is&quot;.</p>
      </PolicySection>

      <PolicySection heading="Cancelling an online order">
        <p className="text-sm leading-relaxed">
          An order is final once we have confirmed and shipped it (for store pickup, once we
          have confirmed it and marked it ready for pickup). Before that, you may ask us to
          cancel it by contacting us with your order ID. If an order is cancelled, the payment is
          returned right away, as long as the account details you send us are correct.
        </p>
      </PolicySection>

      <PolicySection heading="Defective or wrong items">
        <p className="text-sm leading-relaxed">
          LAZAROPH is responsible only when there is proof that the item is defective or wrong.
          Report it within 7 days of receipt with photos or video and the order ID by email or
          call, using the details on the{" "}
          <Link href="/contact" className="underline">Contact page</Link>. If confirmed, we will
          replace the item.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
