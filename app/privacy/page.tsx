import type { Metadata } from "next";
import Link from "next/link";
import PolicyPage, { PolicySection } from "@/components/PolicyPage";
import { STORE_INFO, toTelHref } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Privacy Policy | LAZAROPH",
};

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy">
      <PolicySection heading="What we collect">
        <p className="text-sm leading-relaxed">
          When you order from us or create an account, we collect only the information we need
          to serve you:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>Your name and contact number</li>
          <li>Your delivery address</li>
          <li>
            Your email and account information, when you sign in or use Google sign-in
          </li>
          <li>Your payment proof screenshot</li>
          <li>Your order details, such as items, sizes, amounts and status</li>
        </ul>
      </PolicySection>

      <PolicySection heading="Why we collect it">
        <p className="text-sm leading-relaxed">
          We use your information to process and deliver your orders, to verify payments, and to
          provide customer support. We do not use it for anything else.
        </p>
      </PolicySection>

      <PolicySection heading="Who sees it">
        <p className="text-sm leading-relaxed">
          Only our staff and the couriers needed to deliver your order can see your information.
          We do not sell your information, and we do not share it with anyone else.
        </p>
      </PolicySection>

      <PolicySection heading="Storage and security">
        <p className="text-sm leading-relaxed">
          Your information is stored in our secured systems, and access is limited to the staff
          who need it. We take reasonable steps to protect it against loss and unauthorised
          access.
        </p>
      </PolicySection>

      <PolicySection heading="How long we keep it">
        <p className="text-sm leading-relaxed">
          We keep your information for as long as we need it to handle your orders and to keep
          the records the law requires. Once it is no longer needed, we remove it.
        </p>
      </PolicySection>

      <PolicySection heading="Your rights">
        <p className="text-sm leading-relaxed">
          Under the Data Privacy Act of 2012, you may ask to access, correct, or delete your
          personal information. To make a request, contact us at{" "}
          <a href={`mailto:${STORE_INFO.email}`} className="underline break-all">
            {STORE_INFO.email}
          </a>{" "}
          or call us at{" "}
          {STORE_INFO.phones.map((phone, index) => (
            <span key={phone}>
              <a href={toTelHref(phone)} className="underline whitespace-nowrap">
                {phone}
              </a>
              {index < STORE_INFO.phones.length - 1 ? " or " : ""}
            </span>
          ))}
          . You may also read our <Link href="/contact" className="underline">Contact page</Link>{" "}
          for the rest of our details.
        </p>
      </PolicySection>

      <PolicySection heading="Your cart">
        <p className="text-sm leading-relaxed">
          Your cart is stored in your browser&apos;s local storage so it is still there when you
          come back. It stays on your device and is not shared with anyone.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
