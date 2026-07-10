import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";

// İşletme oluşturma çekirdeği (service-role): auth kullanıcısı + businesses satırı,
// hata olursa kullanıcıyı geri alır (rollback). Hem admin panel create-business ucu
// hem korumalı /api/auth/register bu fonksiyonu çağırır.

export type CreateBusinessInput = {
  businessName: string;
  email: string;
  password: string;
};

export type CreateBusinessResult =
  | { ok: true; slug: string }
  | { ok: false; error: string; status: number };

export async function createBusinessWithOwner(
  input: CreateBusinessInput
): Promise<CreateBusinessResult> {
  const { businessName, email, password } = input;

  if (!businessName?.trim() || !email?.trim() || !password || password.length < 6) {
    return {
      ok: false,
      status: 400,
      error: "İşletme adı, e-posta ve en az 6 karakterli şifre gerekli.",
    };
  }

  const admin = createAdminClient();

  // 1) Kullanıcıyı oluştur (e-posta onayı gerekmeden)
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  });
  if (userErr || !created?.user) {
    const msg = userErr?.message?.includes("already")
      ? "Bu e-posta zaten kayıtlı."
      : userErr?.message || "Kullanıcı oluşturulamadı.";
    return { ok: false, status: 400, error: msg };
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
    return { ok: false, status: 400, error: bizErr.message };
  }

  return { ok: true, slug };
}
