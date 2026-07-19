// Dornbusch ürün görsellerini WebP'e çevirip Supabase 'media' kovasına yükler,
// products.image alanını doldurur ve doğrulandıktan sonra yerel orijinali siler.
//
// Çalıştırma:  node scripts/upload-product-images.mjs        (orijinalleri siler)
//              node scripts/upload-product-images.mjs --keep  (orijinalleri korur)
//
// Kaynak: Dornbusch/Dornbusch Görsel/  (dosya adı = ürün numarası, ör. 43.png, 1.png)
// Eşleştirme ürün "code" alanına göre (parseInt ile; "1.png" -> code "01").

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, readdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SLUG = "dornbusch-ktsv";
const SRC_DIR = join(ROOT, "Dornbusch", "Dornbusch Görsel");
const KEEP = process.argv.includes("--keep");

// ── .env.local ──────────────────────────────────────────────────────
function loadEnv(p) {
  const env = {};
  let txt;
  try {
    txt = readFileSync(p, "utf8");
  } catch {
    return env;
  }
  for (const line of txt.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i === -1) continue;
    const k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    env[k] = v;
  }
  return env;
}
const env = { ...loadEnv(join(ROOT, ".env.local")), ...process.env };
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SERVICE_KEY) {
  console.error("HATA: SUPABASE URL / SERVICE_ROLE_KEY .env.local'de yok.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SERVICE_KEY, {
  db: { schema: "menupanels" },
  auth: { autoRefreshToken: false, persistSession: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Supabase "Too many connections" gibi geçici hatalarda geri çekilerek yeniden dene
async function withRetry(fn, label, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const { error } = await fn();
      if (!error) return;
      lastErr = error;
    } catch (e) {
      lastErr = e;
    }
    await sleep(600 * (i + 1));
  }
  throw new Error(`${label}: ${lastErr?.message || lastErr}`);
}

async function main() {
  // İşletme + ürünler
  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("id, owner_id, name, slug")
    .eq("slug", SLUG)
    .single();
  if (bErr || !business) throw new Error("İşletme bulunamadı: " + (bErr?.message || SLUG));
  console.log(`→ İşletme: ${business.name} (${business.slug}) owner=${business.owner_id}`);

  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id, code, name, image")
    .eq("business_id", business.id);
  if (pErr) throw new Error("Ürünler okunamadı: " + pErr.message);

  // int(code) -> ürün
  const byNum = new Map();
  for (const p of products) {
    if (p.code == null || p.code === "") continue;
    const n = parseInt(p.code, 10);
    if (!Number.isNaN(n)) byNum.set(n, p);
  }

  // Kaynak dosyalar (png/jpg/jpeg)
  const files = readdirSync(SRC_DIR).filter((f) =>
    [".png", ".jpg", ".jpeg"].includes(extname(f).toLowerCase())
  );

  const uploaded = [];
  const noProduct = [];
  const matchedNums = new Set();

  for (const file of files.sort((a, b) => parseInt(a) - parseInt(b))) {
    const num = parseInt(basename(file, extname(file)), 10);
    if (Number.isNaN(num)) {
      noProduct.push(file);
      continue;
    }
    const product = byNum.get(num);
    if (!product) {
      noProduct.push(file);
      continue;
    }
    matchedNums.add(num);
    await sleep(120); // bağlantı fırtınasını önle

    const inputPath = join(SRC_DIR, file);
    const webp = await sharp(readFileSync(inputPath))
      .rotate()
      .resize({ width: 900, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    const path = `${business.owner_id}/products/${product.code}.webp`;
    await withRetry(
      () =>
        supabase.storage
          .from("media")
          .upload(path, webp, { contentType: "image/webp", upsert: true }),
      `upload ${file}`
    );

    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    const url = pub.publicUrl;

    // DB güncelle
    await withRetry(
      () =>
        supabase
          .from("products")
          .update({ image: url })
          .eq("id", product.id)
          .eq("business_id", business.id),
      `update ${product.code}`
    );

    // Doğrula: public URL 200 mü?
    let ok = false;
    try {
      const head = await fetch(url, { method: "HEAD" });
      ok = head.ok;
    } catch {}
    if (!ok) {
      console.warn(`   ! ${file} -> yüklendi ama URL doğrulanamadı (silinmeyecek): ${url}`);
      uploaded.push({ file, code: product.code, url, verified: false, inputPath });
      continue;
    }

    uploaded.push({ file, code: product.code, url, verified: true, inputPath });
    console.log(`   + #${product.code}  ${file} -> ${path}`);
  }

  // Görselsiz kalan ürünler (kod var ama dosya yok)
  const imageless = products
    .filter((p) => p.code && !matchedNums.has(parseInt(p.code, 10)))
    .map((p) => p.code)
    .sort((a, b) => parseInt(a) - parseInt(b));

  // Doğrulanan orijinalleri sil (kullanıcı izinli; Storage'da yedeği var)
  let deleted = 0;
  if (!KEEP) {
    for (const u of uploaded) {
      if (!u.verified) continue;
      try {
        unlinkSync(u.inputPath);
        deleted++;
      } catch (e) {
        console.warn(`   ! silinemedi ${u.file}: ${e.message}`);
      }
    }
  }

  console.log("\n✅ Bitti.");
  console.log(`   Yüklenen görsel:     ${uploaded.filter((u) => u.verified).length}/${uploaded.length}`);
  console.log(`   Ürünü olmayan dosya: ${noProduct.length ? noProduct.join(", ") : "-"}`);
  console.log(`   Görselsiz ürün (code): ${imageless.length ? imageless.join(", ") : "-"}`);
  console.log(`   Silinen orijinal:    ${KEEP ? "(--keep: silinmedi)" : deleted}`);
}

main().catch((e) => {
  console.error("\n❌ HATA:", e.message);
  process.exit(1);
});
