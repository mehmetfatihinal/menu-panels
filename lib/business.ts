import { createClient } from "@/lib/supabase/server";
import type { Menu, Category, MenuItem } from "@/lib/types";

export type BusinessRow = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  tagline: string;
  currency: string;
  logo_url: string;
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
          name: p.name,
          description: p.description || "",
          price: Number(p.price),
          image: p.image || "",
          available: p.available,
          tags: p.tags || [],
        })
      ),
  }));

  return {
    restaurant: {
      name: business.name,
      tagline: business.tagline || "",
      currency: business.currency || "₺",
      logoUrl: business.logo_url || "",
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
