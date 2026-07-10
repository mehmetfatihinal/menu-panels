"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine, MenuItem } from "./types";
import type { CartSelection } from "./options";
import { lineKeyFor, optionsUnitPrice, lineTotal, roundMoney } from "./options";
import { playPop } from "./sounds";

type AddOptions = { selections?: CartSelection[]; note?: string };

type CartContextValue = {
  lines: CartLine[];
  add: (item: MenuItem, opts?: AddOptions) => void;
  remove: (lineKey: string) => void;
  setQty: (lineKey: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
  lineKey: (l: CartLine) => string;
  lineUnitPrice: (l: CartLine) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  table,
  children,
}: {
  table: string;
  children: React.ReactNode;
}) {
  const storageKey = `mp-cart-${table}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // localStorage'dan yükle
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, [storageKey]);

  // değişiklikleri kaydet
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {}
  }, [lines, storageKey, hydrated]);

  // Satır anahtarı = ürün + seçili choiceId'ler (not hariç). Aynı ürün+aynı seçim birleşir.
  const keyOf = (l: CartLine) => lineKeyFor(l.item.id, l.selections);
  const unitOf = (l: CartLine) => optionsUnitPrice(l.item.price, l.selections);

  const add = (item: MenuItem, opts?: AddOptions) => {
    if (!item.available) return;
    const selections =
      opts?.selections && opts.selections.length ? opts.selections : undefined;
    const note = opts?.note?.trim() ? opts.note.trim() : undefined;
    const key = lineKeyFor(item.id, selections);
    setLines((prev) => {
      const existing = prev.find((l) => keyOf(l) === key);
      if (existing) {
        return prev.map((l) =>
          keyOf(l) === key ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { item, qty: 1, selections, note }];
    });
    playPop();
  };

  const remove = (key: string) =>
    setLines((prev) => prev.filter((l) => keyOf(l) !== key));

  const setQty = (key: string, qty: number) =>
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => keyOf(l) !== key)
        : prev.map((l) => (keyOf(l) === key ? { ...l, qty } : l))
    );

  const clear = () => setLines([]);

  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const total = useMemo(
    () =>
      roundMoney(
        lines.reduce(
          (s, l) =>
            s + lineTotal(optionsUnitPrice(l.item.price, l.selections), l.qty),
          0
        )
      ),
    [lines]
  );

  return (
    <CartContext.Provider
      value={{
        lines,
        add,
        remove,
        setQty,
        clear,
        count,
        total,
        lineKey: keyOf,
        lineUnitPrice: unitOf,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
