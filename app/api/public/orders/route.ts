import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateAndPriceLine, roundMoney } from "@/lib/options";
import type { OrderLine } from "@/lib/types";

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
    .select("id,code,name,price,available,options")
    .eq("business_id", business.id)
    .in("id", ids);

  const validated: OrderLine[] = [];
  for (const l of lines) {
    const p = (products ?? []).find((x) => x.id === l.id);
    if (!p) continue;
    if (!p.available)
      return NextResponse.json(
        { error: `"${p.name}" şu anda mevcut değil.` },
        { status: 409 }
      );
    const qty = Math.max(1, Math.min(99, Math.floor(Number(l.qty) || 1)));
    // Seçenekleri sunucuda doğrula ve fiyatla (istemci fiyatına GÜVENİLMEZ).
    const r = validateAndPriceLine(
      { price: p.price, options: p.options },
      { qty, selections: Array.isArray(l.selections) ? l.selections : [] }
    );
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 });
    validated.push({
      id: p.id,
      code: p.code ?? null,
      name: p.name,
      qty,
      base_price: r.base_price,
      options: r.denormalizedOptions,
      unit_price: r.unit_price,
      line_total: r.line_total,
      note: l.note ? String(l.note).slice(0, 200) : undefined,
    });
  }
  if (validated.length === 0)
    return NextResponse.json({ error: "Geçerli ürün yok" }, { status: 400 });

  const total = roundMoney(
    validated.reduce((s, l) => s + (l.line_total ?? 0), 0)
  );

  // Sipariş her şey sunucuda doğrulandıktan sonra service_role ile eklenir:
  // anon istemcinin orders üzerinde SELECT yetkisi yok, bu yüzden .insert().select()
  // (INSERT + RETURNING) RLS'e takılır. Yazma yetkili istemciyle yapılır.
  const admin = createAdminClient();
  const { data: order, error } = await admin
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
