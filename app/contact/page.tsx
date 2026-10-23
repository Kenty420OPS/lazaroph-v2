import type { Metadata } from "next";
import PolicyPage, { PolicySection } from "@/components/PolicyPage";
import { STORE_INFO, toTelHref } from "@/lib/store-info";
import { getBranch, DEFAULT_PICKUP_BRANCH_ID } from "@/lib/branches";

export const metadata: Metadata = {
  title: "Contact | LAZAROPH",
};

export default function ContactPage() {
  const branch = getBranch(DEFAULT_PICKUP_BRANCH_ID);

  return (
    <PolicyPage title="Contact">
      <PolicySection heading="Store details">
        <p className="text-sm leading-relaxed font-semibold">{STORE_INFO.name}</p>
        <p className="text-sm leading-relaxed">{STORE_INFO.address}</p>
        {branch?.hours ? (
          <p className="text-sm leading-relaxed">Hours: {branch.hours}</p>
        ) : null}
      </PolicySection>

      <PolicySection heading="Phone">
        <ul className="space-y-2 text-sm leading-relaxed">
          {STORE_INFO.phones.map((phone) => (
            <li key={phone}>
              <a href={toTelHref(phone)} className="underline">
                {phone}
              </a>
            </li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection heading="Email">
        <p className="text-sm leading-relaxed">
          <a href={`mailto:${STORE_INFO.email}`} className="underline break-all">
            {STORE_INFO.email}
          </a>
        </p>
      </PolicySection>

      <PolicySection heading="Social media">
        <p className="text-sm leading-relaxed">
          Facebook: {STORE_INFO.facebook}
          <br />
          Instagram: {STORE_INFO.instagram}
        </p>
      </PolicySection>

      <PolicySection heading="Note">
        <p className="text-sm leading-relaxed">
          For defective or wrong items, include your order ID and photos.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
