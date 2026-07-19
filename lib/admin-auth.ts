import { cookies } from "next/headers";
import crypto from "node:crypto";

// Admin oturumu — YALNIZCA sunucu tarafı. ADMIN_SESSION_SECRET ile HMAC-imzalı
// httpOnly cookie kullanır. service_role veya admin şifresi tarayıcıya asla gitmez.

export const ADMIN_COOKIE = "mp_admin";
const MAX_AGE = 60 * 60 * 12; // 12 saat (saniye)

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Uzunluk sızıntısını azaltmak için yine de sabit-zamanlı bir karşılaştırma yap.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

// Kullanıcı adı + şifreyi env ile karşılaştırır. Env eksikse false (fail-closed).
export function verifyCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME;
  const p = process.env.ADMIN_PASSWORD;
  if (!u || !p) return false;
  const okU = timingSafeEqualStr(username ?? "", u);
  const okP = timingSafeEqualStr(password ?? "", p);
  return okU && okP;
}

function hmac(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

// İmzalı oturum jetonu üretir: base64url(payload).hexHmac
export function signAdminToken(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET tanımlı değil");
  const payload = { exp: Date.now() + MAX_AGE * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}

// Jetonu doğrular: imza + süre. Geçersiz/eksik secret → false (fail-closed).
export function verifyAdminToken(token: string | undefined | null): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(body, secret);
  if (!timingSafeEqualStr(sig, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

// Aktif isteğin admin oturumu olup olmadığını döndürür (sayfa + route handler).
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}

// Cookie ayarları. `secure` yalnızca production (dev http://localhost'ta kapalı,
// yoksa cookie set edilmez).
export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}
