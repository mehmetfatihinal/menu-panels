import { NextResponse } from "next/server";
import { getMenuBySlug } from "@/lib/business";

export const dynamic = "force-dynamic";

// Herkese açık: slug'a göre menü (müşteri menüsü canlı stok güncellemesi için)
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug gerekli" }, { status: 400 });
  const result = await getMenuBySlug(slug);
  if (!result) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json(result.menu);
}
