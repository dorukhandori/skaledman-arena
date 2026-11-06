### Simülasyon: senaryo `v1`, 14 gün, profil başına 500 koşu (tohum 1..500)

**Tablo A: Madencilik Ustalığı kademe eşiğine ulaşma günü** (p10 / **p50** / p90; `—` = ulaşamadı, parantezde ulaşan oranı)

| Profil | K1 (0) | K2 (10) | K3 (25) | K4 (40) |
|---|---|---|---|---|
| gündelik (≈10 dk/gün) | 1 / **1** / 1 | 3 / **4** / 4 | 9 / **10** / 10 | — (%0) |
| aktif (≈25 dk/gün) | 1 / **1** / 1 | 3 / **3** / 3 | 5 / **5** / 6 | 10 / **10** / 10 |
| tutkulu (≈45 dk/gün) | 1 / **1** / 1 | 3 / **3** / 3 | 5 / **5** / 6 | 9 / **9** / 10 |
| bot çiftliği (sınırsız deneme) | 1 / **1** / 1 | 3 / **3** / 3 | 5 / **5** / 6 | 9 / **9** / 10 |

**Tablo B: İşleme Ustalığı kademe eşiğine ulaşma günü** (aynı biçim)

| Profil | K1 (0) | K2 (10) | K3 (25) | K4 (40) |
|---|---|---|---|---|
| gündelik (≈10 dk/gün) | 1 / **1** / 1 | 2 / **2** / 3 | 6 / **7** / 8 | — (%0) |
| aktif (≈25 dk/gün) | 1 / **1** / 1 | 1 / **2** / 2 | 3 / **4** / 4 | 8 / **8** / 9 |
| tutkulu (≈45 dk/gün) | 1 / **1** / 1 | 1 / **1** / 2 | 3 / **4** / 4 | 7 / **7** / 8 |
| bot çiftliği (sınırsız deneme) | 1 / **1** / 1 | 1 / **1** / 1 | 3 / **3** / 4 | 7 / **7** / 8 |

**Tablo C: bölge patronunu yenme günü** (p10 / **p50** / p90)

| Profil | Bölge 1 | Bölge 2 | Bölge 3 |
|---|---|---|---|
| gündelik (≈10 dk/gün) | 4 / **5** / 8 | 9 / **12** / — | — (%7) |
| aktif (≈25 dk/gün) | 2 / **2** / 3 | 3 / **4** / 5 | 5 / **6** / 8 |
| tutkulu (≈45 dk/gün) | 1 / **1** / 2 | 2 / **2** / 3 | 3 / **3** / 4 |
| bot çiftliği (sınırsız deneme) | 1 / **1** / 1 | 1 / **1** / 1 | 1 / **1** / 1 |

**Tablo D: 14. gün sonu ortalamaları**

| Profil | Madencilik U (p50) | İşleme U (p50) | vuruş/gün | cevher/gün | külçe toplam | harita maçı/gün | harita Altın/gün | dövmeye harcanan Altın |
|---|---|---|---|---|---|---|---|---|
| gündelik (≈10 dk/gün) | 31 | 35 | 14.1 | 34.4 | 118 | 2.0 | 348 | 1683 |
| aktif (≈25 dk/gün) | 48 | 50 | 35.6 | 87.4 | 335 | 5.0 | 649 | 3000 |
| tutkulu (≈45 dk/gün) | 49 | 55 | 49.8 | 121.9 | 489 | 10.0 | 885 | 3000 |
| bot çiftliği (sınırsız deneme) | 49 | 55 | 49.8 | 131.3 | 529 | 11.3 | 989 | 3000 |

**Tablo E: bot çiftliği sınırı** (bot ÷ tutkulu oyuncu, ortalama oranı; ≤ 1,25 hedef, H-H3)

| Kural seti | cevher | Madencilik XP | külçe | harita Altın |
|---|---|---|---|---|
| Taslak (azalan getiri + 60 vuruş tavanı + 10 sayılan harita maçı) | 1.08 | 1.00 | 1.08 | 1.12 |
| Azalan getiri YOK (yalnız 60 tavan) | 1.29 | 1.05 | 1.33 | 1.12 |
| Günlük tavan YOK (yalnız damar kapasitesi) | 1.21 | 1.02 | 1.24 | 1.12 |

**Tablo F: ilk dövme günü (p50) türe ve kademeye göre** (`—` = koşuların yarısından azında)

| Profil | arma-1 | arma-2 | arma-3 | arma-4 | cerceve-1 | cerceve-2 | cerceve-3 | cerceve-4 |
|---|---|---|---|---|---|---|---|---|
| gündelik (≈10 dk/gün) | 1 | 4 | 11 | — | 3 | 6 | 12 | — |
| aktif (≈25 dk/gün) | 1 | 2 | 4 | 8 | 2 | 3 | 5 | 11 |
| tutkulu (≈45 dk/gün) | 1 | 1 | 4 | 7 | 2 | 3 | 5 | 9 |
| bot çiftliği (sınırsız deneme) | 1 | 1 | 3 | 7 | 2 | 2 | 4 | 9 |

**Tablo G: kilidi açılan bir parçayı edinme süresi (gün): craft ile / Market'ten** (p50; 8. günde kilit açılır ve birikim sıfırdan başlar; Market = o günden sonraki bütün Altın biriktirilirse; `—` = süre içinde yok)

| Profil | standart cekirdek (2500 Altın) | nadir govde (12000 Altın) | hizip govde (32000 Altın) | karanlik uc (48000 Altın) |
|---|---|---|---|---|
| gündelik (≈10 dk/gün) | 2 / 4 (×2.0) | 2 / — (Market > 7 gün) | — / — | — / — |
| aktif (≈25 dk/gün) | 1 / 3 (×3.0) | 2 / — (Market > 7 gün) | 3 / — (Market > 7 gün) | — / — |
| tutkulu (≈45 dk/gün) | 1 / 2 (×2.0) | 1 / — (Market > 7 gün) | 2 / — (Market > 7 gün) | — / — |
