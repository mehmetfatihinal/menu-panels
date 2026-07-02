// Deploy/CI ortamında mıyız? (Vercel, Netlify veya genel CI)
const isDeploy = !!(
  process.env.VERCEL ||
  process.env.NETLIFY ||
  process.env.CI
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build/derleme klasörü:
  // - Yerelde (Desktop iCloud'a bağlı) ".next.nosync" -> iCloud senkronize etmez,
  //   böylece dev/build dosya yazarken bozulma olmaz.
  // - Deploy/CI ortamlarında (Vercel, Netlify, CI) standart ".next".
  distDir: isDeploy ? ".next" : ".next.nosync",
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
