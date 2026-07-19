// İşletmeye özel menü teması. Varsayılan tema (koyu mermer & altın) :root'ta;
// buradan dönen sınıf globals.css'teki değişkenleri işletme bazında ezer.
const THEME_BY_SLUG_PREFIX: Record<string, string> = {
  bonita: "theme-bonita",
};

export function menuThemeClass(slug: string): string {
  for (const [prefix, cls] of Object.entries(THEME_BY_SLUG_PREFIX)) {
    if (slug === prefix || slug.startsWith(prefix + "-")) return cls;
  }
  return "";
}
