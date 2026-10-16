import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAZAROPH v2",
  description: "AUTHENTIC. LEGIT. BELOW MARKET PRICE.",
};

import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ChatWidgetWrapper from "@/components/ChatWidgetWrapper";

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
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

