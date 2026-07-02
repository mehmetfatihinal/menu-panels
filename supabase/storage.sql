-- Menu Panels — medya yükleme (foto/video) için Storage kovası + izinler.
-- Bilgisayardan seçilen dosyalar 'media' kovasına yüklenir, herkese açık URL alır.

-- Kova (herkese açık okuma)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- Politikaları yeniden çalıştırılabilir yap
drop policy if exists "mp media read"   on storage.objects;
drop policy if exists "mp media upload" on storage.objects;
drop policy if exists "mp media update" on storage.objects;
drop policy if exists "mp media delete" on storage.objects;

-- Herkes okur (public bucket)
create policy "mp media read" on storage.objects
  for select using (bucket_id = 'media');

-- Giriş yapmış işletme sahibi yükler/günceller/siler
create policy "mp media upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');
create policy "mp media update" on storage.objects
  for update to authenticated using (bucket_id = 'media') with check (bucket_id = 'media');
create policy "mp media delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media');
