# HARİTA-SANAT · Harita / Maden / Ocak sanat turu (2026-11-06)

`[@iris · Game Art Director]` Mac sanat hattıyla (Gemini + anahtarla + palet takası; karakter için Tripo + Blender) `public/harita/` altındaki kodla çizilmiş yer tutucular gerçek pixel art ile değiştirildi. Sahibin tur ortasındaki isteği üzerine ("olabildiği kadar görselleştirelim ve efektler ekleyelim") isteğe bağlı HP-3 zeminleri de üretildi, ekrana bağlandı ve Harita, Maden, Ocak ekranlarına efekt katmanı eklendi.

Sözleşme korundu: bütün yollar, adlar ve boyutlar aynı (`haritaVarlik.ts` değişmedi, yalnız zemin yolları eklendi). PNG'ler paletli, alfa 1 bit, 1 px kontur `#05050A`, ikonlarda ≤ 32 renk (ölçülen en çok 20), karakter sayfalarında ≤ 24 renk, zeminlerde ≤ 48 renk.

## 1. Ne üretildi

| Parti | Çıktı | Adet | Yöntem |
|---|---|---|---|
| HP-1 | `dugum/{dusman,patron,maden,sandik,sandik-bos,kilit}.png` 13×13, `ustalik/{madencilik,isleme}.png` 13×13, `efekt/usta-isi.png` 128×16 | 9 | Gemini ham ikon → `anahtarla.py` → `harita_piksel.py` (ham görselin kendi paletinden medyan kesim, BOX küçültme, 1 bit alfa, dış kontur). Usta işi: tek Gemini parıltısından 8 ölçek karesi |
| HP-2 | `maden/cevher-*`, `maden/kulce-*` 16×16 (8+8), `arma/*` 24×24 (16), `cerceve/*` 24×24 (19) | 51 | 13 gri kalıp (cevher, külçe, 2 arma, 6 bölge arması, 3 çerçeve) → parlaklığa göre 6 düzey → kademe/bölge rampası (10 § 2). Devir Taşı: en parlak düzey 6 element vurgusuyla yanardöner. Çerçeveler 9-dilim sözleşmesine zorlanır (kenar 6, iç 12×12 boş, dış ve iç kenar kontur) |
| HP-K | `karakter/govde-<0..3>-renk-<0..5>.png` 144×72 | 24 | 4 Gemini gövde konsepti (A-duruşu, parlak yeşil giysi) → Tripo `image-to-model` v3.1 → Blender 5.2 `blender/karakter_render.py` (konuma göre iskelet, 27 poz) → `harita_karakter.py` (16×24 hücre, ortak palet, yeşil giysi → 6 profil rengi) |
| M1 | `maden/damar-<kademe>.png` 96×96 (8) | 8 | Gemini gri kaya + anahtar yeşili damar → taş ocak ağzıyla uyumlu mavi-gri rampaya, damar kademe rampasına (Devir yanardöner). Maden ekranında sekizgen yer tutucu kaya ve küçük cevher ikonunun yerini aldı |
| HP-3 | `zemin/<bolge>.png` 480×200 (6 bölge), `zemin/ocak-agzi.png` 480×270 | 7 | Gemini manzara → kenar kırpma, en-boy kırpma, BOX küçültme, ≤ 48 renk |

Toplam 99 dosya, ≈ 400 KB (ikonlar 32 KB, karakter 52 KB, zeminler 309 KB). Önce/sonra: [HARITA-SANAT-once-sonra.png](ekran/HARITA-SANAT-once-sonra.png).

### Karakter iskeleti (Tripo rig kredisi harcamadan)
Tripo modelleri iskeletsiz gelir; Tripo'nun rig + retarget adımı model başına ≈ 65 kredi daha tutardı. Bunun yerine Blender'da ücretsiz bir iskelet kuruldu: model ölçülür (A-duruşunda en dıştaki köşeler = el ucu, göğüs genişliği, omuz yüksekliği), kollar omuz→el kapsülüyle, bacaklar kalça altıyla, baş boyun üstüyle ayrılır, eklemde ağırlık yumuşatılır. Pozlar elle yazılmış açılarla kare kare verilir: BEKLE 4 (nefes), YÜRÜ 6 (bacak/kol salınımı), KAZ 6 (kaldır, tepe, vur, saplan; sağ ele ilkel geometriden kazma), DÖVÜŞE GİR 5 (geri çek, fırlat), KUTLA 6 (zıpla, kollar havada). Kamera ortografik, 3/4 önden, 28° üstten, karakter ekranda sağa bakar (sola yürüme kodda ayna, 13 § 2.2).

## 2. Ekrana bağlananlar ve efektler

Yeni modül [`haritaEfekt.ts`](../../../src/istemci/ekranlar/haritaEfekt.ts): piksel kırıntı patlaması, usta işi parıltısı (sprite şeridi), halka dalgası, sarsıntı, bölge ortam parçacıkları (SVG), ayak tozu. Yalnız görsel; oyun durumunu değiştirmez. "Hareketi azalt" (sistem ya da `data-azalt=1`) açıkken hareketli efektler çizilmez, parıltı tek sabit kare kalır.

| Ekran | Eklenen |
|---|---|
| Harita | Bölge zemini (SVG `<image>`, y 18'den 480×200) + %42 koyu örtü (kilitli bölgede %70), SVG'nin yan boşluklarını aynı zeminin koyu kopyası doldurur; bölgeye göre ortam: Ayaz kar, Kor kıvılcım, Yel rüzgâr çizgisi, Çakım uzak şimşek parlaması + kıvılcım, Dip kabarcık, Ocak Yamacı toz; keşfedilmemiş açık düğümde altın nabız halkası; maden düğümünde kademe renginde ışıma; yürürken ayak tozu; aşama yükselince (KUTLA) altın kırıntı + usta işi parıltısı |
| Maden | Ocak ağzı kaya çerçevesi gövdenin zemini; damar kayası (M1) + kademe renginde nabız ışıması; sol alttaki karakter ×3 (48×72 CSS px); KAZ'da kaya sarsılır, kademe renginde kırıntı, İSABET'te bronz halka dalgası, NADİR'de iki parıltı, ISKA'da gri toz |
| Ocak | Cevher listesinde külçe ikonu (`KULCE_IKON` artık kullanılıyor); ERİT sonucunda külçe ikonu + kor kıvılcımı; DÖV/ÜRET'te çekiç kıvılcımı; usta işinde halka + iki parıltı; `usta-isi.png` yolu `USTA_PARILTI()` üzerinden (önceden sabit yol) |
| Profil | KARAKTER seçicisi kodla çizilmiş dikdörtgenler yerine gerçek sayfanın BEKLE karesini gösterir |

## 3. Çağrı sayısı ve maliyet

| Kalem | Adet | Maliyet |
|---|---|---|
| Gemini `gemini-3.1-flash-image` | 43 çağrı (33 ilk tur + 8 yeniden üretim: 3 zemin perspektif/çerçeve, 1 DÜŞMAN denemesi kullanılmadı, İşleme, 3 bölge arması; + 2 damar kayası varyantı) | ≈ **$1,94** (tahmin $0,045/görsel; bütçe ≈ $2) |
| Tripo `image-to-model` v3.1 | 4 model | 160 kredi |
| Tripo `texture_model` | 1 (karakter-0'ın dokusu gri geldi; yalnız yeniden doku) | 10 kredi |
| Toplam Tripo | | **170 kredi** (bütçe ≈ 160; bakiye 2225 → 2055) |
| Blender, palet takası, piksele indirme | — | 0 |

Kayıtlar depo dışında: `art-source/harita/manifest.jsonl` (Gemini), `tripo-kayit.jsonl`, `secim.json` (varyant seçimi), `once/` (yer tutucuların yedeği).

## 4. Varsaydıklarım (sahibe sorulmadı, 10 § 1–2 uygulandı)

- Bölge armaları için motif: Kaya teraslı ocak, Don kar kristali, Kor krater ağzı (alev yok), Kasırga rüzgâr çizgileri, Şimşek zikzak, Girdap spiral (10 § 1 lore motifleri; "fantastik süs yok" kuralı).
- Arma ve çerçeve tek renk ailesinde (kalıp gri → kademe rampası); metal/bronz ikinci renk eklenmedi.
- Karakter: 4 gövde = dengeli, iri, küçük/kıvırcık saçlı, uzun paltolu; giysi profil rengi, pantolon lacivert, bot kahve, ten sabit. Ten rengi çeşitliliği eklenmedi (sahip kararı gerekir).
- Zeminler bütçesi: 10 § 6 "≤ 120 KB (ikonlar + 3 zemin)" aşıldı (ikonlar 32 KB + 3 zemin ≈ 130 KB). Ekran yalnız açık bölgenin zeminini yükler (bölge başına ≈ 35-60 KB); renk sayısını 32'ye indirmek ≈ %25 kazandırır, gerekirse yapılır.
- Zemin okunurluğu için koyu örtü %42 (gözle seçildi).
- Kalan yer tutucu yok; `harita-asset-uret.ts` artık yalnız `--yer-tutucu` bayrağıyla çalışır (üzerine yazmasın diye).

## 5. Kapılar

| Kapı | Sonuç |
|---|---|
| `npm test` | 628/628 (35 dosya) |
| `npm run lint` | temiz |
| `npm run typecheck` | temiz |
| `npm run build` | başarılı |
| `npm run krediler:uret` | eksik atıf yok; `docs/art/krediler.md`'ye iki satır (harita varlıkları, harita karakteri) |

## 6. Ekran kontrolü

`KIMLIK_MODU=sifre` geliştirme sunucusu (port 5391) açıkken `H_DILIM=SANAT npm run h:akis` (Playwright, masaüstü 1280×720 DPR 2 + telefon 844×390). Otomatik oynanış, insan play pass değil.

- **Konsol hatası: 0** (iki çalıştırma; ikincisi damar kayası ve ×3 karakterden sonra). İlk çalıştırmada bot ilk düşman maçını (b1-01) **kazandı** (1 yıldız); Maden (b1-02) ve Ocak adımları açıldı. Kazı: 6 vuruş (3 ıska, 1 başarılı, 1 İSABET, 1 ıska), Ocak: ERİT + ilk parça (DEMİR DÜZ UÇ, NO. 0001).
- Kontakt: [HARITA-SANAT-kontakt.jpg](ekran/HARITA-SANAT-kontakt.jpg) (Harita ilk, Harita dönüş KUTLA, Maden ilk/vuruş, efekt anı, Ocak ERİT, Profil KARAKTER, telefon Harita/Ocak). Tek tek: `ekran/HARITA-SANAT-*.png`, akış kaydı [HARITA-SANAT-akis.json](HARITA-SANAT-akis.json).
- Gözle doğrulanan: bölge zemini + koyu örtü, maden düğümünde nabız halkası ve ışıma, dönüşte KUTLA parıltısı (harita-donus), ocak ağzı zemini ve sekizgen damar (maden-*), Profil'de 4 karakter karesi, Ocak listesinde külçe ikonu.
- İlk harita görüntüsü yan şerit dolgusundan önce alındı (koyu şerit görünür); dönüş görüntüsünde dolgu var.
- Kırıntı/halka efektleri 0,6 sn sürdüğü için akış görüntülerinin çoğunda yakalanmadı; KUTLA parıltısı yakalandı. Ayrıca efekt modülü dev sunucusundan yüklenip patlama anında (170 ms) çekildi: [HARITA-SANAT-efekt.png](ekran/HARITA-SANAT-efekt.png) (Kor zemini + kor ortam parçacıkları, Kor damar kayası üstünde kırıntı + halka, sağda parıltı + altın kırıntı; sayfa hatası 0).

Ortam notu: bu Mac'te Playwright kurulu değildi. Depoya dokunmadan scratchpad'e `playwright@1.56` kuruldu (`NODE_PATH`), headless kabuk indirmesi yarıda kaldığı için sistemdeki Google Chrome küçük bir sarmalayıcıyla (`--headless=new`) kullanıldı. Bu kurulum `~/Library/Caches/ms-playwright/` altındaki sahipsiz eski `chromium-1194` ve `ffmpeg-1011` klasörlerini sildi; gerekirse `npx playwright install chromium` ile geri gelir.

## 7. Bilinen eksikler

- 16×24'te karakterin yüzü 2-3 pikseldir; okunurluk siluet ve giysi rengiyle. KAZ'da kazma 2-3 piksel görünür.
- Profil renginin palet takası yalnız giysiyi değiştirir; tek renk sayfası 6 kez tekrarlanır (sayfa başına ≈ 2-3 KB).
- `cerceve-krater` ikinci turda bazalt + kor ışığı rampasına alındı; `cerceve-usta-ocakci` Kor rampasında ve köşe yıldızlı.
- Kor bölgesinin ortam efekti ve maden ışıması `prefers-reduced-motion`'da kapanır; gözle insan denetimi yapılmadı.
