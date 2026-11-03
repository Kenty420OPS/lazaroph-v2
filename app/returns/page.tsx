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
          To make sure every customer receives the correct item in good condition, LAZAROPH
          follows a quality inspection and documentation process before dispatch.
        </p>
      </PolicySection>

      <PolicySection heading="1. Pre-shipping quality inspection">
        <p className="text-sm leading-relaxed">
          Before shipping, our team inspects every order to make sure the item is in good
          condition and matches your order. We provide detailed photos of the following:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>Actual item: clear photos of the exact pair or item to be shipped</li>
          <li>Size tag: a photo showing the actual size and product tag</li>
          <li>Shoe box and packaging: photos of the box, label, and overall packaging condition</li>
          <li>
            Item condition: detailed photos of the upper, sole, stitching, interiors, and other
            relevant parts
          </li>
          <li>
            Additional details: any visible marks, minor imperfections, or other relevant details
            are disclosed before shipping
          </li>
        </ul>
      </PolicySection>

      <PolicySection heading="2. Wrong item or incorrect size">
        <p className="text-sm leading-relaxed">
          Please review the photos and verify the item, model, colorway, and size before
          shipment. If the wrong item or size is shipped because of an error on our part,
          LAZAROPH will take responsibility and arrange the appropriate resolution.
        </p>
      </PolicySection>

      <PolicySection heading="3. Defective item claims">
        <p className="text-sm leading-relaxed">
          All items are inspected before dispatch. If you receive an item with a manufacturing
          defect or damage that was not disclosed or documented before shipping, please contact
          us immediately using the details on the{" "}
          <Link href="/contact" className="underline">Contact page</Link>. To process a claim,
          you must provide:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>Clear photos and videos of the received item</li>
          <li>Photos of the shoe box and shipping packaging</li>
          <li>A description of the issue</li>
          <li>Order details and proof of purchase</li>
        </ul>
        <p className="text-sm leading-relaxed">
          Claims are subject to verification and inspection.
        </p>
      </PolicySection>

      <PolicySection heading="4. Customer acknowledgment">
        <p className="text-sm leading-relaxed">
          By confirming the order and approving the pre-shipping photos, you acknowledge the
          item&apos;s:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>Correct model and colorway</li>
          <li>Correct size and product details</li>
          <li>Documented physical condition before dispatch</li>
        </ul>
        <p className="text-sm leading-relaxed">
          Any concerns about the item&apos;s condition must be raised before shipment.
        </p>
      </PolicySection>

      <PolicySection heading="5. Important reminders">
        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>Please inspect your order immediately upon receipt.</li>
          <li>
            Keep the original packaging, box, tags, and accessories in case of a return or
            replacement request.
          </li>
          <li>
            Do not use, wash, alter, or further damage the item while a claim is being evaluated.
          </li>
          <li>
            Normal variations in materials, finishing, and manufacturing are not automatically
            considered defects.
          </li>
          <li>
            All concerns are evaluated fairly and in accordance with applicable consumer
            protection laws.
          </li>
        </ul>
        <p className="text-sm leading-relaxed">
          LAZAROPH is committed to transparency, quality assurance, and a reliable shopping
          experience. Our goal is that what you see before shipment is exactly what you receive.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
