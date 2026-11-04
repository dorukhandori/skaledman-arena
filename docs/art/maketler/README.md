# Maketler (2026-11-04) · yer tutucu sanat, nihai değil

Sahibin kararlarını görünür kılmak için: **K-1 = Hibrit kamera** (sunum eğik, fizik düz) ve **"menüler olabildiğince sade"**. Açıklama ve bağlam: [`../tasarim-dili.md`](../tasarim-dili.md) § 9.1, § 10; sadelik listesi: [`../../design/sadelik-ilkeleri.md`](../../design/sadelik-ilkeleri.md).

| Dosya | İçerik |
|---|---|
| `m1-mac-hibrit.png` | Maç (referans 07 karşılığı), Hibrit eğik arena + referans HUD |
| `m2-ulti-hibrit.png` | Ulti anı (08), özgün ruh Közkaracal (kanatsız) |
| `m3-ilk-cekirdek.png` · `m3-atolye.png` · `m3-market.png` · `m3-basarimlar.png` · `m3-oyna.png` · `m3-lobi.png` · `m3-sonuc.png` | Sade menü ailesi (02, 03, 04, 05, 06, 06, 09) |
| `karsilastirma-*.png` | Önce (D5/D6 ekran görüntüsü) / sonra (maket) + değişen öğeler |
| `m4-kamera-kiyas.png` | Şimdiki oyun / Hibrit maket / referans 07 |

**Yöntem:** oyun kodu import edilmeden HTML + Canvas, 480×270 mantıksal piksel, ×4 tam sayı ölçek (`image-rendering: pixelated`), Bayer 4×4 dither, 4–6 tonlu rampalar; Playwright 960×540 DPR 2 (1920×1080) çekim, 256 renge indirgenmiş PNG. Maket HTML/betikleri depoda değil.
**Sınırlar:** topaç, ruh, ikon ve sahne arka planları yordamsal yer tutucudur (sanat hattı değil). Yazı tipleri Pixelify Sans ve Press Start 2P (Google Fonts, OFL) yalnız maket için; oyuna girmeden lisans/glif denetimi (GU-01). Hiçbir canon/marka tasarımı kullanılmadı; kanatlı, ejderli ya da anka ruh yok. Metinler Türkçe sözlük terimleri; sayılar örnek.
