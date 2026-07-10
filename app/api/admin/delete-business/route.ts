import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kullanıcıyı siler. businesses satırı FK "on delete cascade" ile otomatik silinir.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { userId } = await req.json().catch(() => ({}));

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Kullanıcı id gerekli." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json(
      { error: error.message || "Silinemedi." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
