import type { I18nText } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

// Alerjen & katkı maddesi açıklamaları (Dornbusch menüsünün altındaki referans tablolarından).
// Ürünlerde products.allergens = ["a","c","g","4","7"] gibi kodlar tutulur; burada anlamları.

// Katkı maddeleri (rakamlar) · Zusatzstoffe (Zahlen) · Additives (numbers)
export const ADDITIVES: Record<string, I18nText> = {
  "1": { de: "mit Farbstoff", tr: "renklendirici içerir", en: "with coloring" },
  "2": { de: "mit Konservierungsstoff", tr: "koruyucu içerir", en: "with preservative" },
  "3": { de: "mit Antioxidationsmittel", tr: "antioksidan içerir", en: "with antioxidant" },
  "4": { de: "mit Geschmacksverstärker", tr: "aroma güçlendirici içerir", en: "with flavor enhancer" },
  "5": { de: "chininhaltig", tr: "kinin içerir", en: "contains quinine" },
  "7": { de: "mit Phosphat", tr: "fosfat içerir", en: "with phosphate" },
  "8": { de: "mit Stabilisator", tr: "stabilizatör içerir", en: "with stabilizer" },
  "9": { de: "koffeinhaltig", tr: "kafein içerir", en: "contains caffeine" },
  "10": { de: "geschwärzt", tr: "siyahlaştırılmış", en: "blackened" },
  "12": { de: "mit Stabilisator", tr: "stabilizatör içerir", en: "with stabilizer" },
};

// Alerjenler (harfler) · Allergene (Buchstaben) · Allergens (letters)
export const ALLERGENS: Record<string, I18nText> = {
  a: { de: "Glutenhaltiges Getreide (Weizen)", tr: "Glutenli tahıl (buğday)", en: "Gluten cereals (wheat)" },
  b: { de: "Krebstiere", tr: "Kabuklu deniz ürünleri", en: "Crustaceans" },
  c: { de: "Eier", tr: "Yumurta", en: "Eggs" },
  d: { de: "Fisch", tr: "Balık", en: "Fish" },
  e: { de: "Erdnüsse", tr: "Yer fıstığı", en: "Peanuts" },
  f: { de: "Soja", tr: "Soya", en: "Soy" },
  g: { de: "Milch / Laktose", tr: "Süt / laktoz", en: "Milk / lactose" },
  h: { de: "Schalenobst (Nüsse)", tr: "Sert kabuklu yemişler (fındık vb.)", en: "Nuts" },
  i: { de: "Sellerie", tr: "Kereviz", en: "Celery" },
  j: { de: "Senf", tr: "Hardal", en: "Mustard" },
  k: { de: "Sesam", tr: "Susam", en: "Sesame" },
  l: { de: "Schwefeldioxid / Sulfite", tr: "Kükürt dioksit / sülfit", en: "Sulphur dioxide / sulphites" },
  m: { de: "Lupinen", tr: "Acı bakla", en: "Lupin" },
  n: { de: "Weichtiere", tr: "Yumuşakçalar (midye, salyangoz vb.)", en: "Molluscs" },
};

// Tek bir kodun (harf=alerjen, rakam=katkı) seçili dildeki açıklaması. Bilinmezse boş döner.
export function allergenLabel(code: string, lang: Lang): string {
  const key = code.trim().toLowerCase();
  const entry = /^\d+$/.test(key) ? ADDITIVES[key] : ALLERGENS[key];
  if (!entry) return "";
  return entry[lang] || entry.de || entry.tr || entry.en || "";
}
