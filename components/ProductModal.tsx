"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { MenuItem } from "@/lib/types";
import { useCart } from "@/lib/cart";

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
  const [added, setAdded] = useState(false);

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
              <motion.img
                src={item.image}
                alt={item.name}
                className="h-full w-full object-cover"
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6 }}
              />
              {!item.available && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                  <span className="sans rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white">
                    Şu an mevcut değil
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
                <h2 className="serif text-2xl font-bold text-ink">{item.name}</h2>
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
                {item.description}
              </p>

              <button
                disabled={!item.available}
                onClick={() => {
                  add(item);
                  setAdded(true);
                  setTimeout(() => setAdded(false), 1200);
                }}
                className="sans mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {item.available
                  ? added
                    ? "Sepete eklendi ✓"
                    : "Sepete Ekle"
                  : "Sipariş edilemez"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
