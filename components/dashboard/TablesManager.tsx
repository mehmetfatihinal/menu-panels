"use client";

import { QRCodeCanvas } from "qrcode.react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

type TableRow = { id: string; label: string };

export default function TablesManager() {
  const { t } = useLang();
  const [origin, setOrigin] = useState("");
  const [slug, setSlug] = useState("");
  const [tables, setTables] = useState<TableRow[]>([]);
  const [target, setTarget] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch("/api/tables", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setSlug(data.slug);
    const rows = data.tables as TableRow[];
    setTables(rows);
    setTarget(Math.max(1, rows.length)); // kutu her zaman gerçek sayıyı gösterir
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, []);

  const sorted = [...tables].sort(
    (a, b) => (parseInt(a.label) || 0) - (parseInt(b.label) || 0)
  );

  // Masa sayısını tam olarak n yap: eksikleri (1..n) oluştur, fazlaları sil
  const applyCount = async (n: number) => {
    n = Math.max(0, Math.min(200, Math.floor(n || 0)));
    setBusy(true);
    if (n > 0) {
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: n }),
      });
    }
    const extras = tables.filter((t) => {
      const num = parseInt(t.label);
      return isNaN(num) || num > n;
    });
    await Promise.all(
      extras.map((t) => fetch(`/api/tables?id=${t.id}`, { method: "DELETE" }))
    );
    await load();
    setBusy(false);
  };

  const removeOne = async (id: string) => {
    setBusy(true);
    await fetch(`/api/tables?id=${id}`, { method: "DELETE" });
    await load();
    setBusy(false);
  };

  const url = (label: string) => `${origin}/r/${slug}/masa/${label}`;

  const copy = (label: string) => {
    navigator.clipboard?.writeText(url(label));
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("tablesTitle")}</h1>
          <p className="text-sm text-gray-500">
            {t("total")} <b>{tables.length}</b> {t("tablesWord")} · {t("tablesEach")}
          </p>
        </div>
        {slug && (
          <Link
            href={`/r/${slug}/menu`}
            target="_blank"
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-[#17130d] transition hover:brightness-110 print:hidden"
          >
            {t("viewSharedMenu")}
          </Link>
        )}
      </div>

      {/* Masa sayısı kontrolü */}
      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4 print:hidden">
        <span className="text-sm font-medium text-gray-600">{t("tableCountLabel")}</span>
        <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
          <button
            onClick={() => applyCount(Math.max(0, tables.length - 1))}
            disabled={busy || tables.length === 0}
            className="px-3 py-2 text-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={200}
            value={target}
            onChange={(e) => setTarget(Math.max(0, Math.min(200, +e.target.value || 0)))}
            className="w-16 border-x border-gray-300 py-2 text-center outline-none"
          />
          <button
            onClick={() => applyCount(tables.length + 1)}
            disabled={busy}
            className="px-3 py-2 text-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            +
          </button>
        </div>
        <button
          onClick={() => applyCount(target)}
          disabled={busy}
          className="rounded-lg bg-[#1c1712] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("applying") : t("apply")}
        </button>
        <span className="text-xs text-gray-400">{t("applyHint")}</span>
        <button
          onClick={() => window.print()}
          className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t("print")}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">{t("noTables")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((tbl) => (
            <div key={tbl.id} className="card flex flex-col items-center p-5">
              <div className="rounded-xl bg-white p-2">
                {origin && slug && (
                  <QRCodeCanvas value={url(tbl.label)} size={150} level="M" marginSize={2} />
                )}
              </div>
              <div className="mt-3 text-lg font-bold">{t("thTable")} {tbl.label}</div>
              <div className="text-[11px] text-gray-400">
                /r/{slug}/masa/{tbl.label}
              </div>
              <div className="mt-4 flex w-full gap-2 print:hidden">
                <button
                  onClick={() => copy(tbl.label)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  {copied === tbl.label ? t("copied") : t("copyLink")}
                </button>
                <button
                  onClick={() => removeOne(tbl.id)}
                  disabled={busy}
                  className="rounded-lg px-3 text-sm text-accent hover:bg-accent/10 disabled:opacity-40"
                  title={t("deleteTableTitle")}
                >
                  {t("del")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
