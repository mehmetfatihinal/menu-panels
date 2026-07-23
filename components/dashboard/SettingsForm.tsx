"use client";

import { useEffect, useState } from "react";
import type { Menu } from "@/lib/types";
import UploadButton from "./UploadButton";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

export default function SettingsForm() {
  const { t } = useLang();
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    currency: "₺",
    logo_url: "",
    orders_enabled: true,
  });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Hesap (e-posta / şifre)
  const [acc, setAcc] = useState({ email: "", password: "", password2: "" });
  const [accMsg, setAccMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [accBusy, setAccBusy] = useState(false);

  useEffect(() => {
    fetch("/api/menu", { cache: "no-store" })
      .then((r) => r.json())
      .then((m: Menu) =>
        setForm({
          name: m.restaurant.name,
          tagline: m.restaurant.tagline,
          currency: m.restaurant.currency,
          logo_url: m.restaurant.logoUrl ?? "",
          orders_enabled: m.restaurant.ordersEnabled !== false,
        })
      );
    // mevcut e-postayı doldur
    createClient()
      .auth.getUser()
      .then(({ data }) =>
        setAcc((a) => ({ ...a, email: data.user?.email ?? "" }))
      )
      .catch(() => {});
  }, []);

  const saveAccount = async () => {
    setAccMsg(null);
    if (acc.password && acc.password !== acc.password2) {
      setAccMsg({ ok: false, text: t("pwMismatch") });
      return;
    }
    setAccBusy(true);
    const res = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: acc.email, password: acc.password || undefined }),
    });
    const data = await res.json();
    setAccBusy(false);
    if (!res.ok) {
      setAccMsg({ ok: false, text: data.error || "—" });
      return;
    }
    setAccMsg({
      ok: true,
      text: data.changed ? t("accUpdated") : t("accNoChange"),
    });
    setAcc((a) => ({ ...a, password: "", password2: "" }));
    // şifre/e-posta değiştiyse oturumu tazele
    if (data.changed) createClient().auth.refreshSession().catch(() => {});
  };

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
        <h1 className="text-2xl font-bold">{t("navSettings")}</h1>
        <p className="text-sm text-gray-500">{t("settingsSub")}</p>
      </div>

      <div className="card max-w-lg space-y-4 p-6">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            {t("bizName")}
          </span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">{t("tagline")}</span>
          <input
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="input"
            placeholder="ör. Fine Dining"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            {t("currency")}
          </span>
          <input
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="input w-24"
            maxLength={4}
          />
        </label>

        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500">
            {t("logoLabel")}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#0e0d0b]">
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-400">{t("noLogo")}</span>
              )}
            </div>
            <div className="flex-1">
              <UploadButton
                accept="image/*"
                label={t("uploadLogo")}
                onUploaded={(url) => setForm({ ...form, logo_url: url })}
              />
              {form.logo_url && (
                <button
                  onClick={() => setForm({ ...form, logo_url: "" })}
                  className="mt-1.5 text-xs text-accent hover:underline"
                >
                  {t("removeLogo")}
                </button>
              )}
              <p className="mt-1 text-[11px] text-gray-400">{t("logoHint")}</p>
            </div>
          </div>
        </div>

        {/* Sipariş sistemi — açık: sipariş + masaya özel QR / kapalı: sadece menü + tek QR */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-sm font-medium text-gray-800">
                {t("orderingSystem")}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {form.orders_enabled ? t("orderingOn") : t("orderingOff")}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.orders_enabled}
              onClick={() =>
                setForm({ ...form, orders_enabled: !form.orders_enabled })
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
                form.orders_enabled ? "bg-accent" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  form.orders_enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">{t("orderingHint")}</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-accent px-5 py-2.5 font-medium text-[#17130d] hover:brightness-110 disabled:opacity-50"
          >
            {busy ? t("saving") : t("save")}
          </button>
          {saved && <span className="text-sm text-emerald-600">{t("savedOk")}</span>}
        </div>
      </div>

      {/* Hesap: e-posta / şifre */}
      <div className="card mt-6 max-w-lg space-y-4 p-6">
        <div>
          <h2 className="text-lg font-bold">{t("account")}</h2>
          <p className="text-sm text-gray-500">{t("accountSub")}</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">{t("email")}</span>
          <input
            type="email"
            value={acc.email}
            onChange={(e) => setAcc({ ...acc, email: e.target.value })}
            className="input"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              {t("newPassword")}
            </span>
            <input
              type="password"
              value={acc.password}
              onChange={(e) => setAcc({ ...acc, password: e.target.value })}
              placeholder={t("passwordPlaceholder")}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              {t("newPasswordRepeat")}
            </span>
            <input
              type="password"
              value={acc.password2}
              onChange={(e) => setAcc({ ...acc, password2: e.target.value })}
              className="input"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={saveAccount}
            disabled={accBusy}
            className="rounded-lg bg-[#1c1712] px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {accBusy ? t("updating") : t("updateAccount")}
          </button>
          {accMsg && (
            <span
              className={`text-sm ${accMsg.ok ? "text-emerald-600" : "text-accent"}`}
            >
              {accMsg.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
