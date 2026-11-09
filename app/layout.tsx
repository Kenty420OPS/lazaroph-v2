import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "LAZAROPH",
  description: "AUTHENTIC. LEGIT. BELOW MARKET PRICE.",
};

import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ChatWidgetWrapper from "@/components/ChatWidgetWrapper";
import PolicyGate from "@/components/PolicyGate";
import SignInPrompt from "@/components/SignInPrompt";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isComingSoon =
    process.env.COMING_SOON === "true" || process.env.COMING_SOON === "1";

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            {children}
            {!isComingSoon && (
              <>
                <ChatWidgetWrapper />
                <PolicyGate />
                <SignInPrompt />
              </>
            )}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
