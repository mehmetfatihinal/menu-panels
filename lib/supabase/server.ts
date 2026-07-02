import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Sunucu (RSC / route handler) tarafı Supabase istemcisi — oturum çerezleriyle
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "menupanels" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // RSC içinden set edilirse yoksay (middleware oturumu tazeler)
          }
        },
      },
    }
  );
}
