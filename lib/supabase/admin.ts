import { createClient } from "@supabase/supabase-js";

// Service-role istemci — YALNIZCA sunucu tarafında (RLS'i bypass eder).
// İşletme kaydı sırasında kullanıcı+işletme oluşturmak için kullanılır.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "menupanels" },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
