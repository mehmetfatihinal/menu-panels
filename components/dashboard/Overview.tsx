"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Menu, Order } from "@/lib/types";

export default function Overview() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const load = async () => {
    const [m, o] = await Promise.all([
      fetch("/api/menu", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/orders", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setMenu(m);
    setOrders(o.orders);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todays = orders.filter((o) => o.createdAt.slice(0, 10) === today);
  const revenue = todays.reduce((s, o) => s + o.total, 0);
  const newOrders = orders.filter((o) => o.status === "yeni").length;
  const products = menu?.categories.flatMap((c) => c.items) ?? [];
  const currency = menu?.restaurant.currency ?? "₺";

  const stats = [
    { label: "Bugünkü Sipariş", value: todays.length, sub: `${orders.length} toplam`, color: "text-blue-600" },
    { label: "Bugünkü Ciro", value: `${revenue} ${currency}`, sub: "bugün", color: "text-emerald-600" },
    { label: "Yeni Sipariş", value: newOrders, sub: "bekliyor", color: "text-accent" },
    { label: "Ürün / Kategori", value: `${products.length} / ${menu?.categories.length ?? 0}`, sub: `${products.filter((p) => !p.available).length} kapalı`, color: "text-amber-600" },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Genel Bakış</h1>
        <p className="text-sm text-gray-500">
          {menu?.restaurant.name} — günün özeti
        </p>
      </div>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs font-medium text-gray-500">{s.label}</div>
            <div className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-gray-400">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Hızlı erişim */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickLink href="/dashboard/menu" title="Menü Yönetimi" desc="Ürün ve kategori ekle, stok aç/kapat" />
        <QuickLink href="/dashboard/masalar" title="Masalar & QR" desc="QR üret, menüyü görüntüle" />
        <QuickLink href="/dashboard/siparisler" title="Siparişler" desc="Canlı sipariş takibi" />
      </div>

      {/* Son siparişler */}
      <div className="card mt-6">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold">Son Siparişler</h2>
          <Link href="/dashboard/siparisler" className="text-sm text-accent hover:underline">
            tümü →
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Henüz sipariş yok.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-400">
              <tr>
                <th className="px-5 py-2 font-medium">Sipariş</th>
                <th className="px-5 py-2 font-medium">Masa</th>
                <th className="px-5 py-2 font-medium">Ürün</th>
                <th className="px-5 py-2 font-medium">Tutar</th>
                <th className="px-5 py-2 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map((o) => (
                <tr key={o.id} className="border-t border-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{o.id}</td>
                  <td className="px-5 py-3 font-medium">Masa {o.table}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {o.lines.reduce((s, l) => s + l.qty, 0)} adet
                  </td>
                  <td className="px-5 py-3 font-semibold">{o.total} {currency}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card p-5 transition hover:shadow-md">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-gray-500">{desc}</div>
      <div className="mt-3 text-sm font-medium text-accent">Aç →</div>
    </Link>
  );
}

export function StatusBadge({ status }: { status: Order["status"] }) {
  const map = {
    yeni: "bg-accent/10 text-accent",
    hazirlaniyor: "bg-amber-100 text-amber-700",
    tamamlandi: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}
