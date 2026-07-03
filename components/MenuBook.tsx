"use client";

import HTMLFlipBook from "react-pageflip";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import type { Category, Menu, MenuItem } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { playPageFlip } from "@/lib/sounds";

export type MenuBookHandle = {
  flipToCategory: (i: number) => void;
  next: () => void;
  prev: () => void;
};

type Props = {
  menu: Menu;
  onOpen: (item: MenuItem) => void;
  onCategoryChange: (i: number) => void;
};

// Tek bir kitap yaprağı (react-pageflip her sayfayı forwardRef ister)
const Page = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string; hard?: boolean }
>(({ children, className = "", hard }, ref) => (
  <div
    ref={ref}
    className={className}
    data-density={hard ? "hard" : "soft"}
  >
    {children}
  </div>
));
Page.displayName = "Page";

const MenuBook = forwardRef<MenuBookHandle, Props>(function MenuBook(
  { menu, onOpen, onCategoryChange },
  ref
) {
  const bookRef = useRef<any>(null);
  const flipping = useRef(false);
  const categories = menu.categories;
  const currency = menu.restaurant.currency;
  const logoUrl = menu.restaurant.logoUrl;

  const pf = () => bookRef.current?.pageFlip?.();

  useImperativeHandle(ref, () => ({
    flipToCategory: (i: number) => {
      // kapak(0) + her kategori 2 sayfa -> sol (görsel) sayfa indeksi
      pf()?.flip(1 + i * 2);
    },
    next: () => pf()?.flipNext(),
    prev: () => pf()?.flipPrev(),
  }));

  const handleFlip = (e: any) => {
    const p: number = e.data;
    if (p <= 0) return onCategoryChange(0);
    const total = categories.length;
    const i = Math.max(0, Math.min(total - 1, Math.floor((p - 1) / 2)));
    onCategoryChange(i);
  };

  // Sürükleyerek veya butonla çevirme başladığında kağıt sesi (tek kez)
  const handleState = (e: any) => {
    if (e.data === "flipping" && !flipping.current) {
      flipping.current = true;
      playPageFlip();
    }
    if (e.data === "read") flipping.current = false;
  };

  return (
    // @ts-expect-error react-pageflip prop tipleri eksik
    <HTMLFlipBook
      ref={bookRef}
      width={460}
      height={620}
      size="stretch"
      minWidth={300}
      maxWidth={640}
      minHeight={420}
      maxHeight={800}
      showCover={true}
      drawShadow={true}
      maxShadowOpacity={0.5}
      flippingTime={850}
      usePortrait={true}
      mobileScrollSupport={true}
      clickEventForward={true}
      useMouseEvents={true}
      swipeDistance={30}
      startPage={0}
      autoSize={true}
      className="mx-auto"
      style={{}}
      onFlip={handleFlip}
      onChangeState={handleState}
    >
      {/* ÖN KAPAK — kapak görseli/logo mermer üzerinde */}
      <Page hard className="mp-cover">
        <div
          className="relative h-full w-full bg-cover bg-center"
          style={{ backgroundImage: "url('/marble-bg.jpg')" }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={menu.restaurant.name}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 px-6 text-center">
              <div className="mb-4 text-3xl text-[#c8a34c]">◆</div>
              <h1 className="serif text-4xl font-bold leading-tight text-[#e7cd8b]">
                {menu.restaurant.name}
              </h1>
              {menu.restaurant.tagline && (
                <p className="sans mt-4 text-[11px] uppercase tracking-[0.35em] text-[#c8a34c]">
                  {menu.restaurant.tagline}
                </p>
              )}
              <div className="mx-auto mt-4 h-px w-16 bg-[#c8a34c]/60" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-3 border border-[#c8a34c]/40" />
          <p className="sans absolute inset-x-0 bottom-7 text-center text-[11px] tracking-[0.3em] text-[#e7cd8b]/70 drop-shadow">
            açmak için köşeye dokun →
          </p>
        </div>
      </Page>

      {/* HER KATEGORİ: SOL görsel/video sayfası + SAĞ menü sayfası */}
      {categories.flatMap((cat) => [
        <Page key={`${cat.id}-v`} className="mp-page">
          <VisualPage cat={cat} tagline={menu.restaurant.tagline} />
        </Page>,
        <Page key={`${cat.id}-m`} className="mp-page">
          <MenuPage
            cat={cat}
            currency={currency}
            onOpen={onOpen}
          />
        </Page>,
      ])}

      {/* ARKA KAPAK — mermer */}
      <Page hard className="mp-cover">
        <div
          className="relative flex h-full flex-col items-center justify-center bg-cover bg-center p-8 text-center"
          style={{ backgroundImage: "url('/marble-bg.jpg')" }}
        >
          <div className="absolute inset-0 bg-black/45" />
          <div className="pointer-events-none absolute inset-3 border border-[#c8a34c]/30" />
          <div className="relative z-10 text-2xl text-[#c8a34c]">◆</div>
          <p className="serif relative z-10 mt-5 text-2xl italic text-[#e7cd8b]">
            Afiyet olsun
          </p>
          <p className="sans relative z-10 mt-3 text-[11px] uppercase tracking-[0.3em] text-[#c8a34c]/80">
            {menu.restaurant.name}
          </p>
        </div>
      </Page>
    </HTMLFlipBook>
  );
});

export default MenuBook;

function VisualPage({ cat, tagline }: { cat: Category; tagline: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {cat.cover.video ? (
        <video
          src={cat.cover.video}
          poster={cat.cover.src}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src={cat.cover.src}
          alt={cat.name}
          className="h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
      <div className="absolute bottom-0 left-0 p-6">
        <p className="sans text-[11px] uppercase tracking-[0.3em] text-white/70">
          {tagline}
        </p>
        <h2 className="serif text-3xl font-bold text-white drop-shadow-lg">
          {cat.name}
        </h2>
      </div>
    </div>
  );
}

function MenuPage({
  cat,
  currency,
  onOpen,
}: {
  cat: Category;
  currency: string;
  onOpen: (item: MenuItem) => void;
}) {
  const { add } = useCart();
  return (
    <div className="paper flex h-full flex-col p-5 md:p-6">
      <h2 className="serif mb-1 text-2xl font-bold text-ink">{cat.name}</h2>
      <div className="mb-3 h-px w-full bg-ink/15" />
      <ul className="thin-scroll flex-1 space-y-1 overflow-y-auto">
        {cat.items.map((item) => (
          <li
            key={item.id}
            onClick={() => onOpen(item)}
            className={`group flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-white/5 ${
              !item.available ? "opacity-55" : ""
            }`}
          >
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md">
              <img
                src={item.image}
                alt={item.name}
                className="h-full w-full object-cover"
              />
              {!item.available && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                  <span className="sans text-[8px] font-bold leading-tight text-white">
                    YOK
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="serif truncate text-base font-semibold text-ink">
                  {item.name}
                </h3>
                <span className="serif whitespace-nowrap text-sm font-bold text-accent">
                  {item.price} {currency}
                </span>
              </div>
              <p className="sans line-clamp-1 text-xs text-ink/60">
                {item.description}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                add(item);
              }}
              disabled={!item.available}
              className="sans flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold text-[#17130d] transition enabled:hover:brightness-110 disabled:bg-white/10 disabled:text-white/30"
              aria-label="Sepete ekle"
            >
              +
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
