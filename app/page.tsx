import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-5 py-16 text-center text-white">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-3xl font-bold text-[#17130d]">
        M
      </div>
      <p className="sans text-sm uppercase tracking-[0.3em] text-accent-2">
        QR Menü & Sipariş Platformu
      </p>
      <h1 className="serif mt-3 text-5xl font-bold">Menu Panels</h1>
      <p className="sans mx-auto mt-4 max-w-xl text-white/70">
        Restoranınız için QR ile açılan interaktif katalog menü, canlı sipariş ve
        yönetim paneli. İşletmenizi oluşturun, menünüzü ekleyin, masalarınız için
        QR üretin — dakikalar içinde yayında.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="sans rounded-xl bg-accent px-7 py-3.5 text-lg font-semibold text-[#17130d] transition hover:brightness-110"
        >
          İşletme Oluştur →
        </Link>
        <Link
          href="/login"
          className="sans rounded-xl border border-white/20 px-7 py-3.5 text-lg font-semibold text-white transition hover:bg-white/10"
        >
          Giriş Yap
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
        {[
          { t: "Katalog Menü", d: "Gerçek kitap gibi sayfa çevirme, video kapaklar, kağıt sesi." },
          { t: "Canlı Sipariş", d: "Müşteri masadan sipariş verir, panelde anlık görürsünüz." },
          { t: "Masaya Özel QR", d: "Her masanın kendi QR'ı; sipariş hangi masadan belli." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="serif text-lg font-semibold text-accent-2">{f.t}</h3>
            <p className="sans mt-1 text-sm text-white/60">{f.d}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
