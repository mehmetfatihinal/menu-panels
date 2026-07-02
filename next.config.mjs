/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build/derleme klasörü:
  // - Yerelde (Desktop iCloud'a bağlı) ".next.nosync" -> iCloud senkronize etmez,
  //   böylece dev sunucusu dosya yazarken bozulma olmaz.
  // - Vercel/CI'da standart ".next" (iCloud yok, koşullu gerek yok).
  distDir: process.env.VERCEL ? ".next" : ".next.nosync",
  // Bu projeyi Turbopack'in workspace kökü olarak sabitle
  // (Desktop'taki diğer lockfile'lar yüzünden yanlış kök seçilmesini önler)
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
