"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Menu, Order } from "@/lib/types";
import { useLang, statusLabel } from "@/lib/i18n";

export default function Overview() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const { t } = useLang();

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
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todays = orders.filter((o) => o.createdAt.slice(0, 10) === today);
  const revenue = todays.reduce((s, o) => s + o.total, 0);
  const newOrders = orders.filter((o) => o.status === "yeni").length;
  const products = menu?.categories.flatMap((c) => c.items) ?? [];
  const currency = menu?.restaurant.currency ?? "₺";

  const stats = [
    { label: t("statTodayOrders"), value: todays.length, sub: `${orders.length} ${t("subTotal")}`, color: "text-blue-600" },
    { label: t("statTodayRevenue"), value: `${revenue} ${currency}`, sub: t("subToday"), color: "text-emerald-600" },
    { label: t("statNewOrders"), value: newOrders, sub: t("subWaiting"), color: "text-accent" },
    { label: t("statProdCat"), value: `${products.length} / ${menu?.categories.length ?? 0}`, sub: `${products.filter((p) => !p.available).length} ${t("subClosed")}`, color: "text-amber-600" },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("navOverview")}</h1>
        <p className="text-sm text-gray-500">
          {menu?.restaurant.name} — {t("overviewSub")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs font-medium text-gray-500">{s.label}</div>
            <div className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-gray-400">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickLink href="/dashboard/menu" title={t("navMenu")} desc={t("quickMenuDesc")} open={t("openArrow")} />
        <QuickLink href="/dashboard/masalar" title={t("navTables")} desc={t("quickTablesDesc")} open={t("openArrow")} />
        <QuickLink href="/dashboard/siparisler" title={t("navOrders")} desc={t("quickOrdersDesc")} open={t("openArrow")} />
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold">{t("recentOrders")}</h2>
          <Link href="/dashboard/siparisler" className="text-sm text-accent hover:underline">
            {t("allArrow")}
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">{t("noOrders")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-400">
              <tr>
                <th className="px-5 py-2 font-medium">{t("thOrder")}</th>
                <th className="px-5 py-2 font-medium">{t("thTable")}</th>
                <th className="px-5 py-2 font-medium">{t("thProduct")}</th>
                <th className="px-5 py-2 font-medium">{t("thAmount")}</th>
                <th className="px-5 py-2 font-medium">{t("thStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map((o) => (
                <tr key={o.id} className="border-t border-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{o.id}</td>
                  <td className="px-5 py-3 font-medium">{t("thTable")} {o.table}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {o.lines.reduce((s, l) => s + l.qty, 0)} {t("qtyUnit")}
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

function QuickLink({ href, title, desc, open }: { href: string; title: string; desc: string; open: string }) {
  return (
    <Link href={href} className="card p-5 transition hover:shadow-md">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-gray-500">{desc}</div>
      <div className="mt-3 text-sm font-medium text-accent">{open}</div>
    </Link>
  );
}

export function StatusBadge({ status }: { status: Order["status"] }) {
  const { t } = useLang();
  const map = {
    yeni: "bg-accent/10 text-accent",
    hazirlaniyor: "bg-amber-100 text-amber-700",
    tamamlandi: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status]}`}>
      {statusLabel(status, t)}
    </span>
  );
}
