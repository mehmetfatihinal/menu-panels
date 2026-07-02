"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine, MenuItem } from "./types";
import { playPop } from "./sounds";

type CartContextValue = {
  lines: CartLine[];
  add: (item: MenuItem) => void;
  remove: (itemId: string) => void;
  setQty: (itemId: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
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

  const add = (item: MenuItem) => {
    if (!item.available) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { item, qty: 1 }];
    });
    playPop();
  };

  const remove = (itemId: string) =>
    setLines((prev) => prev.filter((l) => l.item.id !== itemId));

  const setQty = (itemId: string, qty: number) =>
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.item.id !== itemId)
        : prev.map((l) => (l.item.id === itemId ? { ...l, qty } : l))
    );

  const clear = () => setLines([]);

  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const total = useMemo(
    () => lines.reduce((s, l) => s + l.qty * l.item.price, 0),
    [lines]
  );

  return (
    <CartContext.Provider
      value={{ lines, add, remove, setQty, clear, count, total }}
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
