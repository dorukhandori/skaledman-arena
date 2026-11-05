# GU-A raporu: menü dili v2 "Kuşak Taşı" kodda (GU-01 temel + tüm menü ekranları)

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** kıdemli UI + sanat yönetimi
**Sahip talimatı:** "Bir an önce oyunumuzun referans görsellerdeki gibi görünmesini istiyorum." Yön B · Kuşak Taşı onaylı (KM-1…KM-8, `docs/art/menu-tasarim-arastirma.md` § 8–9).
**Kapsam:** yalnız sunum (stil, yerleşim, ikon, animasyon ve gereken DOM). İşlev, API, sim, netcode değişmedi. Maç sahnesi / HUD (`src/istemci/oyun/**`) bu çalışmanın dışında (paralel oturum).
**Doğrulama:** `npm test` 399/399 · `npm run lint` · `npm run typecheck` · `npm run build` yeşil (her dilimde). `araclar/d5-akis.ts` ve `araclar/d6-akis.ts` uçtan uca gerçek tarayıcıda baştan sona geçti; konsol hatası 0 (yalnız beklenen 4xx yanıtları). Ekran görüntüleri Playwright + headless Chromium, 1280×720, DPR 2 (`--o` = 2): `docs/production/raporlar/ekran/GU-A-*.png`.

## 1. Ne yapıldı

### 1.1 GU-01 temel (tek stil kaynağı)
- **Yazı tipleri (yerel, dış istek yok):** `public/yazi/Jersey10-Regular.ttf` (Sarah Cadigan-Fried, SIL OFL 1.1, lisans `Jersey10-OFL.txt`; google/fonts `ofl/jersey10`) başlık/düğme/rakam; `public/yazi/m5x7.ttf` (Daniel Linssen, CC0, lisans `m5x7-CC0.txt`; crates.io `m5x7` 1.0.0 TTF) etiket/açıklama. fontTools cmap denetimi: İ ı Ö ö Ş ş Ğ ğ Ü ü Ç ç ikisinde de tam; Chromium çizimiyle doğrulandı (`GU-A` glif sınaması). Eksik glifler (▲ ◆ ◄ – …) yedek yazı tipine düşer; ▲/◆/◄ bu yüzden glif değil pixel şekil/sprite (`.k-isaret`, `.k-geri`). `@font-face` + `preload`; Google Fonts dilim sorunu yok. Krediler: `docs/art/krediler.md` "Yazı tipleri" bölümü + `veri/manifest-gorsel.json` 3 satır (iki yazı tipi + menü dokuları); oyun içi Krediler metni (`YAZI_TIPI`) güncellendi.
- **Jetonlar:** `src/istemci/stil/jetonlar.css` (§ 5.2 renkleri birebir: taş, harç, çerçeve, panel, bronz, Kuşak halkası `#FBBE88`, ana `#A8572A`/`#7C3D1C` + altın, mürekkep, geri `#9A3D38`, tehlike, element rampaları, takım `--sen`/`--rakip` + metin için `--rakip-yazi #F472B0`, HUD stamina/Enerji/Ulti jetonları K-3), ızgara (kenar 8, lento 26), yazı boyları (Jersey 20/30/40, m5x7 16/32).
- **Tam sayı ölçek:** `--o = floor(min(W/480, H/270))`, en az 2; her ölçü `calc(N * var(--p))`. Metin ölçeği %100/125/150 → yazı ölçeği `--yo` tam sayıya yukarı yuvarlanır (glif ızgarası bozulmaz); `html[data-yazi-buyuk]` ile çok sütunlu yerleşimler tek sütuna kırılır. Ayarlar'a "Yazı tipi: Pixel / Düz (okunurluk)" eklendi (`html[data-duz-yazi]`).
- **Bileşenler:** `src/istemci/stil/bilesenler.css` (`k-` öneki): duvar zemini, üst lento, ◄ geri (20×20 kırmızı), bronz başlık plakası (9-slice, perçin), Altın yuvası (80×20, sikke sprite), taş panel (5 px 9-slice, 3 tohum varyasyonu, çentikli), düğme ailesi (ana / normal / seçili / basılı 2 px aşağı / kapalı + kilit), seçim çentiği (4 köşe L), sekme (açık ağız), fiyat/durum rozeti, segment çubuk (3+1), kare segment (köken, oda sayacı), element rozeti (6 × 11×11 pixel sprite), kalkan rozeti, kaide, kod karosu (+ imleç), VS ad plakası (basamaklı eğim), soru işaretli boş kaide, hücre, form alanı. **Maç HUD için:** `.k-stamina` (eşik: iyi/orta/az + tarama), `.k-enerji` (3 dilim, dolarken yeşil, Ulti açık sarı), `.k-ulti`, `.k-skor` trapez plaka, `.k-etiket-hud`; dokular `--k-*` CSS değişkeni olarak (TS içi stil dizgilerinden de kullanılabilir). Odak halkası 2 px beyaz + 1 px koyu (CSS px'te 4 px ≥ 3 px), `prefers-reduced-motion` ve `html[data-az-hareket]` destekli; animasyonlar `steps()` (12 fps).
- **Dokular:** `araclar/menu-dokulari.ts` (tohumlu, deterministik, kendi PNG kodlayıcısı) → `src/istemci/stil/doku/*.png` 24 dosya / 9,3 KB: duvar, taş çerçeve ×3, lento (derz 61 px), plaka, 7 düğme/panel dolgusu, ahşap, blueprint, gece, tapınak, flama, gök, element/kilit/sikke/◄/kalkan sprite'ları. Gradyan yok: ton geçişi Bayer 4×4 dither.
- **Ekran ekranlar.css + kabuk:** `src/istemci/stil/ekranlar.css`; `arayuz.ts` `ekranKok()` artık taş duvar + lento + gövde + taş panel kurar; `lentoKur()` (◄ · plaka · Altın yuvası; Atölye'de ad + Ayarlar + Çıkış), `kSiniflandir()` eski işaretlemeyi (sınıfsız düğme, `button.bir`, `.geri`, input/select) bileşen sınıflarına eşler; `ARAYUZ_STIL` ve `REF_STIL` yeni dile taşındı (üç ayrı stil kaynağı kalktı, T-9). **Web gezinti çubuğu menülerden kalktı (KM-4):** `body.kabuk`; Atölye alt şeridi (Market · Başarımlar · OYNA) + alt ekranlarda ◄; geliştirici ekranları (`mac`, `topac-lab`) eski bandı korur.

### 1.2 Ekranlar
Pixel topaç / parça / küre / Çekirdek illüstrasyonu yer tutucuları yordamsal: `src/istemci/ekranlar/pikselTopac.ts` (4 tonlu rampa + dither, 8 karelik dönüş), Lobi çizimleri `src/istemci/ekranlar/lobiCizim.ts` (Kuşak yayı, arama çanağı 12 dilim, süre halkası 20 çentik, VS çatlak zemini).

| Ekran | Dosya | Maket / referans | Görüntü | Uyum (0–5) | Kalan farklar |
|---|---|---|---|---|---|
| Oyna (Hızlı maç) | `Lobi.ts` | `b-oyna` | `GU-A-oyna` | **4** | Topaçlar yordamsal yer tutucu; 640×360 mantıksal alanda sahne maketten daha boşluklu; DEĞİŞTİR yalnız 2+ takımda |
| Lobi (Oda kodu, kodla katıl) | `Lobi.ts` | `b-lobi` | `GU-A-lobi-oda`, `GU-A-lobi-oda-yazili` | **4** | KATIL kod tamamlanana kadar kapalı (maketteki gibi); bağlantıyla gelince ana düğme olur |
| Aranıyor (3 aşama) | `Lobi.ts` | `b-ara0..2` | `GU-A-ara0/1/2`, `GU-A-ara-bot` | **4,5** | 30 sn bot teklifi maketlerde yok (D7 işlevi; aynı panel dilinde); ses ipuçları eklenmedi |
| Rakip bulundu / VS | `Lobi.ts` | `b-vs` | `GU-A-vs`, `GU-A-vs-B` | **4** | Alt rozet bandı (Sıra · Stil) çizilmedi: sunucuda bu veri yok; stinger sesi yok; çatlak tek karede (kayan plakalar + damga + 2 px sarsıntı var) |
| Takım seçimi (20 sn) | `Lobi.ts` | `b-takim` | `GU-A-takim`, `GU-A-takim-son5` | **3,5** | Kartlar **takım** seçer (mevcut işlev; maket "ilk topacını seç" diyordu), tek takımlı oyuncuda tek kart; SEN/RAKİP rozet bandı yok |
| Oda açıldı | `Lobi.ts` | `b-oda` | `GU-A-oda` | **4** | QR yer tutucu dama deseni; seyirci bağlantısı düğmesi ek (D8) |
| Sonuç | `Mac.ts` (yalnız sonuç/menü stili) | `b-sonuc`, ref 09 | `GU-A-sonuc`, `GU-A-sonuc-B`, `GU-A-sonuc-cevrimdisi` | **3,5** | 960×540 maç çerçevesinde ölçek kesirli (1280'de ×1,33) → pixel yazı hafif yumuşak; para yığını hâlâ SVG; çok satırda tablo kayar; gelir dökümü Altın kartına odak/üzerine gelince (KM-6); konfeti yerine taş kıymığı (KM-7) |
| Atölye | `Atolye.ts` | `b-atolye`, ref 03 | `GU-A-atolye` | **3** | Takım paneli sağda kaldı (maket alt şeritte 3 topaç); orta önizleme `oyun/TopacOnizleme` (paralel oturumun alanı, patlatılmış blueprint değil); 720p'de bilgi yoğun, paneller kendi içinde kayar |
| Market | `Market.ts` | `b-market`, ref 04 | `GU-A-market`, `GU-A-market-onay` | **4** | Pazar arka planı yer tutucu (gök + flama + ahşap; tezgâh/kasaba sahnesi yok); fiyat rozetinde "ALTIN" yazısı korundu |
| Başarımlar | `Basarimlar.ts` | `b-basarimlar`, ref 05 | `GU-A-basarimlar` | **4** | 9 sekme (maket 6); kalkan içi kategori simgesi geçici olarak element sprite'ı; kartta ödül satırı ek |
| İlk Çekirdek | `IlkCekirdek.ts` | `b-ilk-cekirdek`, ref 02 | `GU-A-ilk-cekirdek` | **3,5** | US-1.3 metinleri (pasif + yetenek + Yapay notu) kartı uzatıyor → 720p'de alt kısım kayar; 5 sn önizleme mantıksal çözünürlüğe indirildi (pixel); her kartta "Bunu seç" (maket tek SEÇ) |
| Karşılama / Kayıt / Giriş | `Kimlik.ts` | `b-giris`, ref 01 | `GU-A-karsilama`, `GU-A-kayit`, `GU-A-giris` | **4** | — |
| Profil | `Profil.ts` | `b-giris`, ref 01 | `GU-A-profil`, `GU-A-profil-duzenle` | **3,5** | 6 renk (kasıtlı, D5); 720p'de form uzun, sayfa kayar |
| Çekirdek Günlüğü | `Gunluk.ts` | (maket yok) | `GU-A-gunluk` | **3,5** | Ruh silueti hâlâ SVG yer tutucu |
| Ayarlar / Gizlilik / Krediler | `Diger.ts`, `Bilgi.ts` | (maket yok) | `GU-A-ayarlar`, `GU-A-ayarlar-misafir`, `GU-A-gizlilik`, `GU-A-krediler` | **3,5** | Uzun metin sayfaları pixel yazıyla okunur ama yoğun |
| Antrenman / Dene katmanları | `Antrenman.ts`, `Dene.ts` | (maket yok) | `GU-A-antrenman` | **3,5** | HUD (paralel oturum) henüz eski yazı tipinde |
| Seyirci bekleme | `Seyirci.ts` | (maket yok) | — (d8 akışıyla) | **3,5** | Stil değişti, bu oturumda ayrı çekilmedi |
| Bakım / sürüm bandı / dar ekran | `arayuz.ts` | — | `GU-A-bakim`, `GU-A-surum-bandi`, `GU-A-dar-ekran` | **4** | — |

### 1.3 Araç betikleri
- `araclar/d5-akis.ts`, `araclar/d6-akis.ts`: Oyna varsayılanı Hızlı maç olduğu için (D7'den beri) oda açmadan önce `[data-mod=oda]` tıklanır. Tüm `data-*` seçicileri, `window.__lobi/__atolye/__market/__basarimlar` kancaları ve `.ms`, `.rf`, `.mk`, `.eg`, `.sy` kökleri korundu. d5 ve d6 gerçek tarayıcıda baştan sona geçti. d7/d8 bu oturumda koşturulmadı. Seçicileri aynı kaldığı için d8 zaten `[data-mod=oda]` tıklıyor.
- Lobi'de gerçek bir hata düzeldi: aynı sayfada İptal'den sonra yeni oda açılınca önceki odanın fazı yeni ekranı engelliyordu (`sonFaz` sıfırlanmıyordu).

## 2. Varsayımlar
- 1280×720'de `--o` = 2 → mantıksal alan 640×360 (maket 480×270). Yerleşimler esnek: maketten daha geniş alan kullanılır, oran korunur.
- m5x7 satır aralığı 0,75–0,875 em (12–14 mantıksal px). Glif 7 px olduğu için okunur, yoğun ekranlar sığar.
- Maç çerçevesi (960×540) içindeki katmanlarda (sonuç, eğitim, Dene, seyirci) 1 mantıksal px = 2 çerçeve px. Ölçek kesirli olduğu için pixel netliği HUD dönüşümüne bağlı.
- Kategori kalkanlarında element sprite'ı geçici simge olarak kullanıldı. Pixel ikon seti sanat kolunun işi (§ 6.3).

## 3. Sahip kararı bekleyenler
1. **Takım seçimi kartları:** maket "İLK TOPACINI SEÇ" (3 topaç) diyor, kod takım seçiyor (US mevcut). Maç başında ilk topaç seçimi istenirse bu bir işlev değişikliği olur (sim/netcode), ayrı iş.
2. **Atölye yerleşimi:** takım panelinin maketteki gibi alt şeride inmesi (kayıtlı takımlar, çark ve sıra okları ikinci kata) sadelik kazancı sağlar ama D6 akışlarına dokunur. Onay?
3. **VS alt bandı (Sıra · Stil rozetleri):** veri sunucuda yok. Yalnız Dereceli açıldığında mı gösterilsin?
4. **720p yoğunluğu:** Atölye, İlk Çekirdek ve Profil 1280×720'de kayıyor. Metin kısaltma (sadelik S-2) mı, ikinci kat mı?
5. **Maç çerçevesi ölçeği:** sonuç ve HUD'un 960×540 çerçevesi tam sayı ölçeğe (`--o`) geçirilsin mi? Paralel HUD oturumuyla birlikte karar verilmeli.

## 4. İkinci tur (2026-11-05): "referanstaki gibi ve menüler sade olsun"

**Sahip cevapları (koordinatör üzerinden):** (1) takım seçimi işlevi aynı kalır; (2) Atölye Takım paneli **sağda** kalır (referans 03 maketten üstün, `menu-tasarim-arastirma.md` § 9.1'e not düşüldü); (3) VS rozet bandı yalnız Dereceli açık ve veri varken (bugün veri yok, çizilmiyor); (4) 720p: metin kısalt, bilgi ikinci kata, iç listeler kendi içinde kayar; **sayfa kayması ve kesilen metin yok**; (5) maç çerçevesi ölçeği bu turun dışında.

### 4.1 Ne değişti
- **Ölçek:** `--o = floor(min(W/640, H/360))` (1280×720 ×2, 1920×1080 ×3, 2560×1440 ×4). Böylece mantıksal alan her çözünürlükte ≥ 640×360 ve yerleşim aynı kalıyor. Eski hedef 480×270 (1080p'de ×4) yoğun ekranlarda sayfayı kaydırıyordu. § 6.5'teki mantıksal ölçüler geçerli.
- **Atölye (sadelik § 2.1):**
  - Dört filtre tek **FİLTRE** düğmesinin arkasında (etkin filtre sayısı + Temizle). Seçenekler BÜYÜK HARF pixel yazıda.
  - Parça kartı: ikon + ad (satır kırılır, kesilmez) + tek kısa durum (sikke + fiyat / SENDE / "1. TOPAÇ" / 3/10 / ???). Tam metin ipucunda ve ARIA'da.
  - Orta sütun (blueprint): plaka ad, önizleme, 4 parça satırı (etiket + tam ad, kırılır).
  - Çubuk sütunu: 6 çubuk (0 değeri boş çubuk, sayı okunur), "TİP: KALE" ("yakın tip" kalktı), tek satır uyum ("Uyum: Enerji +%10" / "! Uyumsuz: Enerji yavaş"), DENE · 30 SN ve AYRINTI.
  - **Ayrıntı** (ikinci kat): Uç deseni, dönüş yönü, Yapay yön seçimi, Dene rakibi, parça çıkar.
  - Sağdaki Takım paneli: "TAKIM 1 ▾" menüsü (ad, kayıtlı takımlar, Aktif yap, Yeni takım), 3 yuva kartı, KAYDET (ikincil). Element çarkı kalktı; üç kendi Çekirdeği hazırsa **TAKIM ULTİSİ** rozeti çıkıyor (araçlar için `data-cark` korundu).
  - Lento: AYARLAR · **DAHA FAZLA ▾** (oyuncu adı başlıkta; Çekirdek Günlüğü, Profil; Topaç Lab yalnız `?gelistir=1`) · ÇIKIŞ · Altın yuvası. Lentoda taş üstünde metin kalmadı.
  - Geliştirme paneli (Parça ver, +100 XP) yalnız `?gelistir=1` ile görünüyor (S-10). Tek ana eylem OYNA; MARKET ve BAŞARIMLAR ikincil.
- **İlk Çekirdek (§ 2.2):** kart = seçim (radyo, ok tuşları); tek **SEÇ** alt ortada ve kartın dışında, her zaman görünür. Yetenek satırı ipucuna ve ARIA'ya taşındı. Yapay notu "30 maç ömür" oldu.
- **Profil (§ 2.9):** renk adları ARIA'da; destek kanalı "Destek kanalı ▾" ile açılıyor.
- **Ayarlar:** maç ayarları iki sütun. **Krediler, Gizlilik, Günlük:** uzun içerik panelin içinde kayar, sayfa kaymaz. Tablolar sarılıyor; yatay kayma yok.
- **Kontrast (≥ 4,5:1):**
  - Soluk açıklama (`.yt`) `#A49C8C` oldu.
  - Kilitli/gizli metin için yeni jeton `--kilitli-yazi #9A93A8`; sekme sayaçları da soluk tona çekildi.
  - Bronz plaka ve VS plaka dokusu koyulaştırıldı (mürekkep / `#8F6538` = 4,8).
  - Günün parçası metni mürekkep rengi; klavye ipuçları (ENTER/ESC) koyu yonga üstünde.
  - Seçili Günlük satırı mürekkep rengi; yer tutucu metin `#9A93A8`.
- **Sonuç:** başarım listesi ve bitiş tablosu kendi içinde kayıyor. Gelir dökümü katmanı artık kesilmiyor.

### 4.2 Denetim (Playwright, 1280×720 DPR 2 ve 1920×1080 DPR 1)
Betik her ekranda dört şeyi ölçtü:
- sayfa kayması (kök `scrollHeight > clientHeight`);
- kesilen metin (`overflow: hidden/clip` ya da ellipsis altında taşan metin, metin taşan kutu, yatay kayma);
- görünüm dışına taşan metin;
- kontrast (metin rengi / ilk opak arka plan < 4,5).

Ölçülen ekranlar: Oyna, Lobi (oda), Aranıyor, bot teklifi, Oda, VS, Takım seçimi, Sonuç, Atölye (+ Gövde sekmesi + üç ikinci kat açık), Market (+ onay), Başarımlar, Günlük, Ayarlar, Profil (yeni ve düzenle), İlk Çekirdek, Karşılama, Kayıt, Giriş, Krediler, Gizlilik.

**Sonuç:** her iki çözünürlükte **sayfa kayması 0, kesilen metin 0, görünüm dışı metin 0, kontrast hatası 0**. Bilinçli istisnalar:
1. Çentikli mod düğmelerinde süs pseudo-öğesi kutuyu aşıyor; metin değil.
2. Maç HUD öğeleri (`.ya` yuva adı, `.mh` skor): sonuç katmanının altında kalıyor ve `src/istemci/oyun/**` alanında (dokunulmadı).

İç kaydırma kalan yerler bilinçli: Atölye envanter ve takım listeleri, Sonuç başarım listesi ve tablo, Krediler, Gizlilik, Günlük.

`araclar/d5-akis.ts` ve `araclar/d6-akis.ts` gerçek tarayıcıda baştan sona geçti (hata 0, konsol hatası 0). d6 ikinci kat panellerini kendisi açıyor (`ikinciKat` yardımcısı); d5 İlk Çekirdek'te kartı + SEÇ'i, Profil'de "Destek kanalı"nı tıklıyor.

**Görüntüler:** `docs/production/raporlar/ekran/GU-A2-*.png`, 35 dosya. 1280×720 DPR 2: tüm ekranlar. `*-1080p.png` (1920×1080): Atölye (+ ikinci kat), Oyna, Market, Başarımlar, İlk Çekirdek, Profil, VS, Takım, Oda, Sonuç.

### 4.3 Güncel uyum puanı (0–5)
| Ekran | 1. tur | 2. tur | Not |
|---|---|---|---|
| Atölye | 3 | **4** | Referans 03 düzeni (envanter · blueprint + 6 çubuk · Takım sağda), ikinci katlar, kesik yok; orta önizleme hâlâ `oyun/TopacOnizleme` |
| İlk Çekirdek | 3,5 | **4** | Tek SEÇ, sığıyor; önizleme küçük |
| Profil | 3,5 | **4** | Sığıyor; 6 renk (kasıtlı) |
| Sonuç | 3,5 | **3,5** | Kesik yok; maç çerçevesi ölçeği kararı ayrı (5) |
| Takım seçimi | 3,5 | **3,5** | İşlev kararı (1) gereği takım kartı |
| Günlük, Ayarlar, Krediler, Gizlilik | 3,5 | **4** | Sayfa kayması yok, içerik panelde kayar |
| Oyna, Lobi, VS, Oda, Market, Başarımlar, Kimlik | 4 | **4** | Kontrast düzeltmeleri |
| Aranıyor | 4,5 | **4,5** | — |

### 4.4 Kalan farklar
- Atölye orta önizlemesi patlatılmış blueprint değil (paralel oturumun `TopacOnizleme` bileşeni).
- Parça, topaç ve kalkan ikonları yordamsal yer tutucu.
- Para yığını ve ruh silueti hâlâ SVG.
- VS rozet bandı veri gelene kadar yok.
- Sonuç maç çerçevesinde kesirli ölçek kullanıyor (karar 5 gereği dokunulmadı).
