"use client";

import { useLang, LANGS } from "@/lib/i18n";

// Koyu zeminler için dil seçici (menü üst çubuğu + panel sidebar)
export default function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-(--chip-border) bg-(--chip-bg) p-0.5 backdrop-blur">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`sans rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition ${
            lang === l ? "bg-accent text-(--on-accent)" : "text-(--chip-fg) hover:text-(--fg)"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
