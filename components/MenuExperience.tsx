"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Menu, MenuItem } from "@/lib/types";
import { CartProvider, useCart } from "@/lib/cart";
import AudioController from "./AudioController";
import ProductModal from "./ProductModal";
import Cart from "./Cart";
import type { MenuBookHandle } from "./MenuBook";

// react-pageflip tarayıcı API'lerine (window/document) ihtiyaç duyar -> SSR kapalı
const MenuBook = dynamic(() => import("./MenuBook"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto flex h-[620px] max-w-[640px] items-center justify-center">
      <div className="serif animate-pulse text-white/60">Menü açılıyor…</div>
    </div>
  ),
});

export default function MenuExperience({
  initialMenu,
  table,
}: {
  initialMenu: Menu;
  table: string;
}) {
  return (
    <CartProvider table={table}>
      <Inner initialMenu={initialMenu} table={table} />
    </CartProvider>
  );
}

function Inner({ initialMenu, table }: { initialMenu: Menu; table: string }) {
  const [menu, setMenu] = useState<Menu>(initialMenu);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const bookRef = useRef<MenuBookHandle>(null);
  const { count } = useCart();

  const categories = menu.categories;
  const currency = menu.restaurant.currency;

  // Admin stok değişikliklerini yansıtmak için hafif güncelleme
  // (yalnızca içerik gerçekten değiştiyse -> kitap gereksiz yere sıfırlanmaz)
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        if (!res.ok) return;
        const fresh = await res.json();
        setMenu((prev) =>
          JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh
        );
      } catch {}
    }, 12000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Üst çubuk */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3">
        <div className="text-white">
          <h1 className="serif text-lg font-bold leading-tight">
            {menu.restaurant.name}
          </h1>
          <p className="sans text-[11px] text-white/60">
            {table === "Genel" ? "Ortak Menü" : `Masa ${table}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AudioController />
          <button
            onClick={() => setCartOpen(true)}
            className="sans relative flex h-11 items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 text-white backdrop-blur transition hover:bg-black/50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="text-sm font-semibold">Sepet</span>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Kategori sekmeleri */}
      <nav className="thin-scroll flex gap-2 overflow-x-auto px-4 pb-3">
        {categories.map((c, i) => (
          <button
            key={c.id}
            onClick={() => bookRef.current?.flipToCategory(i)}
            className={`sans whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition ${
              i === active
                ? "bg-paper font-semibold text-ink"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {c.name}
          </button>
        ))}
      </nav>

      {/* Gerçek kitap */}
      <main className="mx-auto max-w-5xl px-3 pb-28 pt-2">
        <div className="relative">
          <MenuBook
            ref={bookRef}
            menu={menu}
            onOpen={setSelected}
            onCategoryChange={setActive}
          />

          {/* Sayfa çevirme okları */}
          <button
            onClick={() => bookRef.current?.prev()}
            className="sans absolute -left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 md:-left-5"
            aria-label="Önceki sayfa"
          >
            ‹
          </button>
          <button
            onClick={() => bookRef.current?.next()}
            className="sans absolute -right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 md:-right-5"
            aria-label="Sonraki sayfa"
          >
            ›
          </button>
        </div>

        <p className="sans mt-5 text-center text-sm text-white/50">
          Sayfayı çevirmek için köşeden sürükle ya da okları kullan
        </p>
      </main>

      <ProductModal
        item={selected}
        currency={currency}
        onClose={() => setSelected(null)}
      />
      <Cart
        table={table}
        currency={currency}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  );
}
