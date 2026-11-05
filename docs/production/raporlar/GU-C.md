# GU-C raporu: maç ekranı referans 07/08'e yaklaştırma (topaç sprite'ı, çanak, gölge, kalabalık, sarmal iz, lobi ikonu)

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** görsel uyum (teknik sanat + istemci)
**Girdi:** GU-B "Kalan farklar" 1–5, sahibin onaylı referansları `docs/design/beyblade/gorunum/07-arena-mac.jpg`, `08-arena-ulti.jpg`.
`src/paylasilan/**` **değişmedi**; altın hash'ler aynı (`npm run test:tarayici`: Node = Chromium bit bit aynı). Kick OAuth'a,
`veri/*.json` denge/bot dosyalarına, `src/paylasilan/bot`, `test/denge`'ye dokunulmadı (tek istisna aşağıda: üretilen sprite metası).

## 1. Ne değişti

| # | Kalem | Commit | Ne |
|---|---|---|---|
| 1 | Topaç sprite kalitesi | `1cf39a8` | **Yeni render motoru:** `araclar/sanat/topac-render-chromium.ts`, başsız Chromium (SwiftShader WebGL2, `--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`) ile Atölye 3B'nin parametrik ağını (`src/istemci/atolye3d/geometri.ts` ← `kaynak/topac/parcalar-3b.json`) veri geçişli çizer (normal + sınıf/derinlik, ×4 süper örnek, kenar yumuşatma yok). Çıktı sözleşmesi Blender betiğiyle aynı; `npm run topac:uret` artık varsayılan olarak bunu kullanır (`--motor blender` eski yol). Menüdeki 3B parça ile maç sprite'ı aynı ağdan çıkar. Tam set (27 parça + ikonlar) **57 sn** (Blender: 6,4 dk). **Pişirme (elle çizilmiş görünüm):** kamera 26° → **36°** (üst yüz, eş merkezli sırtlar ve amblem okunur; yan bant hâlâ görünür), ton kaydırmalı rampalar (gölge mora, ışık sıcak sarıya; orta ton belgedeki hex), daha az dither ve temiz düz ton alanları, üst yüzde normal kırığına **oluk çizgisi**, Disk koyu metal ve en açık ton 3 (Gövde altında gölge bandı, "gri birikinti" değil), Çekirdek maç sprite'ında ×1,7 ve üstünde **elle çizilmiş 15×9 Element amblemi** (alev / hortum / yıldırım / sarmal / kaya / kristal; ekran pikselinde basılır, dönmez, bulanık karelerde de keskin; özgün çizim, CC0). 27 parçanın **hepsi** atlasta (48 Gövde sayfası + 5 Disk + 6 Uç + 8 Çekirdek + `ikon-48/24`). `TopacYandan`: sprite kipinde çarpışma flaşı yalnız parlak kenar (beyaz dolgu Element rengini silip topacı hayalet gösteriyordu). |
| 2 | Çanak, gölge, kalabalık, sarmal iz | `22ded5a` | **Çanak:** `KAMERA.zOrani` 0,62 → **0,56** (referans 07'nin ışıyan halkası 1170 × 625 px → basıklık ≈ 0,53), `yakinlik` 1,44 → **1,6**, `kaymaY` 5: oynanabilir elips (R = 240) yine süre plakası (y ≥ 62) ile Shift/Space (y ≤ 494) arasında, genişlik 691 → **768** mantıksal px (ekranın %80'i; test sınar). `topacCizimOlcek` 1,2 → 1,08: ekrandaki topaç boyu ve "sprite pikseli = sanat pikseli" kuralı aynı (1,08·1,6 = 1,2·1,44). **Düşen gölge:** sol-alta bir çap kadar uzanan dolu koyu leke + yalnız kenarda dither saçağı. **Kalabalık:** 1500 küçük figür → 300 iri baş-omuz silueti (gölgeli sağ yarı, %16 kalkık kol), daha az sıra. **Krem sarmal iz:** Hibrit'te `Iz` artık topacın temas çemberinde dönüş yönünde dolanan noktanın izi (topaç ilerledikçe kıvrılan sikloit), krem hale + parlak çekirdek iki şerit; çarpışma kıvrımı efekt katmanından **zemine** (iz katmanı) taşındı, topacın üstünden geçmiyor. Düz görünüm eski izle aynı. |
| 3 | Lobi takım kartı 3B ikonu | `93995d0` | Kare 3B ikon (48×48) yordamsal tuvalin (48×39) yerine geçince kart 9 sanat pikseli uzuyor, kaide aşağı kayıyor, topaç kaidenin üstünde havada duruyordu. Yükseltilen ikon artık en alt opak satırını (uç ucu) yordamsal ucun satırına hizalar, yerleşim yüksekliği yordamsal tuvalinki kalır (`ikonOnbellek.ts tabanaHizala`, `pikselTopac.ts data-ikon3b-taban`). **Ölçüm** (CSS px, DPR 2): önce 3B uç 308 / kaide 316 (uç 8 px havada, kaide 18 px aşağıda), yordamsal uç 302 / kaide 298; **sonra** üçü de uç 302 / kaide 298 (fark +4, eşit). |
| — | Doğrulama aracı | bu commit | `araclar/gu-c-ekran.cjs` (maç normal / çarpışma / sarmal / Ulti, Topaç Lab, lobi hizası ölçümü, referans yanında kıyas). |

## 2. Ekran görüntüleri (`docs/production/raporlar/ekran/`, 1280×720 CSS × DPR 2 = 2560×1440)

`-once` = bu turdan önce (devran-kod `9a6ad44`), `-sonra` = bu tur sonu.
- Maç: `GU-C-01-normal-{once,sonra}`, `GU-C-02-carpisma-{once,sonra}`, `GU-C-03-sarmal-iz-{once,sonra}`, `GU-C-04-ulti-{once,sonra}`
- Topaç Lab: `GU-C-05-topac-lab-sonra` (üç hız kademesi yeni sprite'larla)
- Lobi: `GU-C-06-lobi-takim-{once,sonra}`
- **Kıyas (sol referans | sağ uygulama, aynı 1280×720 çerçeve):** `GU-C-kiyas-07-{once,sonra}.png`, `GU-C-kiyas-08-{once,sonra}.png`
- Sprite levhaları: `docs/art/topac-sprite-onizleme.png` (Kor seti: keskin / bulanık / disk + sol ayna + 6 Element, referans kırpıntısı yanında), `docs/art/topac-parca-seti.png` (27 parça)
- Özet: `GU-C-ozet-{once,sonra}.json`, ilk yükleme: `GU-C-yukleme.json`

Çekim notları: `-sonra` maç karelerinde Kor ↔ Girdap (referanstaki turuncu ↔ mavi) için tarayıcı bağlamında Takım 3'ün ilk topacı
Girdap yapıldı (localStorage, oyun kuralı içinde); `?ekran=mac` geliştirici sayfasının üst gezinti çubuğu kıyasta gizlendi (lobi → maç
akışında bu çubuk yok). Çarpışma karesi GU-B yöntemiyle **zorlandı** (yalnız `?debug`, istemcideki çevrimdışı sim kopyası: iki topaç
ortada karşı karşıya, olaydan 1 kare sonra dur). Çubuk gizlenince alt kenarda ~40 CSS px boş şerit kalıyor (sahne yeniden boyutlanmadan
çekildi; oyunun değil çekimin yapıntısı). Konsol hatası 0 (`hatalar: []`).

## 3. Uyum puanı (0–5)

| Ekran | GU-B sonu | Şimdi | Gerekçe |
|---|---|---|---|
| 07 maç | 4 | **4,4** | Topaçlar artık referans dilinde: koyu kontur, sınırlı ton kaydırmalı palet, açık üst yüzde eş merkezli sırtlar, okunur Element amblemi (alev / sarmal), koyu yan bant; çanak ekranın %80'i; dolu uzun düşen gölge; iri seyrek kalabalık; krem sarmal iz. |
| 08 Ulti | 4 | **4,2** | Aynı topaç kazancı (Kor alevli aura altında amblemli Kor, mavi Girdap sarmal amblemli), çift kırmızı halka, Ata hologramı. |

**Kalan farklar (kaçak):**
1. Çanak hâlâ referanstan küçük: halka genişliği referansta ekranın ~%82'si, bizde ~%65'i. Daha büyüğü oynanabilir elipsi HUD şeritlerinin
   altına sokar (×1,6'yı aşmak sahip kararı; HUD'da çakışmada %30 saydamlaşma zaten var).
2. Referansın topaçları ~45° eğik ve birbirine yaslanmış çizilmiş; bizde sabit 36° sprite (çarpışmada yalnız squash).
3. Yüksek hız kademesinde (bulanık disk) Gövde üst yüzü biraz soluk; amblem keskin kalıyor.
4. Krem sarmal bizde çevrimsel bir ilmek dizisi; referansta tek, kalın, kuyruğa doğru incelen bir kıvrım.
5. Kritik çarpışma karesinde squash + yıldız topaçları kısmen örtüyor (referansta yıldız iki topacın arasında dar).
6. Avatar (Ata) referansın kuşu değil (kasıtlı, IP).

## 4. Bütçe ve boyut

- Maç ilk yükleme (aynı ölçü, `araclar/yukleme-olc.cjs`, dev sunucu): **varlık 539 KB** (TEMIZLIK sonrası 533 KB; fark topaç sayfaları
  26,7 → 33,2 KB). Topaç sayfaları önceden olduğu gibi tembel, yalnız sahadaki iki topacın 4'er katmanı iner.
- `public/topac/` üretim boyutu toplam **688 KB** (önce 592 KB); Gövde sayfası Element başına 4–17 KB. Yeni üçüncü taraf varlık yok
  (krediler/manifest değişmedi; amblemler ve sprite'lar bu depoda üretildi, CC0).

## 5. Kapılar

Her kalem sonunda: `npm test` 24 dosya / 466 test yeşil · `npm run lint` temiz · `npm run typecheck` temiz · `npm run build` yeşil ·
`npm run test:tarayici` Node = Chromium bit bit aynı (altın hash'ler değişmedi). Çalışma zamanı: `KIMLIK_MODU=sifre npx vite --port 5291`
+ Playwright (SwiftShader) ile maç, Ulti, Topaç Lab ve lobi (gerçek hesap: kayıt → profil → ilk Çekirdek → lobi) çekildi; konsol hatası 0.

## 6. Varsayımlar

- **Varsaydım:** `veri/topac-gorsel.json` sprite atlas metası (üretici `topac-uret.ts` yazar) "veri/denge" kapsamında değil; yalnız kamera
  açısı ve bayt alanları değişti. Paralel ajanın denge/bot JSON'larına dokunulmadı.
- **Varsaydım:** `zOrani` 0,62 tasarım dilinde "≈ 0,62" diye geçiyor; referans ölçümü 0,53 verdiği için 0,56 seçildi (sunum sabiti,
  fizik düz; fare ters dönüşümü testli). Tasarım dili § İ-5 metni güncellenmedi (belge sahibi/tasarım ajanı).
- **Varsaydım:** "HUD şeritleri kesilmeden" = oynanabilir elips HUD plakalarının altına girmesin; duvar ve tribün girebilir (GU-B kuralı).
- **Varsaydım:** Çekirdek'in maç sprite'ında ×1,7 iri çizilmesi (referansın orta rozeti çapın ≈ %45'i) Atölye 3B ölçüsünü değiştirmez;
  ikonlar gerçek ölçüde kalır.
- Sahibin Mac hattı kancası korunur: `TopacAtlas` biçim B (`public/topac/<tur>/<id>.json` + şeritler, `bicimB` listesi) ve Atölye GLB
  kancası (`public/topac/model/<id>.glb` + `veri/topac-model.json`) değişmedi; Mac çıktısı gelirse bulut atlasının önüne geçer.

## 7. Sahibe kalan kararlar

1. Çanak ×1,6'dan büyük olsun mu (referansa daha yakın, oynanabilir kenar HUD altına girer, HUD o anda saydamlaşır)?
2. Element amblemleri (alev, hortum, yıldırım, sarmal, kaya, kristal) bu biçimde onaylı mı, yoksa Mac hattında elle mi çizilsin?
3. Krem sarmal iz tüm hızlarda mı, yalnız çarpışma/dash sonrası mı görünsün?

## 8. Paralel oturumlardan beklenen / alınan

Bu turda `origin/devran-kod`'a başka ajanın bot commit'i (`7c5cb49`) geldi; rebase çakışmasız. Mac hattı (Gemini + Tripo + Blender)
topaç çıktısı henüz yok; gelirse biçim B ile bağlanır.
