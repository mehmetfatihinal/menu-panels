"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { MenuItem } from "@/lib/types";
import type { GroupSelectionState } from "@/lib/options";
import {
  initSelections,
  buildSelections,
  isSelectionComplete,
  optionsUnitPrice,
  formatMoney,
} from "@/lib/options";
import { useCart } from "@/lib/cart";
import { useLang, pickLang } from "@/lib/i18n";
import { allergenLabel } from "@/lib/allergens";

export default function ProductModal({
  item,
  currency,
  onClose,
}: {
  item: MenuItem | null;
  currency: string;
  onClose: () => void;
}) {
  const { add } = useCart();
  const { t, lang } = useLang();
  const [added, setAdded] = useState(false);
  const [sel, setSel] = useState<GroupSelectionState>({});
  const [note, setNote] = useState("");
  const itemName = item ? pickLang(item.nameI18n, item.name, lang) : "";

  // Ürün değişince seçimleri varsayılanlara sıfırla
  useEffect(() => {
    setSel(initSelections(item?.options));
    setNote("");
    setAdded(false);
  }, [item?.id]);

  const groups = item?.options ?? [];
  const selections = buildSelections(groups, sel);
  const unit = item ? optionsUnitPrice(item.price, selections) : 0;
  const complete = isSelectionComplete(groups, sel);

  const toggleChoice = (groupId: string, choiceId: string, multi: boolean) => {
    setSel((prev) => {
      const cur = prev[groupId] ?? [];
      if (multi) {
        return {
          ...prev,
          [groupId]: cur.includes(choiceId)
            ? cur.filter((x) => x !== choiceId)
            : [...cur, choiceId],
        };
      }
      return { ...prev, [groupId]: [choiceId] };
    });
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            layoutId={`item-${item.id}`}
            onClick={(e) => e.stopPropagation()}
            className="paper relative z-10 w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <div className="relative h-64 w-full overflow-hidden">
              {item.image ? (
                <motion.img
                  src={item.image}
                  alt={itemName}
                  className="h-full w-full object-cover"
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6 }}
                />
              ) : (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: "url('/marble-bg.jpg')" }}
                >
                  <div className="flex h-full w-full items-center justify-center bg-black/40">
                    <span className="serif text-6xl text-[#c8a34c]/40">
                      {itemName.charAt(0)}
                    </span>
                  </div>
                </div>
              )}
              {!item.available && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                  <span className="sans rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-[#17130d]">
                    {t("notAvailable")}
                  </span>
                </div>
              )}
              <button
                onClick={onClose}
                className="sans absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="serif text-2xl font-bold text-ink">
                  {item.code && (
                    <span className="mr-2 align-middle rounded bg-accent/15 px-1.5 py-0.5 text-base font-semibold text-accent">
                      {item.code}
                    </span>
                  )}
                  {itemName}
                </h2>
                <div className="serif whitespace-nowrap text-2xl font-bold text-accent">
                  {item.price} {currency}
                </div>
              </div>

              {item.tags && item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="sans rounded-full bg-paper-dark px-2.5 py-0.5 text-xs text-ink/70"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <p className="sans mt-3 leading-relaxed text-ink/80">
                {pickLang(item.descriptionI18n, item.description, lang)}
              </p>

              {item.allergens && item.allergens.length > 0 && (
                <div className="mt-4 border-t border-ink/10 pt-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="sans text-xs font-semibold text-ink/60">
                      {lang === "tr"
                        ? "Alerjen & katkı"
                        : lang === "de"
                        ? "Allergene & Zusatzstoffe"
                        : "Allergens & additives"}
                      :
                    </span>
                    {item.allergens.map((code) => (
                      <span
                        key={code}
                        title={allergenLabel(code, lang)}
                        className="sans rounded bg-paper-dark px-1.5 py-0.5 text-[11px] font-medium text-ink/70"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                  <ul className="sans mt-2 space-y-0.5 text-[11px] leading-snug text-ink/55">
                    {item.allergens.map((code) => {
                      const label = allergenLabel(code, lang);
                      return label ? (
                        <li key={code}>
                          <span className="font-semibold">{code}</span> · {label}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}

              {groups.length > 0 && (
                <div className="mt-4 space-y-4 border-t border-ink/10 pt-4">
                  {groups.map((g) => {
                    const picked = sel[g.id] ?? [];
                    return (
                      <div key={g.id}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="sans text-sm font-semibold text-ink">
                            {pickLang(g.name_i18n, "", lang)}
                          </span>
                          <span
                            className={`sans rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              g.required
                                ? "bg-accent/15 text-accent"
                                : "bg-paper-dark text-ink/50"
                            }`}
                          >
                            {g.required ? t("optRequired") : t("optOptional")}
                            {g.multi ? ` · ${t("optChooseMulti")}` : ""}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {g.choices.map((c) => {
                            const on = picked.includes(c.id);
                            return (
                              <label
                                key={c.id}
                                className={`sans flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                                  on
                                    ? "border-accent bg-accent/10"
                                    : "border-ink/10 hover:border-ink/25"
                                }`}
                              >
                                <input
                                  type={g.multi ? "checkbox" : "radio"}
                                  name={`g-${g.id}`}
                                  checked={on}
                                  onChange={() => toggleChoice(g.id, c.id, g.multi)}
                                  className="accent-accent"
                                />
                                <span className="flex-1 text-ink/85">
                                  {pickLang(c.name_i18n, "", lang)}
                                </span>
                                <span className="text-xs text-ink/60">
                                  {c.price_delta > 0
                                    ? `+${formatMoney(c.price_delta)} ${currency}`
                                    : ""}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4">
                <label className="sans mb-1 block text-xs font-medium text-ink/60">
                  {t("noteLabel")}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder={t("notePlaceholder")}
                  className="sans w-full resize-none rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-accent"
                />
              </div>

              <button
                disabled={!item.available || !complete}
                onClick={() => {
                  add(item, { selections, note });
                  setAdded(true);
                  setTimeout(() => setAdded(false), 1200);
                }}
                className="sans mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-[#17130d] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {item.available
                  ? added
                    ? t("added")
                    : `${t("addToCart")} · ${formatMoney(unit)} ${currency}`
                  : t("cannotOrder")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
