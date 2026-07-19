"use client";

import { useLang, SUPPORTED_LANGS, type Lang } from "@/lib/i18n";

// Dil seçim menüsü (menü üst çubuğu + panel sidebar).
// Seçenekler SUPPORTED_LANGS'ten üretilir; seçim localStorage'a kaydedilir.
export default function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="relative">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label="Language"
        className="sans h-11 cursor-pointer appearance-none rounded-full border border-(--chip-border) bg-(--chip-bg) pl-3.5 pr-8 text-xs font-semibold text-(--fg) backdrop-blur outline-none transition hover:bg-(--chip-bg-hover)"
      >
        {SUPPORTED_LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-(--fg-soft)">
        ▾
      </span>
    </div>
  );
}
