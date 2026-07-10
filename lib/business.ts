import { createClient } from "@/lib/supabase/server";
import type { Menu, Category, MenuItem, I18nText } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

// Gelen i18n nesnesini temizle: yalnızca dolu tr/de/en string alanları; hiçbiri yoksa undefined
export function cleanI18n(o: unknown): I18nText | undefined {
  if (!o || typeof o !== "object") return undefined;
  const src = o as Record<string, unknown>;
  const out: I18nText = {};
  for (const k of ["tr", "de", "en"] as const) {
    const v = src[k];
    if (typeof v === "string" && v.trim() !== "") out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

// i18n'den eski (tek dilli) düz metni üret: öncelik de → tr → en
export function legacyFromI18n(o: I18nText | undefined, fallback = ""): string {
  if (!o) return fallback;
  return o.de || o.tr || o.en || fallback;
}

export type BusinessRow = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  tagline: string;
  currency: string;
  logo_url: string;
  default_lang?: string;
};

// Supabase kayıtlarını uygulamanın Menu tipine dönüştürür
export function buildMenu(
  business: BusinessRow,
  categories: any[],
  products: any[]
): Menu {
  const cats: Category[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    nameI18n: c.name_i18n ?? undefined,
    cover: {
      type: c.cover_video ? "video" : "image",
      src: c.cover_src || "",
      video: c.cover_video || "",
    },
    items: products
      .filter((p) => p.category_id === c.id)
      .map(
        (p): MenuItem => ({
          id: p.id,
          code: p.code ?? undefined,
          name: p.name,
          description: p.description || "",
          price: Number(p.price),
          image: p.image || "",
          available: p.available,
          tags: p.tags || [],
          nameI18n: p.name_i18n ?? undefined,
          descriptionI18n: p.description_i18n ?? undefined,
          allergens: p.allergens ?? [],
          options: Array.isArray(p.options) ? p.options : [],
        })
      ),
  }));

  return {
    restaurant: {
      name: business.name,
      tagline: business.tagline || "",
      currency: business.currency || "₺",
      logoUrl: business.logo_url || "",
      defaultLang: ((business.default_lang as Lang) || "tr") as Lang,
    },
    categories: cats,
  };
}

// Giriş yapmış kullanıcının işletmesi (owner_id = auth.uid())
export async function getCurrentBusiness(): Promise<BusinessRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  return (data as BusinessRow) ?? null;
}

// Giriş yapmış kullanıcının tüm menüsü (panel için)
export async function getCurrentMenu(): Promise<{
  business: BusinessRow;
  menu: Menu;
} | null> {
  const supabase = await createClient();
  const business = await getCurrentBusiness();
  if (!business) return null;

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("business_id", business.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("products")
      .select("*")
      .eq("business_id", business.id)
      .order("sort_order")
      .order("created_at"),
  ]);

  return { business, menu: buildMenu(business, categories ?? [], products ?? []) };
}

// Herkese açık: slug'a göre işletme menüsü (müşteri QR ile okur)
export async function getMenuBySlug(
  slug: string
): Promise<{ business: BusinessRow; menu: Menu } | null> {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) return null;

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("business_id", business.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("products")
      .select("*")
      .eq("business_id", business.id)
      .order("sort_order")
      .order("created_at"),
  ]);

  return {
    business: business as BusinessRow,
    menu: buildMenu(business as BusinessRow, categories ?? [], products ?? []),
  };
}
