import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAZAROPH v2",
  description: "AUTHENTIC. LEGIT. BELOW MARKET PRICE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

