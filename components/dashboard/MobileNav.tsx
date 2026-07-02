"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Genel" },
  { href: "/dashboard/menu", label: "Menü" },
  { href: "/dashboard/masalar", label: "Masalar" },
  { href: "/dashboard/siparisler", label: "Siparişler" },
  { href: "/dashboard/ayarlar", label: "Ayarlar" },
];

export default function MobileNav() {
  const path = usePathname();
  return (
    <div className="sticky top-0 z-20 border-b border-gray-200 bg-[#1c1712] md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold">
            M
          </div>
          <span className="font-semibold">Menu Panels</span>
        </div>
        <Link
          href="/menu"
          target="_blank"
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
        >
          Menüyü Aç ↗
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
        {nav.map((n) => {
          const active =
            n.href === "/dashboard" ? path === "/dashboard" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                active ? "bg-accent text-white" : "text-white/70"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
