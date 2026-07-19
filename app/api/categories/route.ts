import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness, cleanI18n, legacyFromI18n } from "@/lib/business";

export const dynamic = "force-dynamic";

// Yeni kategori
export async function POST(req: Request) {
  const b = await req.json();
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

  const nameI18n = cleanI18n(b.nameI18n);
  const name = legacyFromI18n(nameI18n) || String(b.name ?? "");
  if (!name.trim())
    return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      business_id: business.id,
      name,
      name_i18n: nameI18n ?? null,
      cover_src:
        String(b.coverSrc ?? "") ||
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
      cover_video: String(b.coverVideo ?? ""),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, category: data });
}

// Kategori güncelle
export async function PATCH(req: Request) {
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (b.name !== undefined) patch.name = String(b.name);
  if (b.coverSrc !== undefined) patch.cover_src = String(b.coverSrc);
  if (b.coverVideo !== undefined) patch.cover_video = String(b.coverVideo);
  if (b.nameI18n !== undefined) {
    const ni = cleanI18n(b.nameI18n);
    patch.name_i18n = ni ?? null;
    const legacy = legacyFromI18n(ni);
    if (legacy) patch.name = legacy;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", b.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true, category: data });
}

// Kategori sil (ürünleri cascade ile gider)
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
