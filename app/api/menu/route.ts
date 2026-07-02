import { NextResponse } from "next/server";
import { getCurrentMenu } from "@/lib/business";

export const dynamic = "force-dynamic";

// Giriş yapmış işletmenin menüsü (panel bileşenleri için)
export async function GET() {
  const result = await getCurrentMenu();
  if (!result) {
    return NextResponse.json({ error: "Oturum yok" }, { status: 401 });
  }
  return NextResponse.json({ ...result.menu, slug: result.business.slug });
}
