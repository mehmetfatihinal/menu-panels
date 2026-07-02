import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business";

export const dynamic = "force-dynamic";

// İşletmenin masaları + slug (QR adresleri için)
export async function GET() {
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("tables")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at");

  return NextResponse.json({ slug: business.slug, tables: data ?? [] });
}

// Masa ekle (tek label veya toplu: {count} ile 1..count)
export async function POST(req: Request) {
  const b = await req.json();
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });
  const supabase = await createClient();

  let rows: { business_id: string; label: string }[] = [];
  if (b.label) {
    rows = [{ business_id: business.id, label: String(b.label) }];
  } else if (b.count) {
    const n = Math.max(1, Math.min(200, Number(b.count)));
    rows = Array.from({ length: n }, (_, i) => ({
      business_id: business.id,
      label: String(i + 1),
    }));
  } else {
    return NextResponse.json({ error: "label veya count gerekli" }, { status: 400 });
  }

  // upsert: aynı label varsa yoksay (business_id+label unique)
  const { error } = await supabase
    .from("tables")
    .upsert(rows, { onConflict: "business_id,label", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// Masa sil
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("tables").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
