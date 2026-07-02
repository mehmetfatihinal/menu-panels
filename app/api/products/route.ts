import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business";

export const dynamic = "force-dynamic";

// Yeni ürün ekle
export async function POST(req: Request) {
  const b = await req.json();
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });
  if (!b.categoryId || !b.name?.trim())
    return NextResponse.json({ error: "Kategori ve isim gerekli" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      business_id: business.id,
      category_id: b.categoryId,
      name: String(b.name),
      description: String(b.description ?? ""),
      price: Number(b.price) || 0,
      image:
        String(b.image ?? "") ||
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
      available: b.available ?? true,
      tags: Array.isArray(b.tags) ? b.tags : [],
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
  if (b.name !== undefined) patch.name = String(b.name);
  if (b.description !== undefined) patch.description = String(b.description);
  if (b.price !== undefined) patch.price = Number(b.price) || 0;
  if (b.image !== undefined) patch.image = String(b.image);
  if (b.available !== undefined) patch.available = Boolean(b.available);
  if (b.tags !== undefined) patch.tags = Array.isArray(b.tags) ? b.tags : [];

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
