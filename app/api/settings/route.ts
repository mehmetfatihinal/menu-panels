import { NextResponse } from "next/server";
import { readMenu, writeMenu } from "@/lib/data";

export const dynamic = "force-dynamic";

// Restoran ayarlarını güncelle
export async function PATCH(req: Request) {
  const b = await req.json();
  const menu = await readMenu();
  if (b.name !== undefined) menu.restaurant.name = String(b.name);
  if (b.tagline !== undefined) menu.restaurant.tagline = String(b.tagline);
  if (b.currency !== undefined) menu.restaurant.currency = String(b.currency);
  await writeMenu(menu);
  return NextResponse.json({ ok: true, restaurant: menu.restaurant });
}
