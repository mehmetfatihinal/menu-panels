// Emir-Et (slug: emir-et-restaurant-jrl3 / owner: emiretrestaurant@gmail.com) ve Dornbusch
// (slug: dornbusch-ktsv / owner: ffmkeskin@gmail.com) işletmelerindeki TÜM ürünlerin EK
// SEÇENEKLERİNİ boşaltır → products.options = [].
//
// DOKUNULMAZ: ürün/kategori, ad, fiyat, açıklama, görsel, kapak, alerjen, etiketler.
// SADECE options alanı boşaltılır. Silme YOK. Yalnızca bu iki işletme.
// IDEMPOTENT (tekrar çalışınca yine boş; yedeği ezmez — aşağıya bkz.).
//
// Çalıştırma (proje kökünden):
//   node scripts/clear-options.mjs --dry   # DRY-RUN: yedek al + boş olmayan sayıyı raporla (DB'ye YAZMAZ)
//   node scripts/clear-options.mjs         # UYGULA: yedek al + options=[] yap + doğrula
//
// .env.local'den: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (admin, schema menupanels).
// Yedek: scripts/backup-options.json  → [{ business_slug, product_id, code, name, options }]
//        (yalnızca options'ı boş OLMAYAN ürünler). Geri yükleme buradan mümkün.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BACKUP_PATH = join(__dirname, "backup-options.json");

// Hedef işletmeler: önce slug ile bul; bulunamazsa owner e-postasıyla eşle.
const TARGETS = [
  { label: "Emir-Et", slug: "emir-et-restaurant-jrl3", email: "emiretrestaurant@gmail.com" },
  { label: "Dornbusch", slug: "dornbusch-ktsv", email: "ffmkeskin@gmail.com" },
];

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

// options boş mu? (jsonb not null default '[]' → null gelmez, yine de savunmacı)
const isNonEmpty = (o) => Array.isArray(o) && o.length > 0;

// owner e-postasından auth kullanıcısını bul (sayfalı)
async function findUserByEmail(email) {
  const target = email.toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("listUsers: " + error.message);
    const found = data.users.find((u) => (u.email || "").toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 200 || page > 50) return null;
    page++;
  }
}

// Bir hedefi işletme kaydına çöz: slug → yoksa owner e-postası
async function resolveBusiness(t) {
  const { data: bySlug, error: e1 } = await supabase
    .from("businesses")
    .select("id,slug,name,owner_id")
    .eq("slug", t.slug)
    .maybeSingle();
  if (e1) throw new Error(`select business (slug ${t.slug}): ${e1.message}`);
  if (bySlug) return { ...t, id: bySlug.id, slug: bySlug.slug, name: bySlug.name, matchedBy: "slug" };

  const user = await findUserByEmail(t.email);
  if (!user) throw new Error(`İşletme bulunamadı: slug=${t.slug} ve owner e-postası da yok (${t.email}).`);
  const { data: byOwner, error: e2 } = await supabase
    .from("businesses")
    .select("id,slug,name,owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (e2) throw new Error(`select business (owner ${t.email}): ${e2.message}`);
  if (!byOwner) throw new Error(`İşletme bulunamadı: owner ${t.email} (user id=${user.id}).`);
  return { ...t, id: byOwner.id, slug: byOwner.slug, name: byOwner.name, matchedBy: "owner-email" };
}

// ── Ana akış ────────────────────────────────────────────────────────
async function main() {
  const DRY = process.argv.includes("--dry");
  console.log(`\n=== options temizleme — ${DRY ? "DRY-RUN (yazma yok)" : "UYGULA"} ===`);

  // 1) İşletmeleri çöz
  const businesses = [];
  for (const t of TARGETS) {
    const b = await resolveBusiness(t);
    console.log(`→ ${b.label}: ${b.name} / ${b.slug}  id=${b.id}  (eşleşme: ${b.matchedBy})`);
    businesses.push(b);
  }
  const bizIds = businesses.map((b) => b.id);
  if (new Set(bizIds).size !== bizIds.length) throw new Error("İki hedef aynı işletmeye çözüldü — iptal.");

  // 2) Ürünleri çek + boş olmayan options'ları tespit et (YEDEK için)
  const perBiz = [];
  const backup = [];
  for (const b of businesses) {
    const { data: prods, error } = await supabase
      .from("products")
      .select("id,code,name,options")
      .eq("business_id", b.id);
    if (error) throw new Error(`select products (${b.slug}): ${error.message}`);
    const rows = prods ?? [];
    const nonEmpty = rows.filter((p) => isNonEmpty(p.options));
    perBiz.push({ biz: b, total: rows.length, nonEmpty });
    for (const p of nonEmpty) {
      backup.push({ business_slug: b.slug, product_id: p.id, code: p.code, name: p.name, options: p.options });
    }
    console.log(`   ${b.label}: ${rows.length} ürün · boş OLMAYAN options: ${nonEmpty.length}`);
  }

  // 3) YEDEK yaz — yalnızca yedeklenecek bir şey varsa (idempotent: ikinci çalıştırmada
  //    her şey zaten boşsa mevcut yedeği BOŞ diziyle EZMEZ).
  if (backup.length > 0) {
    writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2), "utf8");
    console.log(`\n📦 Yedek yazıldı: ${BACKUP_PATH}  (${backup.length} ürün)`);
  } else {
    console.log(`\n📦 Yedeklenecek (boş olmayan options'lı) ürün yok — mevcut yedek dosyası korundu.`);
  }

  // 4) DRY-RUN ise burada dur
  if (DRY) {
    console.log("\n(DRY-RUN — DB'ye hiçbir şey yazılmadı.)");
    console.log("── Temizlenecek ürün sayısı ──");
    for (const x of perBiz) console.log(`   ${x.biz.label}: ${x.nonEmpty.length}`);
    return;
  }

  // 5) UYGULA — yalnızca boş olmayan ürünlerde options=[] (kesin küme; başka işletmeye dokunmaz)
  const cleanedPerBiz = [];
  for (const x of perBiz) {
    const ids = x.nonEmpty.map((p) => p.id);
    if (ids.length === 0) {
      cleanedPerBiz.push({ biz: x.biz, cleaned: 0 });
      continue;
    }
    const { error } = await supabase
      .from("products")
      .update({ options: [] })
      .in("id", ids)
      .eq("business_id", x.biz.id); // savunma: yalnızca bu işletme
    if (error) throw new Error(`update options (${x.biz.slug}): ${error.message}`);
    cleanedPerBiz.push({ biz: x.biz, cleaned: ids.length });
    console.log(`   ✓ ${x.biz.label}: ${ids.length} ürün → options=[]`);
  }

  // 6) DOĞRULA — canlı DB'den yeniden say; boş olmayan KALMAMALI
  console.log("\n── Doğrulama (canlı DB) ──");
  let allClear = true;
  for (const b of businesses) {
    const { data: prods, error } = await supabase
      .from("products")
      .select("id,options")
      .eq("business_id", b.id);
    if (error) throw new Error(`verify select (${b.slug}): ${error.message}`);
    const remaining = (prods ?? []).filter((p) => isNonEmpty(p.options)).length;
    const cleaned = cleanedPerBiz.find((c) => c.biz.id === b.id)?.cleaned ?? 0;
    console.log(
      `   ${b.label}: temizlenen=${cleaned} · boş olmayan KALAN=${remaining} → ${remaining === 0 ? "✅ TEMİZ" : "❌ HÂLÂ VAR"}`
    );
    if (remaining !== 0) allClear = false;
  }

  console.log("\n" + (allClear ? "✅ Bitti — her iki işletmede de boş olmayan options kalmadı." : "❌ Doğrulama BAŞARISIZ."));
  if (!allClear) process.exit(1);
}

main().catch((e) => {
  console.error("\n❌ HATA:", e.message);
  process.exit(1);
});
