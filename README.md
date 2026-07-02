# Menu Panels

QR ile açılan interaktif **katalog/kitap menü** ve **yönetim paneli**. Gerçek sayfa
çevirme animasyonu (StPageFlip), kağıt sesi, arka plan müziği, videolu kategori
kapakları; müşteri sipariş oluşturur, admin stok ve siparişleri yönetir.

## Özellikler
- **Ortak menü** (`/menu`) — solda görsel/video, sağda menü; ürüne dokununca büyür.
- Gerçek **kitap sayfası çevirme** + Pixabay kağıt sesi + Web Audio ambient müzik.
- **Sepet & sipariş** oluşturma.
- **Yönetim paneli** (`/dashboard`): genel bakış, menü (kategori/ürün CRUD + stok),
  masalar & QR, canlı siparişler, ayarlar.
- **Masaya özel QR** (`/masa/[id]`) — sipariş hangi masadan geldi belli olur.

## Geliştirme
```bash
npm install
npm run dev      # http://localhost:3100 (webpack)
```

## Teknoloji
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, framer-motion,
react-pageflip, qrcode.react.

## Veri
Şu an veriler yerel JSON dosyalarında tutulur: `data/menu.json`, `data/orders.json`.

> ⚠️ **Vercel / serverless notu:** Vercel'in dosya sistemi **salt-okunurdur**.
> Menü **görüntüleme** çalışır, ancak **sipariş oluşturma ve admin düzenlemeleri**
> (dosyaya yazan işlemler) Vercel'de kalıcı olmaz / hata verebilir. Kalıcı sürüm
> için veriler bir veritabanına (ör. Supabase, Vercel Postgres/KV) taşınmalıdır.

## Notlar
- Yerelde `distDir` = `.next.nosync` (iCloud senkron çakışmasını önlemek için);
  Vercel'de otomatik olarak `.next` kullanılır.
