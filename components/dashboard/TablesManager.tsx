"use client";

import { QRCodeCanvas } from "qrcode.react";
import Link from "next/link";
import { useEffect, useState } from "react";


export default function TablesManager() {
  const [origin, setOrigin] = useState("");
  const [count, setCount] = useState(8);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    const saved = localStorage.getItem("mp-table-count");
    if (saved) setCount(Math.max(1, Math.min(60, +saved || 8)));
  }, []);

  const updateCount = (n: number) => {
    const v = Math.max(1, Math.min(60, n || 1));
    setCount(v);
    localStorage.setItem("mp-table-count", String(v));
  };

  const tables = Array.from({ length: count }, (_, i) => String(i + 1));

  const copy = (t: string) => {
    navigator.clipboard?.writeText(`${origin}/masa/${t}`);
    setCopied(t);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Masalar & QR Kodları</h1>
          <p className="text-sm text-gray-500">
            Her masanın QR kodu farklıdır → siparişte masa numarası bellidir.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Link
            href="/menu"
            target="_blank"
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:brightness-110"
          >
            Ortak Menüyü Gör ↗
          </Link>
          <label className="ml-2 text-sm text-gray-500">Masa sayısı</label>
          <input
            type="number"
            min={1}
            max={60}
            value={count}
            onChange={(e) => updateCount(+e.target.value)}
            className="input w-20"
          />
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-[#1c1712] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Yazdır
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.map((t) => (
          <div key={t} className="card flex flex-col items-center p-5">
            <div className="rounded-xl bg-white p-2">
              {origin && (
                <QRCodeCanvas
                  value={`${origin}/masa/${t}`}
                  size={150}
                  level="M"
                  marginSize={2}
                />
              )}
            </div>
            <div className="mt-3 text-lg font-bold">Masa {t}</div>
            <div className="text-[11px] text-gray-400">/masa/{t}</div>

            <button
              onClick={() => copy(t)}
              className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50 print:hidden"
              title="Bu masanın sipariş bağlantısını kopyala"
            >
              {copied === t ? "✓ Kopyalandı" : "Masa bağlantısını kopyala"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
