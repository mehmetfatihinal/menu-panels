import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Menu Panels — Dijital Menü",
  description: "QR ile açılan interaktif katalog menü ve sipariş sistemi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
