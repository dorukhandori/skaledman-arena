# Kalan iş raporu (2026-11-06, akşam güncellemesi)

Kaynak: D1–D8, GU-A…GU-E, TEMIZLIK, DENGE-1/2, FIZIK-1 raporları ve `test-gecesi.md`. Süre ve yüzde tahminleri bu raporun
yazarının **varsayımıdır**, ölçüm değildir.

## 1. Nerede duruyoruz
- **Oyun işlevi tamam:** sim, yetenek/Ulti/Takım Ultisi, çevrimiçi 1v1, hesaplar, Atölye (3B), Market, Başarımlar, Altın,
  hızlı maç, seyirci/OBS, gizlilik + hesap silme, krediler. `npm test` 488/488, lint, typecheck, build yeşil; Node = Chromium
  17/17 altın hash.
- **Denge (botlarla):** kazanım bandı 20/20 (3 tohum × 1 000 maç), Ring Out %25-34, maç p90 ≤ 81 sn, Ulti görülen maç ≈ %41.
- **Fizik:** girdisiz topaçlar çarpışıyor (720/720 koşuda 15 sn içinde), çarpışma sonrası ayrılıp tekrar çarpıyor.
- **Görsel:** maç ekranı referans 07 için 4,8/5, 08 için 4,4/5. Menüler Kuşak Taşı dilinde (çoğu 3,5-4,5/5).

## 2. Geliştirme tarafında kalanlar (benim/ajanların işi)
| # | İş | Büyüklük | Not |
|---|---|---|---|
| 1 | ~~Kıvılcımı yeni fiziğe ayarla (GU-F)~~ | küçük | **bitti** (`raporlar/GU-F.md`) |
| 2 | Menü sanatı: parça/topaç/kalkan ikonları, para yığını, ruh silueti (Çekirdek Günlüğü), Pazar arka planı yer tutucu | orta | 3B ikon önbelleği hazır; el çizimi pixel kalite için sahibin Mac hattı veya ayrı sanat turu |
| 3 | Topaç sprite'larında nihai kalite (Tripo/Blender GLB) | orta | **Parti 1-3 işlendi** (yedi Çekirdek, gövdeler; `raporlar/MAC-PARCA.md`); Disk ve Uç sahip kararıyla parametrik |
| 4 | ~~Menü hataları ve karmaşa (MENU-DENETIM P1-P4)~~ | orta | **bitti 2026-11-06** (`raporlar/MENU-P1A.md`, `MENU-P2.md`): 14 hata + 18 karmaşa + 4 cila, S-1 gezinti modeli, Profil'de dövülen arma/çerçeve. Kalan: P5 menü sanatı (#2 ile), Zafer ekranı ve %125/%150 yazı ölçeği gözle denetlenmedi, 0–4 maçta "İLK 3 PUAN" yazısı (@helix) |
| 5 | **Ağ (N3):** p95 olay gecikmesi 350-490 ms (hedef ≤ 200), sıçrama/10 çarpışma 1,5 (kapı ≤ 1) | orta-büyük | çare: güvenilmez girdi kanalı (WebTransport, deneysel) ya da tahmin B; karar sahibin |
| 6 | Maç ilk yükleme: sıkıştırmasız 1,62 MB (hedef 1,5), gzip ≈ 750 KB | küçük | **ölçüldü, kod bölme yapılmadı (2026-11-06):** en büyük parça Atölye 3B görüntüleyicisi (582 KB) zaten tembel; giriş 365 KB, gzip ile hedefin altında |
| 7 | **İnsan oyun testi yok:** his ve denge yalnız botla ölçüldü | büyük (sahip/izleyici) | ilk test gecesi bunu yapacak |
| 8 | Denge ince ayar: eşzamanlı bitiş %7, Ring Out tohum yayılımı (per-uç `ringOutHizi`), Kül Çekirdeği meta, Kasırga/Yapay ruh Ulti'leri | küçük-orta | gerçek oyuncu verisi gelince |
| 9 | Karar bekleyenler: Takım Ultisi'nde üç Ata kapsamı, ruh portre bayrağı, şok halkası kalsın mı, sürtünme sesi | küçük | sahip tek satırla |
| 10 | **Kick OAuth** | orta | **sahip söyleyene kadar ASKIDA**, kod yazılmadı |
| 11 | Sezon 2 (ilk sürüm dışı): 4. yuva Parça Tekniği, Karanlık Pazarı, parça sayısı 27→genişleme, Altın fiyat revizyonu | büyük | ilk canlı haftadan sonra |
| 12 | ~~Sunucu 127.0.0.1'e bağlanmıyor~~ | küçük | **bitti 2026-11-06:** `vite.config.ts` `hostBagla()` → `listen(port, process.env.HOST)`; `HOST=127.0.0.1` ile yalnız loopback (lsof ile doğrulandı); `kur.sh` denetimi yeni biçime uyarlandı. VPS'te bir sonraki `kur.sh` ile geçerli olur |
| 13 | ~~CI `devran-kod` push'unda koşmuyor~~ | küçük | **bitti 2026-11-06** (`ci.yml`) |
| 14 | ~~`deploy/README.md` tünel örneği varsayılan `config.yml`~~ | küçük | **bitti 2026-11-06:** ayrı `devran.yml` + tünel kimliği |
| 15 | ~~Oda adımı bütçesi iki yerde farklı; Lv.4 eşiği~~ | küçük | **bitti 2026-11-06** (`docs/tech/mimari.md` § 7): seyircisiz oda ≤ 0,3 ms (ADR-002 yoğunluğundan), yayın odası ≤ 4 ms; Lv.4 eşiği tavan 3 ile tutarlı |

Tahmin (varsayım): madde 1-4, 6, 8 için 4-6 ajan turu (her biri birkaç saat). Madde 5 karar + 1-2 tur. Madde 10 Kick kayıtlı
uygulama gelince 1-2 tur.

| 16 | Harita dengesi H-H4 / H-H5 | küçük | **2026-11-06** (`raporlar/HARITA-DENGE.md`): H-H4 botla geçti (zorluk eşlemesi değişti, `npm run harita:zorluk`); H-H5 kaldı, `dovmeParcalari` kapalı; dövme parça sayı önerileri ve geçit tanımı **sahip kararı** |

## 3. Sahibin yapacakları (benim yapamayacaklarım)
**Yayına çıkış için zorunlu**
1. Alan adı al, Cloudflare'e bağla (`deploy/README.md`).
2. VPS kur: `deploy/kur.sh`, `.env` (`OTURUM_SIRRI`, `IZINLI_KOKENLER`, `VERI_DIZINI`, `GUVENILIR_VEKIL=1`).
3. Cloudflare Tunnel `devran` → `127.0.0.1:2567`; yedek zamanlayıcıyı aç.
4. İlk test gecesi kontrol listesi (`test-gecesi.md`): ≥ 10 izleyici, OBS seyirci görünümü.
5. TÜRKPATENT ad/marka kontrolü (sınıf 9 ve 41); kod lisansı seçimi (şu an LICENSE yok).
6. Geri bildirim formu adresi (`test-gecesi.md`).

**Sanat hattı**
7. Mac'te Gemini + Tripo + Blender hattı: top parçaları batch 1, onay, batch 2; GLB'leri `public/topac/model/<id>.glb` +
   `veri/topac-model.json` ile bağlatmak (komut hazırlandı).
8. Gemini/Tripo ticari kullanım şartlarını doğrula.

**Sonra**
9. Kick uygulama kaydı (ne zaman "Kick'e başla" dersen).
10. İsteğe bağlı: GitHub deposunu `devran` olarak yeniden adlandır.

## 4. Yayın ölçütüne göre özet (varsayım)
- **Kapalı alfa / test gecesi:** teknik olarak hazır; engel yalnız sahibin 1-6 maddeleri (≈ 1 gün iş) + yerelde deneme.
- **Açık beta:** ağ maddesi (5), insan testinden gelen denge ayarları ve menü sanatı (2-3).
- **Kick girişli sürüm:** madde 10 (sahibin Kick kaydı + 1-2 tur).
