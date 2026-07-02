"use client";

import { createBrowserClient } from "@supabase/ssr";

// Tarayıcı (istemci) tarafı Supabase istemcisi
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase ayarları eksik. Netlify'da NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlanıp yeniden deploy edilmeli."
    );
  }
  return createBrowserClient(url, anon, { db: { schema: "menupanels" } });
}
