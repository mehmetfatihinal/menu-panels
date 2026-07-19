-- Menu Panels SaaS — MEVCUT bir Supabase projesinin İÇİNE, ayrı bir şemaya kurulur.
-- Tüm tablolar "menupanels" şemasında -> senin diğer (public) tablolarınla KARIŞMAZ.

-- ── Ayrı şema ─────────────────────────────────────────────────────────
create schema if not exists menupanels;
grant usage on schema menupanels to anon, authenticated, service_role;

-- ── İşletmeler (tenant) ───────────────────────────────────────────────
create table if not exists menupanels.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  slug        text not null unique,
  name        text not null,
  tagline     text default '',
  currency    text default '₺',
  logo_url    text default '',
  default_lang text not null default 'tr',   -- menü açılış dili (kayıtlı tercih yoksa)
  created_at  timestamptz default now()
);

-- ── Kategoriler ───────────────────────────────────────────────────────
create table if not exists menupanels.categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references menupanels.businesses(id) on delete cascade,
  name         text not null,
  name_i18n    jsonb,                     -- {"tr":"...","de":"...","en":"..."} (opsiyonel)
  cover_src    text default '',
  cover_video  text default '',
  sort_order   int  default 0,
  created_at   timestamptz default now()
);
create index if not exists mp_categories_business_idx on menupanels.categories(business_id);

-- ── Ürünler ───────────────────────────────────────────────────────────
create table if not exists menupanels.products (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references menupanels.businesses(id) on delete cascade,
  category_id  uuid not null references menupanels.categories(id) on delete cascade,
  code         text,                      -- menüdeki ürün numarası (opsiyonel), ör. "70"
  name         text not null,
  name_i18n        jsonb,                 -- {"tr":"...","de":"...","en":"..."} (opsiyonel)
  description  text default '',
  description_i18n jsonb,                 -- {"tr":"...","de":"...","en":"..."} (opsiyonel)
  price        numeric(10,2) default 0,
  image        text default '',
  available    boolean default true,
  tags         text[] default '{}',
  allergens    text[] default '{}',       -- alerjen/katkı kodları: ["a","c","g","4","7"]
  options      jsonb not null default '[]'::jsonb,  -- ek seçenek grupları (grup dizisi); boş = eski davranış
  sort_order   int default 0,
  created_at   timestamptz default now()
);
create index if not exists mp_products_business_idx on menupanels.products(business_id);
create index if not exists mp_products_category_idx on menupanels.products(category_id);

-- ── Masalar ───────────────────────────────────────────────────────────
create table if not exists menupanels.tables (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references menupanels.businesses(id) on delete cascade,
  label        text not null,
  created_at   timestamptz default now(),
  unique (business_id, label)
);
create index if not exists mp_tables_business_idx on menupanels.tables(business_id);

-- ── Siparişler ────────────────────────────────────────────────────────
create table if not exists menupanels.orders (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references menupanels.businesses(id) on delete cascade,
  table_label  text not null,
  status       text not null default 'yeni',
  lines        jsonb not null default '[]',
  total        numeric(10,2) not null default 0,
  created_at   timestamptz default now()
);
create index if not exists mp_orders_business_idx on menupanels.orders(business_id);

-- ── API rollerine erişim izni (satır erişimini RLS belirler) ──────────
grant select, insert, update, delete on all tables in schema menupanels
  to anon, authenticated, service_role;
alter default privileges in schema menupanels
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- ── RLS ───────────────────────────────────────────────────────────────
alter table menupanels.businesses enable row level security;
alter table menupanels.categories enable row level security;
alter table menupanels.products   enable row level security;
alter table menupanels.tables     enable row level security;
alter table menupanels.orders     enable row level security;

-- Menüler herkese açık (müşteri QR ile okur) → herkes OKUR
create policy "public read businesses" on menupanels.businesses for select using (true);
create policy "public read categories" on menupanels.categories for select using (true);
create policy "public read products"   on menupanels.products   for select using (true);
create policy "public read tables"      on menupanels.tables     for select using (true);

-- Yazma yalnızca işletme sahibine ait
create policy "owner writes business" on menupanels.businesses for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner writes categories" on menupanels.categories for all
  using (exists (select 1 from menupanels.businesses b where b.id = categories.business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from menupanels.businesses b where b.id = categories.business_id and b.owner_id = auth.uid()));

create policy "owner writes products" on menupanels.products for all
  using (exists (select 1 from menupanels.businesses b where b.id = products.business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from menupanels.businesses b where b.id = products.business_id and b.owner_id = auth.uid()));

create policy "owner writes tables" on menupanels.tables for all
  using (exists (select 1 from menupanels.businesses b where b.id = tables.business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from menupanels.businesses b where b.id = tables.business_id and b.owner_id = auth.uid()));

-- Siparişler: müşteri (anon) OLUŞTURUR; yalnızca sahip OKUR/GÜNCELLER
create policy "anyone creates orders" on menupanels.orders for insert with check (true);
create policy "owner reads orders" on menupanels.orders for select
  using (exists (select 1 from menupanels.businesses b where b.id = orders.business_id and b.owner_id = auth.uid()));
create policy "owner updates orders" on menupanels.orders for update
  using (exists (select 1 from menupanels.businesses b where b.id = orders.business_id and b.owner_id = auth.uid()));
