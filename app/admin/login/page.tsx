"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, AuthField } from "../../login/page";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: pw }),
      });
      if (!res.ok) {
        setErr("Kullanıcı adı veya şifre hatalı.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Admin Girişi" subtitle="Yönetim paneline erişim">
      <form onSubmit={submit} className="space-y-4">
        <AuthField
          label="Kullanıcı adı"
          type="text"
          value={username}
          onChange={setUsername}
          placeholder="admin"
        />
        <AuthField
          label="Şifre"
          type="password"
          value={pw}
          onChange={setPw}
          placeholder="••••••••"
        />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-accent py-3 font-semibold text-[#17130d] transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>
      </form>
    </AuthShell>
  );
}
