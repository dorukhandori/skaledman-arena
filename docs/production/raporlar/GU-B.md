# GU-B raporu: maç ekranının görsel dönüşümü (Hibrit kamera, topaç, efekt, HUD, Ulti)

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** grafik / oyun geliştirici + sanat yönetmeni
**Sahibin talimatı:** "Bir an önce oyunumuzun referans görsellerdeki gibi görünmesini istiyorum." Kamera kararı **K-1 Hibrit**:
fizik, sim, netcode, bot, tahmin ve hash düz kalır; yalnız sunum eğik.
**Kapsam:** `src/istemci/oyun/**` (maç sahnesi), `src/istemci/ekranlar/Mac.ts`, `Seyirci.ts`, `TopacLab.ts` (yalnız sahne bağlantısı),
`src/istemci/ses/Ses.ts`, `public/efekt/`, `public/ses/kayit/`, `veri/manifest-ses.json`. `src/paylasilan/**` **değişmedi**;
altın hash'ler aynı (`npm run test:tarayici`: 14/14 AYNI). Menü ekranlarına dokunulmadı (Ayarlar seçeneği `AYAR_SECENEKLERI`
üzerinden menüde kendiliğinden görünür).

## 1. Ne değişti (dilim dilim)

| Dilim | Commit | Ne |
|---|---|---|
| GU-00 Hibrit kamera | `da6d07a`, `137f65d` | Tek dönüşüm `Sahne` + `kamera.ts`: dünyaY = merkez + kayma + z·**0,62**, sabit kamera yakınlığı **×1,4** (çanak ekranı doldursun), fare nişanı ters dönüşümle (`ekrandanSime`, birim testli). Zemin düzlemi kapsayıcıları (`zeminDuzlem`, `ustDuzlem`): içlerinde düz sim koordinatıyla çizilen telegraf, alan dekali, nişan, bağ çizgisi otomatik elips olur. Sarsıntı, squash normali, kıvılcım/toz/duvar parçacık yönleri izdüşmüş normali kullanır. H11 kenar uyarısı dudakta elips yay, "!" dik. Pixel görünüm: dünya `cacheAsTexture({resolution 0,5, nearest})` ile **480×270** dokuya çizilip büyütülür (sabit `boundsArea`, ızgara kaymaz). Yeni `HibritArena`: yordamsal pixel dokular (tribün + kalabalık siluetleri, hafif parallax; uzak duvar iç yüzü taş blok dikişli; dudak; çatlaklı taş levha zemin, Bayer dither, çakıl, merkez çukur, kenar eğim gölgesi; ayrı yakın dudak dokusu topacın ÜSTÜNDE), ışıyan kuşak halkası `#FBBE88` (ADD, ≤ 1 Hz nabız, şeritte parlar), dönen hız şeridi, ani ölüm kararması + kalınlaşan kırmızı sınır. Ring Out'ta uzak yarıdan düşen topaç duvarın arkasına geçer. Nesneler ekranY'ye göre sıralı. **Ayarlar › "Düz görünüm (sonraki maç)"**: eski `KusakArenasi` + `TopacGorsel` çizimi aynen (URL `?gorunum=duz|hibrit` geliştirici ezmesi). |
| GU-topaç | `da6d07a`, `33a0820` | `TopacYandan`: üç çeyrek katmanlı yer tutucu (elips gölge, takım çemberi zeminde elips: oyuncu düz + ▼, rakip kesikli + ◆; Uç konisi, Disk silindiri + dönen kilit çentikleri, Gövde yan bandı ışıklı/koyu dilimler + dönen sırt çizgileri, üst yüzde dönen kanat siluet, Çekirdek kubbe + Lv. yayı, dönmeyen parlama), 3 hız kademesi (bulanık disk / iki hayaletli bulanık kanat / keskin kanat + yalpa eğilmesi), Sekme'de yükselme + gölge ayrılması, Durma'da yana yatma, Parçalanma'da katmanlar havada sekerek dağılır, Çekirdek yerde parlar, H12 çatlak üst yüzde. Element paleti `renkler.ts` (pixel planı § 2.3). Hepsi Pixi Graphics, dışarıdan sanat yok. |
| GU-efekt | `382ed61` | Pişmiş atlaslar `public/efekt/` (pixelfx MIT + Aim CC0; `EfektAtlas.ts`: Spritesheet, `nearest`, önbellek, yüklenemezse yordamsal yedek). Atlas pikseli = sanat pikseli. Hava efektleri sheet'ten: kıvılcım (ağır), kritik yıldız patlaması, toz bulutu (Ring Out, Parçalanma, Durma), enerji doldu, Kor bulutu / Don kırılma / Şimşek çarpma, element Ulti (kasırga hortumu, girdap çöküşü, kaya sivrisi …). Zemin efektleri kodla elips (şok çemberi, Ulti halkaları); tam sayı olmayan dikey ölçek yok. Yordamsal: ışınsal yıldız patlaması ve iki topacın renginde hız çizgileri (referans 07), kıvılcımlar gövde yüksekliğinde. Ses: 18 CC0 kayıt (`public/ses/kayit/`) sentez tabanın üstüne katman (`KAYIT_KATMANI`; hafif/ağır/kritik metal, duvar, cam Parçalanma, bozuk para Durma, zil Enerji, UI tık); dosya yüklenmezse yalnız sentez. `manifest-ses.json` `kayitAdaylari` → "entegre". |
| GU-02 HUD | `d6445a8` | `MacHud` DOM yapısı, H1–H15 konumları, ARIA, %100/125/150 metin ölçeği, yüksek kontrast korundu; menü dili jetonları/yazıları (`jetonlar.css`, `public/yazi/` m5x7 + Jersey 10) kullanıldı. STAMINA / ENERJİ büyük harf pixel etiket; stamina çubuğu dış uçtan kırmızı (%0–25) → sarı bölgeli (referans 07; ayraçlar, tarama, "!" ve nabız korundu); Enerji yeşil `#86E065` → Ulti hazırken sarı-turuncu `#FEE55F` + turuncu "ULTİ"; bronz trapez skor plakası, turuncu Jersey rakam; süre plakası; lacivert pahlı paneller, bej çerçeve; aktif takım yuvası turuncu çerçeve. **H16 ses düğmesi** (her zaman görünür, M ile aynı, üzerine gelince Müzik/Efekt kaydırıcıları, `localStorage`), arena müziği döngüsü (%40 varsayılan). |
| GU-05 Ulti / telegraf | `26ef02a` | Telegraf kırmızısı `#C82625`; Ulti atanın altında eş merkezli **iki kırmızı zemin halkası** + topaç üstünde element aurası (08'deki alev); rakip alanları zeminde taramalı elips + dik element simgesi + bağ çizgisi; dash koni izi; sol/sağ kenar `#E6680C` parlaması (yalnız "Flaş: Normal", ≤ %25, 0,3 s tek yönlü); D8 özgün ruh siluetleri uzak duvar hizasında, yarı saydam (≤ %75), kamera yakınlığı telafili; Takım Ultisi üç ruh. Kanatlı kuş YOK. |
| Doğrulama | `01895c1` + bu commit | `araclar/gu-ekran.ts` (ekran görüntüleri + kare işi ölçümü), `test/kamera.test.ts`, bu rapor. |

## 2. Ekran görüntüleri (`docs/production/raporlar/ekran/`, 1920×1080: 1280×720 CSS × DPR 1,5 = 960×540 mantıksal × 2)

`GU-B-01-normal` · `02-carpisma` · `03-hiz-seridi` · `04-dusuk-stamina-yalpa` · `05-ring-out` · `06-parcalanma` · `07-ani-olum` ·
`08-telegraf-rakip-ulti` · `09-ulti-ani` · `10-takim-ultisi` · `11-duz-gorunum` · `12-topac-lab` · `13-durma` · yan yana:
`GU-B-kiyas-07.png` (referans 07 | çarpışma anı), `GU-B-kiyas-08.png` (referans 08 | Ulti anı). Özet: `GU-B-ozet.json`.
Not: 960×540 görüntü alanı uygulamada "en az 1280×720" uyarısını açtığı için DPR 2 yerine aynı çıktı boyutunu veren 1,5 kullanıldı.
`10-takim-ultisi` aynı betiğin önceki koşusundan (son koşuda Takım Ultisi tuşu headless zamanlamasında kaçtı, `ozet.json`'da kayıtlı).
Ekrandaki üst gezinti çubuğu menü kabuğunun (başka ajan), maç sahnesinin değil.

## 3. Referans uyumu (0–5)

| Ekran | Önce (tasarım dili § 7.1) | Şimdi | Gerekçe |
|---|---|---|---|
| 07 maç | 2 | **4** | Eğik elips çanak, uzak duvar + tribün, çatlak taş, ışıyan halka, yandan topaçlar, yıldız patlaması + renkli hız çizgileri, STAMINA/ENERJİ, kırmızı→sarı çubuk, yeşil Enerji, bronz skor plakası, alt yuvalar düzeni referansla örtüşüyor. |
| 08 Ulti | 2 | **3,5–4** | Çift kırmızı zemin halkası, kenar parlaması, alev aurası, dash konisi, yarı saydam ruh arenanın üstünde, sarı-turuncu Enerji + ULTİ. |

**Kalan farklar (kaçak):** (1) çanak referansta ekranı tam doldurur ve topaçlar daha büyük; bizde yakınlık ×1,4 (HUD şeritleri 50–492 dışında kalsın diye; ×1,6 referansa daha yakın ama alt/üst kenar HUD altına girer) · (2) topaçlar yer tutucu Graphics: referanstaki elle çizilmiş pixel sprite kalitesinde değil (eş merkezli sırtlar ve amblem sade) · (3) referansın uzun koyu düşen gölgesi bizde yumuşak elips · (4) tribün kalabalığı yanlarda çizgisel bant gibi okunuyor, referansta seyrek ve iri · (5) mavi topacın krem sarmal izi bizde düz MeshRope (eğik ve kısa) · (6) avatar sanatı yer tutucu siluet. **Kasıtlı (kapatılmaz):** takım çemberi + ▼/◆, ad/Lv./%/Çatlak satırı, 4. yuva + Shift/Space, kanatsız özgün ruh, telegrafta çapraz tarama (tasarım dili § 7.11).

## 4. Performans (headless Chromium 153, SwiftShader yazılım GL; gerçek GPU değil)

Kare başına CPU işi (mantık + Pixi render; `__mac.olcumBaslat`, ~130 kare, oto maç): **Hibrit p50 2,1–3,2 ms, p95 4,5–9,6 ms** (en çok 19–31 ms, atlas ilk yükleme/GC karesi);
Düz görünüm p50 1,4–2,3, p95 3,7–5,9 ms. Bütçe p95 ≤ 16,7 ms içinde. Headless'ta rAF kare aralığı GPU geri okuması (yazılım GL) yüzünden
ölçülemez (saniyede birkaç kare); gerçek GPU'da ölçülmedi: sahibin makinesinde `?debug` ile `__mac.olcumBaslat()` önerilir.
Ek maliyet: 480×270 önbellek dokusu (tek ek çizim), statik arena dokuları bir kez kanvasta (~130 k piksel, açılışta), maçta en çok 3 efekt atlası (~1,7 MB PNG).

## 5. Test ve kapılar (her dilim sonunda)

`npm test` 403/403 (yeni `test/kamera.test.ts` 4 test) · `npm run lint` temiz · `npm run typecheck` temiz (yalnız başka ajanın yarım
`araclar/d8-akis.ts`'i dönem dönem hata verdi, `src/` temiz) · `npm run build` yeşil · `npm run test:tarayici` **14/14 AYNI** (altın hash'ler değişmedi).
Konsol hatası 0 (`GU-B-ozet.json` `hatalar: []`; yalnız menü kabuğunun font preload uyarıları).
**Çevrimiçi:** `araclar/d8-akis.ts` (AG_ADRES 5191) ile iki istemci oda açıp maç oynadı: Hibrit sahne çevrimiçi akışta çalıştı, ağ
rozetinde `hash 8/8 · sapma 0` (tahmin/uzlaşma bozulmadı). Betik sonraki adımda `window.__lobi` bulunamadığı için durdu (lobi
ekranının yeni sürümüyle ilgili; maç sahnesiyle değil) → seyirci maç görünümü bu koşuda çekilemedi; seyirci ekranı aynı `Sahne`
kipini kullanır, bekleme kartı hatasız açıldı. D8 dosyaları geri alındı (başka ajanın çıktıları).

## 6. Varsayımlar

- Kamera yakınlığı ×1,4 ve kayma 6 px bir sunum ölçeğidir (x ve z için aynı; z ek olarak 0,62): "x aynı" kuralının ruhu korunur, fare ters dönüşümü testli.
- Topacın kendi elips oranı 0,5 (zemin 0,62'den dik): uç ve disk gövdenin altından görünsün diye (referans 07 okuması).
- Yakın duvar alçak çizildi (uzak 15, yakın 4 sanat pikseli): alt kenardaki Ring Out bölgesi örtülmesin.
- Stamina rengi: tasarım dili C-16 eşik rengi yerine sahibin "kırmızı→sarı (07)" isteği uygulandı; okunurluk ayraç + tarama + "!" ile korunur.
- "Düz görünüm" sahne yeniden kurulması gerektiğinden **sonraki maçta** uygulanır.
- Ogg kayıtları Safari'de çalmazsa yalnız sentez duyulur (zararsız yedek).

## 7. Sahibe kalan kararlar

1. Kamera yakınlığı: ×1,4 (şimdi, HUD şeritleri boş) mı, ×1,6 (referansa daha yakın, çanak HUD altına taşar) mı?
2. Stamina çubuğu: referans 07 bölgeli kırmızı→sarı (şimdi) mi, belge C-16 eşik rengi mi?
3. Arena müziği maçta varsayılan açık (%40) kalsın mı?
4. `@pebble` okunurluk testi (720p H.264, dikey çarpışma, üst/alt kenar) yapılsın mı (GU-00 kabul ölçütü)?

## 8. Sanat kolu ihtiyacı

- **Topaç sprite'ları** (en büyük kalan fark): pixel planı § 3 (c) Blender → pixel boru hattı, render açısı **35–45°** (Hibrit), katman başına (Uç, Disk, Gövde, Çekirdek) periyot başına 8 kare, keskin + bulanık + sol ayna; `TopacAtlas.ts` yükleyicisi hazır, `TopacYandan` çizimi atlas gelince katman katman değiştirilir.
- Ruh avatarları (özgün, kanatsız; D8 siluetleri yer tutucu).
- Tribün kalabalık tileset'i (iri, seyrek, 2–3 poz) ve uzun düşen gölge.
- Uzun vadede zemin efektleri için k_y = 0,62'ye göre yeniden pişirilmiş elips varyantlar (frost-nova, fire-ring halkaları).

## 9. İkinci tur (sahip kararları, 2026-11-05)

| Karar / iş | Sonuç | Commit |
|---|---|---|
| Kamera yakınlığı ×1,6 dene | ×1,6'da oynanabilir elips (R = 240) üstte süre plakasının (y ≤ 66), altta Shift/Space'in (y ≥ 494) ~25 px altına giriyor; ×1,5'te ~10 px. **Karar: ×1,44** (kayma 6): elips y 64–493, en büyük uygun değer; `test/kamera.test.ts` sınırı sınar. Duvar ve tribün HUD altında kalabilir (referanstaki gibi) | `66fd5d2`'den önceki `feat(gu-b2)` |
| Topaçlar daha iri | Çizim ölçeği ×1,2 (`KAMERA.topacCizimOlcek`); sim yarıçapı 30 sabit, temas noktası (yıldız patlaması) gövde yüksekliğinde | aynı |
| Uzun düşen gölge | Sol-alta uzayan döndürülmüş elips, 2×2 dama pixel dither kenar + koyu çekirdek (referans 07) | aynı |
| Tribün | Sıra çizgileri kaldırıldı: seyirciler çanak çevresinde halka biçimli bantta sürekli rastgele açı/derinlikte, ekranY'ye göre arkadan öne; yakın (alt) taraf boş | aynı |
| Krem sarmal iz | Ağır/kritik/dash çarpışmasında geri tepilen topacın çevresinde dönüş yönünde 1,7π krem sarmal (baş önce koşar, kuyruk söner); yıldız patlaması korundu | aynı |
| Okunurluk 720p (`@pebble` yerine, Playwright 1280×720 DPR 1) | `GU-B-14-okunurluk-720p-dikey.png` (dikey çarpışma: iki gövde üst üste biner, temas yıldızı ve takım çemberleri ayrı okunur), `GU-B-15-okunurluk-720p-kenar.png`. **Bulunan sorun:** uzak kenardaki topacın gövdesi skor/süre plakasının ve üst panellerin altına giriyordu → **düzeltme:** topaç gövde kutusuyla kesişen HUD öğesi (paneller, skor, süre, Shift/Space) %30 saydamlaşır (`MacHud.ortusmeAyarla`); topaç asla örtülmez. İnsan testi (yayın sıkıştırması, renk körlüğü) sahibe kalır | aynı |
| Stamina çubuğu | Referans 07 kırmızı→sarı bölgeli kaldı; `tasarim-dili.md` C-16 "sahip kararıyla değişti (2026-11-05)" | `chore(gu-b2)` |
| Müzik | Varsayılan açık %40, H16 ses düğmesi her zaman görünür (değişiklik yok) | — |
| Araçlar | `yetenek-ekran.ts` ve `d5-akis.ts` fare konumunu `__mac.ekranNoktasi` ile alıyor (hibrit izdüşüm); `yetenek-ekran` hibrit sahnede baştan sona koştu (konsol hatası 0, kayıt ses katmanları çaldı; üretilen D3 görüntüleri geri alındı). `mac-ekran.ts` ve `lab-ekran.ts` fare-dünya eşlemesi kullanmıyor (değişiklik gerekmedi) | `chore(gu-b2)` |
| `d8-akis` `window.__lobi` | Kanca yeni `Lobi.ts` kurucusunda duruyor; menü ajanı kendi worktree'sinde d8'i baştan sona geçirdi. En olası neden: koşu sırasında paylaşılan ağaçta dosya değişimi → Vite tam yeniden yükleme. Menü ajanına bildirildi | — |

**Yeni ölçüm** (aynı yöntem): Hibrit p50 2,2–2,4 ms, p95 5,3–6,7 ms, en çok ~17 ms; Düz p95 3,1–4,2 ms. Konsol hatası 0. Kapılar yeşil (403 test, 14/14 altın hash AYNI).

**Uyum puanı (ikinci tur):** 07 **4/5** (çanak ekranı daha çok dolduruyor, iri topaç, düşen gölge, sarmal iz, halka kalabalık; kalan: elle çizilmiş topaç sprite'ı, çanak hâlâ referanstan küçük); 08 **4/5** (çift kırmızı halka, aura, koni, kenar parlaması, ruh arenanın üstünde; kalan: avatar sanatı). Kıyaslar: `GU-B-kiyas-07.png`, `GU-B-kiyas-08.png` (yenilendi).
