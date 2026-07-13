// Bonita kategori kapaklarını (dosya adı = kategori adı, DE) WebP'e çevirip
// 'media' kovasına yükler ve cover_src'i günceller.
//
// Çalıştırma:  node scripts/upload-bonita-covers.mjs <görsel-klasörü>

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SLUG = "bonita";
const SRC_DIR = process.argv[2];
if (!SRC_DIR) {
  console.error("Kullanım: node scripts/upload-bonita-covers.mjs <görsel-klasörü>");
  process.exit(1);
}

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

const norm = (s) => (s || "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

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

  // Kayıtlı (legacy/DE) ada göre indeks
  const byName = new Map();
  for (const c of cats) byName.set(norm(c.name), c);

  const files = readdirSync(SRC_DIR).filter((f) =>
    [".png", ".jpg", ".jpeg", ".webp"].includes(extname(f).toLowerCase())
  );

  const matched = [];
  const skipped = [];
  let idx = 0;

  for (const file of files) {
    const key = norm(basename(file, extname(file)));
    const cat = byName.get(key);
    if (!cat) {
      skipped.push(file);
      continue;
    }

    const webp = await sharp(readFileSync(join(SRC_DIR, file)))
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

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
    matched.push({ file, cat: cat.name, url, ok });
    console.log(`   ${ok ? "+" : "!"} "${file}" -> [${cat.sort_order}] ${cat.name}`);
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
