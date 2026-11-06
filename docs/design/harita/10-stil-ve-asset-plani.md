# 10 · Stil ve asset planı (EN SONA; yalnız PLAN)

**Şapka:** `@iris` (sanat yönü) · **Durum:** plan. Bu oturumda **hiçbir asset üretilmedi**; maketler (`maketler/`) yalnız yerleşimdir. Üretim, H6–H7 ekranları yer tutucularla çalıştıktan sonra Mac hattında (`araclar/sanat/README.md`) yapılır.
**Otorite:** `docs/art/tasarim-dili.md`, `docs/art/menu-tasarim-arastirma.md` § 5–6 (Kuşak Taşı), onaylı referanslar `docs/design/beyblade/gorunum/` (özellikle 03 Atölye, 04 Market, 05 Başarımlar).

## 1. Sanat yönü

| Ekran | "Yer" (menü 5.1/5: bir ekran, bir yer) | Malzeme | Referansa bağ |
|---|---|---|---|
| **Harita** | **Arazi masası:** taş çerçeveli lacivert bir masa üstünde, elle çizilmiş (pixel) bölge haritası; bölge başına bir zemin | Kabuk Kuşak Taşı (◄, bronz plaka, Altın yuvası); harita içi düz renk bölgeler, 1 px kontur, dither yok-az | 04 Market'in "dış mekân arka planı + üstte tabela" kuruluşu; 05'in kalkan rozet dili düğümlerde |
| **Maden** | **Ocak ağzı:** karanlık kaya yüzü, ortada damar, çevresinde Kuşak halkası | Kaya dokusu yalnız çevrede (metin taşa değmez), merkez damar kademe renginde | 07/08 arena çatlak taşı + ışıyan halka |
| **Ocak** | **Atölye'nin masası:** blueprint (03) | Lacivert ızgara, ince bronz çizgi, külçe ikonları | 03 Atölye'nin birebir dili |

**Kural:** rün, alev, meşale, "fantastik RPG" süsü **yok** (menü § 3.B zayıf yönler). Lore görselde: bölge zeminlerinde element motifi (Kaya: teraslı ocak yamacı; Don: buzlu geçit; Kor: krater ağızları; Kasırga: rüzgâr oyuklu sırt; Şimşek: yıldırım izli yayla; Girdap: akıntılı mağara).

## 2. Kademe renk dili

| K | Ana | Koyu | Vurgu (öneri) | Desen ipucu (renk körlüğü) |
|---|---|---|---|---|
| 1 Demir | `#8C8A88` | `#4A4846` | `#C8C6C2` | düz |
| 2 Kaya | `#B0743A` | `#45392A` | `#E6C08A` | çapraz çizgi |
| 3 Don | `#9FE3F5` | `#3B7D8F` | `#FFFFFF` | kar tanesi noktası |
| 4 Kor | `#E8452C` | `#7A1D12` | `#FFD2A8` | iç kıvılcım |
| 5 Kasırga | `#5BD1A5` | `#1F6B52` | `#E2FFF2` | kavis çizgisi |
| 6 Şimşek | `#F7D83A` | `#8A6A08` | `#FFFBE0` | zikzak |
| 7 Girdap | `#2A5BD7` | `#14286B` | `#CFDCFF` | spiral |
| 8 Devir Taşı | `#F4E9FF` | `#6B5A8A` | 6 element vurgusu sırayla (yanardöner, 6 kare döngü) | altıgen |

K3–K7 orta tonları `renkler.ts` `ELEMENT_RENK` ile aynı (tek kaynak); K2 kehribar köken ışığı (Maden: toprak-kehribar) ile akrabadır.

## 3. Asset listesi

### 3.1 2B ikonlar (11×11 ızgara, 4 tonlu rampa; 2× rozet; menü § 3.B ikon dili)

| # | Grup | Adet | Boyut / biçim | Yol (öneri) | Yöntem |
|---|---|---|---|---|---|
| A1 | Düğüm türü: DÜŞMAN, PATRON, MADEN, SANDIK (+ boş sandık) | 5 | 11×11 + 22×22 2×, PNG palet | `public/ikon/harita/dugum-<tur>.png` | el çizimi pixel (Gemini adım 1–2 + elle düzeltme) |
| A2 | Düğüm durum katmanları: kilit, ✓ çentik, seçili köşe çentiği, yıldız dolu/boş | 5 | 11×11 / 7×7 | `public/ikon/harita/durum-*.png` | kodla çizilebilir (Pixi Graphics) → sanat gerekmez |
| A3 | Cevher (8 kademe) | 8 | 16×16 + 32×32 | `public/ikon/maden/cevher-<id>.png` | tek gri kalıp + **palet takası** (`palet-takasi.ts`) → 1 çizim, 8 çıktı |
| A4 | Külçe (8 kademe) | 8 | 16×16 + 32×32 | `public/ikon/maden/kulce-<id>.png` | aynı: 1 kalıp + palet takası |
| A5 | Ustalık rozetleri (⛏ Madencilik, ⚒ İşleme, USTA çerçevesi) | 3 | 11×11 | `public/ikon/ustalik/*.png` | el çizimi |
| A6 | Arma (cevher motifi, 8 kademe) + `arma-kazma`, `arma-dip` | 10 | 24×24 (mevcut arma boyutu) | `public/ikon/arma/` | 2 kalıp (kazma, cevher) + palet takası |
| A7 | Çerçeve (8 kademe) + `cerceve-krater`, `cerceve-yildiz`, `cerceve-usta-*` | 12 | 9-dilim (9-slice) 24×24 kaynak | `public/ikon/cerceve/` | 3 kalıp + palet takası |
| A8 | Usta işi parıltısı | 1 | 8 kare 16×16 şerit | `public/efekt/usta-isi.png` | el çizimi |

### 3.2 Harita zeminleri

| # | Ne | Adet | Boyut | Yöntem |
|---|---|---|---|---|
| Z1 | Bölge zemini (ilk sürüm 3, sezon 2 +3) | 6 | 480×200 mantıksal (×1 kaynak, nearest büyütme) | Gemini konsept (adım 1) → elle pixel temizliği, ≤ 32 renk; düğüm konumları (`harita.json`) üstüne bindirilip boş alan kontrolü |
| Z2 | Yol çizgileri | — | kod | Pixi: bronz kesikli / halka rengi / sönük noktalı (sanat gerekmez) |
| Z3 | Kilitli bölge örtüsü | 1 | 480×200 dither örtü | kod |

### 3.3 Maden ekranı

| # | Ne | Adet | Boyut | Yöntem |
|---|---|---|---|---|
| M1 | Damar kayası (gri kalıp, kademe renkli damar çizgileri ayrı katman) | 1 + 8 katman | 96×96 | el çizimi + palet takası |
| M2 | Kırılma/kıvılcım parçacıkları | mevcut | — | mevcut efekt atlası (`public/efekt/`) kademe renginde tint |
| M3 | Ocak ağzı çerçevesi (kaya yüzü) | 1 | 480×270 kenar, orta boş | Gemini konsept + temizlik |
| M4 | Kuşak halkası + isabet yayı | — | kod | mevcut halka bileşeni (menü § 5.1/3 ışık kuralı) |

### 3.6 Oyuncu karakteri (13 § 2; sahip kararı: yeni avatar)

| # | Ne | Adet | Boyut / biçim | Yöntem |
|---|---|---|---|---|
| K1 | Karakter gövdesi (4 biçim) | 4 | 16×24 hücre, 27 kare/biçim (BEKLE 4, YÜRÜ 6 + ayna, KAZ 6, DÖVÜŞE GİR 5, KUTLA 6), sayfa 9×3 | Gemini konsept (her biçim 1 ön + 1 yan) → **Tripo + Blender** (karakter rig'i, `render_ata.py` deseni, 1 yön + ayna) → `sayfala.py` 16×24, ≤ 24 renk |
| K2 | Giysi paleti (6 profil rengi) | 6 palet | palet takası | gri kalıp + `palet-takasi.ts` → 4 × 6 = 24 sayfa, tek çizim |
| K3 | Göğüs arması yeri | — | 5×5 | kod (arma ikonunun küçültülmüşü) |
| K4 | Taşınan topaç | — | 10×10 | mevcut ikon önbelleği küçültülür |

Maliyet eki: ≈ 8 Gemini çağrısı (≈ $0,4) + 4 Tripo modeli (160 kredi) — tasarımdaki tek 3B asset. Yer tutucu kodda (Pixi figür) sanat gelene kadar.

### 3.4 Cila (Gövde/Disk metal paleti)

| # | Ne | Yöntem |
|---|---|---|
| C1 | 7 cila paleti (K2–K8) | Palet takası **yalnız metal rampasına** (Gövde/Disk sprite'larının metal indeksleri); köken ışığı ve element kıvılcımı indeksleri kilitli. Atölye 3B (three.js) için malzeme rengi parametresi (GLB yeniden üretilmez) |
| C2 | Doğrulama | Her cila × her Gövde gri ton ve CVD testi: element ve köken okunurluğu değişmemeli (tasarim-dili okunurluk ölçütleri) |

### 3.5 Lore (Dünya sayfası, isteğe bağlı)
8 lore kartı (cevher lore adı + tek cümle, `madenler.json` `aciklama`); görsel olarak A3 ikonunun büyütülmüşü (yeni asset yok).

## 4. Ses ve efekt ihtiyaçları

| # | Ses | Ne zaman | İlk sürüm | Nihai |
|---|---|---|---|---|
| S1 | Kazma vuruşu (taş tıkı) | KAZ | `ses-uret.ts` sentez (gürültü + kısa zarf) | CC0 kayıt (krediler) |
| S2 | İsabet çınlaması (bronz) | İsabet | sentez (sinüs + harmonik) | aynı |
| S3 | Iska (boğuk) | Başarısız vuruş | sentez | aynı |
| S4 | Nadir damar parıltısı | Nadir yuva görünür / kazılır | sentez arpej | aynı |
| S5 | Ustalık seviye atlaması | Seviye | mevcut "enerji-doldu" varyantı | aynı |
| S6 | Eritme cızırtısı | ERİT | sentez (filtreli gürültü) | CC0 |
| S7 | Çekiç (dövme) | DÖV | sentez darbe ×3 | CC0 |
| S8 | Usta işi (parlak çan) | Usta işi | sentez | aynı |
| S9 | Düğüm açılması (halka çentiği) | Yol ışıklanınca | mevcut menü çentik sesi | aynı |
| S10 | Yıldız (üç perdeli) | Sonuç yıldız satırı | sentez | aynı |
| S11 | Kazı ritmi (isteğe bağlı erişilebilirlik tıkı) | İsabet yayına giriş | sentez, çok kısık | aynı |

Hepsi `veri/manifest-ses.json` satırı + krediler (`npm run krediler:uret` kapısı).

## 5. Mac hattı üretim listesi (Gemini + Tripo + Blender)

**3B (Tripo) yalnız oyuncu karakteri için** (§ 3.6, 4 model ≈ 160 kredi). Diğer bütün yeni varlıklar 2B: hat adım 1 (Gemini) + adım 2 (`anahtarla.py`) + palet takası.

| Parti | İçerik | Gemini çağrısı (tahmin, yeniden üretimler dahil) |
|---|---|---|
| HP-1 | A1 (5) + A5 (3) + A8 (1) | ≈ 15 |
| HP-2 | Kalıplar: cevher, külçe, damar kayası, arma ×2, çerçeve ×3 (= 8 kalıp; palet takasıyla 50+ çıktı) | ≈ 16 |
| HP-3 | Z1 bölge zeminleri ×3 (ilk sürüm) + M3 ocak ağzı | ≈ 12 |
| HP-K | Karakter: 4 gövde konsepti + Tripo + Blender kareleri + palet takası (§ 3.6) | ≈ 8 + 160 Tripo kredisi |
| HP-4 (sezon 2) | Z1 ×3 | ≈ 9 |

## 6. Boyut / biçim sözleşmesi ve maliyet

| Konu | Sözleşme |
|---|---|
| Biçim | PNG, palet (≤ 32 renk ikon, ≤ 48 zemin), alfa 1 bit, `sharp` palet çıktısı (mevcut hat) |
| Ölçek | Mantıksal px; tam sayı büyütme (`nearest`); 1 px kontur `#05050A` |
| Adlandırma | ASCII, kebab: `cevher-kaya.png`, `dugum-maden.png` |
| Manifest | `veri/manifest-gorsel.json` satırı (kaynak, araç, yapay zekâ notu) + krediler |
| Atlas | İkonlar tek atlas `public/ikon/harita/atlas.png` + json (mevcut atlas yükleyici deseni) |
| Toplam boyut | ≤ 120 KB (ikonlar + 3 zemin), tembel yükleme (Harita ekranına girince) |

**Tahmini maliyet (ilk sürüm):** ≈ 43 Gemini çağrısı × ≈ $0,045 = **≈ $2**; Tripo **0 kredi**; Blender 0. Sezon 2: ≈ $0,4. (Kıyas: topaç parçaları Parti 1–3 ≈ $3,11 + 760 Tripo kredisi, `docs/art/topac-uretim-kaydi.md`.)

## 7. Sıra
1. H6–H7 yer tutucularla biter (metin rozetleri, kademe rengi düz kareler, Pixi çizimi halka/yol).
2. HP-1 + HP-2 (ikonlar, kalıplar) → palet takası → atlas.
3. HP-3 zeminler → düğüm konumlarıyla bindirme kontrolü (gerekirse `harita.json` konumları birkaç px kayar; topoloji değişmez).
4. Ses S1–S11 sentez yer tutucuları H8'de; nihai CC0 seçimi sanat turunda.
5. Görsel uyum puanlaması (tasarim-dili § 8.3 deseni) → rapor.
