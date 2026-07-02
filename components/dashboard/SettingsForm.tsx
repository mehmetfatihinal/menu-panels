"use client";

import { useEffect, useState } from "react";
import type { Menu } from "@/lib/types";

export default function SettingsForm() {
  const [form, setForm] = useState({ name: "", tagline: "", currency: "₺" });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/menu", { cache: "no-store" })
      .then((r) => r.json())
      .then((m: Menu) => setForm(m.restaurant));
  }, []);

  const save = async () => {
    setBusy(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-sm text-gray-500">Restoran bilgileri</p>
      </div>

      <div className="card max-w-lg space-y-4 p-6">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Restoran adı
          </span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Slogan</span>
          <input
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Para birimi
          </span>
          <input
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="input w-24"
            maxLength={4}
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
          {saved && <span className="text-sm text-emerald-600">✓ Kaydedildi</span>}
        </div>
      </div>
    </div>
  );
}
