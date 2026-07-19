// Kullanıcının elle yaptığı KATEGORİ kapaklarını (dosya adı = Türkçe kategori adı) WebP'e
// çevirip 'media' kovasına YENİ benzersiz adla yükler ve ilgili kategorinin cover_src'ini
// günceller. Eşleşmeyen kategoriler ve orijinal dosyalar olduğu gibi kalır.
//
// Çalıştırma:  node scripts/upload-category-covers-manual.mjs
// Kaynak: Dornbusch/Dornbusch Görsel/  (ör. "Dürüm.png", "Ekonomik Menüler.png")

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SLUG = "dornbusch-ktsv";
const SRC_DIR = join(ROOT, "Dornbusch", "Dornbusch Görsel");

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
  console.error("HATA: SUPABASE URL / SERVICE_ROLE_KEY yok.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SERVICE_KEY, {
  db: { schema: "menupanels" },
  auth: { autoRefreshToken: false, persistSession: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, label, tries = 5) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const { error } = await fn();
      if (!error) return;
      last = error;
    } catch (e) {
      last = e;
    }
    await sleep(600 * (i + 1));
  }
  throw new Error(`${label}: ${last?.message || last}`);
}

// Ad karşılaştırması: NFC + boşlukları sadeleştir + küçük harf (&, %, ( ) olduğu gibi)
const norm = (s) =>
  (s || "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

function slugify(s) {
  return (s || "")
    .toLowerCase()
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("id, owner_id, name, slug")
    .eq("slug", SLUG)
    .single();
  if (bErr || !business) throw new Error("İşletme yok: " + (bErr?.message || SLUG));

  const { data: cats, error: cErr } = await supabase
    .from("categories")
    .select("id, name, name_i18n, sort_order")
    .eq("business_id", business.id);
  if (cErr) throw new Error("Kategoriler okunamadı: " + cErr.message);

  // Türkçe ada göre indeks
  const byTr = new Map();
  for (const c of cats) {
    const tr = c.name_i18n?.tr;
    if (tr) byTr.set(norm(tr), c);
  }

  const files = readdirSync(SRC_DIR).filter((f) =>
    [".png", ".jpg", ".jpeg"].includes(extname(f).toLowerCase())
  );

  const matched = [];
  const skipped = [];
  let idx = 0;

  for (const file of files) {
    const key = norm(basename(file, extname(file)));
    const cat = byTr.get(key);
    if (!cat) {
      skipped.push(file);
      continue;
    }

    const webp = await sharp(readFileSync(join(SRC_DIR, file)))
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Önbelleği aşmak için YENİ benzersiz ad
    const stamp = `${Date.now()}-${idx++}`;
    const path = `${business.owner_id}/covers/${slugify(cat.name)}-${stamp}.webp`;
    await withRetry(
      () =>
        supabase.storage
          .from("media")
          .upload(path, webp, { contentType: "image/webp", upsert: true }),
      `upload ${file}`
    );
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    const url = pub.publicUrl;

    await withRetry(
      () =>
        supabase
          .from("categories")
          .update({ cover_src: url })
          .eq("id", cat.id)
          .eq("business_id", business.id),
      `update ${cat.name}`
    );

    let ok = false;
    try {
      ok = (await fetch(url, { method: "HEAD" })).ok;
    } catch {}
    matched.push({ file, cat: cat.name_i18n?.tr || cat.name, url, ok });
    console.log(`   ${ok ? "+" : "!"} "${file}" -> [${cat.sort_order}] ${cat.name_i18n?.tr} (${path})`);
    await sleep(150);
  }

  console.log("\n✅ Bitti.");
  console.log(`   Eşleşen & yüklenen: ${matched.length}`);
  console.log(`   Eşleşmeyen dosya:   ${skipped.length ? skipped.join(", ") : "-"}`);
}

main().catch((e) => {
  console.error("\n❌ HATA:", e.message);
  process.exit(1);
});
