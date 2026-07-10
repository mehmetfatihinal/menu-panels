import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createBusinessWithOwner } from "@/lib/register-business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only işletme oluşturma (public signup'ın yerine).
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { businessName, email, password } = await req.json().catch(() => ({}));
  const result = await createBusinessWithOwner({ businessName, email, password });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, slug: result.slug });
}
