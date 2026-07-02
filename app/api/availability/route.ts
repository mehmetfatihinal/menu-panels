import { NextResponse } from "next/server";
import { readMenu, writeMenu } from "@/lib/data";

export const dynamic = "force-dynamic";

// Admin: bir ürünün sipariş edilebilirliğini (stok durumunu) değiştirir.
export async function POST(req: Request) {
  const { itemId, available } = await req.json();
  if (typeof itemId !== "string" || typeof available !== "boolean") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const menu = await readMenu();
  let found = false;
  for (const cat of menu.categories) {
    const item = cat.items.find((i) => i.id === itemId);
    if (item) {
      item.available = available;
      found = true;
      break;
    }
  }

  if (!found) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  await writeMenu(menu);
  return NextResponse.json({ ok: true, itemId, available });
}
