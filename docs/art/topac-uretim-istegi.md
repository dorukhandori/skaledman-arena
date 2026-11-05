# Topaç parçaları üretim isteği (sahibin Mac oturumu için)

**Tarih:** 2026-11-05 · **Yazan:** bulut sanat oturumu (ART-1, `@iris` + `@byte`) · **Çalıştıran:** sahibin Mac oturumu (`araclar/sanat/README.md` hattı: Gemini + Tripo + Blender 5.2; dal `origin/devran-sanat`).
Bağlı: `docs/art/topac-pixel-plani.md` (§ 2 katmanlar, § 2.3 palet, § 3.3-3.4 kare/kademe, § 7.3-7.5 atlas), `docs/production/raporlar/ART-1.md` (bulut spike'ı), `veri/parcalar.json`, `kaynak/topac/parcalar-3b.json` (bulut parametrik modelleri), `veri/topac-gorsel.json` (spike meta), `src/istemci/oyun/TopacAtlas.ts` (yükleyici; iki biçimi de okur).

## 0. Karar özeti ve bulut spike'ının yeri

| Konu | Öneri |
|---|---|
| Atölye/Market/Başarımlar **ikonları** (48×48, 24×24) | **Mac hattı, adım 1-2** (Gemini 2B + anahtarlama + `sayfala` benzeri kuantize). Elle çizilmiş görünüm burada en büyük kazancı verir; dönme/simetri sorunu yok |
| Maçta dönen **katman sprite'ları** (Uç, Disk, Gövde, Çekirdek) | **Mac hattı adım 3-5, ama simetrileştirilmiş**: Tripo modeli Blender'da tek kanat dilimine kesilip `n` kez dairesel dizilir (§ 3.2). Simetrisiz Tripo mesh'i periyot başına 8 karede **dikiş atlaması** (pop) yapar. Alternatif: bulut parametrik modelleri (`kaynak/topac/parcalar-3b.json`) Mac'te Blender 5.2 + EEVEE ışığıyla render (aynı betik `npm run topac:uret`, `BLENDER=/opt/homebrew/bin/blender`) |
| Bulut spike'ı (`8618187` + tam set) | Yedek ve şablon: biçim, çapa, periyot, ölçü ve oyun içi bağlama bunun üzerinden yapıldı. Mac çıktısı geldiğinde dosya bazında üzerine yazar; gelmeyen parça buluttaki sprite'la, o da yoksa yordamsal çizimle görünür |

**Bulut spike değerlendirmesi (dürüst):** referans 07'deki turuncu topaca göre **3/5**. İyi: parçalı katman yığını (koyu çizgiyle ayrılan Gövde / gri Disk / koyu Uç ucu), 1 px renkli dış çizgi, sol-üst ışık (parlak üst-sol, koyu ön yan bant), eş merkezli sırtlar, 6 Element boyası ve sol ayna otomatik, simetri kusursuz (dikişsiz döngü). Eksik: referanstaki **el işi amblem** (Kor'da alev, Girdap'ta sarmal) ve yüzey detayı yok; rampa kırmızıya kayık (referans turuncu → sarı ton kaydırması kullanıyor); Çekirdek küçük okunuyor; düz geometri "plastik" görünüyor. Mac hattıyla beklenen: ikonlarda **4/5** (Gemini pixel art detayı + kuantize); dönen sprite'larda Tripo dokusu simetrileştirilirse **3,5-4/5**, simetrileştirilmezse kare dikişi yüzünden bulut spike'ının altında kalır.

## 1. Parça listesi (27)

Kimlikler ve sayılar `veri/parcalar.json`'dan. Şekiller özgündür: canon/marka parçası, logo, yazı **YOK**; kanatlı kuş, ejderha, anka biçimi **YOK** (pixel planı § 4.3, 01 § 5 madde 9). Şekil dili: tıknaz, okunur siluet, kanat sayısı silüette sayılabilir, üst yüzde eş merkezli sırt/oluk, merkezde Çekirdek yuvası (metal göbek halkası).

### 1.1 Gövde (8) — Element boyalı, `n` = kanat, kiral (sol ayna gerekir) aksi belirtilmedikçe

| id | ad | n | tip | katalog Element | özgün şekil tarifi |
|---|---|---|---|---|---|
| `ok-govde` | Ok Gövde | 3 | saldırgan | kor | Üç geniş, geriye süpürülmüş ok ucu kanat; kanat sırtında ince kabartma; iki eş merkezli oluk; metal göbek halkası |
| `kalkan-govde` | Kalkan Gövde | 6 | kale | kaya | Neredeyse daire, 6 sığ yuvarlak lob, kalın **metal dış kenar bandı** (kalkan kenarı), 6 kısa radyal kabartma; simetrik (aynasız) |
| `savrulan-govde` | Savrulan Gövde | 4 | denge | kasirga | Dört kıvrık kanca kanat, kıvrık sırtlar dönüş yönünün tersine akar; tek oluk halkası |
| `halka-govde` | Halka Gövde | 6 | dayanıklı | girdap | Düz yuvarlak halka; dış kenarda 6 küçük çentik; içte geniş çukur oluk, dışta yüksek kabarık halka; simetrik |
| `ayaz-govde` | Ayaz Gövde | 4 | dayanıklı | don | Yuvarlak ağırlık halkası, 4 alçak tümsek; üst yüz 8 düzlemli **kristal faset** (buz kesimi); simetrik |
| `dusurucu-govde` | Düşürücü Gövde | 2 | saldırgan | kor | İki büyük kama kanat (orak gibi, hayvan değil); kanat sırtında **altın** şerit |
| `sivri-govde` | Sivri Gövde | 3 | saldırgan | simsek | Üç uzun sivri diken, aralarda küçük yuvarlak dolgu; dikenlerin sırtı altın şerit |
| `izli-govde` | İz Gövde | 4 | denge | kasirga | Dört uzun eğik kanat + 8 küçük çentik; üstte 8 ince **beyaz** iz yüzgeci (dönüşte iz çizgisi okunur) |

### 1.2 Disk (5) — metal (Element boyası yok), `k` = kilit çıkıntısı = `katki.burstEsik`, simetrik

| id | ad | k | yükseklik | şekil |
|---|---|---|---|---|
| `hafif-disk` | Hafif Disk | 7 | 60 | İnce halka, 7 küçük düz çıkıntı, üstte bir kabarık halka |
| `agir-disk` | Ağır Disk | 9 | 55 | Kalın, 9 geniş çıkıntı, altı daralan |
| `denge-disk` | Denge Disk | 7 | 65 | Yuvarlak 7 lob (dalgalı kenar) |
| `alcak-disk` | Alçak Disk | 8 | 50 | Geniş ve alçak, 8 kısa çıkıntı |
| `parlak-disk` | Parlak Disk | 6 | 75 | Yüksek profil, 6 uzun çıkıntı, çıkıntı uçları **altın** |

Yükseklik, Gövde+Çekirdek katmanını çalışma zamanında yukarı kaydırır (Disk üst yüzü z = 16 + (yükseklik − 60) × 0,15 birim); Disk render'ında bu z'yi kullanın.

### 1.3 Uç (6) — koyu metal/lastik, eksenel (dönüşte yalnız nervür), simetrik

| id | ad | uç türü (`katki.desen`) | şekil |
|---|---|---|---|
| `duz-uc` | Düz Uç | cicek | Geniş düz taban, 6 nervürlü koni |
| `igne-uc` | İğne Uç | cakili | İnce sivri iğne |
| `dengeli-uc` | Dengeli Uç | dengeli | Yarı düz, kısa koni |
| `top-uc` | Top Uç | merkezci | Yarım küre top |
| `kusak-ucu` | Kuşak Ucu | kusak | Geniş **lastik halka** taban, 12 ince nervür |
| `karanlik-ucu` | Tutucu Uç | dengeli | Koyu, 4 pençe nervürlü (hayvan pençesi değil, kavrama dişi) |

### 1.4 Çekirdek (8) — kendi Element (taş) + Köken (çerçeve) rengi

| id | ad | Element | Köken | şekil |
|---|---|---|---|---|
| `kor-goktasi` | Kor Göktaşı | kor | goktasi | 6 yüzlü piramit taş, altın çerçeve |
| `simsek-goktasi` | Şimşek Göktaşı | simsek | goktasi | 4 yüzlü sivri taş |
| `kor-kalbi` | Kor Kalbi | kor | goktasi | Pürüzsüz yuvarlak kubbe taş (kor kalbi parıltısı) |
| `kaya-maden` | Kaya Maden | kaya | maden | 5 yüzlü yassı külçe, hafif dalgalı kehribar çerçeve |
| `girdap-maden` | Girdap Maden | girdap | maden | 5 yüzlü külçe (döndürülmüş fasetler) |
| `sabir-tasi` | Sabır Taşı | don | maden | Alçak pürüzsüz kubbe, 6 loblu çerçeve |
| `kasirga-yapay` | Kasırga Döküm | kasirga | yapay | **Dişli çark** çerçeve (8 diş), düz mercek kubbe; çelik mavi |
| `kul-cekirdegi` | Kül Çekirdeği | kor | karanlik | 5 dikenli mor-siyah çerçeve, koyu sivri taş (sol döner) |

## 2. Gemini tarif şablonları (adım 1)

Ortak gövde (ruh portresi `PORTRE` şablonunun topaç uyarlaması; `gemini_uret.py` içine `TOPAC` sözlüğü olarak):

```
High-quality 16-bit pixel art game sprite of a single mechanical spinning-top PART, crisp hard-edged pixels, no anti-aliasing,
limited palette, bold 1-pixel dark outline in a darker shade of the part's own color (not pure black), rich cel shading with
4 tones, light from the upper left (bright top-left rim, darker lower-right side). Three-quarter view from above (camera about
38 degrees above the horizon), the part centered and filling about 80 percent of the frame, its rotation axis vertical.
Original design, no logos, no text, no brand or toy-line styling, no animal, bird, dragon or wing shapes. Perfectly flat uniform
solid magenta (#FF00FF) background edge to edge, no gradient, no ground, no cast shadow, no border. Square image. Part: {tarif}
```

`{tarif}` örnekleri (Gövde'lerde renk olarak **orta gri** iste: palet takası § 4; ikon için katalog Element rengi):
- `ok-govde`: "the attack ring of a spinning top: a thick round disc body with three broad arrowhead blades swept back, a raised ridge along each blade, two concentric engraved grooves, a polished steel hub ring in the center with an empty socket, painted {renk} enamel."
- `hafif-disk`: "a thin polished steel weight disc for a spinning top with seven small square lock tabs around its rim and one raised ring on top, brushed metal."
- `duz-uc`: "the tip of a spinning top: a short dark gunmetal cone with six ribs ending in a wide flat rubber foot."
- `kor-goktasi`: "a small six-faceted glowing ember-red gemstone set in a gold bezel ring, the core of a spinning top."

Tripo için (adım 3) ikinci tarif: ruhlardaki `TRIPO` şablonunun aynısı, "creature" yerine "mechanical part", "plain flat light grey background", **"perfectly radially symmetric with N identical blades"** ekiyle (`N` = § 1 sayısı).

Ret ölçütleri (yeniden üret): kanat sayısı yanlış; kuş/ejderha/kanat okunuyor; yazı/logo; zemin degrade; ışık sağdan.

## 3. Tripo / Blender render kuralları (adım 3-4)

### 3.1 Kamera, ışık, çözünürlük

| Kural | Değer |
|---|---|
| Kamera | **Ortografik**, yükselti **38°** (sahnenin zOrani 0,62; bulut spike'ı 26° denedi, Uç görünürlüğü için 26-30° de kabul: sahibin seçimi; meta `kamera.yukselti`'ye yazılır) |
| Işık | Tek yönlü/nokta ışık **sol-üst-önden**, sahnede SABİT; nesne döner. Kenar ışığı kullanılırsa sol üstte. Gölge yok (oyun çizer) |
| Kare | **64×64** sanat pikseli (topaç ~56 px çap); ×4 render (256) → kutu indirgeme; alternatif 80×80 (o zaman meta `kare`=80 ve `birim` buna göre) |
| Ölçek | 1 sanat pikseli = **1,1574 topaç birimi** (Gövde dış yarıçapı ≈ 32 birim ≈ 27,6 px) |
| Çapa | Uç temas noktası (dünya orijini) karede **(32, 54)** pikseli; TÜM katmanlar aynı kare ve çapa |
| Katman yükseklikleri (birim) | Uç 0-12,4 · Disk ~10-16 (yüksekliğe göre) · Gövde taban **16**, üst ~30 · Çekirdek 29-37 |
| Katmanlar | **Her katman AYRI render**: Uç, Disk, Gövde, Çekirdek (diğerleri gizli). Oyun alttan üste bu sırayla üst üste koyar |

### 3.2 Dönüş ve kareler

- Periyot = 360°/n (Gövde n = kanat, Disk n = çıkıntı, Uç n = nervür, Çekirdek n = faset).
- **Simetri şartı:** Tripo mesh'i n-katlı simetrik değildir. Blender'da: modeli eksene hizala, 360/n'lik bir dilimi Boolean/bisect ile kes, **Array (Object offset, n adet, 360/n döndürme) + Weld**. Bunu yapmadan periyot döngüsü dikiş atlar.
- **Sağ dönüş** = üstten bakışta saat yönü. Kare i, nesneyi z ekseninde **−i × periyot/8** döndürür.
- **Keskin:** periyot başına **8 kare** (i = 0..7).
- **Bulanık:** periyot başına **8 kare**, her kare kendi açısından geriye doğru **min(0,34 × periyot, 40°)** pencerede ~10 alt kare ortalaması (hareket bulanıklığı), sonra palete geri kuantize, kenar saydamlığı dither'lı.
- **Bulanık disk:** **3 kare**, her biri 0,85 periyotluk ortalama (0, 1/3, 2/3 periyot ofsetli).
- **Sol dönüş:** kiral parçalar (§ 1.1'de "simetrik" yazmayanlar) için mesh'i **x'te aynala** (ışığı aynalama), kare i = **+i × periyot/8**. Simetrik parçalarda sol satır gerekmez (oyun keskin diziyi ters oynatır).

### 3.3 Palet ve çizgi

- Kuantize: `sayfala.py` gibi, ama **ortak 40 renk yerine sabit rampalar**: Element rampaları `src/istemci/oyun/renkler.ts` `ELEMENT_RENK` (koyu / orta / açık / vurgu) + çizgi = koyu × 0,55; metal `#1C2326 #4A555B #7C888E #B3BEC3 #EEF4F5`; koyu metal `#101316 #23282D #3A4248 #5C666D #96A1A7`; altın `#452C0A #8A5A14 #C8902A #F2C447 #FFF0B8`; Köken çerçeveleri `KOKEN_RENK`. Dither: Bayer 4×4, yalnız ton sınırlarında.
- 1 px dış çizgi (4 komşu), rengi katmanın rampasının en koyusu (saf siyah değil; ruhlardaki `(10,13,24)` yerine).

## 4. Altı Element boyası (palet takası)

Gövde **bir kez** gri tonda üretilir; boya çevrimdışı değiştirilir (shader yok):
1. Gövde boya bölgesi tam şu 5 griye kuantize edilir: çizgi `#202020`, koyu `#505050`, orta `#808080`, açık `#B0B0B0`, vurgu `#E0E0E0`. Metal/altın/beyaz bölgeler kendi (mavimsi/sıcak) rampalarında kalır, bu 5 griyi KULLANMAZ.
2. `npx tsx araclar/sanat/palet-takasi.ts <gri.png> <cikti-{boya}.png>` 6 dosya yazar (`kor kasirga simsek girdap kaya don`), her griyi `ELEMENT_RENK` rampasının karşılığına eşler (çizgi = koyu×0,55).
3. Çekirdek kendi Element + Köken'inde tek boya; Disk ve Uç boyasız.

## 5. Çıktı sözleşmesi

İki biçim de `TopacAtlas.ts` tarafından okunur; Mac oturumu **biçim B**'yi yazar (dosya başına şerit, daha kolay), bulut hattı biçim A'yı (parça sayfası) yazar. Aynı parça için B varsa A'nın önüne geçer.

**Biçim B (Mac):** `public/topac/<tur>/<parcaId>.json` + şeritler `public/topac/<tur>/<parcaId>-<kademe>-<yon>[-<boya>].png`
- `<kademe>`: `keskin` (8 kare) | `bulanik` (8) | `disk` (3); `<yon>`: `s` | `l`; `<boya>`: yalnız Gövde (`kor`…`don`).
- Şerit: kareler yatay yan yana, her kare `kare[0]×kare[1]`, saydam zemin, PNG (paletli tercih).

```json
{
  "surum": 2,
  "parcaId": "ok-govde",
  "tur": "govde",
  "kare": [64, 64],
  "capa": [32, 54],
  "birim": 1.1574,
  "yukselti": 38,
  "simetri": 3,
  "periyotKare": 8,
  "diskKare": 3,
  "yonler": ["s", "l"],
  "boyalar": ["kor", "kasirga", "simsek", "girdap", "kaya", "don"],
  "ustZ": 26.4,
  "disYaricap": 32,
  "kaynak": "gemini-3.1-flash-image + tripo v3.1 + blender 5.2",
  "tarih": "2026-11-0x"
}
```
Yükleyici biçim B json'unu yalnız `veri/topac-gorsel.json` `bicimB` dizisinde listelenen parçalar için ister (gereksiz 404 olmasın): Mac oturumu ürettiği her parça kimliğini oraya ekler (`npm run topac:uret` listeyi korur). Zorunlu: `surum`, `parcaId`, `tur`, `kare`, `capa`, `simetri`, `yonler`, `boyalar` (Gövde dışında `null`), `ustZ` (Disk'te Gövde kaydırmasını sürer). `periyotKare`/`diskKare` verilmezse 8/3.

**Biçim A (bulut, mevcut):** `veri/topac-gorsel.json` `parcalar.<id>` (sayfa yolu, satır sırası) + `public/topac/<tur>/<id>[-<boya>].png` (satırlar: yön başına keskin / bulanık / disk).

**İkonlar:** `public/topac/ikon-48.png` ve `ikon-24.png` (8 sütun ızgara) + meta `veri/topac-gorsel.json` `ikon.ikon48.yer.<id> = [x, y]`; Mac çıktısı aynı adla üzerine yazabilir ya da `public/topac/ikon/<parcaId>-48.png` / `-24.png` tek dosyalar bırakır (menü bağlaması iki yolu da dener).
**Manifest:** her dosya için `veri/manifest-gorsel.json` `dosyalar[]` satırı (`kaynak`: "kendi üretimimiz (Gemini + Tripo + Blender)", araç, tarih, lisans "proje varlığı") ve `docs/art/ruh-uretim-kaydi.md` benzeri `docs/art/topac-uretim-kaydi.md` maliyet satırı.
**3B model (Atölye, ATOLYE3D):** Tripo/Blender GLB'leri `public/topac/model/<parcaId>.glb` olarak da bırakılabilir (Y yukarı, kök dönme ekseninde ve Uç ucunda, 1 birim = topaç birimi; malzeme adları sınıf adı `boya`/`metal`/`koyu`/…) ve kimlik `veri/topac-model.json` `glb` listesine eklenir; yoksa Atölye parametrik modeli çizer (sözleşme: `docs/production/raporlar/ATOLYE3D.md` § 6).

## 6. Parti sırası ve kalite kapısı

1. **Parti 1 (kalite kapısı):** `ok-govde` + `hafif-disk` + `duz-uc` + `kor-goktasi`, Kor boyası, keskin/bulanık/disk + ikon. Kontakt levha `docs/art/topac-mac-onizleme.png`, bulut spike'ı (`docs/art/topac-sprite-onizleme.png`) ve referans 07 ile yan yana. **Sahip onayı.** Ölçüt: Mac çıktısı referansa bulut spike'ından açıkça yakın (≥ 4/5), döngüde dikiş yok, Uç ve Disk katmanı ayrı okunuyor.
2. Onay yoksa: ikonlar Mac'ten, dönen sprite'lar bulut hattından kalır (yalnız ikon partisi devam eder).
3. **Parti 2:** kalan 7 Gövde. **Parti 3:** 4 Disk + 5 Uç + 7 Çekirdek. Her parti sonrası commit + `devran-kod`'a push.
4. **İkon adımı (2B tek kare, adım 1-2 yeter):** her parça için Gemini § 2 tarifi (katalog Element renginde), anahtarla, 48×48 ve 24×24'e indir (24 ayrı kuantize, çizgi yeniden), § 3.3 paleti.

## 7. Maliyet tahmini (ruh üretim kaydı birim fiyatlarıyla)

| Kalem | Adet | Birim | Tutar |
|---|---|---|---|
| Gemini ikon görselleri | 27 + ~%35 yeniden üretim ≈ 36 | ≈ $0,045 | ≈ $1,6 |
| Gemini Tripo konseptleri | 27 + ~%35 ≈ 36 | ≈ $0,045 | ≈ $1,6 |
| Tripo image-to-model | 27 + ~5 yeniden ≈ 32 model | 40 kredi | ≈ **1 280 kredi** (bakiye 2 985 → ~1 700) |
| Blender, kuantize, palet takası | — | yerel | 0 |
| **Toplam** | | | **≈ $3,2 + ~1 280 Tripo kredisi** (yalnız ikon yolu: ≈ $1,6, kredi 0; Parti 1 kalite kapısı: ≈ $0,5 + 160-200 kredi) |

Uç ve Disk eksenel/basit parçalardır: Tripo yerine bulut parametrik modeli (`kaynak/topac/parcalar-3b.json`) Mac Blender'ında kullanılırsa 11 model ≈ 440 kredi düşer.
