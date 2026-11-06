### Simülasyon: senaryo `v1`, 60 gün, profil başına 500 koşu (tohum 1..500)

**Tablo A: Madencilik Ustalığı kademe eşiğine ulaşma günü** (p10 / **p50** / p90; `—` = ulaşamadı, parantezde ulaşan oranı)

| Profil | K1 (0) | K2 (10) | K3 (25) | K4 (40) |
|---|---|---|---|---|
| gündelik (≈10 dk/gün) | 1 / **1** / 1 | 3 / **4** / 4 | 9 / **10** / 10 | 20 / **21** / 22 |
| aktif (≈25 dk/gün) | 1 / **1** / 1 | 3 / **3** / 3 | 5 / **5** / 6 | 10 / **10** / 10 |
| tutkulu (≈45 dk/gün) | 1 / **1** / 1 | 3 / **3** / 3 | 5 / **5** / 6 | 9 / **9** / 10 |
| bot çiftliği (sınırsız deneme) | 1 / **1** / 1 | 3 / **3** / 3 | 5 / **5** / 6 | 9 / **9** / 10 |

**Tablo B: İşleme Ustalığı kademe eşiğine ulaşma günü** (aynı biçim)

| Profil | K1 (0) | K2 (10) | K3 (25) | K4 (40) |
|---|---|---|---|---|
| gündelik (≈10 dk/gün) | 1 / **1** / 1 | 2 / **2** / 3 | 6 / **7** / 8 | 17 / **19** / 20 |
| aktif (≈25 dk/gün) | 1 / **1** / 1 | 1 / **2** / 2 | 3 / **4** / 4 | 8 / **8** / 9 |
| tutkulu (≈45 dk/gün) | 1 / **1** / 1 | 1 / **1** / 2 | 3 / **4** / 4 | 7 / **7** / 8 |
| bot çiftliği (sınırsız deneme) | 1 / **1** / 1 | 1 / **1** / 1 | 3 / **3** / 4 | 7 / **7** / 8 |

**Tablo C: bölge patronunu yenme günü** (p10 / **p50** / p90)

| Profil | Bölge 1 | Bölge 2 | Bölge 3 |
|---|---|---|---|
| gündelik (≈10 dk/gün) | 4 / **5** / 8 | 9 / **12** / 15 | 15 / **19** / 23 |
| aktif (≈25 dk/gün) | 2 / **2** / 3 | 3 / **4** / 5 | 5 / **6** / 8 |
| tutkulu (≈45 dk/gün) | 1 / **1** / 2 | 2 / **2** / 3 | 3 / **3** / 4 |
| bot çiftliği (sınırsız deneme) | 1 / **1** / 1 | 1 / **1** / 1 | 1 / **1** / 1 |

**Tablo D: 60. gün sonu ortalamaları**

| Profil | Madencilik U (p50) | İşleme U (p50) | vuruş/gün | cevher/gün | külçe toplam | harita maçı/gün | harita Altın/gün | dövmeye harcanan Altın |
|---|---|---|---|---|---|---|---|---|
| gündelik (≈10 dk/gün) | 62 | 62 | 14.8 | 29.9 | 446 | 2.0 | 171 | 2974 |
| aktif (≈25 dk/gün) | 71 | 72 | 39.0 | 98.6 | 1832 | 5.0 | 297 | 3000 |
| tutkulu (≈45 dk/gün) | 72 | 75 | 57.6 | 143.6 | 2722 | 10.0 | 509 | 3000 |
| bot çiftliği (sınırsız deneme) | 72 | 76 | 57.6 | 153.3 | 2914 | 10.3 | 545 | 3000 |

**Tablo E: bot çiftliği sınırı** (bot ÷ tutkulu oyuncu, ortalama oranı; ≤ 1,25 hedef, H-H3)

| Kural seti | cevher | Madencilik XP | külçe | harita Altın |
|---|---|---|---|---|
| Taslak (azalan getiri + 60 vuruş tavanı + 10 sayılan harita maçı) | 1.07 | 1.00 | 1.07 | 1.07 |
| Azalan getiri YOK (yalnız 60 tavan) | 1.32 | 1.04 | 1.33 | 1.07 |
| Günlük tavan YOK (yalnız damar kapasitesi) | 1.28 | 1.03 | 1.29 | 1.07 |

**Tablo F: ilk dövme günü (p50) türe ve kademeye göre** (`—` = koşuların yarısından azında)

| Profil | arma-1 | arma-2 | arma-3 | arma-4 | cerceve-1 | cerceve-2 | cerceve-3 | cerceve-4 |
|---|---|---|---|---|---|---|---|---|
| gündelik (≈10 dk/gün) | 1 | 4 | 11 | 19 | 3 | 6 | 12 | 25 |
| aktif (≈25 dk/gün) | 1 | 2 | 4 | 8 | 2 | 3 | 5 | 11 |
| tutkulu (≈45 dk/gün) | 1 | 1 | 4 | 7 | 2 | 3 | 5 | 9 |
| bot çiftliği (sınırsız deneme) | 1 | 1 | 3 | 7 | 2 | 2 | 4 | 9 |

**Tablo G: kilidi açılan bir parçayı edinme süresi (gün): craft ile / Market'ten** (p50; 8. günde kilit açılır ve birikim sıfırdan başlar; Market = o günden sonraki bütün Altın biriktirilirse; `—` = süre içinde yok)

| Profil | standart cekirdek (2500 Altın) | nadir govde (12000 Altın) | hizip govde (32000 Altın) | karanlik uc (48000 Altın) |
|---|---|---|---|---|
| gündelik (≈10 dk/gün) | 2 / 4 (×2.0) | 2 / 17 (×8.5) | 12 / — (Market > 53 gün) | 48 / — (Market > 53 gün) |
| aktif (≈25 dk/gün) | 1 / 3 (×3.0) | 2 / 13 (×6.5) | 3 / 33 (×11.0) | 20 / 49 (×2.5) |
| tutkulu (≈45 dk/gün) | 1 / 2 (×2.0) | 1 / 8 (×8.0) | 2 / 19 (×9.5) | 16 / 29 (×1.8) |
