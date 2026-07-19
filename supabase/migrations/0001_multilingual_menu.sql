-- Çok dilli menü içeriği (TR/DE/EN) + alerjen kodları
-- Yalnızca YENİ nullable/additive sütunlar ekler → mevcut kayıtlar bozulmaz.
-- JSONB biçimi: {"tr":"...","de":"...","en":"..."} (eksik diller olabilir).

alter table menupanels.products   add column if not exists name_i18n        jsonb;
alter table menupanels.products   add column if not exists description_i18n jsonb;
alter table menupanels.products   add column if not exists allergens        text[] default '{}';
alter table menupanels.categories add column if not exists name_i18n        jsonb;
