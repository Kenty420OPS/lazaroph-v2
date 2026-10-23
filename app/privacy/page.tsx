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
          When you order from us, chat with us, or create an account, we collect only the
          information we need to serve you:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
          <li>Your name and contact number</li>
          <li>Your delivery address (you do not give an address for store pickup)</li>
          <li>
            Your email and account information, when you sign in or use Google sign-in. An
            account is optional: you can check out as a guest, and guests are given an anonymous
            sign-in ID instead.
          </li>
          <li>The payment method you chose and the payment reference number you enter</li>
          <li>Your payment proof screenshot</li>
          <li>
            Your delivery region (for LBC) or your Metro Manila delivery city (for Lalamove)
          </li>
          <li>Your order details, such as items, sizes, amounts and status</li>
          <li>
            The messages you send us in chat, and the name shown with your chat (guest chats show
            as &quot;Guest&quot;)
          </li>
          <li>
            Ratings you give after your order is completed or picked up (a star rating and the
            order ID). These are shown publicly as an average per product once approved.
          </li>
          <li>
            Request logs and your IP address, which our hosting provider records and which our
            system uses to limit repeated requests
          </li>
        </ul>
        <p className="text-sm leading-relaxed">
          We do not collect any government ID, and Lalamove riders do not ask you for one.
        </p>
      </PolicySection>

      <PolicySection heading="Why we collect it">
        <p className="text-sm leading-relaxed">
          We use your information to process and deliver your orders, to verify payments, to
          provide customer support, and to keep the site secure. We do not use it for anything
          else.
        </p>
      </PolicySection>

      <PolicySection heading="Who sees it">
        <p className="text-sm leading-relaxed">
          We share your name, contact number and delivery address with the courier you chose
          (LBC or Lalamove) only to deliver your order. Our service providers process data on our
          behalf: Google Firebase (sign-in, database and file storage) and Vercel (website
          hosting and logs). We do not sell your data, and apart from these couriers and service
          providers we do not share it with anyone else.
        </p>
      </PolicySection>

      <PolicySection heading="Storage and security">
        <p className="text-sm leading-relaxed">
          Your data is stored with Google Firebase, and this site is hosted on Vercel. Access to
          orders, payment proofs and chats is limited to authorized staff through their account
          permissions. You can view an order on the tracking page with its order ID and the
          contact number used for that order, so keep both private. No online system is 100%
          secure.
        </p>
      </PolicySection>

      <PolicySection heading="How long we keep it">
        <p className="text-sm leading-relaxed">
          Our admin keeps these records and manages them. They are not deleted automatically,
          and they stay until our admin removes them. You can ask us to delete your records at
          any time (see Your rights below).
        </p>
      </PolicySection>

      <PolicySection heading="Your rights">
        <p className="text-sm leading-relaxed">
          Under the Data Privacy Act of 2012, you may ask to access, correct, or delete your
          personal information, and you may ask us to remove your records. To make a request,
          email us at{" "}
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
          . We reply within 7 days. You may also read our{" "}
          <Link href="/contact" className="underline">Contact page</Link>{" "}
          for the rest of our details.
        </p>
      </PolicySection>

      <PolicySection heading="Your cart and recent orders">
        <p className="text-sm leading-relaxed">
          Your cart and a short list of your recent orders are stored in your browser&apos;s
          local storage so they are still there when you come back. This stays on your device
          and is not shared with anyone. The recent orders list holds the order ID, date, item
          names and images, sizes, quantities and total. You can clear your history from the
          cart page, or by clearing your browser data.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
