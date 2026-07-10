// Higgsfield ile üretilen 14 kategori kapağını (scripts/.cover-urls.json, sort_order sırasında)
// indirir, WebP'e çevirir/sıkıştırır, 'media' kovasına yükler ve categories.cover_src'e yazar.
//
// Çalıştırma:  node scripts/upload-category-covers.mjs
// cover_video'ya dokunmaz. Yalnızca Dornbusch işletmesinin kategorilerini günceller.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SLUG = "dornbusch-ktsv";
const URLS = JSON.parse(readFileSync(join(__dirname, ".cover-urls.json"), "utf8"));

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

function slugify(s) {
  return s
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
    .select("id, name, sort_order")
    .eq("business_id", business.id)
    .order("sort_order");
  if (cErr) throw new Error("Kategoriler okunamadı: " + cErr.message);

  if (cats.length !== URLS.length)
    throw new Error(`Kategori sayısı (${cats.length}) ile URL sayısı (${URLS.length}) uyuşmuyor.`);

  let done = 0;
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    const srcUrl = URLS[i];

    const resp = await fetch(srcUrl);
    if (!resp.ok) throw new Error(`indirilemedi (${cat.name}): HTTP ${resp.status}`);
    const inputBuf = Buffer.from(await resp.arrayBuffer());

    const webp = await sharp(inputBuf)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const path = `${business.owner_id}/covers/${slugify(cat.name)}.webp`;
    await withRetry(
      () =>
        supabase.storage
          .from("media")
          .upload(path, webp, { contentType: "image/webp", upsert: true }),
      `upload ${cat.name}`
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
    done++;
    console.log(`   ${ok ? "+" : "!"} [${cat.sort_order}] ${cat.name} -> ${path}`);
    await sleep(150);
  }

  console.log(`\n✅ Bitti. ${done}/${cats.length} kategori kapağı yüklendi.`);
}

main().catch((e) => {
  console.error("\n❌ HATA:", e.message);
  process.exit(1);
});
