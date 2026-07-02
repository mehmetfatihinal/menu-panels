import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Herkese açık: müşteri sipariş oluşturur (slug + masa + ürünler).
// Fiyat ve stok sunucuda doğrulanır; anon INSERT RLS ile izinli.
export async function POST(req: Request) {
  const { slug, table, lines } = await req.json();
  if (!slug || !table || !Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) return NextResponse.json({ error: "İşletme yok" }, { status: 404 });

  const ids = lines.map((l: any) => l.id);
  const { data: products } = await supabase
    .from("products")
    .select("id,name,price,available")
    .eq("business_id", business.id)
    .in("id", ids);

  const validated: { id: string; name: string; price: number; qty: number }[] = [];
  for (const l of lines) {
    const p = (products ?? []).find((x) => x.id === l.id);
    if (!p) continue;
    if (!p.available)
      return NextResponse.json(
        { error: `"${p.name}" şu anda mevcut değil.` },
        { status: 409 }
      );
    validated.push({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      qty: Math.max(1, Math.min(99, Math.floor(l.qty))),
    });
  }
  if (validated.length === 0)
    return NextResponse.json({ error: "Geçerli ürün yok" }, { status: 400 });

  const total = validated.reduce((s, l) => s + l.price * l.qty, 0);

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      business_id: business.id,
      table_label: String(table),
      status: "yeni",
      lines: validated,
      total,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, order: { id: order.id } });
}
