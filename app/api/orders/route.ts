import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

// Panel: işletmenin siparişleri (RLS ile yalnızca sahibi görür)
export async function GET() {
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ orders: [] });

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const orders: Order[] = (data ?? []).map((o) => ({
    id: o.id,
    table: o.table_label,
    createdAt: o.created_at,
    status: o.status,
    lines: o.lines ?? [],
    total: Number(o.total),
  }));
  return NextResponse.json({ orders });
}

// Panel: sipariş durumu güncelle
export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
