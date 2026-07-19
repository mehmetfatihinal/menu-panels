import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kullanıcıyı pasifleştir (ban) / aktifleştir. Ban ile giriş engellenir; veri silinmez.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { userId, active } = await req.json().catch(() => ({}));

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Kullanıcı id gerekli." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    // "none" → yasağı kaldır; uzun süre → pasif (giriş yapamaz)
    ban_duration: active ? "none" : "876000h",
  });
  if (error) {
    return NextResponse.json(
      { error: error.message || "Durum güncellenemedi." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
