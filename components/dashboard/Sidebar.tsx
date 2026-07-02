"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Genel Bakış", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { href: "/dashboard/menu", label: "Menü Yönetimi", icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z" },
  { href: "/dashboard/masalar", label: "Masalar & QR", icon: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h-3zM18 18h3v3h-3z" },
  { href: "/dashboard/siparisler", label: "Siparişler", icon: "M9 2h6l1 3h3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5h3zM9 11h6M9 15h6" },
  { href: "/dashboard/ayarlar", label: "Ayarlar", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 8" },
];

export default function Sidebar({ slug, name }: { slug: string; name: string }) {
  const path = usePathname();

  return (
    <aside className="flex h-full w-full flex-col bg-[#1c1712] text-white md:w-64">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-bold text-[#17130d]">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate font-semibold">{name}</div>
          <div className="text-[11px] text-white/50">Yönetim Paneli</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((n) => {
          const active =
            n.href === "/dashboard"
              ? path === "/dashboard"
              : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-accent text-[#17130d]"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={n.icon} />
              </svg>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        <Link
          href={`/r/${slug}/menu`}
          target="_blank"
          className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium transition hover:bg-white/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
          Menüyü Görüntüle
        </Link>
        <form action="/auth/signout" method="post">
          <button className="w-full rounded-lg px-3 py-2 text-center text-xs text-white/40 transition hover:text-white/80">
            Çıkış yap
          </button>
        </form>
      </div>
    </aside>
  );
}
