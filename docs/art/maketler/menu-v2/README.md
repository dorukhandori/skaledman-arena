# Menü dili v2 maketleri (2026-11-05) · yer tutucu sanat, nihai değil

Bağlam, teşhis, kaynaklar ve karar: [`../../menu-tasarim-arastirma.md`](../../menu-tasarim-arastirma.md). **Karar (2026-11-05, sahip onayı): Yön B · Kuşak Taşı** (arena taşı, bronz kakma, ışıyan Kuşak halkası).

| Dosya | İçerik |
|---|---|
| `b-oyna.png` | Oyna: mod seçimi (Hızlı maç seçili), takım sahnede, MAÇ BUL |
| `b-lobi.png` | Lobi: Oda kodu seçili, 8 taş karoyla kodla katıl, ODA AÇ |
| `b-ara0.png` · `b-ara1.png` · `b-ara2.png` | Aranıyor: bekleme animasyonunun 3 karesi (0:04 · 0:12 · 0:21 + Antrenman önerisi); halka 12 dilim = 60 sn |
| `b-vs.png` | Rakip bulundu / VS: çatlakla bölünen ekran, ad plakaları, element rozetleri |
| `b-takim.png` | Takım seçimi (20 sn): SEN · geri sayım halkası + 3 kart · RAKİP, HAZIR |
| `b-oda.png` | Oda açıldı: kod karoları, KODU KOPYALA, 60 sn sayacı, QR yer tutucu, boş rakip kaidesi |
| `b-sonuc.png` | Sonuç (Zafer): bronz plaka, bitiş tablosu, Altın · Çekirdek · Başarım, taş kıymığı |
| `b-atolye.png` · `b-market.png` · `b-basarimlar.png` · `b-ilk-cekirdek.png` · `b-giris.png` | Komşu menüler aynı dilde: Atölye (blueprint orta sütun), Market (pazar ahşabı), Başarımlar (6 sekme, kalkan kart), İlk Çekirdek (taş niş + kaide), Giriş/Profil (bronz GİRİŞ) |
| `a-lobi.png` · `a-vs.png` | Yön A · Tezgâh Planı (blueprint, pirinç, maskeleme bandı) |
| `c-lobi.png` · `c-vs.png` | Yön C · Turnuva Tabelası (arcade, LED, çapraz bant) |
| `onceki-sonra-*.png` | Bugünkü ekran (D4/D5/D7 görüntüsü) / yön B maketi + değişen öğeler: oyna, lobi, araniyor, bulundu, takim, oda, sonuc |
| `yonler-lobi.png` · `yonler-vs.png` | Bugün / A / B / C yan yana |
| `teshis-1-lobi.png` · `teshis-2-bulundu.png` · `teshis-3-sonuc.png` | Bugünkü ekranlarda "slop" belirtilerinin numaralı işaretleri |

**Yöntem:** Oyun kodu import edilmedi. HTML + Canvas ile 480×270 mantıksal piksel çizildi, ×4 tam sayı ölçekle 1920×1080 (DPR 1) Playwright çekimi alındı. Bayer 4×4 dither ve tohumlu değer gürültüsü kullanıldı; gradyan, bulanık gölge ve parlama yok. Metin eşiklenmiş pixel glif (yumuşatma yok). PNG'ler 256 renge indirgendi. Kıyas görsellerinde maketler yumuşak küçültüldü; birebir piksel için `b-*.png` dosyalarına bakın. Maket HTML/betikleri depoda değil.
**Yazı tipleri (yalnız maket):** Jersey 10 (Sarah Cadigan-Fried, OFL; başlık, 20/30/40 px) ve m5x7 (Daniel Linssen, CC0; etiket, 16 px), yerel TTF'den bağlandı. Yön C'deki rakam ve "VS" için Press Start 2P (OFL) kullanıldı. Türkçe glif denetimi: araştırma belgesi § 4.2. Oyuna girmeden önce `krediler.md` (GU-01).
**Sınırlar:** Topaç, element ikonları, kaide, rozet ve QR yordamsal yer tutucudur, sanat hattı değildir. Hiçbir canon/marka tasarımı ya da başka oyunun görseli kullanılmadı. Adlar (Ayla, Berk) ve sayılar örnektir.
