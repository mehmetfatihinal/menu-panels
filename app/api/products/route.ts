import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness, cleanI18n, legacyFromI18n } from "@/lib/business";
import type { OptionGroup, OptionChoice } from "@/lib/options";

export const dynamic = "force-dynamic";

// Panelden gelen seçenek gruplarını doğrula/normalize et (sayı/boolean coerce, eksik id üret).
function sanitizeOptions(raw: unknown): OptionGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: OptionGroup[] = [];
  for (const g of raw) {
    if (!g || typeof g !== "object") continue;
    const gi = cleanI18n((g as any).name_i18n);
    const choicesRaw = Array.isArray((g as any).choices) ? (g as any).choices : [];
    const choices: OptionChoice[] = [];
    for (const c of choicesRaw) {
      if (!c || typeof c !== "object") continue;
      const ci = cleanI18n((c as any).name_i18n);
      if (!ci) continue; // isimsiz seçeneği atla
      choices.push({
        id:
          typeof (c as any).id === "string" && (c as any).id
            ? (c as any).id
            : randomUUID(),
        name_i18n: ci,
        price_delta: Math.max(0, Number((c as any).price_delta) || 0),
        default: Boolean((c as any).default),
      });
    }
    if (!gi || choices.length === 0) continue; // isimsiz/seçeneksiz grubu atla
    groups.push({
      id:
        typeof (g as any).id === "string" && (g as any).id
          ? (g as any).id
          : randomUUID(),
      name_i18n: gi,
      required: Boolean((g as any).required),
      multi: Boolean((g as any).multi),
      choices,
    });
  }
  return groups;
}

// Yeni ürün ekle
export async function POST(req: Request) {
  const b = await req.json();
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

  const nameI18n = cleanI18n(b.nameI18n);
  const descI18n = cleanI18n(b.descriptionI18n);
  const name = legacyFromI18n(nameI18n) || String(b.name ?? "");
  const description = legacyFromI18n(descI18n) || String(b.description ?? "");

  if (!b.categoryId || !name.trim())
    return NextResponse.json({ error: "Kategori ve isim gerekli" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      business_id: business.id,
      category_id: b.categoryId,
      code: b.code && String(b.code).trim() ? String(b.code).trim() : null,
      name,
      name_i18n: nameI18n ?? null,
      description,
      description_i18n: descI18n ?? null,
      price: Number(b.price) || 0,
      image:
        String(b.image ?? "") ||
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
      available: b.available ?? true,
      tags: Array.isArray(b.tags) ? b.tags : [],
      options: sanitizeOptions(b.options),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}

// Ürün güncelle (stok, fiyat, isim vb.)
export async function PATCH(req: Request) {
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (b.code !== undefined) patch.code = String(b.code).trim() || null;
  if (b.name !== undefined) patch.name = String(b.name);
  if (b.description !== undefined) patch.description = String(b.description);
  if (b.price !== undefined) patch.price = Number(b.price) || 0;
  if (b.image !== undefined) patch.image = String(b.image);
  if (b.available !== undefined) patch.available = Boolean(b.available);
  if (b.tags !== undefined) patch.tags = Array.isArray(b.tags) ? b.tags : [];
  if (b.allergens !== undefined)
    patch.allergens = Array.isArray(b.allergens) ? b.allergens : [];
  if (b.options !== undefined) patch.options = sanitizeOptions(b.options);
  // Çok dilli alanlar (varsa eski düz alanı da güncelle)
  if (b.nameI18n !== undefined) {
    const ni = cleanI18n(b.nameI18n);
    patch.name_i18n = ni ?? null;
    const legacy = legacyFromI18n(ni);
    if (legacy) patch.name = legacy;
  }
  if (b.descriptionI18n !== undefined) {
    const di = cleanI18n(b.descriptionI18n);
    patch.description_i18n = di ?? null;
    patch.description = legacyFromI18n(di);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", b.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true, item: data });
}

// Ürün sil
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
