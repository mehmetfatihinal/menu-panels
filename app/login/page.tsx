"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });
      if (error) {
        setErr("E-posta veya şifre hatalı.");
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
    <AuthShell title="İşletme Girişi" subtitle="Panelinize erişmek için giriş yapın">
      <form onSubmit={submit} className="space-y-4">
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
      <p className="mt-5 text-center text-sm text-white/50">
        Hesabın yok mu?{" "}
        <Link href="/signup" className="text-accent-2 hover:underline">
          İşletme kaydı oluştur
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-2xl font-bold text-[#17130d]">
            M
          </div>
          <h1 className="serif text-2xl font-bold text-white">{title}</h1>
          <p className="sans mt-1 text-sm text-white/50">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          {children}
        </div>
      </div>
    </main>
  );
}

export function AuthField({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-white/60">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white placeholder-white/30 outline-none focus:border-accent"
      />
    </label>
  );
}
