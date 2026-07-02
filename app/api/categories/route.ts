import { NextResponse } from "next/server";
import { readMenu, writeMenu } from "@/lib/data";
import { slugify } from "@/lib/slug";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

// Yeni kategori ekle
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });
  const menu = await readMenu();
  const cat: Category = {
    id: slugify(b.name),
    name: String(b.name),
    cover: {
      type: "image",
      src: String(b.coverSrc ?? "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80"),
      video: String(b.coverVideo ?? ""),
    },
    items: [],
  };
  menu.categories.push(cat);
  await writeMenu(menu);
  return NextResponse.json({ ok: true, category: cat });
}

// Kategori güncelle
export async function PATCH(req: Request) {
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  const menu = await readMenu();
  const cat = menu.categories.find((c) => c.id === b.id);
  if (!cat) return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });
  if (b.name !== undefined) cat.name = String(b.name);
  if (b.coverSrc !== undefined) cat.cover.src = String(b.coverSrc);
  if (b.coverVideo !== undefined) cat.cover.video = String(b.coverVideo);
  await writeMenu(menu);
  return NextResponse.json({ ok: true, category: cat });
}

// Kategori sil (içindeki ürünlerle birlikte)
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  const menu = await readMenu();
  const before = menu.categories.length;
  menu.categories = menu.categories.filter((c) => c.id !== id);
  if (menu.categories.length === before) {
    return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 });
  }
  await writeMenu(menu);
  return NextResponse.json({ ok: true });
}
