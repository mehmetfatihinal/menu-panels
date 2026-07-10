import { createAdminClient } from "@/lib/supabase/admin";

// Admin panel verisi (service-role, server-only). Tüm auth kullanıcılarını ve
// işletmelerini owner_id ile eşler. İşletmesi olmayan kullanıcılar da listelenir.

export type AdminRow = {
  userId: string;
  ownerEmail: string;
  businessName: string;
  slug: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  banned: boolean;
};

export async function listBusinessesWithOwners(): Promise<AdminRow[]> {
  const admin = createAdminClient();

  // 1) Tüm kullanıcıları sayfa sayfa çek
  type AuthUser = {
    id: string;
    email?: string;
    created_at?: string;
    last_sign_in_at?: string | null;
    banned_until?: string | null;
  };
  const users: AuthUser[] = [];
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = (data?.users ?? []) as AuthUser[];
    users.push(...batch);
    if (batch.length < perPage) break;
  }

  // 2) Tüm işletmeleri çek ve owner_id ile indeksle
  const { data: businesses, error: bizErr } = await admin
    .from("businesses")
    .select("id, name, slug, owner_id, created_at");
  if (bizErr) throw bizErr;

  const byOwner = new Map<string, { name: string; slug: string; created_at: string | null }>();
  for (const b of (businesses ?? []) as Array<{
    name: string;
    slug: string;
    owner_id: string;
    created_at: string | null;
  }>) {
    // Bir sahibin birden fazla işletmesi olursa ilkini tut (mevcut modelde 1:1).
    if (!byOwner.has(b.owner_id)) {
      byOwner.set(b.owner_id, { name: b.name, slug: b.slug, created_at: b.created_at });
    }
  }

  // 3) Eşle
  const now = Date.now();
  const rows: AdminRow[] = users.map((u) => {
    const biz = byOwner.get(u.id);
    const bannedUntil = u.banned_until ? Date.parse(u.banned_until) : 0;
    return {
      userId: u.id,
      ownerEmail: u.email ?? "",
      businessName: biz?.name ?? "",
      slug: biz?.slug ?? "",
      createdAt: biz?.created_at ?? u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      banned: bannedUntil > now,
    };
  });

  // İşletmesi olanlar üstte, sonra e-postaya göre sırala
  rows.sort((a, b) => {
    if (!!a.businessName !== !!b.businessName) return a.businessName ? -1 : 1;
    return a.ownerEmail.localeCompare(b.ownerEmail);
  });

  return rows;
}
