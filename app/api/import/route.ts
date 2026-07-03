import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business";

export const dynamic = "force-dynamic";

const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80";
const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80";

// Toplu içe aktarma: kategori + ürünleri tek seferde ekler.
// Aynı isimli kategori varsa ürünler ona eklenir (yeni oluşturulmaz).
export async function POST(req: Request) {
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

  const { categories } = await req.json();
  if (!Array.isArray(categories) || categories.length === 0) {
    return NextResponse.json({ error: "İçerik boş" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("categories")
    .select("id,name")
    .eq("business_id", business.id);
  const byName = new Map(
    (existing ?? []).map((c: any) => [String(c.name).toLowerCase(), c.id])
  );

  let catCount = 0;
  let prodCount = 0;

  for (const cat of categories) {
    const name = String(cat?.name ?? "").trim();
    if (!name) continue;

    let catId = byName.get(name.toLowerCase());
    if (!catId) {
      const { data: created, error } = await supabase
        .from("categories")
        .insert({
          business_id: business.id,
          name,
          cover_src: DEFAULT_COVER,
          cover_video: "",
        })
        .select("id")
        .single();
      if (error || !created) continue;
      catId = created.id;
      byName.set(name.toLowerCase(), catId);
      catCount++;
    }

    const items = (Array.isArray(cat.items) ? cat.items : []).filter(
      (i: any) => i && String(i.name).trim()
    );
    if (items.length === 0) continue;

    const rows = items.map((i: any, idx: number) => ({
      business_id: business.id,
      category_id: catId,
      name: String(i.name).trim(),
      description: String(i.description ?? ""),
      price: Number(i.price) || 0,
      image: DEFAULT_IMG,
      available: true,
      tags: [],
      sort_order: idx,
    }));
    const { data: ins } = await supabase.from("products").insert(rows).select("id");
    prodCount += ins?.length ?? 0;
  }

  return NextResponse.json({ ok: true, categories: catCount, products: prodCount });
}
