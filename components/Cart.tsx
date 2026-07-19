"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useLang, pickLang } from "@/lib/i18n";
import { formatMoney, lineTotal } from "@/lib/options";

export default function Cart({
  table,
  slug,
  currency,
  open,
  onClose,
}: {
  table: string;
  slug: string;
  currency: string;
  open: boolean;
  onClose: () => void;
}) {
  const { lines, setQty, remove, clear, total, count, lineKey, lineUnitPrice } =
    useCart();
  const { t, lang } = useLang();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          table,
          lines: lines.map((l) => ({
            id: l.item.id,
            qty: l.qty,
            selections: (l.selections ?? []).map((s) => ({
              groupId: s.groupId,
              choiceId: s.choiceId,
            })),
            note: l.note,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sipariş gönderilemedi");
      setDone(data.order.id);
      clear();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="paper fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
          >
            <header className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
              <div>
                <h2 className="serif text-xl font-bold text-ink">{t("yourOrder")}</h2>
                <p className="sans text-xs text-ink/60">
                  {table === "Genel" ? t("sharedMenuShort") : `${t("table")} ${table}`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="sans flex h-9 w-9 items-center justify-center rounded-full bg-paper-dark text-ink hover:brightness-95"
              >
                ✕
              </button>
            </header>

            <div className="thin-scroll flex-1 overflow-y-auto px-5 py-4">
              {done ? (
                <div className="float-up mt-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-3xl text-white">
                    ✓
                  </div>
                  <h3 className="serif mt-4 text-xl font-bold text-ink">
                    {t("orderReceived")}
                  </h3>
                  <p className="sans mt-1 text-ink/70">
                    {t("orderNo")}: <b>{done}</b>
                  </p>
                  <p className="sans mt-1 text-sm text-ink/60">
                    {table === "Genel" ? t("sharedMenuShort") : `${t("table")} ${table}`}{" "}
                    — {t("sentToKitchen")}
                  </p>
                  <button
                    onClick={() => setDone(null)}
                    className="sans mt-6 rounded-lg border border-ink/20 px-4 py-2 text-ink hover:bg-paper-dark"
                  >
                    {t("backToMenu")}
                  </button>
                </div>
              ) : lines.length === 0 ? (
                <div className="mt-16 text-center text-ink/50">
                  <p className="serif text-lg">{t("emptyCart")}</p>
                  <p className="sans mt-1 text-sm">{t("emptyCartHint")}</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {lines.map((l) => {
                    const key = lineKey(l);
                    const unit = lineUnitPrice(l);
                    return (
                      <li key={key} className="flex gap-3 rounded-xl bg-(--row-hover) p-3">
                        {l.item.image ? (
                          <img
                            src={l.item.image}
                            alt=""
                            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-(--thumb-bg)">
                            <span className="serif text-xl text-accent/60">
                              {pickLang(l.item.nameI18n, l.item.name, lang).charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between gap-2">
                            <span className="serif font-semibold text-ink">
                              {pickLang(l.item.nameI18n, l.item.name, lang)}
                            </span>
                            <button
                              onClick={() => remove(key)}
                              className="sans text-xs text-accent hover:underline"
                            >
                              {t("remove")}
                            </button>
                          </div>
                          {l.selections && l.selections.length > 0 && (
                            <ul className="sans mt-1 space-y-0.5 text-xs text-ink/55">
                              {l.selections.map((s) => (
                                <li key={s.choiceId}>
                                  + {pickLang(s.choiceName_i18n, "", lang)}
                                  {s.price_delta > 0
                                    ? ` (+${formatMoney(s.price_delta)} ${currency})`
                                    : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                          {l.note && (
                            <p className="sans mt-1 text-xs italic text-ink/55">
                              “{l.note}”
                            </p>
                          )}
                          <div className="sans mt-1 text-sm text-ink/60">
                            {formatMoney(unit)} {currency}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => setQty(key, l.qty - 1)}
                              className="sans flex h-7 w-7 items-center justify-center rounded-full bg-paper-dark text-ink"
                            >
                              −
                            </button>
                            <span className="sans w-6 text-center font-semibold">
                              {l.qty}
                            </span>
                            <button
                              onClick={() => setQty(key, l.qty + 1)}
                              className="sans flex h-7 w-7 items-center justify-center rounded-full bg-paper-dark text-ink"
                            >
                              +
                            </button>
                            <span className="sans ml-auto font-semibold text-ink">
                              {formatMoney(lineTotal(unit, l.qty))} {currency}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {!done && lines.length > 0 && (
              <footer className="border-t border-ink/10 px-5 py-4">
                {error && (
                  <p className="sans mb-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
                    {error}
                  </p>
                )}
                <div className="mb-3 flex items-center justify-between">
                  <span className="sans text-ink/70">
                    {t("total")} ({count} {t("items")})
                  </span>
                  <span className="serif text-2xl font-bold text-ink">
                    {formatMoney(total)} {currency}
                  </span>
                </div>
                <button
                  onClick={submit}
                  disabled={sending}
                  className="sans w-full rounded-xl bg-accent py-3.5 font-semibold text-(--on-accent) transition hover:brightness-110 disabled:opacity-50"
                >
                  {sending ? t("sending") : t("confirmOrder")}
                </button>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
