"use client";

import { createClient } from "@/lib/supabase/client";

// Dosyayı Supabase Storage 'media' kovasına yükler, herkese açık URL döner.
export async function uploadToStorage(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const folder = user?.id ?? "anon";
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-40);
  const path = `${folder}/${Date.now()}-${safe}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}
