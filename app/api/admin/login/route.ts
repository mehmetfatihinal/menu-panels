import { NextResponse } from "next/server";
import {
  verifyCredentials,
  signAdminToken,
  adminCookieOptions,
  ADMIN_COOKIE,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin girişi: kullanıcı adı + şifreyi env ile karşılaştırır; doğruysa imzalı
// httpOnly cookie verir. Yanlışsa 401.
export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));

  if (!verifyCredentials(String(username ?? ""), String(password ?? ""))) {
    return NextResponse.json(
      { error: "Kullanıcı adı veya şifre hatalı." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, signAdminToken(), adminCookieOptions());
  return res;
}
