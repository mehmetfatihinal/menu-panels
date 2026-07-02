import { NextResponse } from "next/server";
import { readMenu } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const menu = await readMenu();
  return NextResponse.json(menu);
}
