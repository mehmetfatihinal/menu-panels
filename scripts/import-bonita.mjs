// Bonita Ice Cream & Cafe menüsünü (kaynak: "qr menü bonita.pdf", DE) TR/EN/DE
// çevirileriyle bonita@gmail.com işletmesine aktarır. Tek seferlik, IDEMPOTENT.
// Yalnızca bu işletmeye EKLER; hiçbir şey silmez.
//
// Çalıştırma (proje kökünden):
//   node scripts/import-bonita.mjs --dry     # sadece önizleme, DB'ye yazma
//   node scripts/import-bonita.mjs           # gerçek aktarım
//
// .env.local'den okur: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (admin).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const EMAIL = "bonita@gmail.com";
// Şifre repoya yazılmaz: yalnızca kullanıcı ilk kez OLUŞTURULACAKSA gerekir.
// BONITA_PASSWORD env değişkeniyle verin (mevcut kullanıcıda hiç kullanılmaz).
const PASSWORD = process.env.BONITA_PASSWORD || "";
const BIZ_NAME = "Bonita";
const BIZ_TAGLINE = "Ice Cream & Cafe";
const BIZ_CURRENCY = "€";
const DEFAULT_LANG = "de";
const BIZ_SLUG = "bonita";

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
const legacyDe = (o) => o.de || o.tr || o.en || "";
const prodKey = (code, name) => `${code ?? ""}|${(name || "").toLowerCase()}`;

// {tr,en,de} kısayolu
const t3 = (tr, en, de) => ({ tr, en, de });

// Seçenek grubu üret (uygulamanın beklediği şema: backup-options.json ile aynı)
function optGroup(nameI18n, choices, { required = false, multi = false } = {}) {
  return {
    id: randomUUID(),
    name_i18n: nameI18n,
    required,
    multi,
    choices: choices.map(([nameI18nC, delta]) => ({
      id: randomUUID(),
      name_i18n: nameI18nC,
      price_delta: delta,
    })),
  };
}

// Süt seçimi: sütlü kahve spesiyalleri + shake'ler (dipnot: laktozsuz süt ve
// vegan süt alternatifi +0,70 € mevcut)
const milkGroup = () =>
  optGroup(
    t3("Süt Seçimi", "Milk choice", "Milchauswahl"),
    [
      [t3("Normal Süt", "Regular milk", "Normale Milch"), 0],
      [t3("Laktozsuz Süt", "Lactose-free milk", "Laktosefreie Milch"), 0],
      [t3("Yulaf Sütü", "Oat milk", "Haferdrink"), 0.7],
    ]
  );

// Kafein: espresso bazlı içecekler (dipnot: kafeinsiz kahve mevcut)
const decafGroup = () =>
  optGroup(
    t3("Kahve", "Coffee", "Kaffee"),
    [
      [t3("Normal", "Regular", "Normal"), 0],
      [t3("Kafeinsiz", "Decaf", "Entkoffeiniert"), 0],
    ]
  );

// Şurup aroması: her içeceğe eklenebilir (+0,50 €)
const syrupGroup = () =>
  optGroup(
    t3("Şurup Aroması", "Syrup flavour", "Siruparoma"),
    [[t3("Şurup Aroması", "Syrup flavour", "Siruparoma"), 0.5]],
    { multi: true }
  );

// ── Menü (kaynak: qr menü bonita.pdf, 2 sayfa) ───────────────────────
// item: [nameI18n, fiyat, descI18n?, optionsFactory dizisi?]
const MENU = [
  {
    name: t3("Dondurma", "Ice Cream", "Eis"),
    items: [
      [t3("Top Dondurma", "Ice Cream Scoop", "Eiskugel"), 1.8],
      [t3("Premium Dondurma", "Premium Ice Cream", "Premium Eis"), 2.2],
    ],
  },
  {
    name: t3("Spagetti Dondurma", "Spaghetti Ice Cream", "Spaghetti Eis"),
    items: [
      [t3("Spagetti Dondurma", "Spaghetti Ice Cream", "Spaghetti Eis"), 6.5],
      [
        t3("Spagetti Dondurma Nutella", "Spaghetti Ice Cream Nutella", "Spaghetti Eis Nutella"),
        8.5,
      ],
      [t3("Spaghetti Bonito", "Spaghetti Bonito", "Spaghetti Bonito"), 8.5],
      [t3("Spaghetti Fragola", "Spaghetti Fragola", "Spaghetti Fragola"), 8.5],
      [t3("Spaghetti Frutta", "Spaghetti Frutta", "Spaghetti Frutta"), 8.5],
    ],
  },
  {
    name: t3("Tartufo & Affogato", "Tartufo & Affogato", "Tartufo & Affogato"),
    items: [
      [t3("Tartufo Nero", "Tartufo Nero", "Tartufo Nero"), 8.5],
      [t3("Tartufo Bianco", "Tartufo Bianco", "Tartufo Bianco"), 8.5],
      [t3("Tartufo al Pistacchio", "Tartufo al Pistacchio", "Tartufo al Pistacchio"), 9.5],
      [t3("Affogato", "Affogato", "Affogato"), 4.1],
      [t3("Affogato Pistacchio", "Affogato Pistacchio", "Affogato Pistacchio"), 4.5],
    ],
  },
  {
    name: t3("Çocuk Dondurmaları", "Kids' Ice Cream", "Kinder Eis"),
    items: [
      [t3("Çocuk Sürprizi", "Kids' Surprise", "Kinder Überraschung"), 5.0],
      [
        t3("Çocuk Spagetti Dondurma", "Kids' Spaghetti Ice Cream", "Kinder Spaghetti Eis"),
        5.0,
      ],
      [t3("Şirin Dondurması", "Smurf Ice Cream", "Kinder Schlumpfeis"), 5.0],
      [t3("Arı Maya", "Maya the Bee", "Kinder Biene Maja"), 5.0],
    ],
  },
  {
    name: t3("Dondurma Kupları", "Ice Cream Sundaes", "Eis Becher"),
    items: [
      [t3("Çikolatalı Kup", "Chocolate Sundae", "Schoko Becher"), 7.0],
      [t3("Çilekli Kup", "Strawberry Sundae", "Erdbeer Becher"), 9.0],
      [t3("Fındıklı Kup", "Nut Sundae", "Nuss Becher"), 8.0],
      [t3("Rocher Kup", "Rocher Sundae", "Rocher Becher"), 9.0],
      [t3("Amarena Kup", "Amarena Sundae", "Amarena Becher"), 7.5],
      [t3("Stracciatella Kup", "Stracciatella Sundae", "Stracciatella Becher"), 7.0],
      [
        t3("Yoğurtlu Çilekli Kup", "Yogurt Strawberry Sundae", "Joghurt Erdbeer Becher"),
        8.0,
      ],
      [t3("Muzlu Split", "Banana Split", "Bananen Split"), 9.0],
    ],
  },
  {
    name: t3("Ekstralar", "Extras", "Extras"),
    items: [
      [t3("Krema", "Whipped Cream", "Sahne"), 1.7],
      [t3("Sos, Granül", "Sauce, Sprinkles", "Soße, Streusel"), 1.0],
      [t3("Fındık", "Nuts", "Nüsse"), 1.2],
      [t3("Meyve", "Fruit", "Obst"), 2.0],
    ],
  },
  {
    name: t3("Kahve & Çay", "Coffee & Tea", "Coffee & Tee"),
    items: [
      [t3("Espresso", "Espresso", "Espresso"), 2.4, null, [decafGroup, syrupGroup]],
      [
        t3("Duble Espresso", "Double Espresso", "Espresso Doppio"),
        4.0,
        null,
        [decafGroup, syrupGroup],
      ],
      [t3("Café Creme", "Café Creme", "Café Creme"), 2.5, null, [decafGroup, syrupGroup]],
      [
        t3("Cappuccino", "Cappuccino", "Cappuccino"),
        3.4,
        null,
        [decafGroup, milkGroup, syrupGroup],
      ],
      [
        t3("Latte Macchiato", "Latte Macchiato", "Latte Macchiato"),
        4.0,
        null,
        [decafGroup, milkGroup, syrupGroup],
      ],
      [
        t3("Espresso Macchiato", "Espresso Macchiato", "Espresso Macchiato"),
        2.8,
        null,
        [decafGroup, milkGroup, syrupGroup],
      ],
      [
        t3("Sütlü Kahve", "Coffee with Milk", "Milchkaffee"),
        3.6,
        null,
        [decafGroup, milkGroup, syrupGroup],
      ],
      [
        t3("Sıcak Çikolata", "Hot Chocolate", "Heiße Schokolade"),
        3.4,
        null,
        [milkGroup, syrupGroup],
      ],
      [t3("Türk Kahvesi", "Turkish Coffee", "Türkischer Mokka"), 2.5],
      [t3("Çay", "Turkish Tea", "Türkischer Tee (Çay)"), 2.0],
      [t3("Bitki Çayları", "Herbal Teas", "Kräuter Tee Sorten"), 2.5],
      [
        t3("Şurup Aroması", "Syrup Flavour", "Siruparomen"),
        0.5,
        t3(
          "Her içeceğe eklenebilir",
          "Optional with any drink",
          "Wahlweise zu jedem Getränk"
        ),
      ],
    ],
  },
  {
    name: t3("Milkshake", "Milkshake", "Milchshake"),
    items: [
      [
        t3("Milkshake Büyük", "Milkshake Large", "Milchshake Groß"),
        5.5,
        null,
        [milkGroup, syrupGroup],
      ],
      [
        t3("Milkshake Küçük", "Milkshake Small", "Milchshake Klein"),
        4.5,
        null,
        [milkGroup, syrupGroup],
      ],
      [
        t3("Buzlu Kahve", "Iced Coffee", "Eiskaffee"),
        5.5,
        null,
        [decafGroup, milkGroup, syrupGroup],
      ],
    ],
  },
];

// ── Kullanıcı + işletme ──────────────────────────────────────────────
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
  if (!PASSWORD)
    throw new Error(
      "Kullanıcı mevcut değil ve BONITA_PASSWORD env değişkeni verilmedi."
    );
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error("createUser: " + error.message);
  return { user: data.user, created: true };
}

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
    if (existing.tagline !== BIZ_TAGLINE) patch.tagline = BIZ_TAGLINE;
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
      slug: BIZ_SLUG,
      currency: BIZ_CURRENCY,
      tagline: BIZ_TAGLINE,
      default_lang: DEFAULT_LANG,
    })
    .select()
    .single();
  if (insErr) throw new Error("insert business: " + insErr.message);
  return { business: data, created: true, updated: [] };
}

// ── Ana akış ─────────────────────────────────────────────────────────
async function main() {
  const dry = process.argv.includes("--dry");

  const nItems = MENU.reduce((a, c) => a + c.items.length, 0);
  console.log(`Bonita menüsü: ${MENU.length} kategori, ${nItems} ürün.\n`);

  if (dry) {
    for (const c of MENU) {
      console.log(`▶ ${legacyDe(c.name)}  (${c.items.length} ürün)`);
      for (const [nm, price, desc, opts] of c.items) {
        console.log(
          `   - ${legacyDe(nm)}  ${price.toFixed(2)}€` +
            (opts ? `  [${opts.length} seçenek grubu]` : "") +
            (desc ? `  — ${legacyDe(desc)}` : "")
        );
      }
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

  for (let ci = 0; ci < MENU.length; ci++) {
    const cat = MENU[ci];
    const catLegacy = legacyDe(cat.name);
    let catId = catByName.get(catLegacy.toLowerCase());

    if (!catId) {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          business_id: business.id,
          name: catLegacy,
          name_i18n: cat.name,
          cover_src: "",
          cover_video: "",
          sort_order: ci,
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
      .filter(([nm]) => !prodKeys.has(prodKey(null, legacyDe(nm))))
      .map(([nm, price, desc, opts], pi) => ({
        business_id: business.id,
        category_id: catId,
        code: null,
        name: legacyDe(nm),
        name_i18n: nm,
        description: desc ? legacyDe(desc) : "",
        description_i18n: desc || null,
        price,
        image: "",
        available: true,
        tags: [],
        allergens: [],
        options: (opts ?? []).map((f) => f()),
        sort_order: pi,
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
