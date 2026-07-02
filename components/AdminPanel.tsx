"use client";

import { useEffect, useState } from "react";
import type { Menu, Order } from "@/lib/types";

export default function AdminPanel({ initialMenu }: { initialMenu: Menu }) {
  const [menu, setMenu] = useState<Menu>(initialMenu);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"stok" | "siparisler">("stok");
  const currency = menu.restaurant.currency;

  const loadOrders = async () => {
    const res = await fetch("/api/orders", { cache: "no-store" });
    if (res.ok) setOrders((await res.json()).orders);
  };

  useEffect(() => {
    loadOrders();
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, []);

  const toggle = async (itemId: string, available: boolean) => {
    // iyimser güncelleme
    setMenu((m) => ({
      ...m,
      categories: m.categories.map((c) => ({
        ...c,
        items: c.items.map((i) =>
          i.id === itemId ? { ...i, available } : i
        ),
      })),
    }));
    await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, available }),
    });
  };

  const setStatus = async (id: string, status: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  };

  const newCount = orders.filter((o) => o.status === "yeni").length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 text-white">
      <div className="flex items-center justify-between">
        <h1 className="serif text-3xl font-bold">Admin Paneli</h1>
        <a href="/" className="sans text-sm text-white/60 hover:text-white">
          ← ana sayfa
        </a>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setTab("stok")}
          className={`sans rounded-full px-4 py-2 text-sm ${
            tab === "stok" ? "bg-paper text-ink" : "bg-white/10"
          }`}
        >
          Stok / Ürünler
        </button>
        <button
          onClick={() => setTab("siparisler")}
          className={`sans relative rounded-full px-4 py-2 text-sm ${
            tab === "siparisler" ? "bg-paper text-ink" : "bg-white/10"
          }`}
        >
          Siparişler
          {newCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
              {newCount}
            </span>
          )}
        </button>
      </div>

      {tab === "stok" ? (
        <div className="mt-6 space-y-6">
          {menu.categories.map((cat) => (
            <section key={cat.id}>
              <h2 className="serif mb-2 text-xl font-semibold text-accent-2">
                {cat.name}
              </h2>
              <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
                {cat.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 p-3"
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="serif font-semibold">{item.name}</div>
                      <div className="sans text-sm text-white/50">
                        {item.price} {currency}
                      </div>
                    </div>
                    <span
                      className={`sans text-sm ${
                        item.available ? "text-green-400" : "text-white/40"
                      }`}
                    >
                      {item.available ? "Sipariş açık" : "Kapalı"}
                    </span>
                    <button
                      onClick={() => toggle(item.id, !item.available)}
                      className={`relative h-7 w-12 rounded-full transition ${
                        item.available ? "bg-green-500" : "bg-white/20"
                      }`}
                      aria-label="Stok durumunu değiştir"
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                          item.available ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.length === 0 && (
            <p className="sans text-white/50">Henüz sipariş yok.</p>
          )}
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="serif text-lg font-bold">Masa {o.table}</span>
                  <span className="sans ml-2 text-sm text-white/50">{o.id}</span>
                </div>
                <span
                  className={`sans rounded-full px-3 py-1 text-xs font-semibold ${
                    o.status === "yeni"
                      ? "bg-accent text-white"
                      : o.status === "hazirlaniyor"
                      ? "bg-accent-2 text-ink"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {o.status}
                </span>
              </div>
              <ul className="sans mt-2 text-sm text-white/70">
                {o.lines.map((l) => (
                  <li key={l.id}>
                    {l.qty}× {l.name} — {l.price * l.qty} {currency}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between">
                <span className="serif font-bold">
                  Toplam: {o.total} {currency}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus(o.id, "hazirlaniyor")}
                    className="sans rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
                  >
                    Hazırlanıyor
                  </button>
                  <button
                    onClick={() => setStatus(o.id, "tamamlandi")}
                    className="sans rounded-lg bg-green-600 px-3 py-1.5 text-sm hover:brightness-110"
                  >
                    Tamamlandı
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
