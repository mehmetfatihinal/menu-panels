"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang, type TKey } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";

const nav: { href: string; key: TKey }[] = [
  { href: "/dashboard", key: "navOverview" },
  { href: "/dashboard/menu", key: "navMenu" },
  { href: "/dashboard/masalar", key: "mTables" },
  { href: "/dashboard/siparisler", key: "navOrders" },
  { href: "/dashboard/ayarlar", key: "navSettings" },
];

export default function MobileNav({ slug }: { slug: string }) {
  const path = usePathname();
  const { t } = useLang();
  return (
    <div className="sticky top-0 z-20 border-b border-gray-200 bg-[#1c1712] md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-[#17130d]">
            M
          </div>
          <span className="font-semibold">{t("adminPanel")}</span>
        </div>
        <div className="flex items-center gap-2">
          <LangSwitcher />
          <Link
            href={`/r/${slug}/menu`}
            target="_blank"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
          >
            {t("viewMenu")} ↗
          </Link>
        </div>
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
                active ? "bg-accent text-[#17130d]" : "text-white/70"
              }`}
            >
              {t(n.key)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
