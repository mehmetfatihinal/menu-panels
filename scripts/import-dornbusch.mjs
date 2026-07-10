// Dornbusch Kebaphaus menüsünü (TR/DE/EN) ffmkeskin@gmail.com işletmesine aktarır.
// Tek seferlik, IDEMPOTENT script. Yalnızca bu işletmeye EKLER; hiçbir şey silmez.
//
// Çalıştırma (proje kökünden):  node scripts/import-dornbusch.mjs
//
// .env.local'den okur: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (admin).
// ÖN KOŞUL: 0001_multilingual_menu.sql migration'ı uygulanmış olmalı
//           (products.name_i18n/description_i18n/allergens, categories.name_i18n).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const EMAIL = "ffmkeskin@gmail.com";
const PASSWORD = "Memo8080?";
const BIZ_NAME = "Dornbusch Kebaphaus";
const BIZ_TAGLINE = "Fleischdrehspieß 100% Kalbfleisch";
const BIZ_CURRENCY = "€";
const MENU_PATH = join(ROOT, "Dornbusch", "Dornbusch-Menu-TR-DE-EN.md");

// ── .env.local ayrıştır ──────────────────────────────────────────────
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
    const key = s.slice(0, i).trim();
    let val = s.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    env[key] = val;
  }
  return env;
}

const env = { ...loadEnv(join(ROOT, ".env.local")), ...process.env };
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA_URL || !SERVICE_KEY) {
  console.error(
    "HATA: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env.local'de bulunamadı."
  );
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SERVICE_KEY, {
  db: { schema: "menupanels" },
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Yardımcılar ──────────────────────────────────────────────────────
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Bir parantez içeriği alerjen/katkı grubu mu? (virgül/eğik çizgi ile ayrılmış
// her öğe ya tek harf a-n ya da bir sayı) — "(a,c,g,4,7)", "(1,3 / 1,3,8,12)" → evet;
// "(klein)", "(groß)", "(5 Stück)", "(2 Personen)", "(Portion)" → hayır.
function isAllergenGroup(inner) {
  const tokens = inner
    .split(/[,/]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((tok) => /^[a-n]$/.test(tok) || /^\d+$/.test(tok));
}

// DE ad satırındaki alerjen/katkı kodlarını sırayla, tekrarsız topla.
function extractAllergens(text) {
  const codes = [];
  const seen = new Set();
  for (const m of text.matchAll(/\(([^)]*)\)/g)) {
    const inner = m[1];
    if (!isAllergenGroup(inner)) continue;
    for (const tok of inner.split(/[,/]/).map((s) => s.trim()).filter(Boolean)) {
      const c = tok.toLowerCase();
      if (!seen.has(c)) {
        seen.add(c);
        codes.push(c);
      }
    }
  }
  return codes;
}

// Yalnızca alerjen parantezlerini kaldır (gerçek "(klein)" vb. korunur).
function stripAllergens(text) {
  return text
    .replace(/\s*\(([^)]*)\)/g, (m, inner) => (isAllergenGroup(inner) ? "" : m))
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Bir dil hücresini { name, desc } olarak ayrıştır (isim satırı + opsiyonel *italik* açıklama)
function parseCell(cell) {
  const parts = cell.split(/<br\s*\/?>/i);
  let name = (parts[0] || "").replace(/\*\*/g, "");
  name = stripAllergens(name).replace(/\*/g, "").trim();
  let desc = "";
  if (parts[1]) desc = parts[1].replace(/\*/g, "").replace(/\s{2,}/g, " ").trim();
  return { name, desc };
}

function pick3(obj) {
  const out = {};
  for (const k of ["tr", "de", "en"]) if (obj[k] && obj[k].trim()) out[k] = obj[k].trim();
  return out;
}
const legacyDe = (o) => o.de || o.tr || o.en || "";

// ── Markdown'ı ayrıştır → [{ nameI18n, sort, items:[...] }] ───────────
function parseMenu(md) {
  const lines = md.split(/\r?\n/);
  const categories = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();

    // Başlık: her "## ..." önce kategoriyi sıfırlar; yalnızca "## N. ..." ürün kategorisidir
    if (line.startsWith("## ")) {
      current = null;
      const m = line.match(/^##\s+(\d+)\.\s+(.*)$/);
      if (m) {
        const titles = m[2].split(/\s*·\s*/); // TR · DE · EN
        const nameI18n = pick3({ tr: titles[0], de: titles[1], en: titles[2] });
        current = { nameI18n, sort: categories.length, items: [] };
        categories.push(current);
      }
      continue;
    }

    if (!current || !line.startsWith("|")) continue;

    // Hücreler (baş/son boş hücreleri at)
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length && cells[0] === "") cells.shift();
    if (cells.length && cells[cells.length - 1] === "") cells.pop();

    // Ürün satırı: ilk hücre Nr (sayı) ve en az 5 sütun. (Başlık/hizalama/Kod tabloları elenir.)
    if (cells.length < 5 || !/^\d+$/.test(cells[0])) continue;

    const nr = cells[0];
    const de = parseCell(cells[1]);
    const tr = parseCell(cells[2]);
    const en = parseCell(cells[3]);
    const price = Number(String(cells[4]).replace(",", ".")) || 0;
    const allergens = extractAllergens(cells[1]);

    const nameI18n = pick3({ tr: tr.name, de: de.name, en: en.name });
    const descI18n = pick3({ tr: tr.desc, de: de.desc, en: en.desc });

    current.items.push({
      code: nr,
      nameI18n,
      descI18n,
      name: de.name, // numarayı ada gömme; ayrı "code" alanında dur
      description: legacyDe(descI18n),
      price,
      allergens,
      sort: current.items.length,
    });
  }
  return categories;
}

// ── Auth kullanıcısını bul/oluştur ───────────────────────────────────
async function ensureUser() {
  const target = EMAIL.toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("listUsers: " + error.message);
    const found = data.users.find((u) => (u.email || "").toLowerCase() === target);
    if (found) return { user: found, created: false };
    if (data.users.length < 200 || page > 50) break;
    page++;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error("createUser: " + error.message);
  return { user: data.user, created: true };
}

// ── İşletmeyi bul/oluştur ────────────────────────────────────────────
async function ensureBusiness(ownerId) {
  const { data: existing, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error("select business: " + error.message);
  if (existing) return { business: existing, created: false };

  const { data, error: insErr } = await supabase
    .from("businesses")
    .insert({
      owner_id: ownerId,
      name: BIZ_NAME,
      slug: slugify(BIZ_NAME),
      currency: BIZ_CURRENCY,
      tagline: BIZ_TAGLINE,
    })
    .select()
    .single();
  if (insErr) throw new Error("insert business: " + insErr.message);
  return { business: data, created: true };
}

// ── Ana akış ─────────────────────────────────────────────────────────
async function main() {
  const DRY = process.argv.includes("--dry");
  console.log("→ Menü ayrıştırılıyor:", MENU_PATH);
  const md = readFileSync(MENU_PATH, "utf8");
  const parsed = parseMenu(md);
  const totalItems = parsed.reduce((n, c) => n + c.items.length, 0);
  console.log(`   ${parsed.length} kategori, ${totalItems} ürün bulundu.`);

  if (DRY) {
    for (const c of parsed) {
      console.log(
        `\n[${c.sort}] ${JSON.stringify(c.nameI18n)}  (${c.items.length} ürün)`
      );
      for (const it of c.items.slice(0, 2)) {
        console.log(
          `   • #${it.code} ${it.name} | ${it.price}€ | alerjen=[${it.allergens.join(",")}]`
        );
        console.log(`     name_i18n=${JSON.stringify(it.nameI18n)}`);
        if (Object.keys(it.descI18n).length)
          console.log(`     desc_i18n=${JSON.stringify(it.descI18n)}`);
      }
    }
    console.log("\n(DRY RUN — veritabanına hiçbir şey yazılmadı.)");
    return;
  }

  const { user, created: userCreated } = await ensureUser();
  console.log(`→ Kullanıcı: ${user.email} (${userCreated ? "OLUŞTURULDU" : "mevcut"})`);

  const { business, created: bizCreated } = await ensureBusiness(user.id);
  console.log(
    `→ İşletme: ${business.name} / ${business.slug} (${bizCreated ? "OLUŞTURULDU" : "mevcut"}) id=${business.id}`
  );

  // Mevcut kategoriler (Almanca ada göre) ve ürün adları (idempotency)
  const { data: exCats } = await supabase
    .from("categories")
    .select("id,name")
    .eq("business_id", business.id);
  const catByName = new Map();
  for (const c of exCats ?? []) catByName.set((c.name || "").toLowerCase(), c.id);

  const { data: exProds } = await supabase
    .from("products")
    .select("name,code")
    .eq("business_id", business.id);
  // Idempotency anahtarı: code varsa code, yoksa ad (adlar çakışabilir: 60/61 Adana Kebap)
  const prodKey = (code, name) => String(code || name || "").toLowerCase();
  const prodKeys = new Set(
    (exProds ?? []).map((p) => prodKey(p.code, p.name))
  );

  let catsAdded = 0;
  let prodsAdded = 0;

  for (const cat of parsed) {
    const catLegacy = legacyDe(cat.nameI18n);
    let catId = catByName.get(catLegacy.toLowerCase());

    if (!catId) {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          business_id: business.id,
          name: catLegacy,
          name_i18n: cat.nameI18n,
          cover_src: "",
          cover_video: "",
          sort_order: cat.sort,
        })
        .select("id")
        .single();
      if (error) throw new Error(`insert category "${catLegacy}": ${error.message}`);
      catId = data.id;
      catByName.set(catLegacy.toLowerCase(), catId);
      catsAdded++;
      console.log(`   + kategori: ${catLegacy}`);
    }

    const rows = cat.items
      .filter((it) => !prodKeys.has(prodKey(it.code, it.name)))
      .map((it) => ({
        business_id: business.id,
        category_id: catId,
        code: it.code,
        name: it.name,
        name_i18n: it.nameI18n,
        description: it.description,
        description_i18n: Object.keys(it.descI18n).length ? it.descI18n : null,
        price: it.price,
        image: "",
        available: true,
        tags: [],
        allergens: it.allergens,
        sort_order: it.sort,
      }));

    if (rows.length) {
      const { error } = await supabase.from("products").insert(rows);
      if (error) throw new Error(`insert products (${catLegacy}): ${error.message}`);
      for (const r of rows) prodKeys.add(prodKey(r.code, r.name));
      prodsAdded += rows.length;
      console.log(`     → ${rows.length} ürün eklendi`);
    }
  }

  console.log("\n✅ Bitti.");
  console.log(`   Eklenen kategori: ${catsAdded}`);
  console.log(`   Eklenen ürün:     ${prodsAdded}`);
  console.log(`   (Tekrar çalıştırılırsa mevcut olanlar atlanır.)`);
  console.log(`   Müşteri menüsü:   /r/${business.slug}/menu`);
}

main().catch((e) => {
  console.error("\n❌ HATA:", e.message);
  process.exit(1);
});
