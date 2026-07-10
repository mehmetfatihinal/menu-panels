// Ürün seçenekleri (ek seçim grupları) — SAF modül.
// React / Supabase / "use client" YOK. Hem müşteri (canlı fiyat) hem sunucu (doğrulama) kullanır,
// böylece gösterilen fiyat ile kaydedilen fiyat AYNI kodla hesaplanır.
// types.ts ile tip-only döngü (import type) — derlemede silinir, çalışma zamanı döngüsü yoktur.

import type { I18nText } from "./types";

// ── Tipler (products.options jsonb'da saklanır) ──────────────────────────
export type OptionChoice = {
  id: string;
  name_i18n: I18nText; // {tr?,de?,en?}
  price_delta: number; // 0 = ücretsiz/dahil, >0 = ücretli ekstra
  default?: boolean;
};

export type OptionGroup = {
  id: string;
  name_i18n: I18nText;
  required: boolean;
  multi: boolean; // false = radio (≤1), true = checkbox (0..n)
  choices: OptionChoice[];
};

// Sepette her seçili seçenek için tutulan (gösterim için denormalize) veri
export type CartSelection = {
  groupId: string;
  groupName_i18n: I18nText;
  choiceId: string;
  choiceName_i18n: I18nText;
  price_delta: number;
};

// Modal çalışma durumu: groupId -> seçili choiceId[]
export type GroupSelectionState = Record<string, string[]>;

// ── Para yardımcıları (kritik: tek doğruluk kaynağı) ─────────────────────
export function roundMoney(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100; // kuruş
}

export function optionsUnitPrice(
  basePrice: number,
  selections: { price_delta: number }[] | undefined
): number {
  const delta = (selections ?? []).reduce(
    (s, x) => s + (Number(x.price_delta) || 0),
    0
  );
  return roundMoney((Number(basePrice) || 0) + delta);
}

export function lineTotal(unit: number, qty: number): number {
  return roundMoney((Number(unit) || 0) * (Number(qty) || 0));
}

// Sadece gösterim: tam sayı tam sayı kalsın, değilse iki ondalık.
export function formatMoney(n: number): string {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

// ── Kararlı satır anahtarı — yalnızca choiceId'ler, sıralı; not HARİÇ ────
export function lineKeyFor(
  itemId: string,
  selections: { choiceId: string }[] | undefined
): string {
  const ids = (selections ?? []).map((s) => s.choiceId).sort();
  return ids.length ? `${itemId}#${ids.join(",")}` : itemId;
}

// ── Modal varsayılanları + serileştirme ──────────────────────────────────
export function initSelections(
  groups: OptionGroup[] | undefined
): GroupSelectionState {
  const s: GroupSelectionState = {};
  for (const g of groups ?? []) {
    if (g.multi) {
      // required && multi: en az 1 (submit'te doğrulanır) — sadece default'lar ön-seçili
      s[g.id] = g.choices.filter((c) => c.default).map((c) => c.id);
    } else {
      // required && !multi: tam 1 (default ya da ilk) ön-seçili
      const def =
        g.choices.find((c) => c.default) ?? (g.required ? g.choices[0] : undefined);
      s[g.id] = def ? [def.id] : [];
    }
  }
  return s;
}

export function buildSelections(
  groups: OptionGroup[] | undefined,
  state: GroupSelectionState
): CartSelection[] {
  const out: CartSelection[] = [];
  for (const g of groups ?? []) {
    const picked = state[g.id] ?? [];
    for (const c of g.choices) {
      if (!picked.includes(c.id)) continue;
      out.push({
        groupId: g.id,
        groupName_i18n: g.name_i18n,
        choiceId: c.id,
        choiceName_i18n: c.name_i18n,
        price_delta: Number(c.price_delta) || 0,
      });
    }
  }
  return out;
}

// "Sepete Ekle" butonunu kilitler
export function isSelectionComplete(
  groups: OptionGroup[] | undefined,
  state: GroupSelectionState
): boolean {
  for (const g of groups ?? []) {
    const n = (state[g.id] ?? []).length;
    if (g.required && n < 1) return false;
    if (!g.multi && n > 1) return false;
  }
  return true;
}

// ── Sunucu tarafı yetkili doğrulayıcı/fiyatlayıcı ────────────────────────
export type DenormOption = {
  group_name_i18n: I18nText;
  choice_name_i18n: I18nText;
  price_delta: number;
};

export type PriceLineOk = {
  ok: true;
  base_price: number;
  unit_price: number;
  line_total: number;
  denormalizedOptions: DenormOption[];
};

export type PriceLineErr = {
  ok: false;
  code: "missing_required" | "too_many" | "unknown_group" | "unknown_choice";
  message: string;
};

export type PriceLineResult = PriceLineOk | PriceLineErr;

// Girdi: yalnızca id'ler ({groupId, choiceId}). Fiyat/isim ürünün options'ından türetilir,
// böylece "price_delta eşleşiyor mu" yapısı gereği doğrudur ve istemci fiyatına güvenilmez.
export function validateAndPriceLine(
  product: { price: number | string; options?: OptionGroup[] | null },
  input: { qty: number; selections?: { groupId: string; choiceId: string }[] }
): PriceLineResult {
  const groups: OptionGroup[] = Array.isArray(product.options)
    ? product.options
    : [];
  const base = Number(product.price) || 0;
  const qty = Math.max(1, Math.min(99, Math.floor(Number(input.qty) || 1)));
  const incoming = input.selections ?? [];

  // Gelen seçimleri gruba göre topla ve ürüne karşı çöz
  const byGroup = new Map<string, Set<string>>();
  for (const sel of incoming) {
    const g = groups.find((x) => x.id === sel.groupId);
    if (!g)
      return {
        ok: false,
        code: "unknown_group",
        message: "Geçersiz seçenek grubu.",
      };
    const c = g.choices.find((x) => x.id === sel.choiceId);
    if (!c)
      return {
        ok: false,
        code: "unknown_choice",
        message: "Geçersiz seçenek.",
      };
    if (!byGroup.has(g.id)) byGroup.set(g.id, new Set());
    byGroup.get(g.id)!.add(c.id);
  }

  // Her grup için zorunluluk ve tekli/çoklu kuralını doğrula
  for (const g of groups) {
    const count = byGroup.get(g.id)?.size ?? 0;
    if (g.required && count < 1)
      return {
        ok: false,
        code: "missing_required",
        message: "Zorunlu bir seçim eksik.",
      };
    if (!g.multi && count > 1)
      return {
        ok: false,
        code: "too_many",
        message: "Bu grupta yalnızca bir seçim yapılabilir.",
      };
  }

  // Denormalize seçenekleri ürün sırasına göre, fiyat/isim ÜRÜNDEN alınarak kur
  const denormalizedOptions: DenormOption[] = [];
  for (const g of groups) {
    const picked = byGroup.get(g.id);
    if (!picked) continue;
    for (const c of g.choices) {
      if (!picked.has(c.id)) continue;
      denormalizedOptions.push({
        group_name_i18n: g.name_i18n,
        choice_name_i18n: c.name_i18n,
        price_delta: Number(c.price_delta) || 0,
      });
    }
  }

  const unit_price = optionsUnitPrice(base, denormalizedOptions);
  return {
    ok: true,
    base_price: roundMoney(base),
    unit_price,
    line_total: lineTotal(unit_price, qty),
    denormalizedOptions,
  };
}
