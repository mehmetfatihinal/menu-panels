-- İşletme bazında "Sadece Menü" modu.
-- orders_enabled=false: müşteri menüyü/ürün detayını görür ama sepet/sipariş yok; tek "Menü QR" kullanılır.
-- Ek/geriye-uyumlu: default true -> mevcut tüm işletmeler sipariş-açık kalır.
alter table menupanels.businesses
  add column if not exists orders_enabled boolean not null default true;
