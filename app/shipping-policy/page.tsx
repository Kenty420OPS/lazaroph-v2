import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage, { PolicySection } from "@/components/PolicyPage";
import { STORE_INFO } from "@/lib/store-info";
import { getBranch, DEFAULT_PICKUP_BRANCH_ID } from "@/lib/branches";
import { getLbcRate } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Shipping Policy | LAZAROPH",
};

export default function ShippingPolicyPage() {
  const branch = getBranch(DEFAULT_PICKUP_BRANCH_ID);
  const luzonRate = getLbcRate("Luzon");
  const visayasRate = getLbcRate("Visayas");
  const mindanaoRate = getLbcRate("Mindanao");

  return (
    <PolicyPage title="Shipping Policy">
      <PolicySection heading="Couriers">
        <p className="text-sm leading-relaxed">
          We offer the following delivery/pickup options:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>
            <strong>LBC</strong> &mdash; Nationwide delivery. LBC shipping fee is charged per
            pair by region: Luzon ₱{luzonRate}, Visayas ₱{visayasRate}, Mindanao ₱{mindanaoRate}.
            Delivery is usually 1-7 business days after payment verification.
          </li>
          <li>
            <strong>Lalamove</strong> &mdash; Available in select Metro Manila, Rizal, Bulacan and Cavite cities. Orders are processed for
            same-day delivery on the day the payment is verified, regardless of what time the
            order was placed. Payments are verified by our staff, so same-day delivery starts
            once payment is verified, not when the order is placed. The buyer pays the
            rider&apos;s delivery fee directly. Delivery time is subject to rider availability
            and traffic or weather conditions.
          </li>
          <li>
            <strong>Store Pickup</strong> &mdash; Free pickup at our store:{" "}
            {STORE_INFO.address}
            {branch?.hours ? (
              <>
                {" "}
                (<span className="whitespace-nowrap">{branch.hours}</span>).
              </>
            ) : (
              "."
            )}
          </li>
        </ul>
      </PolicySection>

      <PolicySection heading="Lalamove coverage">
        <p className="text-sm leading-relaxed">
          Lalamove same-day delivery is available in Metro Manila and in these nearby cities:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>
            <strong>Rizal:</strong> Taytay, Cainta, Binangonan, Antipolo, San Mateo, Rodriguez
            (Montalban)
          </li>
          <li>
            <strong>Bulacan:</strong> San Jose del Monte
          </li>
          <li>
            <strong>Cavite:</strong> Imus, Trece Martires, Cavite City, Dasmariñas, General Trias
          </li>
        </ul>
        <p className="text-sm leading-relaxed">
          If your city is not listed, please choose LBC.
        </p>
      </PolicySection>

      <PolicySection heading="Processing and delivery">
        <p className="text-sm leading-relaxed">
          Our staff verifies your payment, and items ship after verification. Please make sure
          you give a complete and correct address and contact number so we can deliver your order
          without delay.
        </p>
      </PolicySection>

      <PolicySection heading="Landmark and courier notes">
        <p className="text-sm leading-relaxed">
          For LBC and Lalamove orders, please give a landmark (a nearby recognizable place) and
          any notes for the rider or courier. We share the address, landmark and notes with the
          courier to help them find you.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
