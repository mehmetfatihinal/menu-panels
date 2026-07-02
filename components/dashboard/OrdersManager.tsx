"use client";

import { useEffect, useState } from "react";
import type { Menu, Order } from "@/lib/types";
import { StatusBadge } from "./Overview";

const FILTERS: { key: "hepsi" | Order["status"]; label: string }[] = [
  { key: "hepsi", label: "Hepsi" },
  { key: "yeni", label: "Yeni" },
  { key: "hazirlaniyor", label: "Hazırlanıyor" },
  { key: "tamamlandi", label: "Tamamlandı" },
];

export default function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currency, setCurrency] = useState("₺");
  const [filter, setFilter] = useState<"hepsi" | Order["status"]>("hepsi");

  const load = async () => {
    const [o, m] = await Promise.all([
      fetch("/api/orders", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/menu", { cache: "no-store" }).then((r) => r.json()) as Promise<Menu>,
    ]);
    setOrders(o.orders);
    setCurrency(m.restaurant.currency);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const setStatus = async (id: string, status: Order["status"]) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  };

  const shown = orders.filter((o) => filter === "hepsi" || o.status === filter);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Siparişler</h1>
        <p className="text-sm text-gray-500">Canlı sipariş takibi (4 sn'de bir yenilenir)</p>
      </div>

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => {
          const n = f.key === "hepsi" ? orders.length : orders.filter((o) => o.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                filter === f.key ? "bg-accent text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {f.label} <span className="opacity-60">({n})</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">Sipariş yok.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {shown.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">Masa {o.table}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="font-mono text-xs text-gray-400">{o.id}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{o.total} {currency}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(o.createdAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm text-gray-600">
                {o.lines.map((l) => (
                  <li key={l.id} className="flex justify-between">
                    <span>{l.qty}× {l.name}</span>
                    <span>{l.price * l.qty} {currency}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setStatus(o.id, "hazirlaniyor")}
                  className="flex-1 rounded-lg bg-amber-100 py-2 text-sm font-medium text-amber-700 hover:bg-amber-200"
                >
                  Hazırlanıyor
                </button>
                <button
                  onClick={() => setStatus(o.id, "tamamlandi")}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:brightness-110"
                >
                  Tamamlandı
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
