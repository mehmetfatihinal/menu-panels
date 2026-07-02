import Link from "next/link";
import { readMenu } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const menu = await readMenu();

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-white">
      <div className="text-center">
        <p className="sans text-sm uppercase tracking-[0.3em] text-accent-2">
          {menu.restaurant.tagline}
        </p>
        <h1 className="serif mt-3 text-5xl font-bold">{menu.restaurant.name}</h1>
        <p className="sans mx-auto mt-4 max-w-xl text-white/70">
          QR ile açılan interaktif katalog menü. Solda görsel/video, sağda menü;
          ürünlere dokununca büyür, sepete eklenir, sipariş oluşur. Her masanın
          QR kodu farklıdır.
        </p>
      </div>

      <section className="mt-12 flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <h2 className="serif text-xl font-semibold">Tek ortak menü</h2>
        <p className="sans mt-1 max-w-md text-sm text-white/60">
          Tüm masalara aynı menü sunulur. Menüyü görmek için tek bir yere bas.
          (Gerçekte müşteri masadaki QR'ı okutur; QR yalnızca sipariş hangi
          masadan geldi bunu ayırt eder.)
        </p>
        <Link
          href="/menu"
          className="sans mt-5 rounded-xl bg-paper px-7 py-3.5 text-lg font-semibold text-ink transition hover:brightness-95"
        >
          Menüyü Gör →
        </Link>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard"
          className="sans rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
        >
          <h3 className="serif text-lg font-semibold">Yönetim Paneli →</h3>
          <p className="mt-1 text-sm text-white/60">
            Genel bakış, menü yönetimi, stok, siparişler ve ayarlar.
          </p>
        </Link>
        <Link
          href="/dashboard/masalar"
          className="sans rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
        >
          <h3 className="serif text-lg font-semibold">Masalar & QR →</h3>
          <p className="mt-1 text-sm text-white/60">
            Her masa için ayrı QR oluştur, yazdır ve menüyü aç.
          </p>
        </Link>
      </div>
    </main>
  );
}
