import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-16 text-white">
      <div className="flex flex-col items-center gap-12 lg:flex-row lg:justify-between lg:gap-16">
        {/* Sol: içerik */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-3xl font-bold text-[#17130d]">
            M
          </div>
          <p className="sans text-sm uppercase tracking-[0.3em] text-accent-2">
            QR Menü & Sipariş Platformu
          </p>
          <h1 className="serif mt-3 text-5xl font-bold">Qr MenuPanels</h1>
          <p className="sans mt-4 max-w-xl text-white/70">
            Restoranınız için QR ile açılan interaktif katalog menü, canlı sipariş ve
            yönetim paneli. İşletmenizi oluşturun, menünüzü ekleyin, masalarınız için
            QR üretin — dakikalar içinde yayında.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href="/login"
              className="sans rounded-xl bg-accent px-7 py-3.5 text-lg font-semibold text-[#17130d] transition hover:brightness-110"
            >
              İşletme Girişi →
            </Link>
          </div>
        </div>

        {/* Sağ: telefon önizleme (hafif süzülen) */}
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl"
          />
          <img
            src="/telefon.webp?v=2"
            alt="Qr MenuPanels telefon önizleme"
            width={760}
            height={1572}
            className="float-phone w-[210px] drop-shadow-2xl sm:w-[250px] lg:w-[290px]"
          />
        </div>
      </div>

      {/* Özellik kartları */}
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
