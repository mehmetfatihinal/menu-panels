// Emir-Et ürün görsellerini WebP'e çevirip Supabase 'media' kovasına yükler ve
// products.image alanını doldurur. Orijinaller KORUNUR (silinmez).
//
// Çalıştırma:
//   node scripts/upload-emir-et-images.mjs --dry   (sadece eşleşme raporu, yazma yok)
//   node scripts/upload-emir-et-images.mjs          (yükle + DB güncelle)
//
// Kaynak: C:\Users\PC\Desktop\emir-et-görsel  (dosya adı "NN - Ad.webp", NN = ürün "code")
// Eşleştirme ürün "code" alanına göre (parseInt: "01 - ...webp" -> 1 -> code "01").
// 236 kodu iki ürün + iki dosya olduğundan ada göre ayrıştırılır.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SLUG = "emir-et-restaurant-jrl3";
const SRC_DIR = "C:\\Users\\PC\\Desktop\\emir-et-görsel";
const DRY = process.argv.includes("--dry");
const IMG_EXT = [".webp", ".png", ".jpg", ".jpeg", ".avif"];

// code 236 iki ürüne bölünür (dosya adındaki Türkçe metne göre)
const DUP236 = {
  turk: { id: "4df3a0d6-7ceb-4907-8e6b-d270760fd137", storageName: "236", label: "Türkischer Tee / Türk Çayı" },
  cesit: { id: "e77e2b76-8e41-4128-9f9a-415e4f40071b", storageName: "236-cesitli", label: "Diverse Teesorten / Çeşitli Çaylar" },
};

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

// Bir dosyayı hedef ürüne + storage adına çöz
function resolveTarget(file, byNum) {
  const num = parseInt(basename(file, extname(file)), 10);
  if (Number.isNaN(num)) return null;
  if (num === 236) {
    if (file.includes("Türk")) return { productId: DUP236.turk.id, storageName: DUP236.turk.storageName, num };
    if (file.includes("Çeşit")) return { productId: DUP236.cesit.id, storageName: DUP236.cesit.storageName, num };
    return null; // beklenmedik 236 dosyası
  }
  const p = byNum.get(num);
  if (!p) return null;
  return { productId: p.id, storageName: p.code, num };
}

async function main() {
  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("id, owner_id, name, slug")
    .eq("slug", SLUG)
    .single();
  if (bErr || !business) throw new Error("İşletme bulunamadı: " + (bErr?.message || SLUG));
  console.log(`→ İşletme: ${business.name} (${business.slug})  owner=${business.owner_id}`);
  console.log(`→ Kaynak : ${SRC_DIR}`);
  console.log(`→ Mod    : ${DRY ? "DRY (yazma yok)" : "CANLI (yükle + DB güncelle)"}\n`);

  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id, code, name, image")
    .eq("business_id", business.id);
  if (pErr) throw new Error("Ürünler okunamadı: " + pErr.message);
  const byId = new Map(products.map((p) => [p.id, p]));

  // int(code) -> ürün (236 hariç; o özel ele alınır)
  const byNum = new Map();
  for (const p of products) {
    if (p.code == null || p.code === "" || p.code === "236") continue;
    const n = parseInt(p.code, 10);
    if (!Number.isNaN(n)) byNum.set(n, p);
  }

  const files = readdirSync(SRC_DIR).filter((f) => IMG_EXT.includes(extname(f).toLowerCase()));

  const uploaded = [];
  const noProduct = [];
  const assigned = new Set();

  for (const file of files.sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0))) {
    const t = resolveTarget(file, byNum);
    if (!t) {
      noProduct.push(file);
      continue;
    }
    const product = byId.get(t.productId);
    const path = `${business.owner_id}/products/${t.storageName}.webp`;
    const url = `${SUPA_URL}/storage/v1/object/public/media/${path}`;

    if (DRY) {
      assigned.add(product.id);
      uploaded.push({ file, code: product.code, name: product.name, path, verified: null });
      console.log(`   • #${String(t.num).padEnd(3)} ${file}  ->  ${product.name}  ->  media/${path}`);
      continue;
    }

    await sleep(120);
    const webp = await sharp(readFileSync(join(SRC_DIR, file)))
      .rotate()
      .resize({ width: 900, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    await withRetry(
      () => supabase.storage.from("media").upload(path, webp, { contentType: "image/webp", upsert: true }),
      `upload ${file}`
    );

    await withRetry(
      () => supabase.from("products").update({ image: url }).eq("id", product.id).eq("business_id", business.id),
      `update ${product.code}`
    );

    let ok = false;
    try {
      const head = await fetch(url, { method: "HEAD" });
      ok = head.ok;
    } catch {}
    assigned.add(product.id);
    uploaded.push({ file, code: product.code, name: product.name, path, verified: ok });
    console.log(`   ${ok ? "+" : "!"} #${String(product.code).padEnd(3)} ${file} -> media/${path}${ok ? "" : "  (URL doğrulanamadı)"}`);
  }

  // Kod var ama görsel atanmadı
  const imageless = products
    .filter((p) => p.code && !assigned.has(p.id))
    .sort((a, b) => (parseInt(a.code) || 0) - (parseInt(b.code) || 0));
  // Kodsuz ürünler (soslar vb.)
  const noCode = products.filter((p) => !p.code);

  console.log("\n──────── ÖZET ────────");
  console.log(`Toplam ürün           : ${products.length}`);
  console.log(`Kaynak görsel dosyası  : ${files.length}`);
  console.log(`Eşleşen / atanan       : ${uploaded.length}`);
  if (!DRY) console.log(`  Doğrulanan (200 OK)  : ${uploaded.filter((u) => u.verified).length}`);
  console.log(`Ürünü bulunmayan dosya : ${noProduct.length}${noProduct.length ? " -> " + noProduct.join(", ") : ""}`);
  console.log(`Görselsiz kalan ürün   : ${imageless.length}${imageless.length ? " -> " + imageless.map((p) => `${p.code}:${p.name}`).join(", ") : ""}`);
  console.log(`Kodsuz ürün (atlandı)  : ${noCode.length}${noCode.length ? " -> " + noCode.map((p) => p.name).join(", ") : ""}`);
  console.log(DRY ? "\n(DRY) Hiçbir şey yazılmadı. Gerçek yükleme için --dry olmadan çalıştırın." : "\n✅ Bitti.");
}

main().catch((e) => {
  console.error("\n❌ HATA:", e.message);
  process.exit(1);
});
