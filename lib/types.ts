import type { OptionGroup, CartSelection, DenormOption } from "./options";
import type { Lang } from "./i18n";

export type Cover = {
  type: "image" | "video";
  src: string;
  video?: string;
};

// Çok dilli metin (eksik diller olabilir) — {"tr":"...","de":"...","en":"..."}
export type I18nText = { tr?: string; de?: string; en?: string };

export type MenuItem = {
  id: string;
  code?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  tags?: string[];
  nameI18n?: I18nText;
  descriptionI18n?: I18nText;
  allergens?: string[];
  options?: OptionGroup[]; // ek seçenek grupları; boş/eksik = eski davranış
};

export type Category = {
  id: string;
  name: string;
  cover: Cover;
  items: MenuItem[];
  nameI18n?: I18nText;
};

export type Menu = {
  restaurant: {
    name: string;
    tagline: string;
    currency: string;
    logoUrl?: string;
    defaultLang?: Lang; // menü açılış dili (kayıtlı tercih yoksa)
    ordersEnabled?: boolean; // false: sadece menü modu (sepet/sipariş yok)
  };
  categories: Category[];
};

export type CartLine = {
  item: MenuItem;
  qty: number;
  note?: string;
  selections?: CartSelection[]; // seçili ek seçenekler (denormalize, gösterim için)
};

// Sipariş satırı — eski satırlar (price) ve yeni satırlar (unit_price/line_total/options)
// birlikte geçerli olsun diye tüm yeni alanlar opsiyonel.
export type OrderLine = {
  id: string;
  name: string;
  qty: number;
  code?: string | null;
  price?: number; // yalnızca eski satırlar
  note?: string;
  base_price?: number; // yeni satırlar
  unit_price?: number; // yeni satırlar
  line_total?: number; // yeni satırlar
  options?: DenormOption[]; // yeni satırlar
};

export type Order = {
  id: string;
  table: string;
  createdAt: string;
  status: "yeni" | "hazirlaniyor" | "tamamlandi";
  lines: OrderLine[];
  total: number;
};
