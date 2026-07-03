import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Giriş yapmış kullanıcının kendi e-posta / şifresini günceller.
// (Oturumdan kullanıcı doğrulanır; yalnızca kendi hesabını değiştirebilir.)
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

  const { email, password } = await req.json();
  const updates: Record<string, unknown> = {};

  if (email && email.trim() && email.trim() !== user.email) {
    updates.email = email.trim();
    updates.email_confirm = true; // e-posta onayı beklemeden geçerli olsun
  }
  if (password) {
    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalı." },
        { status: 400 }
      );
    }
    updates.password = String(password);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, changed: false });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, updates);
  if (error) {
    const msg = error.message?.includes("already")
      ? "Bu e-posta başka bir hesapta kayıtlı."
      : error.message || "Güncellenemedi.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, changed: true });
}
