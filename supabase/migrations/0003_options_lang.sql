-- Ürün seçenekleri (ek seçim grupları) + işletme varsayılan dili.
-- Yalnızca yeni / nullable-default sütunlar — geriye dönük uyumlu, hiçbir şey bozulmaz.
-- ÖN KOŞUL yok; 0001/0002 gibi additive.

-- Ürünün ek seçenek grupları (grup dizisi jsonb). Boş = eski davranış.
-- [{ id, name_i18n:{de,tr,en}, required:bool, multi:bool,
--    choices:[{ id, name_i18n:{de,tr,en}, price_delta:number, default?:bool }] }]
alter table menupanels.products
  add column if not exists options jsonb not null default '[]'::jsonb;

-- İşletmenin menüsünün açılış dili (kayıtlı tercih yoksa kullanılır).
alter table menupanels.businesses
  add column if not exists default_lang text not null default 'tr';
