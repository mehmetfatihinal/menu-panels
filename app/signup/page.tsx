"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, AuthField } from "../login/page";

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      // 1) İşletme + kullanıcı oluştur (sunucu, service-role)
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, email, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Kayıt başarısız.");
        return;
      }

      // 2) Otomatik giriş
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });
      if (error) {
        setErr("Hesap oluşturuldu ancak giriş yapılamadı. Giriş sayfasından deneyin.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="İşletme Kaydı"
      subtitle="Menünüzü dakikalar içinde yayına alın"
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthField
          label="İşletme adı"
          type="text"
          value={businessName}
          onChange={setBusinessName}
          placeholder="Crystal Restaurant"
        />
        <AuthField
          label="E-posta"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="ornek@isletme.com"
        />
        <AuthField
          label="Şifre"
          type="password"
          value={pw}
          onChange={setPw}
          placeholder="en az 6 karakter"
        />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-accent py-3 font-semibold text-[#17130d] transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Oluşturuluyor…" : "İşletme Oluştur"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-white/50">
        Zaten hesabın var mı?{" "}
        <Link href="/login" className="text-accent-2 hover:underline">
          Giriş yap
        </Link>
      </p>
    </AuthShell>
  );
}
