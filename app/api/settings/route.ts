import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business";

export const dynamic = "force-dynamic";

// İşletme ayarlarını güncelle (ad, slogan, para birimi, logo)
export async function PATCH(req: Request) {
  const b = await req.json();
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

  const patch: Record<string, unknown> = {};
  if (b.name !== undefined) patch.name = String(b.name);
  if (b.tagline !== undefined) patch.tagline = String(b.tagline);
  if (b.currency !== undefined) patch.currency = String(b.currency);
  if (b.logo_url !== undefined) patch.logo_url = String(b.logo_url);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .update(patch)
    .eq("id", business.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    ok: true,
    restaurant: { name: data.name, tagline: data.tagline, currency: data.currency },
  });
}
