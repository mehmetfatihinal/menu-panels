import { NextResponse } from "next/server";
import { readMenu, writeMenu } from "@/lib/data";
import { slugify } from "@/lib/slug";
import type { MenuItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// Yeni ürün ekle
export async function POST(req: Request) {
  const b = await req.json();
  const { categoryId, name } = b;
  if (!categoryId || !name) {
    return NextResponse.json({ error: "Kategori ve isim gerekli" }, { status: 400 });
  }
  const menu = await readMenu();
  const cat = menu.categories.find((c) => c.id === categoryId);
  if (!cat) return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });

  const item: MenuItem = {
    id: slugify(name),
    name: String(name),
    description: String(b.description ?? ""),
    price: Number(b.price) || 0,
    image: String(b.image ?? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80"),
    available: true,
    tags: Array.isArray(b.tags) ? b.tags : [],
  };
  cat.items.push(item);
  await writeMenu(menu);
  return NextResponse.json({ ok: true, item });
}

// Ürün güncelle
export async function PATCH(req: Request) {
  const b = await req.json();
  const { id } = b;
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const menu = await readMenu();
  for (const cat of menu.categories) {
    const item = cat.items.find((i) => i.id === id);
    if (item) {
      if (b.name !== undefined) item.name = String(b.name);
      if (b.description !== undefined) item.description = String(b.description);
      if (b.price !== undefined) item.price = Number(b.price) || 0;
      if (b.image !== undefined) item.image = String(b.image);
      if (b.available !== undefined) item.available = Boolean(b.available);
      if (b.tags !== undefined) item.tags = Array.isArray(b.tags) ? b.tags : [];
      await writeMenu(menu);
      return NextResponse.json({ ok: true, item });
    }
  }
  return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
}

// Ürün sil
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  const menu = await readMenu();
  let removed = false;
  for (const cat of menu.categories) {
    const before = cat.items.length;
    cat.items = cat.items.filter((i) => i.id !== id);
    if (cat.items.length !== before) removed = true;
  }
  if (!removed) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  await writeMenu(menu);
  return NextResponse.json({ ok: true });
}
