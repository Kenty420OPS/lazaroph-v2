import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAZAROPH",
  description: "AUTHENTIC. LEGIT. BELOW MARKET PRICE.",
};

import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ChatWidgetWrapper from "@/components/ChatWidgetWrapper";
import PolicyGate from "@/components/PolicyGate";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            {children}
            <ChatWidgetWrapper />
            <PolicyGate />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

