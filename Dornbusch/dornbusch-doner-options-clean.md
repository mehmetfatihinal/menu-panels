# Dornbusch Döner — Ek Seçenekler (temiz / DRY, TR·DE·EN)

_Kaynak: dornbusch-doner-menu.md sadeleştirildi. Ürünler numaraya göre mevcut Dornbusch
menüsüyle eşleşir; sadece `options` (ek seçenekler) eklenir. Ana dil Almanca; TR/EN yan diller._

**Kararlar (orijinaldeki belirsizlikler netleştirildi):**
- `tek` = radyo (1 seçim), `çoklu` = checkbox (0+ / zorunluysa 1+). `zorunlu` = seçim şart.
- **Soßen → çoklu** kabul edildi (müşteri birden çok sos seçebilir; "Ohne Soße" = sossuz). Tek sos
  istersen `tek` yap.
- **Extras** her yerde **çoklu, opsiyonel** ve fiyatlı (orijinaldeki 03'ün "zorunlu"su ve 06'nın
  fiyatsızlığı düzeltildi).
- **YENİ ürünler** (Burger kategorisi + Cola Zero/Eistee) mevcut menüde yok → eklenmeli (aşağıda ✚).

---

## 🔧 Seçenek Sözlüğü

### SALAT — Salatzutaten · Salata malzemeleri · Salad ingredients — (çoklu, zorunlu)
| DE | TR | EN | +€ |
|---|---|---|---|
| Keine | Yok | None | — |
| Zwiebel | Soğan | Onion | — |
| Tomate | Domates | Tomato | — |
| Weißkohl | Beyaz lahana | White cabbage | — |
| Eisbergsalat | Aysberg marul | Iceberg lettuce | — |

### SOSSE — Soßen · Soslar · Sauces — (çoklu, zorunlu)
| DE | TR | EN | +€ |
|---|---|---|---|
| Ohne Soße | Sossuz | No sauce | — |
| Scharfe Soße | Acı sos | Spicy sauce | — |
| Joghurtsoße | Yoğurt sosu | Yoghurt sauce | — |
| Knoblauchsoße | Sarımsak sosu | Garlic sauce | — |

### BEILAGE3 — Beilage · Garnitür · Side — (tek, zorunlu)
| DE | TR | EN | +€ |
|---|---|---|---|
| Reis | Pirinç | Rice | — |
| Pommes | Patates | Fries | — |
| Salat | Salata | Salad | — |

### BEILAGE2 — Beilage · Garnitür · Side (Teller/Izgara) — (tek, zorunlu)
| DE | TR | EN | +€ |
|---|---|---|---|
| Reis | Pirinç | Rice | — |
| Pommes | Patates | Fries | — |

### EXTRAS — Extras · Ekstralar · Extras — (çoklu, opsiyonel)
| DE | TR | EN | +€ |
|---|---|---|---|
| Käse | Peynir | Cheese | +1,00 |
| Hackfleisch | Kıyma | Minced meat | +2,00 |
| Gebratenes Gemüse | Kavrulmuş sebze | Fried vegetables | +1,00 |

### ZWIEBELN — Zwiebeln? · Soğan? · Onions? — (tek, zorunlu)
| DE | TR | EN | +€ |
|---|---|---|---|
| Ja | Evet | Yes | — |
| Nein | Hayır | No | — |

### ENTFERNEN — Zutaten entfernen · Malzeme çıkar · Remove ingredients — (çoklu, opsiyonel)
| DE | TR | EN | +€ |
|---|---|---|---|
| Salat | Marul | Lettuce | — |
| Tomate | Domates | Tomato | — |
| Gewürzgurke | Turşu | Pickle | — |
| Zwiebel | Soğan | Onion | — |
| Ketchup | Ketçap | Ketchup | — |
| Mayonnaise | Mayonez | Mayonnaise | — |

---

## 📋 Ürün → Seçenek Grupları (numaraya göre)

| No | Ürün | Gruplar |
|---|---|---|
| 01 | Döner Sandwich Menü | EXTRAS · SALAT · SOSSE |
| 02 | Döner Dürüm Menü | EXTRAS · SALAT · SOSSE |
| 03 | Lahmacun Menü | EXTRAS · SALAT · SOSSE |
| 05 | Veget./Falafel Sandwich Menü | EXTRAS · SALAT · SOSSE |
| 06 | Veget./Falafel Dürüm Menü | EXTRAS · SALAT · SOSSE |
| 07 | Pomm Döner (groß) | BEILAGE3 · SALAT · SOSSE |
| 08 | Pomm Döner (klein) | BEILAGE3 · SALAT · SOSSE |
| 09 | Schüler Döner | SALAT · SOSSE |
| 10 | Döner Sandwich | SALAT · SOSSE |
| 11 | Döner-Käse | SALAT · SOSSE |
| 12 | Jumbo Döner | SALAT · SOSSE |
| 13 | Döner Teller | BEILAGE2 · SALAT · SOSSE |
| 14 | Jumbo Döner Teller | BEILAGE2 · SALAT · SOSSE |
| 15 | Döner Teller (klein) | BEILAGE2 · SALAT · SOSSE |
| 16 | Iskender Döner | — |
| 17 | Iskender Döner gerollt | SALAT · SOSSE |
| 20–25 | Dürüm (hepsi) | SALAT · SOSSE |
| 30–34 | Lahmacun | SALAT · SOSSE |
| 35 | Lahmacun Teller | SALAT |
| 40–46 | Pide (hepsi) | — |
| 50–56 | Vegetarische (hepsi) | SALAT · SOSSE |
| 60–69 | Gegrilltes (hepsi) | BEILAGE2 · SALAT · SOSSE |
| 70–79 | Pizza (hepsi) | ZWIEBELN |
| 85–89 | Salat (hepsi) | SALAT |
| 90–96 | Beilagen | — |
| 100 | Baklava | — |
| 103–114 | İçecekler (hepsi) | — |
| ✚ 120 | Hamburger — 7,00 € | ENTFERNEN |
| ✚ 121 | Cheeseburger — 8,00 € | ENTFERNEN |
| ✚ 122 | Chickenburger — 7,00 € | ENTFERNEN |
| ✚ 123 | 6 Chicken Nuggets — 7,50 € | — |
| ✚ 124 | 9 Chicken Nuggets — 10,00 € | — |
| ✚ 130 | Hamburger Menü — 13,00 € | ENTFERNEN |
| ✚ 131 | Cheeseburger Menü — 14,00 € | ENTFERNEN |
| ✚ 132 | Chickenburger Menü — 13,00 € | ENTFERNEN |

✚ = mevcut menüde YOK, yeni **Burger** kategorisi olarak eklenecek.
(Orijinaldeki numarasız "Cola Zero 0,33l" ve "Eistee 0,33l" — 3,00 € — istenirse Kalte Getränke'ye
numarasız eklenebilir; seçenekleri yok.)
