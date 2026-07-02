import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

// İşletme kaydı: auth kullanıcısı + businesses satırı oluşturur (service-role).
export async function POST(req: Request) {
  const { businessName, email, password } = await req.json();

  if (!businessName?.trim() || !email?.trim() || !password || password.length < 6) {
    return NextResponse.json(
      { error: "İşletme adı, e-posta ve en az 6 karakterli şifre gerekli." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 1) Kullanıcıyı oluştur (e-posta onayı gerekmeden)
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userErr || !created?.user) {
    const msg = userErr?.message?.includes("already")
      ? "Bu e-posta zaten kayıtlı."
      : userErr?.message || "Kullanıcı oluşturulamadı.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 2) İşletme satırını oluştur (slug benzersiz — slugify rastgele son ek ekler)
  const slug = slugify(businessName);
  const { error: bizErr } = await admin.from("businesses").insert({
    owner_id: created.user.id,
    slug,
    name: businessName.trim(),
    tagline: "",
    currency: "₺",
  });

  if (bizErr) {
    // geri al: kullanıcıyı sil
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: bizErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, slug });
}
