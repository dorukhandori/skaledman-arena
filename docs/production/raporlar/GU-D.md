# GU-D raporu: büyük çanak, 45° topaç, keskin hızlı kademe, dar kritik yıldız, tek kıvrımlı sarmal iz

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** görsel uyum (teknik sanat + istemci)
**Girdi:** GU-C "Kalan farklar" 1–5 ve "Sahibe kalan kararlar". Sahip kararları: **"çanak büyüsün"**, **"amblemler tamam"**, **"devam et"**.
Referanslar: `docs/design/beyblade/gorunum/07-arena-mac.jpg`, `08-arena-ulti.jpg`.
`src/paylasilan/**` **değişmedi**. Altın hash'ler aynı (`npm run test:tarayici`: Node ve Chromium bit bit aynı). Kick OAuth'a,
`veri/*.json` denge/bot dosyalarına ve `test/denge`'ye dokunulmadı (tek istisna aşağıda: üretilen sprite metası `veri/topac-gorsel.json`).
Element amblemleri değişmedi (onaylı).

## 1. Ne değişti

| # | Kalem | Commit | Ne |
|---|---|---|---|
| 1 | Çanak büyüdü | `7b07fff` | `KAMERA.zOrani` 0,56 → **0,52** (referans 07'nin halkası 1170 × 625 px, basıklık ≈ 0,52–0,53), `yakinlik` ×1,6 → **×1,83**, `kaymaY` 5 → 15. Işıyan halka (0,85 R) **ekranın %68'inden %78'ine** çıktı (referans ~%82). Oynanabilir elips (R = 240) ekranda y 69–526, x 41–919. Bu boyda elips alt ortadaki Shift/Space'in altına giriyordu. Bu yüzden **H7 Shift/Space alt ortadan yetenek yuvası 1-2'nin hemen üstüne (sol alt) taşındı**: alt orta, referans 07'deki gibi boş kaldı (`MacHud.H7`, Lab HUD'unda da sol alt). `test/kamera.test.ts` artık oynanabilir elipsi **bütün** maç HUD kutularına karşı sınıyor (paneller, skor, süre, ses, 4 yuva + adlar, Shift/Space, takım yuvaları). Ayrıca halkanın ≥ %77 olduğunu, duvarın ekranda kaldığını ve fare ters dönüşümünü de sınıyor. Seyirci HUD'unda skor 6–42, süre 44–66 (elipsin üst ucu 69). Lab'ın hız kademesi önizlemeleri artık yakın dudağın üstünde çiziliyor. **Topaç ölçeği:** `topacCizimOlcek` 1,08'de kaldı, yani topaç çanakla orantılı büyüyor (×1,14). Sprite seti yeni ölçekte yeniden üretildi (`npm run topac:uret`, birim 1,157 → 1,012: sprite pikseli = sanat pikseli). Kare 64×64 → **76×76**, çünkü eski kare yeni ölçekte 613 karede kırpılıyordu. Kırpılma denetimi için `araclar/sanat/kare-tasma.py` eklendi, şimdi 0 kare kırpılıyor. |
| 2 | Topaç eğimi | `4e639c5` | Sprite kamerası 36° → **45°**. 42° ve 45° render edilip referansla yan yana kıyaslandı (`ekran/GU-D-egim-kiyas.png`: referans · 36° · 42° · 45°). 45°'de üst yüz, eş merkezli sırtlar ve amblem en iyi okunuyor, yan bant ve Disk/Uç da hâlâ görünüyor. 42° ara değer, belirgin bir kazanç getirmiyor. `TOPAC_YUKSELTI` ortam değişkeniyle açı deneme için ezilebilir. Zemin elipsi (0,52 ≈ 31°) daha basık kalıyor. Bu, referanstaki stilize bakışla aynı. |
| 3a | Hızlı kademede soluk üst yüz | `b08f16a` | Bulanık disk kareleri renk **ortalaması** yerine pencerede **en sık görülen palet rengini** alıyor (eşitlikte koyusu). Böylece dönüşle değişmeyen sırtlar, oluk çizgileri ve ton basamakları aynen kalıyor, yalnız dönen loblar yuvarlanıyor. Orta kademe ortalamasına hafif kontrast (×1,15) eklendi. |
| 3b | Kritikte squash/yıldız örtmesi | `0925716` | Yıldız ışınları temas normali boyunca **%40'a basık**: yıldız iki topacın arasındaki dik yarıkta dar kalıyor. Pişmiş "kritik" sheet'i ×0,6 ölçekte oynuyor. Hibrit topaçta squash yarım genlikte (`SQUASH_GENLIK` 0,5; düz görünüm aynı). |
| 3c | Sarmal iz tek kalın kıvrım | `09c71b9` | Hibrit iz artık temas noktası geçmişinin sikloidi (ilmek dizisi) değil, **topaca bağlı tek bir sarmal kol**. Başı temas çemberinde dönüş yönünde dolanıyor. Kol geriye doğru ~0,9 tur kıvrılıyor, 2,1 kat açılıyor ve hareketin tersine uzuyor. Kol, sivri uca incelen **tek şerit çokgeni** olarak çiziliyor: krem hale + parlak çekirdek, üst üste binen saydam parçalar olmadığı için boncuklanma yok. İz katmanı hibritte düşen gölgenin **üstünde**, topacın altında: referanstaki gibi gölgeyi kesiyor ve kararmıyor. |
| 4 | Tasarım dili | `67eeff2` | `tasarim-dili.md` İ-5, § 9.1 dönüşüm metni (0,52 / ×1,83 / kaymaY 15 / ×1,08 / 45° / H7 yeri / geçmiş değerler), okunurluk riski (%38 → %48) ve H6-H7 tablosu güncellendi. |
| — | Rapor ve araç | bu commit | Bu rapor, `araclar/gu-d-ekran.cjs` (GU-C aracı + yeniden yazılmış sarmal karesi zorlaması), ekran görüntüleri. |

## 2. Ekran görüntüleri (`docs/production/raporlar/ekran/`, 1280×720 CSS × DPR 2)

`-once` = bu turdan önce (`430e723`), `-sonra` = bu tur sonu.
- Maç: `GU-D-01-normal-{once,sonra}`, `GU-D-02-carpisma-{once,sonra}` (kritik, zorlanmış), `GU-D-03-sarmal-iz-{once,sonra}`, `GU-D-04-ulti-{once,sonra}`
- Topaç Lab: `GU-D-05-topac-lab-{once,sonra}` (üç hız kademesi)
- **Kıyas (sol referans | sağ uygulama):** `GU-D-kiyas-07-{once,sonra}.png`, `GU-D-kiyas-08-{once,sonra}.png`
- **Eğim kıyası:** `GU-D-egim-kiyas.png` (referans 07 | 36° | 42° | 45°, aynı kritik çarpışma bölgesi)
- 720p / 1080p (DPR 1): `GU-D-mac-720p-sonra.png`, `GU-D-mac-1080p-sonra.png`
- Özet: `GU-D-ozet-{once,sonra}.json`, ilk yükleme: `GU-D-yukleme.json`

Çekim notları GU-C ile aynı: Kor ↔ Girdap için Takım 3'ün ilk topacı Girdap yapıldı (localStorage). Geliştirici üst çubuğu gizlendi,
bu yüzden alt kenarda ~40 CSS px boş şerit kaldı (çekim yapıntısı). Çarpışma ve sarmal kareleri yalnız `?debug` ile zorlandı. Konsol hatası 0.

## 3. Doğrulama

- **720p ve 1080p:** HUD aynı 960×540 mantıksal çerçevede ölçekleniyor. Görünen 18 HUD öğesinin hiçbiri birbirine binmiyor, hiçbiri ekran dışına taşmıyor (Playwright ölçümü, iki çözünürlük). Konsol hatası 0.
- **Fare nişanı:** `ekrandanSime` ters dönüşümü birim testli, yeni sabitlerle geçiyor.
- **Kapılar (her kalemden sonra):** `npm test` 24 dosya / 466 test yeşil · `npm run lint` temiz · `npm run typecheck` temiz · `npm run build` yeşil · `npm run test:tarayici` Node = Chromium bit bit aynı.
- **Çalışma zamanı:** `KIMLIK_MODU=sifre npx vite --port 5391` + Playwright (SwiftShader). Maç, kritik çarpışma, sarmal iz, Ulti ve Topaç Lab koşturuldu.
- **İlk yükleme varlığı:** **539,4 → 551,9 KB** (+12,5 KB; topaç sayfaları 33,2 → 45,6 KB). Sprite'lar ×1,14 büyüdüğü ve 45° üst yüzü daha çok gösterdiği için bu artış kaçınılmaz ("sprite pikseli = sanat pikseli"). Başka varlık büyümedi. `public/topac/` toplamı 566 → 755 KB, ama sayfaların hâlâ yalnız sahadaki ikisi iniyor.

## 4. Uyum puanı (0–5)

| Ekran | GU-C sonu | Şimdi | Gerekçe |
|---|---|---|---|
| 07 maç | 4,4 | **4,7** | Çanak ekranın %78'i, alt orta referans gibi boş; topaçlar 45°'de üst yüz + amblem + sırtlar okunuyor; kritik yıldız iki topacın arasında dar; tek kalın krem kıvrım topacın çevresinde, gölgenin üstünde. |
| 08 Ulti | 4,2 | **4,4** | Aynı çanak ve topaç kazancı; çift kırmızı halka ve Ata hologramı daha büyük sahnede; Ulti bandı Shift/Space ile çakışmıyor. |

**Kalan farklar:**
1. Halka %78, referans ~%82. Daha büyük çanak, oynanabilir elipsi süre plakasının (y 66) ya da sol alt yetenek yuvalarının altına sokar. Görev kuralı bunu yasaklıyor.
2. Referansın topaçları çarpışmada birbirine doğru yatık. Bizde sprite eğimi sabit; çarpışmada yalnız yarım squash var.
3. Düşen gölge iri Bayer damalı. Referansta dolu ve koyu (bu turun kapsamında değildi).
4. Seyirci (OBS) HUD'unda alt parça kartları (y 484–532, x 8–946) çanağın alt yayıyla kesişiyor (GU-C'de de alt yay y 493'te kartların üst kenarını, y 484'ü, geçiyordu). Maç HUD'unda böyle bir çakışma yok.
5. Metin ölçeği %125/%150'de süre plakası 70/74'e uzuyor, panel 92 px oluyor; elipsin üst ucuyla birkaç px kesişiyor (GU-C'de de vardı). Topaç oraya gelince `ortusmeAyarla` HUD'u %30 saydamlaştırıyor.
6. Avatar (Ata) referansın kuşu değil (kasıtlı, IP).

## 5. Varsayımlar

- **Varsaydım:** "oynanabilir alan HUD plakalarının altına girmesin" kuralına uymak için HUD yerleşiminde değişiklik yapılabilir. H7 Shift/Space'i sol alta (yuvaların üstüne) taşıdım. ux § 2'deki H7 "alt orta" konumu değişti; kontrol eşlemesi ve davranış aynı.
- **Varsaydım:** sahibin "çanak büyüsün" kararı GU-C'nin "oynanabilir kenar HUD altına girer" seçeneğini kabul ediyor olabilir. Ama görev kuralı açıkça girmemesini istediği için kurala uydum: en büyük uygun boyut ×1,83 / 0,52. HUD altına girmeye izin verilirse ×1,93 civarı %82'yi verir.
- **Varsaydım:** topaç ekranda çanakla orantılı büyümeli (`topacCizimOlcek` 1,08 sabit). Topaç/halka oranı referansta ≈ 0,13, bizde de öyle. Sprite seti yeni ölçekte yeniden üretildi.
- **Varsaydım:** `veri/topac-gorsel.json` (üretici yazar) "veri/denge" kapsamında değil. Yalnız kamera (yükselti, birim, kare, çapa) ve bayt alanları değişti.
- **Varsaydım:** seyirci HUD'unda süre yazısı 18 → 17 px küçüldü; yayın okunurluğu için yeterli.
- **Varsaydım:** sarmal iz (GU-C sahip sorusu 3) yanıtlanmadığı için tüm hızlarda kaldı. Görünürlüğü hızla artıyor, yavaşta görünmüyor.
- Mac hattı kancaları (biçim B atlası, Atölye GLB) değişmedi. Biçim B sayfaları kendi `kare`/`capa`/`birim` alanlarını taşıdığı için yeni 76×76 kareyle çakışmıyor.

## 6. Sahibe kalan kararlar

1. Halkayı referanstaki %82'ye çıkarmak için oynanabilir kenar sol alt yuvaların ve süre plakasının altına girebilir mi (×1,93)?
2. Shift/Space'in yeni yeri (yetenek yuvalarının üstü, sol alt) uygun mu, yoksa sağ alta takım yuvalarının üstüne mi gitsin (iki rozet takım yuvalarının üstünde dikey dizilirse aynı çanak boyu sığar)?
3. Seyirci HUD'unun alt parça kartları, büyük çanakla çakışmaması için köşelere sıkıştırılsın mı?
4. Düşen gölge Bayer damalı yerine referanstaki gibi dolu koyu leke olsun mu?
