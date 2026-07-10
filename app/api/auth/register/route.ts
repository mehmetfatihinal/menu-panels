import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createBusinessWithOwner } from "@/lib/register-business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// İşletme kaydı: auth kullanıcısı + businesses satırı oluşturur (service-role).
// Public kayıt kapalı — YALNIZCA geçerli admin oturumuyla çağrılabilir.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { businessName, email, password } = await req.json();
  const result = await createBusinessWithOwner({ businessName, email, password });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, slug: result.slug });
}
