"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminRow } from "@/lib/admin-data";

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* boş gövde */
  }
  return { ok: res.ok, data };
}

const inputCls =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-accent";

export default function AdminDashboard({ rows }: { rows: AdminRow[] }) {
  const router = useRouter();

  // İşletme oluştur formu
  const [biz, setBiz] = useState({ businessName: "", email: "", password: "" });
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const createBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    setCreateBusy(true);
    const { ok, data } = await postJSON("/api/admin/create-business", biz);
    setCreateBusy(false);
    if (!ok) {
      setCreateMsg({ ok: false, text: data.error || "Oluşturulamadı." });
      return;
    }
    setCreateMsg({ ok: true, text: `İşletme oluşturuldu (slug: ${data.slug}).` });
    setBiz({ businessName: "", email: "", password: "" });
    router.refresh();
  };

  const logout = async () => {
    await postJSON("/api/admin/logout", {});
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 text-white">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="serif text-2xl font-bold">Admin Paneli</h1>
          <p className="sans text-sm text-white/50">
            İşletmeler ve kullanıcı yönetimi
          </p>
        </div>
        <button
          onClick={logout}
          className="sans rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          Çıkış
        </button>
      </div>

      {/* İşletme oluştur */}
      <section className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="serif mb-1 text-lg font-semibold text-accent-2">
          Yeni İşletme Oluştur
        </h2>
        <p className="sans mb-4 text-sm text-white/50">
          İşletme adı, e-posta ve şifre ile yeni hesap açar.
        </p>
        <form
          onSubmit={createBusiness}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <input
            className={inputCls}
            placeholder="İşletme adı"
            value={biz.businessName}
            onChange={(e) => setBiz({ ...biz, businessName: e.target.value })}
            required
          />
          <input
            className={inputCls}
            type="email"
            placeholder="E-posta"
            value={biz.email}
            onChange={(e) => setBiz({ ...biz, email: e.target.value })}
            required
          />
          <input
            className={inputCls}
            type="text"
            placeholder="Şifre (en az 6)"
            value={biz.password}
            onChange={(e) => setBiz({ ...biz, password: e.target.value })}
            required
          />
          <div className="sm:col-span-3 flex items-center gap-3">
            <button
              disabled={createBusy}
              className="sans rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-[#17130d] transition hover:brightness-110 disabled:opacity-50"
            >
              {createBusy ? "Oluşturuluyor…" : "Oluştur"}
            </button>
            {createMsg && (
              <span
                className={`sans text-sm ${
                  createMsg.ok ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {createMsg.text}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* İşletme / kullanıcı listesi */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="serif mb-4 text-lg font-semibold text-accent-2">
          İşletmeler &amp; Kullanıcılar{" "}
          <span className="sans text-sm font-normal text-white/40">
            ({rows.length})
          </span>
        </h2>

        <div className="overflow-x-auto">
          <table className="sans w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/50">
                <th className="py-2 pr-3 font-medium">İşletme</th>
                <th className="py-2 pr-3 font-medium">Slug</th>
                <th className="py-2 pr-3 font-medium">E-posta</th>
                <th className="py-2 pr-3 font-medium">Oluşturma</th>
                <th className="py-2 pr-3 font-medium">Son giriş</th>
                <th className="py-2 pr-3 font-medium">Durum</th>
                <th className="py-2 pr-3 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <UserRow key={r.userId} row={r} onDone={() => router.refresh()} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-white/40">
                    Kayıt yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function UserRow({ row, onDone }: { row: AdminRow; onDone: () => void }) {
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState<null | "pw" | "active" | "delete">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const resetPassword = async () => {
    if (newPw.length < 6) {
      setMsg({ ok: false, text: "En az 6 karakter." });
      return;
    }
    setBusy("pw");
    setMsg(null);
    const { ok, data } = await postJSON("/api/admin/reset-password", {
      userId: row.userId,
      newPassword: newPw,
    });
    setBusy(null);
    setNewPw("");
    setMsg({ ok, text: ok ? "Şifre atandı." : data.error || "Hata." });
  };

  const setActive = async (active: boolean) => {
    setBusy("active");
    setMsg(null);
    const { ok, data } = await postJSON("/api/admin/set-active", {
      userId: row.userId,
      active,
    });
    setBusy(null);
    if (!ok) {
      setMsg({ ok: false, text: data.error || "Hata." });
      return;
    }
    onDone();
  };

  const del = async () => {
    if (
      !window.confirm(
        `"${row.ownerEmail}" kullanıcısı ve işletmesi kalıcı olarak silinsin mi? Bu geri alınamaz.`
      )
    )
      return;
    setBusy("delete");
    setMsg(null);
    const { ok, data } = await postJSON("/api/admin/delete-business", {
      userId: row.userId,
    });
    setBusy(null);
    if (!ok) {
      setMsg({ ok: false, text: data.error || "Hata." });
      return;
    }
    onDone();
  };

  return (
    <tr className="border-b border-white/5 align-top">
      <td className="py-3 pr-3 text-white">
        {row.businessName || <span className="text-white/30">—</span>}
        <div className="text-[11px] text-white/30">{row.userId}</div>
      </td>
      <td className="py-3 pr-3 text-white/70">{row.slug || "—"}</td>
      <td className="py-3 pr-3 text-white/70">{row.ownerEmail || "—"}</td>
      <td className="py-3 pr-3 text-white/50">{fmtDate(row.createdAt)}</td>
      <td className="py-3 pr-3 text-white/50">{fmtDate(row.lastSignInAt)}</td>
      <td className="py-3 pr-3">
        {row.banned ? (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
            Pasif
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
            Aktif
          </span>
        )}
      </td>
      <td className="py-3 pr-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Yeni şifre"
              className="w-28 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
            />
            <button
              onClick={resetPassword}
              disabled={busy === "pw"}
              className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-[#17130d] transition hover:brightness-110 disabled:opacity-50"
            >
              {busy === "pw" ? "…" : "Ata"}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActive(row.banned)}
              disabled={busy === "active"}
              className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              {busy === "active"
                ? "…"
                : row.banned
                  ? "Aktifleştir"
                  : "Pasifleştir"}
            </button>
            <button
              onClick={del}
              disabled={busy === "delete"}
              className="rounded-md border border-red-500/40 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              {busy === "delete" ? "…" : "Sil"}
            </button>
          </div>
          {msg && (
            <span
              className={`text-xs ${msg.ok ? "text-emerald-400" : "text-red-400"}`}
            >
              {msg.text}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
