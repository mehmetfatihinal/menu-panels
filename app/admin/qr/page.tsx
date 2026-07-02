"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";

export default function QrPage() {
  const [origin, setOrigin] = useState("");
  const [count, setCount] = useState(8);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const tables = Array.from({ length: count }, (_, i) => String(i + 1));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-white">
      <div className="flex items-center justify-between">
        <h1 className="serif text-3xl font-bold">Masa QR Kodları</h1>
        <a href="/" className="sans text-sm text-white/60 hover:text-white">
          ← ana sayfa
        </a>
      </div>

      <p className="sans mt-2 max-w-2xl text-white/70">
        Her masanın QR kodu farklı bir adrese gider (
        <code className="rounded bg-white/10 px-1">/masa/&lt;no&gt;</code>), böylece
        gelen siparişte hangi masadan geldiği bellidir. Yazdırıp masalara koyun.
      </p>

      <div className="mt-5 flex items-center gap-3 print:hidden">
        <label className="sans text-sm text-white/70">Masa sayısı</label>
        <input
          type="number"
          min={1}
          max={60}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(60, +e.target.value || 1)))}
          className="sans w-20 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-white"
        />
        <button
          onClick={() => window.print()}
          className="sans rounded-lg bg-paper px-4 py-1.5 font-semibold text-ink hover:brightness-95"
        >
          Yazdır
        </button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {tables.map((t) => (
          <div
            key={t}
            className="flex flex-col items-center rounded-2xl bg-white p-4 text-ink"
          >
            {origin && (
              <QRCodeCanvas
                value={`${origin}/masa/${t}`}
                size={160}
                level="M"
                marginSize={2}
              />
            )}
            <div className="serif mt-3 text-lg font-bold">Masa {t}</div>
            <div className="sans text-[11px] text-ink/50">
              /masa/{t}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
