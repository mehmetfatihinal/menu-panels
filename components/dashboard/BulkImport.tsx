"use client";

import { useMemo, useState } from "react";

type ParsedItem = { name: string; price: number; description: string };
type ParsedCat = { name: string; items: ParsedItem[] };

// Metni kategori + ürünlere ayrıştırır.
// "#" ile başlayan satır = kategori. Diğer satırlar = ürün: Ad | fiyat | açıklama
export function parseBulk(text: string): ParsedCat[] {
  const cats: ParsedCat[] = [];
  let current: ParsedCat | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#") || (line.startsWith("[") && line.endsWith("]"))) {
      const name = line.replace(/^#+/, "").replace(/^\[|\]$/g, "").trim();
      if (name) {
        current = { name, items: [] };
        cats.push(current);
      }
      continue;
    }
    if (!current) {
      current = { name: "Menü", items: [] };
      cats.push(current);
    }
    const parts = line.split("|").map((s) => s.trim());
    const name = parts[0];
    if (!name) continue;
    const price = parts[1] ? Number(parts[1].replace(",", ".").replace(/[^\d.]/g, "")) || 0 : 0;
    current.items.push({ name, price, description: parts[2] || "" });
  }
  return cats.filter((c) => c.items.length > 0);
}

const EXAMPLE = `# Ana Yemek
Kabuli Pulao | 320
Chapli Kebab | 280 | Baharatlı köfte
Qorma

# Tatlı
Firni
Sheer Yakh | 90`;

export default function BulkImport({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const parsed = useMemo(() => parseBulk(text), [text]);
  const totalItems = parsed.reduce((s, c) => s + c.items.length, 0);

  const submit = async () => {
    if (parsed.length === 0) return;
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: parsed }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setResult(data.error || "Eklenemedi");
      return;
    }
    setResult(`✓ ${data.categories} kategori, ${data.products} ürün eklendi.`);
    onDone();
    setText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-bold">Toplu Ekle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-gray-500">
              <b>#</b> ile başlayan satır = kategori. Diğer satırlar ürün:
              <br />
              <code className="text-[11px]">Ad | fiyat | açıklama</code> (fiyat/açıklama isteğe bağlı)
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE}
              className="h-72 w-full resize-none rounded-lg border border-gray-300 p-3 font-mono text-sm outline-none focus:border-accent"
            />
            <button
              onClick={() => setText(EXAMPLE)}
              className="mt-2 text-xs text-accent hover:underline"
            >
              Örnek doldur
            </button>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="mb-2 text-xs font-medium text-gray-500">
              Önizleme — {parsed.length} kategori, {totalItems} ürün
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {parsed.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Sol tarafa yapıştır, burada önizleme görünecek.
                </p>
              ) : (
                parsed.map((c, i) => (
                  <div key={i}>
                    <div className="text-sm font-semibold text-gray-800">{c.name}</div>
                    <ul className="ml-3 text-sm text-gray-600">
                      {c.items.map((it, j) => (
                        <li key={j} className="flex justify-between">
                          <span>{it.name}</span>
                          {it.price > 0 && <span className="text-gray-400">{it.price}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
          <span className="text-sm text-gray-500">{result}</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-gray-600 hover:bg-gray-50"
            >
              Kapat
            </button>
            <button
              onClick={submit}
              disabled={busy || totalItems === 0}
              className="rounded-lg bg-accent px-5 py-2.5 font-medium text-[#17130d] hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Ekleniyor…" : `${totalItems} ürünü ekle`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
