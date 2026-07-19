// Emir Et Grill & Steak menüsünü (TR/EN/DE) + ek seçenek gruplarıyla emiretrestaurant@gmail.com
// işletmesine aktarır. Tek seferlik, IDEMPOTENT. Yalnızca bu işletmeye EKLER; hiçbir şey silmez.
//
// Çalıştırma (proje kökünden):
//   node scripts/import-emiret.mjs --dry     # sadece ayrıştır, DB'ye yazma (önizleme)
//   node scripts/import-emiret.mjs           # gerçek aktarım
//
// .env.local'den okur: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (admin).
// ÖN KOŞUL: 0003_options_lang.sql (products.options, businesses.default_lang) uygulanmış olmalı.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const EMAIL = "emiretrestaurant@gmail.com";
const PASSWORD = "Emir4949.";
const BIZ_NAME = "Emir Et Grill & Steak Restaurant";
const BIZ_TAGLINE = "Grill & Steak";
const BIZ_CURRENCY = "€";
const DEFAULT_LANG = "de";
const MENU_PATH = join(ROOT, "Emir-et", "Emir-ET-Restaurant-Menu-TR-EN-DE.md");

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

// "7,50 €" / "102,90" / "+1,40 €" → sayı (virgül -> nokta, kuruşa yuvarla). "—" → 0.
function toNum(s) {
  const v = String(s).replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

const legacyDe = (o) => o.de || o.tr || o.en || "";

// [tr,en,de] dizisinden dolu alanlarla i18n nesnesi
function triple(parts) {
  const o = {};
  if (parts[0]) o.tr = String(parts[0]).trim();
  if (parts[1]) o.en = String(parts[1]).trim();
  if (parts[2]) o.de = String(parts[2]).trim();
  return o;
}

// Başlıktaki baştaki emoji/işaretleri temizle (ilk harfe kadar)
function stripEmoji(s) {
  return String(s).replace(/^[^\p{L}]+/u, "").trim();
}

// Alerjen/katkı grubu mu? (virgül/eğik çizgi ile ayrılmış her öğe tek harf a-n VEYA sayı)
function isAllergenGroup(inner) {
  const tokens = inner.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
  if (!tokens.length) return false;
  return tokens.every((tok) => /^[a-n]$/i.test(tok) || /^\d+$/.test(tok));
}

// Metindeki alerjen/katkı kodlarını sırayla, tekrarsız, küçük harf olarak topla.
function extractAllergens(text) {
  const codes = [];
  const seen = new Set();
  for (const m of text.matchAll(/\(([^)]*)\)/g)) {
    if (!isAllergenGroup(m[1])) continue;
    for (const tok of m[1].split(/[,/]/).map((s) => s.trim()).filter(Boolean)) {
      const c = tok.toLowerCase();
      if (!seen.has(c)) {
        seen.add(c);
        codes.push(c);
      }
    }
  }
  return codes;
}

// Bir ürüne açıklama yaz (ilk açıklama kazanır); gövde "TR · EN · DE"
function setDesc(product, body) {
  if (Object.keys(product.descI18n).length) return;
  const p = body.split(/\s+·\s+/).map((s) => s.trim());
  const d = {};
  if (p[0]) d.tr = p[0];
  if (p[1]) d.en = p[1];
  if (p[2]) d.de = p[2];
  product.descI18n = d;
}

// Bir devam satırını (EN/DE ad, Açıklama, Seçenekler, çıplak açıklama) ürüne uygula
function applyDetail(text, product) {
  text = text.trim();
  if (!text) return;

  if (/^Açıklama:/i.test(text)) {
    setDesc(product, text.replace(/^Açıklama:\s*/i, ""));
    return;
  }
  if (/^Seçenekler:/i.test(text)) {
    const body = text.replace(/^Seçenekler:\s*/i, "");
    product.optionRefs = body
      .split(/\s+·\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return;
  }

  let m;
  if ((m = text.match(/^EN\/DE\s+([\s\S]+)$/i))) {
    const dm = m[1].split(/\s+—\s+/);
    const desc = dm.slice(1).join(" — ");
    const hasDesc = dm.length > 1 && desc.includes(" · ");
    const nm = (hasDesc ? dm[0] : m[1]).trim();
    if (nm) {
      if (!product.nameI18n.en) product.nameI18n.en = nm;
      if (!product.nameI18n.de) product.nameI18n.de = nm;
    }
    if (hasDesc) setDesc(product, desc);
    return;
  }
  if (/^EN\s+/i.test(text)) {
    // Segmentlere ayır; ad segmentleri (EN/DE) ve açıklama segmentlerini sınıflandır.
    const nameSegs = [];
    const descSegs = [];
    for (const seg of text.split(/\s+·\s+/)) {
      let mm;
      if ((mm = seg.match(/^EN\s+([\s\S]+)$/i))) nameSegs.push({ lang: "en", full: mm[1] });
      else if ((mm = seg.match(/^DE\s+([\s\S]+)$/i))) nameSegs.push({ lang: "de", full: mm[1] });
      else descSegs.push(seg);
    }
    // Bir ad segmenti " — <açıklamaTR>" kuyruğu taşıyabilir; yalnızca 3 parçalı bir
    // açıklama oluşuyorsa kuyruğu ayır, aksi halde kuyruk adın parçasıdır (ör. "— 2 persons").
    const tails = [];
    const names = nameSegs.map((n) => {
      const parts = n.full.split(/\s+—\s+/);
      if (parts.length > 1) tails.push(parts.slice(1).join(" — "));
      return { lang: n.lang, name: parts[0].trim(), full: n.full.trim() };
    });
    const descAll = [...tails, ...descSegs];
    const hasDesc = descAll.length >= 3;
    for (const n of names) {
      const val = hasDesc ? n.name : n.full;
      if (val && !product.nameI18n[n.lang]) product.nameI18n[n.lang] = val;
    }
    if (hasDesc) setDesc(product, descAll.join(" · "));
    return;
  }

  // Çıplak 3 dilli açıklama satırı
  if (text.includes(" · ")) setDesc(product, text);
}

// ── Sözlük grubu başlat: "### Sos · Sauce · Soße — (tek, zorunlu)" ────
function startDictGroup(line) {
  const body = line.slice(4).trim();
  const dash = body.split(/\s+—\s+/);
  const titleLeft = dash[0].trim();
  const markers = (dash[1] || "").toLowerCase();

  let qualifier = "";
  let clean = titleLeft;
  const qm = titleLeft.match(/\(([^)]*)\)\s*$/);
  if (qm) {
    qualifier = qm[1].trim();
    clean = titleLeft.slice(0, qm.index).trim();
  }
  const parts = clean.split(/\s+·\s+/).map((s) => s.trim());
  const name_i18n = triple(parts);

  const trBase = (parts[0] || "").toLowerCase().trim();
  const q = qualifier.toLowerCase();
  let key;
  if (trBase === "garnitür") {
    if (q.includes("etler")) key = "garnitür-etler";
    else if (q.includes("lokum")) key = "garnitür-lokum";
    else key = "garnitür";
  } else {
    key = trBase;
  }

  return {
    key,
    group: {
      name_i18n,
      required: markers.includes("zorunlu"),
      multi: markers.includes("çoklu"),
      choices: [],
    },
  };
}

// Sözlük tablo satırı: | TR | EN | DE | Ek ücret |
function addDictRow(group, line) {
  const cells = line.split("|").map((c) => c.trim());
  if (cells.length && cells[0] === "") cells.shift();
  if (cells.length && cells[cells.length - 1] === "") cells.pop();
  if (cells.length < 4) return;
  if (/türkçe/i.test(cells[0]) || /^-+$/.test(cells[0])) return; // başlık/ayraç
  group.choices.push({
    name_i18n: { tr: cells[0], en: cells[1], de: cells[2] },
    price_delta: toNum(cells[3]),
  });
}

// Ürün başlığı bullet'ı: "- **<code> · <TR>** — <price> € · (kodlar) [· EN.. · DE..]"
function startProduct(line, cat) {
  const m = line.match(/^- \*\*(.+?)\*\*([\s\S]*)$/);
  if (!m) return null;
  const bold = m[1].trim();
  const rest = m[2] || "";

  let code = null;
  let nameTr = bold;
  const bi = bold.indexOf(" · ");
  if (bi !== -1) {
    code = bold.slice(0, bi).replace(/\\?\*/g, "").trim() || null;
    nameTr = bold.slice(bi + 3).trim();
  }
  nameTr = nameTr.replace(/\\?\*/g, "").trim();

  const pm = rest.match(/([\d.,]+)\s*€/);
  const price = pm ? toNum(pm[1]) : 0;
  const allergens = extractAllergens(rest);

  let weight = "";
  const wm = rest.match(/_([^_]*\d+\s*g)_/i);
  if (wm) weight = wm[1].replace(/\s+/g, " ").trim();

  const p = {
    code,
    nameI18n: { tr: nameTr },
    descI18n: {},
    price,
    allergens,
    optionRefs: [],
    options: [],
    _weight: weight,
    sort: cat.items.length,
  };
  cat.items.push(p);

  // Tek satırlık üründe EN/DE aynı satırda olabilir
  const dm = rest.match(/·\s*(EN(?:\/DE)?\s[\s\S]*)$/);
  if (dm) applyDetail(dm[1].trim(), p);
  return p;
}

// İçecek tablo satırı → ürün
function handleDrinkRow(line, cat) {
  const cells = line.split("|").map((c) => c.trim());
  if (cells.length && cells[0] === "") cells.shift();
  if (cells.length && cells[cells.length - 1] === "") cells.pop();
  if (!cells.length || !/^\d+$/.test(cells[0])) return; // başlık/ayraç/boş

  const code = cells[0];
  let nameCell, volume = "", priceCell;
  if (cells.length >= 4) {
    nameCell = cells[1];
    volume = cells[2];
    priceCell = cells[3];
  } else {
    nameCell = cells[1];
    priceCell = cells[2];
  }
  const price = toNum(priceCell);
  const parts = nameCell.split(/\s+·\s+/).map((s) => s.trim()).filter(Boolean);
  let nameI18n;
  if (parts.length >= 3) nameI18n = { tr: parts[0], en: parts[1], de: parts[2] };
  else if (parts.length === 2) nameI18n = { tr: parts[0], de: parts[1] };
  else nameI18n = { tr: parts[0], de: parts[0], en: parts[0] };

  const descI18n = {};
  if (volume) {
    descI18n.tr = volume;
    descI18n.de = volume;
    descI18n.en = volume;
  }
  cat.items.push({
    code,
    nameI18n,
    descI18n,
    price,
    allergens: [],
    optionRefs: [],
    options: [],
    _weight: "",
    sort: cat.items.length,
  });
}

// "**Ekstralar (numarasız):** Ketçap 0,50 € · Mayonez 0,50 € · ..." → code'suz ürünler
function addExtrasLine(body, cat) {
  for (const it of body.split(/\s+·\s+/).map((s) => s.trim()).filter(Boolean)) {
    const m = it.match(/^(.+?)\s+([\d.,]+)\s*€$/);
    if (!m) continue;
    const name = m[1].trim();
    cat.items.push({
      code: null,
      nameI18n: { tr: name, de: name, en: name },
      descI18n: {},
      price: toNum(m[2]),
      allergens: [],
      optionRefs: [],
      options: [],
      _weight: "",
      sort: cat.items.length,
    });
  }
}

// ── Tüm menüyü ayrıştır ──────────────────────────────────────────────
function parseAll(md) {
  const lines = md.split(/\r?\n/);
  const dict = new Map();
  const categories = [];
  let mode = "top";
  let curCat = null;
  let curProduct = null;
  let curGroup = null;

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith("# ")) {
      curProduct = null;
      curGroup = null;
      const title = line.slice(2).trim();
      if (/EK SEÇENEK|🔧/.test(title)) {
        mode = "dict";
        curCat = null;
        continue;
      }
      mode = "menu";
      const parts = stripEmoji(title)
        .split(/\s+·\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const nameI18n = triple(parts);
      curCat = {
        nameI18n,
        name: legacyDe(nameI18n),
        items: [],
        sort: categories.length,
      };
      categories.push(curCat);
      continue;
    }
    if (line.startsWith("## ")) {
      mode = "footer";
      curCat = null;
      curProduct = null;
      curGroup = null;
      continue;
    }

    if (mode === "dict") {
      if (line.startsWith("### ")) {
        curGroup = startDictGroup(line);
        if (curGroup) dict.set(curGroup.key, curGroup.group);
        continue;
      }
      if (line.startsWith("|") && curGroup) addDictRow(curGroup.group, line);
      continue;
    }

    if (mode === "menu") {
      if (line.startsWith("### ")) {
        curProduct = null;
        continue;
      }
      if (line.startsWith("|")) {
        if (curCat) handleDrinkRow(line, curCat);
        continue;
      }
      let em;
      if ((em = line.match(/^\*\*(.+?):\*\*\s*(.+)$/))) {
        if (curCat) addExtrasLine(em[2], curCat);
        curProduct = null;
        continue;
      }
      if (line.startsWith("- **")) {
        curProduct = curCat ? startProduct(line, curCat) : null;
        continue;
      }
      if (curProduct && /^\s+\S/.test(raw)) {
        applyDetail(line, curProduct);
        continue;
      }
      if (!line) curProduct = null;
      continue;
    }
    // top/footer: yoksay
  }

  // Ağırlık notlarını açıklamaya kat
  for (const c of categories) {
    for (const p of c.items) {
      if (!p._weight) continue;
      for (const l of ["tr", "de", "en"]) {
        p.descI18n[l] = p.descI18n[l] ? `${p.descI18n[l]} · ${p._weight}` : p._weight;
      }
    }
  }

  return { dict, categories };
}

// Ürünün Seçenekler referanslarını sözlükteki gruplara eşle, yeni id'lerle inline kopyala
function attachOptions(product, dict, warnings) {
  const opts = [];
  for (const ref of product.optionRefs) {
    const pi = ref.indexOf(" (");
    const refName = (pi === -1 ? ref : ref.slice(0, pi)).trim();
    const key = refName.toLowerCase().trim();
    const g = dict.get(key);
    if (!g) {
      warnings.push(
        `Seçenek grubu eşlenemedi: "${refName}" → ürün ${product.code || product.nameI18n.tr}`
      );
      continue;
    }
    opts.push({
      id: randomUUID(),
      name_i18n: g.name_i18n,
      required: g.required,
      multi: g.multi,
      choices: g.choices.map((c) => ({
        id: randomUUID(),
        name_i18n: c.name_i18n,
        price_delta: c.price_delta,
      })),
    });
  }
  return opts;
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

// ── İşletmeyi bul/normalize et (ad/para/dil), yoksa oluştur ──────────
async function ensureBusiness(ownerId) {
  const { data: existing, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error("select business: " + error.message);

  if (existing) {
    const patch = {};
    if (existing.name !== BIZ_NAME) patch.name = BIZ_NAME;
    if (existing.currency !== BIZ_CURRENCY) patch.currency = BIZ_CURRENCY;
    if (existing.default_lang !== DEFAULT_LANG) patch.default_lang = DEFAULT_LANG;
    if (Object.keys(patch).length) {
      const { data: upd, error: uErr } = await supabase
        .from("businesses")
        .update(patch)
        .eq("id", existing.id)
        .select()
        .single();
      if (uErr) throw new Error("update business: " + uErr.message);
      return { business: upd, created: false, updated: Object.keys(patch) };
    }
    return { business: existing, created: false, updated: [] };
  }

  const { data, error: insErr } = await supabase
    .from("businesses")
    .insert({
      owner_id: ownerId,
      name: BIZ_NAME,
      slug: slugify(BIZ_NAME),
      currency: BIZ_CURRENCY,
      tagline: BIZ_TAGLINE,
      default_lang: DEFAULT_LANG,
    })
    .select()
    .single();
  if (insErr) throw new Error("insert business: " + insErr.message);
  return { business: data, created: true, updated: [] };
}

// Idempotency anahtarı: code + legacy ad (aynı code'lu farklı ürünler ayrışsın, ör. iki 236)
const prodKey = (code, name) =>
  `${String(code || "").trim()}|${String(name || "").trim()}`.toLowerCase();

// ── Ana akış ─────────────────────────────────────────────────────────
async function main() {
  const DRY = process.argv.includes("--dry");
  console.log("→ Menü ayrıştırılıyor:", MENU_PATH);
  const md = readFileSync(MENU_PATH, "utf8");
  const parsed = parseAll(md);
  const dict = parsed.dict;
  // Boş kategorileri (ör. belge başlığı H1) atla
  const categories = parsed.categories.filter((c) => c.items.length > 0);

  const warnings = [];
  let optionCount = 0;
  for (const c of categories) {
    for (const p of c.items) {
      p.options = attachOptions(p, dict, warnings);
      optionCount += p.options.length;
    }
  }

  const totalItems = categories.reduce((n, c) => n + c.items.length, 0);
  console.log(
    `   ${categories.length} kategori · ${totalItems} ürün · ${dict.size} sözlük grubu · ${optionCount} inline seçenek grubu eklendi.`
  );
  console.log(`   Sözlük anahtarları: ${[...dict.keys()].join(", ")}`);

  if (warnings.length) {
    console.log("\n⚠ Eşlenemeyen seçenek referansları:");
    for (const w of warnings) console.log("   - " + w);
  }

  if (DRY) {
    for (const c of categories) {
      console.log(
        `\n[${c.sort}] ${JSON.stringify(c.nameI18n)}  (${c.items.length} ürün)`
      );
      for (const it of c.items.slice(0, 3)) {
        const optNames = it.options
          .map((g) => legacyDe(g.name_i18n) + (g.required ? "*" : ""))
          .join(", ");
        console.log(
          `   • #${it.code ?? "—"} ${legacyDe(it.nameI18n)} | ${it.price}€ | alerjen=[${it.allergens.join(",")}]${optNames ? ` | seçenekler=[${optNames}]` : ""}`
        );
        if (Object.keys(it.descI18n).length)
          console.log(`     desc=${JSON.stringify(it.descI18n)}`);
      }
      if (c.items.length > 3) console.log(`   … (+${c.items.length - 3} ürün)`);
    }
    console.log("\n(DRY RUN — veritabanına hiçbir şey yazılmadı.)");
    return;
  }

  const { user, created: userCreated } = await ensureUser();
  console.log(`→ Kullanıcı: ${user.email} (${userCreated ? "OLUŞTURULDU" : "mevcut"})`);

  const { business, created: bizCreated, updated } = await ensureBusiness(user.id);
  console.log(
    `→ İşletme: ${business.name} / ${business.slug} (${
      bizCreated ? "OLUŞTURULDU" : updated.length ? "GÜNCELLENDİ: " + updated.join(",") : "mevcut"
    }) id=${business.id}`
  );

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
  const prodKeys = new Set((exProds ?? []).map((p) => prodKey(p.code, p.name)));

  let catsAdded = 0;
  let prodsAdded = 0;

  for (const cat of categories) {
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
      .filter((it) => !prodKeys.has(prodKey(it.code, legacyDe(it.nameI18n))))
      .map((it) => ({
        business_id: business.id,
        category_id: catId,
        code: it.code,
        name: legacyDe(it.nameI18n),
        name_i18n: it.nameI18n,
        description: legacyDe(it.descI18n),
        description_i18n: Object.keys(it.descI18n).length ? it.descI18n : null,
        price: it.price,
        image: "",
        available: true,
        tags: [],
        allergens: it.allergens,
        options: it.options,
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
