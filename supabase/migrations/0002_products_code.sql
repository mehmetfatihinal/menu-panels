-- Ürün numarası (menüdeki "Nr") için ayrı, opsiyonel sütun.
-- Numara artık adın içine gömülmez; müşteri menüsünde rozet olarak gösterilir.

alter table menupanels.products add column if not exists code text;
