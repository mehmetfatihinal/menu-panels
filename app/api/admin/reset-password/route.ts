import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bir kullanıcıya yeni şifre atar. Düz metin şifre saklanmaz/loglanmaz/döndürülmez.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { userId, newPassword } = await req.json().catch(() => ({}));

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Kullanıcı id gerekli." }, { status: 400 });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return NextResponse.json(
      { error: "Yeni şifre en az 6 karakter olmalı." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: String(newPassword),
  });
  if (error) {
    return NextResponse.json(
      { error: error.message || "Şifre güncellenemedi." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
