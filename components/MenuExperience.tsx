"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Menu, MenuItem } from "@/lib/types";
import { CartProvider, useCart } from "@/lib/cart";
import { LangProvider, useLang, pickLang } from "@/lib/i18n";
import LangSwitcher from "./LangSwitcher";
import AudioController from "./AudioController";
import ProductModal from "./ProductModal";
import Cart from "./Cart";
import type { MenuBookHandle } from "./MenuBook";

// react-pageflip tarayıcı API'lerine (window/document) ihtiyaç duyar -> SSR kapalı
const MenuBook = dynamic(() => import("./MenuBook"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="serif animate-pulse text-white/60">Menü açılıyor…</div>
    </div>
  ),
});

export default function MenuExperience({
  initialMenu,
  table,
  slug,
}: {
  initialMenu: Menu;
  table: string;
  slug: string;
}) {
  return (
    <LangProvider initialLang={initialMenu.restaurant.defaultLang}>
      <CartProvider table={`${slug}:${table}`}>
        <Inner initialMenu={initialMenu} table={table} slug={slug} />
      </CartProvider>
    </LangProvider>
  );
}

function Inner({
  initialMenu,
  table,
  slug,
}: {
  initialMenu: Menu;
  table: string;
  slug: string;
}) {
  const [menu, setMenu] = useState<Menu>(initialMenu);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const bookRef = useRef<MenuBookHandle>(null);
  const { count } = useCart();
  const { t, lang } = useLang();

  const categories = menu.categories;
  const currency = menu.restaurant.currency;

  // Admin stok değişikliklerini yansıtmak için hafif güncelleme
  // (yalnızca içerik gerçekten değiştiyse -> kitap gereksiz yere sıfırlanmaz)
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/menu?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const fresh = await res.json();
        setMenu((prev) =>
          JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh
        );
      } catch {}
    }, 12000);
    return () => clearInterval(timer);
  }, [slug]);

  return (
    // Ekran kaymasın: menü tam olarak görünen yüksekliğe (100dvh) sabitlenir
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Üst çubuk */}
      <header className="z-30 flex flex-none items-center justify-between gap-2 px-3 py-3">
        <div className="min-w-0 flex-1 text-white">
          <h1 className="serif truncate text-base font-bold leading-tight sm:text-lg">
            {menu.restaurant.name}
          </h1>
          <p className="sans text-[11px] text-white/60">
            {table === "Genel" ? t("sharedMenu") : `${t("table")} ${table}`}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <LangSwitcher />
          <AudioController />
          <button
            onClick={() => setCartOpen(true)}
            className="sans relative flex h-11 items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3.5 text-white backdrop-blur transition hover:bg-black/50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="hidden text-sm font-semibold sm:inline">{t("cart")}</span>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-[#17130d]">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Kategori sekmeleri */}
      <nav className="thin-scroll flex flex-none gap-2 overflow-x-auto px-4 pb-2">
        {categories.map((c, i) => (
          <button
            key={c.id}
            onClick={() => bookRef.current?.flipToCategory(i)}
            className={`sans whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition ${
              i === active
                ? "bg-accent font-semibold text-[#17130d]"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {pickLang(c.nameI18n, c.name, lang)}
          </button>
        ))}
      </nav>

      {/* Gerçek kitap — kalan alana en-boy oranıyla sığar, ekran kaymaz */}
      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-2 sm:px-3">
        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          <div className="relative mx-auto flex aspect-[460/620] h-full max-w-[min(440px,100%)] items-center justify-center md:aspect-[920/620] md:max-w-full">
            <MenuBook
              ref={bookRef}
              menu={menu}
              onOpen={setSelected}
              onCategoryChange={setActive}
            />

            {/* Sayfa çevirme okları (mobilde içeride, masaüstünde dışarıda) */}
            <button
              onClick={() => bookRef.current?.prev()}
              className="sans absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 md:-left-5 md:h-11 md:w-11"
              aria-label="Önceki sayfa"
            >
              ‹
            </button>
            <button
              onClick={() => bookRef.current?.next()}
              className="sans absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 md:-right-5 md:h-11 md:w-11"
              aria-label="Sonraki sayfa"
            >
              ›
            </button>
          </div>
        </div>

        <p className="sans flex-none py-2 text-center text-xs text-white/50">
          {t("flipHint")}
        </p>
      </main>

      <ProductModal
        item={selected}
        currency={currency}
        onClose={() => setSelected(null)}
      />
      <Cart
        table={table}
        slug={slug}
        currency={currency}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  );
}
