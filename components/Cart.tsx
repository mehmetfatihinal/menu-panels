"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useCart } from "@/lib/cart";

export default function Cart({
  table,
  currency,
  open,
  onClose,
}: {
  table: string;
  currency: string;
  open: boolean;
  onClose: () => void;
}) {
  const { lines, setQty, remove, clear, total, count } = useCart();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table,
          lines: lines.map((l) => ({ id: l.item.id, qty: l.qty })),
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
                <h2 className="serif text-xl font-bold text-ink">Siparişin</h2>
                <p className="sans text-xs text-ink/60">
                  {table === "Genel" ? "Ortak menü" : `Masa ${table}`}
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
                    Siparişin alındı!
                  </h3>
                  <p className="sans mt-1 text-ink/70">
                    Sipariş no: <b>{done}</b>
                  </p>
                  <p className="sans mt-1 text-sm text-ink/60">
                    {table === "Genel" ? "Ortak menü" : `Masa ${table}`} — mutfağa
                    iletildi.
                  </p>
                  <button
                    onClick={() => setDone(null)}
                    className="sans mt-6 rounded-lg border border-ink/20 px-4 py-2 text-ink hover:bg-paper-dark"
                  >
                    Menüye dön
                  </button>
                </div>
              ) : lines.length === 0 ? (
                <div className="mt-16 text-center text-ink/50">
                  <p className="serif text-lg">Sepetin boş</p>
                  <p className="sans mt-1 text-sm">
                    Menüden ürünlere dokunarak ekle.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {lines.map((l) => (
                    <li
                      key={l.item.id}
                      className="flex gap-3 rounded-xl bg-white/40 p-3"
                    >
                      <img
                        src={l.item.image}
                        alt=""
                        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between gap-2">
                          <span className="serif font-semibold text-ink">
                            {l.item.name}
                          </span>
                          <button
                            onClick={() => remove(l.item.id)}
                            className="sans text-xs text-accent hover:underline"
                          >
                            kaldır
                          </button>
                        </div>
                        <div className="sans mt-1 text-sm text-ink/60">
                          {l.item.price} {currency}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => setQty(l.item.id, l.qty - 1)}
                            className="sans flex h-7 w-7 items-center justify-center rounded-full bg-paper-dark text-ink"
                          >
                            −
                          </button>
                          <span className="sans w-6 text-center font-semibold">
                            {l.qty}
                          </span>
                          <button
                            onClick={() => setQty(l.item.id, l.qty + 1)}
                            className="sans flex h-7 w-7 items-center justify-center rounded-full bg-paper-dark text-ink"
                          >
                            +
                          </button>
                          <span className="sans ml-auto font-semibold text-ink">
                            {l.qty * l.item.price} {currency}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
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
                    Toplam ({count} ürün)
                  </span>
                  <span className="serif text-2xl font-bold text-ink">
                    {total} {currency}
                  </span>
                </div>
                <button
                  onClick={submit}
                  disabled={sending}
                  className="sans w-full rounded-xl bg-accent py-3.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {sending ? "Gönderiliyor…" : "Siparişi Onayla"}
                </button>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
