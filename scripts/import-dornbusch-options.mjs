// Dornbusch (slug: dornbusch-ktsv) ürünlerine ek seçenekleri (options) bağlar + yeni Burger
// kategorisi/ürünleri ve iki içeceği ekler. Tek seferlik, IDEMPOTENT. Yalnızca Dornbusch işletmesi.
// MEVCUT ürünlerde SADECE options alanı yazılır — ad/fiyat/açıklama/çevirilere DOKUNULMAZ.
//
// Çalıştırma (proje kökünden):
//   node scripts/import-dornbusch-options.mjs --dry   # önizleme (DB'ye yazmaz)
//   node scripts/import-dornbusch-options.mjs         # uygula
//
// .env.local'den: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (admin, schema menupanels).
// ÖN KOŞUL: 0003_options_lang.sql (products.options) uygulanmış olmalı.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SLUG = "dornbusch-ktsv";
const MENU_PATH = join(ROOT, "Dornbusch", "dornbusch-doner-options-clean.md");

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
  console.error("HATA: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY .env.local'de yok.");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SERVICE_KEY, {
  db: { schema: "menupanels" },
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Yardımcılar ─────────────────────────────────────────────────────
// "1,00" / "+1,00" / "7,00 €" -> sayı ; "—" -> 0
function toNum(s) {
  const v = String(s).replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
// Ad parçasındaki sondaki "(...)" niteleyicisini at (ör. "Side (Teller/Izgara)" -> "Side")
const stripParen = (s) => String(s).replace(/\s*\([^)]*\)\s*$/, "").trim();
const legacyDe = (o) => o.de || o.tr || o.en || "";

// ── Sözlüğü ayrıştır: KEY -> { name_i18n{de,tr,en}, required, multi, choices[] } ──
function parseDictionary(md) {
  const lines = md.split(/\r?\n/);
  const dict = new Map();
  let inDict = false;
  let cur = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      inDict = /Seçenek Sözlüğü/i.test(line);
      cur = null;
      continue;
    }
    if (!inDict) continue;

    if (line.startsWith("### ")) {
      // "### SALAT — Salatzutaten · Salata malzemeleri · Salad ingredients — (çoklu, zorunlu)"
      const body = line.slice(4).trim();
      const parts = body.split(/\s+—\s+/);
      const key = parts[0].trim();
      const markers = (parts[parts.length - 1] || "").toLowerCase();
      const names = parts.slice(1, -1).join(" — ");
      const [de, tr, en] = names.split(/\s+·\s+/).map((x) => stripParen(x));
      cur = {
        name_i18n: { de: de || "", tr: tr || "", en: en || "" },
        required: markers.includes("zorunlu"),
        multi: markers.includes("çoklu"),
        choices: [],
      };
      dict.set(key, cur);
      continue;
    }

    if (line.startsWith("|") && cur) {
      const cells = line.split("|").map((c) => c.trim());
      if (cells.length && cells[0] === "") cells.shift();
      if (cells.length && cells[cells.length - 1] === "") cells.pop();
      if (cells.length < 4) continue;
      if (/^de$/i.test(cells[0]) || /^-+$/.test(cells[0])) continue; // başlık/ayraç
      cur.choices.push({
        name_i18n: { de: cells[0], tr: cells[1], en: cells[2] },
        price_delta: toNum(cells[3]),
      });
    }
  }
  return dict;
}

// ── Ürün → grup tablosunu kurallara çevir (✚ yeni ürünler hariç) ──
function parseRules(md) {
  const lines = md.split(/\r?\n/);
  const rules = [];
  let inTable = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      inTable = /Ürün → Seçenek/i.test(line);
      continue;
    }
    if (!inTable || !line.startsWith("|")) continue;

    const cells = line.split("|").map((c) => c.trim());
    if (cells.length && cells[0] === "") cells.shift();
    if (cells.length && cells[cells.length - 1] === "") cells.pop();
    if (cells.length < 3) continue;
    const no = cells[0];
    if (/^no$/i.test(no) || /^-+$/.test(no)) continue; // başlık/ayraç
    if (no.startsWith("✚")) continue; // yeni ürünler ayrıca (hardcoded)

    const groups =
      cells[2] === "—" ? [] : cells[2].split(/\s+·\s+/).map((g) => g.trim()).filter(Boolean);

    const range = no.match(/^(\d+)\s*[–-]\s*(\d+)$/);
    if (range) rules.push({ type: "range", lo: +range[1], hi: +range[2], groups });
    else if (/^\d+$/.test(no)) rules.push({ type: "single", code: no, groups });
  }
  return rules;
}

// Bir ürün koduna atanan grup anahtarları (tekli önce, sonra aralık)
function groupsForCode(code, rules) {
  for (const r of rules) if (r.type === "single" && r.code === code) return r.groups;
  const n = parseInt(code, 10);
  for (const r of rules) if (r.type === "range" && n >= r.lo && n <= r.hi) return r.groups;
  return null;
}

// Grup anahtarlarını, koda özgü DETERMİNİSTİK id'lerle inline options'a çevir
function buildOptions(code, groupKeys, dict) {
  return groupKeys.map((k) => {
    const g = dict.get(k);
    if (!g) throw new Error(`Sözlükte grup yok: ${k}`);
    return {
      id: `${code}__${k}`,
      name_i18n: g.name_i18n,
      required: g.required,
      multi: g.multi,
      choices: g.choices.map((c, i) => ({
        id: `${code}__${k}__${i}`,
        name_i18n: c.name_i18n,
        price_delta: c.price_delta,
      })),
    };
  });
}

// ── Yeni ürünler (task'tan; 3 dilli adlar + fiyat + grup) ──
const NEW_BURGERS = [
  { code: "120", price: 7.0, groups: ["ENTFERNEN"], name_i18n: { de: "Hamburger", tr: "Hamburger", en: "Hamburger" } },
  { code: "121", price: 8.0, groups: ["ENTFERNEN"], name_i18n: { de: "Cheeseburger", tr: "Cheeseburger", en: "Cheeseburger" } },
  { code: "122", price: 7.0, groups: ["ENTFERNEN"], name_i18n: { de: "Chickenburger", tr: "Tavuklu Burger", en: "Chicken Burger" } },
  { code: "123", price: 7.5, groups: [], name_i18n: { de: "6 Chicken Nuggets", tr: "6 Tavuk Nugget", en: "6 Chicken Nuggets" } },
  { code: "124", price: 10.0, groups: [], name_i18n: { de: "9 Chicken Nuggets", tr: "9 Tavuk Nugget", en: "9 Chicken Nuggets" } },
  { code: "130", price: 13.0, groups: ["ENTFERNEN"], name_i18n: { de: "Hamburger Menü", tr: "Hamburger Menü", en: "Hamburger Menu" } },
  { code: "131", price: 14.0, groups: ["ENTFERNEN"], name_i18n: { de: "Cheeseburger Menü", tr: "Cheeseburger Menü", en: "Cheeseburger Menu" } },
  { code: "132", price: 13.0, groups: ["ENTFERNEN"], name_i18n: { de: "Chickenburger Menü", tr: "Tavuklu Burger Menü", en: "Chicken Burger Menu" } },
];

const NEW_DRINKS = [
  { price: 3.0, name_i18n: { de: "Cola Zero — 0,33 l", tr: "Cola Zero — 0,33 l", en: "Cola Zero — 0,33 l" } },
  { price: 3.0, name_i18n: { de: "Eistee — 0,33 l", tr: "Buzlu Çay — 0,33 l", en: "Iced Tea — 0,33 l" } },
];

// ── Ana akış ────────────────────────────────────────────────────────
async function main() {
  const DRY = process.argv.includes("--dry");
  console.log("→ Kaynak:", MENU_PATH);
  const md = readFileSync(MENU_PATH, "utf8");
  const dict = parseDictionary(md);
  const rules = parseRules(md);
  // Karar: 04 (Lahmacun Döner Menü) da kardeşleri gibi EXTRAS·SALAT·SOSSE alsın (kaynak atlamış).
  rules.unshift({ type: "single", code: "04", groups: ["EXTRAS", "SALAT", "SOSSE"] });

  console.log(`   Sözlük grupları: ${[...dict.keys()].join(", ")}`);

  // İşletme
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("id,slug,name")
    .eq("slug", SLUG)
    .maybeSingle();
  if (bizErr) throw new Error("select business: " + bizErr.message);
  if (!biz) throw new Error(`İşletme yok: ${SLUG}`);
  console.log(`→ İşletme: ${biz.name} / ${biz.slug} id=${biz.id}`);

  // Mevcut ürünler
  const { data: prods, error: pErr } = await supabase
    .from("products")
    .select("id,code,name,options,category_id,sort_order")
    .eq("business_id", biz.id);
  if (pErr) throw new Error("select products: " + pErr.message);
  const byCode = new Map((prods ?? []).map((p) => [p.code, p]));

  // Kategoriler
  const { data: cats } = await supabase
    .from("categories")
    .select("id,name,sort_order")
    .eq("business_id", biz.id);
  const catByName = new Map((cats ?? []).map((c) => [(c.name || "").toLowerCase(), c]));

  // ── 1) Mevcut ürünlere options bağla (sadece options) ──
  let setNonEmpty = 0;
  let setEmpty = 0;
  const planLines = [];
  for (const p of prods ?? []) {
    if (!p.code) continue;
    const gk = groupsForCode(p.code, rules) ?? [];
    const desired = buildOptions(p.code, gk, dict);
    const curLen = Array.isArray(p.options) ? p.options.length : 0;
    if (desired.length === 0 && curLen === 0) continue; // zaten boş → dokunma
    planLines.push(`   #${p.code} ${p.name} → [${gk.join(", ") || "—"}]`);
    if (!DRY) {
      const { error } = await supabase
        .from("products")
        .update({ options: desired })
        .eq("id", p.id);
      if (error) throw new Error(`update ${p.code}: ${error.message}`);
    }
    if (desired.length > 0) setNonEmpty++;
    else setEmpty++;
  }

  // ── 2) Burger kategorisi ──
  let burgerCat = catByName.get("burger");
  if (!burgerCat) {
    if (DRY) {
      burgerCat = { id: "(yeni)", name: "Burger" };
      console.log("   + kategori (yeni): Burger");
    } else {
      const sort = Math.max(0, ...(cats ?? []).map((c) => c.sort_order ?? 0)) + 1;
      const { data, error } = await supabase
        .from("categories")
        .insert({
          business_id: biz.id,
          name: "Burger",
          name_i18n: { de: "Burger", tr: "Burger", en: "Burger" },
          cover_src: "",
          cover_video: "",
          sort_order: sort,
        })
        .select("id,name")
        .single();
      if (error) throw new Error("insert Burger category: " + error.message);
      burgerCat = data;
      console.log("   + kategori: Burger");
    }
  }

  // ── 3) Burger ürünleri (idempotent: varsa sadece options güncelle) ──
  let burgersAdded = 0;
  let burgersUpdated = 0;
  for (let i = 0; i < NEW_BURGERS.length; i++) {
    const b = NEW_BURGERS[i];
    const options = buildOptions(b.code, b.groups, dict);
    const existing = byCode.get(b.code);
    if (existing) {
      if (!DRY) {
        const { error } = await supabase
          .from("products")
          .update({ options })
          .eq("id", existing.id);
        if (error) throw new Error(`update burger ${b.code}: ${error.message}`);
      }
      burgersUpdated++;
    } else {
      if (!DRY) {
        const { error } = await supabase.from("products").insert({
          business_id: biz.id,
          category_id: burgerCat.id,
          code: b.code,
          name: legacyDe(b.name_i18n),
          name_i18n: b.name_i18n,
          description: "",
          description_i18n: null,
          price: b.price,
          image: "",
          available: true,
          tags: [],
          allergens: [],
          options,
          sort_order: i,
        });
        if (error) throw new Error(`insert burger ${b.code}: ${error.message}`);
      }
      burgersAdded++;
    }
  }

  // ── 4) İki içecek (Kalte Getränke, code'suz, idempotent: ada göre) ──
  let drinksAdded = 0;
  const kalte = catByName.get("kalte getränke");
  const existingNames = new Set((prods ?? []).map((p) => (p.name || "").toLowerCase()));
  if (!kalte) {
    console.log("   ⚠ 'Kalte Getränke' kategorisi bulunamadı — içecekler atlandı.");
  } else {
    let sort = Math.max(
      0,
      ...(prods ?? []).filter((p) => p.category_id === kalte.id).map((p) => p.sort_order ?? 0)
    );
    for (const d of NEW_DRINKS) {
      const legacy = legacyDe(d.name_i18n);
      if (existingNames.has(legacy.toLowerCase())) continue; // zaten var
      sort++;
      if (!DRY) {
        const { error } = await supabase.from("products").insert({
          business_id: biz.id,
          category_id: kalte.id,
          code: null,
          name: legacy,
          name_i18n: d.name_i18n,
          description: "",
          description_i18n: null,
          price: d.price,
          image: "",
          available: true,
          tags: [],
          allergens: [],
          options: [],
          sort_order: sort,
        });
        if (error) throw new Error(`insert drink "${legacy}": ${error.message}`);
      }
      drinksAdded++;
    }
  }

  // ── Rapor ──
  if (DRY) {
    console.log("\n── Mevcut ürünlere planlanan options ──");
    for (const l of planLines) console.log(l);
  }
  console.log("\n" + (DRY ? "(DRY RUN — hiçbir şey yazılmadı.)" : "✅ Bitti."));
  console.log(`   options bağlanan (dolu) ürün : ${setNonEmpty}`);
  console.log(`   options=[] yapılan ürün      : ${setEmpty}`);
  console.log(`   yeni burger eklendi          : ${burgersAdded} (mevcut/güncellenen: ${burgersUpdated})`);
  console.log(`   yeni içecek eklendi          : ${drinksAdded}`);
}

main().catch((e) => {
  console.error("\n❌ HATA:", e.message);
  process.exit(1);
});
