export type Cover = {
  type: "image" | "video";
  src: string;
  video?: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  tags?: string[];
};

export type Category = {
  id: string;
  name: string;
  cover: Cover;
  items: MenuItem[];
};

export type Menu = {
  restaurant: {
    name: string;
    tagline: string;
    currency: string;
    logoUrl?: string;
  };
  categories: Category[];
};

export type CartLine = {
  item: MenuItem;
  qty: number;
  note?: string;
};

export type Order = {
  id: string;
  table: string;
  createdAt: string;
  status: "yeni" | "hazirlaniyor" | "tamamlandi";
  lines: { id: string; name: string; price: number; qty: number; note?: string }[];
  total: number;
};
