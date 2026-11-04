# Devran tasarım dili (görsel + UX, tek otorite)

**Tarih:** 2026-11-04 · **Şapka:** `@iris` (sanat yönetimi) + UX belgeleme · **Dal:** `devran-kod` · **Durum:** taslak otorite. Sahip itiraz etmezse görsel ve sunum kararlarında bu belge kazanır.
**Sahibin isteği (2026-11-04):** "Efekt oturumunu ve tasarım dilini belgelendirelim. Projenin en başında onayladığım referans görsellere en yakın şekilde tasarım dili benimseyeceğiz ve onları tutturacağız."

**Sahip kararları (2026-11-04, bu belgeye işlendi):** **K-1 = Hibrit** kamera (sunum eğik, fizik/netcode düz; § 9.1) · K-2 bronz-turuncu ana düğme ve K-3 Enerji rengi **varsayılan** (sahip cevap vermedi, itiraz etmedi; § 9.1) · "Referanstaki gibi olsun her şey" (menüler dahil, kasıtlı farklar hariç) · **"Menüler olabildiğince sade ve anlaşılır olsun; gerekirse lore derinliğinden feragat"** → İ-12 ve [`docs/design/sadelik-ilkeleri.md`](../design/sadelik-ilkeleri.md). Maketler: § 10, [`docs/art/maketler/`](maketler/).

**Otorite sırası.** Oynanış ve sayılar `docs/design/` (`docs/design/beyblade/00..05`, `tuning.md`) kazanır. Oyuncuya sunum (konum, metin, akış) `docs/ux/kontrol-ve-hud.md` kazanır. **Görünüş** (palet, şekil, yazı, panel, efekt, kompozisyon) bu belge kazanır ve hedefi **dokuz onaylı referans ekrandır**. Referansla belge çeliştiğinde belge kazanır (`docs/design/beyblade/gorunum/README.md`); bu belge her böyle farkı § 7.11'de "kasıtlı" olarak listeler. Kalan her fark "kaçak"tır ve Görsel Uyum Geçişi'nde (§ 8) kapatılır.

**Referans görseller:** `docs/design/beyblade/gorunum/01-giris-profil.jpg … 09-sonuc.jpg` (commit `eb74c12`, 1376×768 JPG; Gemini `gemini-3.1-flash-image` ile üretilmiş **konsept**, nihai sanat değil; sahip tek tek onayladı: `02-sahip-kararlari.md` sonu). Kullanım ve hijyen notu: `docs/art/referans.md`. Bu belgedeki her referans tarifi görseller açılıp bakılarak yazıldı; renkler görsellerden piksel örneklenerek alındı (§ 2.0).
**Uygulamanın bugünkü görünüşü:** D1–D6 ekran görüntüleri `docs/production/raporlar/ekran/` (1280×720, DPR 2) açılıp bakılarak tarif edildi (§ 7.0).

Bağlı belgeler: `docs/art/topac-pixel-plani.md`, `docs/design/beyblade/05-carpisma-hissi.md` § 3, `docs/design/beyblade/04-sozluk.md`, `docs/ux/kontrol-ve-hud.md`, `docs/production/boslukler/tide-ux.md` § 2 (C-1…C-16), `docs/art/efekt-kaynaklari.md`, `docs/art/krediler.md`, `docs/art/efekt-oturumu.md`, `docs/art/referans.md`.

---

## 1. İlkeler

| # | İlke | Ne demek | Kaynak |
|---|---|---|---|
| İ-1 | **Okunurluk önce** | Bir vuruşta üç şey aynı anda okunur: vurgu, ağırlık, sonuç. Hiçbir süs oyun alanını kapatmaz (avatar alfa ≤ %75, topaçların arkasında) | kaynak: `topac-pixel-plani.md` § 5.1, § 4.1 |
| İ-2 | **Kick yayınında 720p'de okunur** | Bilgi taşıyan çizgi ≥ 2 px, metin ≥ 10 px mantıksal (1080p'de 20 px), seyirci kontrastı ≥ 4,5:1 | kaynak: `kontrol-ve-hud.md` § 2, § 5, § 6.3 |
| İ-3 | **Renk tek kanal değil** | Element = silüet, takım = düz/kesikli çember + ▲/◆, tehlike = tarama, stamina = ayraç + tarama + "!" | kaynak: `kontrol-ve-hud.md` § 6.1; `tide-ux.md` G-14, G-26 |
| İ-4 | **1 px = 1 mantıksal px** | Aynı piksel yoğunluğu; karma yoğunluk yasak; ölçek tam sayı + `nearest`; bulanık katmanlar linear | kaynak: `topac-pixel-plani.md` § 1.3; `efekt-kaynaklari.md` § 5.2 |
| İ-5 | **Fizik üstten, sunum eğik (Hibrit)** (sahip kararı K-1, 2026-11-04) | Sim, çarpışma, tahmin, hash, bot ve telegraf alan geometrisi düz daire koordinatında; çizim referans 07/08 gibi eğik: elips çanak (zOranı ≈ 0,62), yandan katmanlı topaç, görünür iç duvar ve tribün, elips gölge. Erişilebilirlik ayarı "Düz görünüm" eski tam üstten sunumu korur | kaynak: sahip (bu oturum); § 9.1 K-1; maket `maketler/m1-mac-hibrit.png` |
| İ-6 | **Efekt kodla, atlas küçük** | Hafif efektler kodla; dış sheet yalnız bitiş, element patlaması, Ulti; atlas ≤ 2048² | kaynak: `topac-pixel-plani.md` § 5; `efekt-kaynaklari.md` § 0, § 5.2 |
| İ-7 | **Sabit kamera** | Takip yok; kısa zoom darbeleri | kaynak: `topac-pixel-plani.md` § 1.2 |
| İ-8 | **Genel oyun terimleri, Türkçe** | Sözlüğün sağ sütunu; İngilizce metin yok | kaynak: `04-sozluk.md`; `tide-ux.md` C-3 |
| İ-9 | **Özgün IP** | Kanatlı/ejderli üst tasarım ve anka okuması yok | kaynak: `topac-pixel-plani.md` § 4.3; `nile-kapsam.md` B-36 |
| İ-10 | **Erişilebilir hareket** | Nabız ≤ 2 Hz; tam ekran flaş ≤ %25, ≤ 3/sn; sarsıntı/flaş/hitstop/zoom kapatılabilir | kaynak: `kontrol-ve-hud.md` § 6.2 |
| İ-11 | **Her şey pixel art** (referanstan) | Arayüz dahil: pixel yazı tipi, pixel çerçeve, pixel ikon, sahne arka planı. Referansta tek bir düzgün kenarlı (vektör) öğe yok | kaynak: görseller 01–09 |
| İ-12 | **Sadelik > lore** | Menüde ekran başına 1 ana eylem, 5–7 öğe kümesi, ana düğme sabit konumda, tek tıkla geri, kısa genel terim; yalnız lore taşıyan öğe ana ekranda durmaz (ipucu / ikinci kat / Dünya sayfası). Mekanik silinmez, yalnız arayüz | kaynak: sahip (2026-11-04); `docs/design/sadelik-ilkeleri.md` |

---

## 2. Palet

### 2.0 Referanstan örneklenen palet (görsellerden)
Yöntem: scratchpad'de Python/Pillow, her noktada 5×5 ya da 7×7 piksel medyanı (JPG sıkıştırması ve dither nedeniyle değerler **±10 civarı oynar**; gölgeli yüzeylerde ton ışığa göre değişir). Betik depoya konmadı. Fark sütunu CIE76 ΔE (yaklaşık; ≤ 10 "yakın", 10–25 "belirgin", > 25 "farklı").

| Öğe | Referans (görsel, örnek hex) | Bizdeki (belge / kod) | ΔE76 | Yorum |
|---|---|---|---|---|
| Sayfa / sahne arka planı | 01 `#11101E`, 07 tribün `#0B0A0F` | `#0B1418` (`index.html --bg`) | 8 | yakın; bizde yeşile, referansta mora/laciverte kayık |
| **Panel zemini** | 04 üst bant `#1B2131`, 06 `#161C32`, 08 `#14192D`, 05 `#1F2739`, 03 `#0C1326` | `#10222A` (`--panel`), kart `#0C191D` | 8 | **lacivert vs petrol yeşili**: ton yönü kaçak |
| Panel ikinci (düğme, hücre) | 06 `#292D39`, 01 `#262E3B` | `#173039` (`--panel-2`) | 8 | aynı yön farkı |
| **Panel çerçevesi** | bej-gri: 01 `#BFABA0`, 07 `#837C6C`, 09 `#9FA3B0` | `#24414B` (`--edge`), `#050D10` | 33 | **farklı**: referans açık bej/gri çerçeve, bizde koyu |
| Vurgu çerçeve (altın-bronz) | 01 `#B47E4C`, 06 `#CDB16F`, logo `#E3B66F` | altın `#F4CF47` (seçili öğe) | — | referansta bronz/turuncu çerçeve sık, bizde yalnız seçimde sarı |
| Turuncu vurgu | 07 skor rakamı `#E7783F`, 03 çubuk `#F57817`, 05 ilerleme `#EA7321` | yok (amber `#F2A33A` yalnız stamina) | — | **kaçak**: referansın imza rengi |
| Altın metin / başlık | 09 ZAFER `#FDD359`, ALTIN `#E2BF4E`, bar `#FBC33E` | `#F4CF47` | 6 | yakın |
| Geri / kapat düğmesi | kırmızı kare: 04 `#943A3C`, 06 `#994036`; X 03 `#7E2E3A`, 05 `#83313D` | düz koyu düğme | — | kaçak (geri) / kasıtlı (X yok, G-15) |
| Ana eylem | 01 GİRİŞ yeşil `#3AA152`; diğerleri koyu zemin + bronz çerçeve; seçili mod 06 kahve-turuncu | sarı dolgu `#F4CF47` | — | kaçak; tek tutarlı kural önerisi § 4.3 |
| Mürekkep | açık krem `#FBF2C3` | `#F3F1E8` | 20 | referans daha sıcak/sarı |
| **Stamina (07)** | kırmızı bölge `#F76A35` → sarı bölge `#FFF268` → boş `#23283B` (dış uçta kırmızı, içe doğru sarı) | eşik rengi: krem `#F2E8B0` / amber `#F2A33A` / kırmızı `#E3350D` | 18 / 39 | yapı farklı: referansta bir çubukta iki bölge; bizde tek renk eşikle değişir (kasıtlı, C-4/C-16) |
| **Stamina (08)** | bej `#A88D58`, boş `#191C38` | krem `#F2E8B0` | 33 | referans bejı belirgin koyu ve doygun; krem açık kalır |
| **Enerji (07)** | yeşil segment `#86E065` | açık mavi `#7FD3FF` (`MacHud.ts`) | 88 | **kaçak**: renk tamamen farklı |
| **Enerji (08)** | dolu dilim sarı-turuncu `#FEE55F`, parlak `#FEFBB3`, rakip bej `#D4BC7E`; "ULTİ" turuncu | açık mavi; ULTİ `#FFB347` | — | kaçak; 07 ve 08 kendi aralarında da farklı (§ 9 Ç-15) |
| Ping / bağlantı | 06 yeşil `#43944F` | `#F2A33A` rozet (yalnız kötü bağlantıda) | — | kasıtlı (H10 yalnız sorunlu bağlantıda) |
| **Çanak zemini** | 07 sıcak taş `#91847B` / gölge `#534747` / iç çukur `#867468`; 08 soğuk kayrak `#464D5D` | `#6E6A66` (pixel § 6.3, `KusakArenasi.ts`) | 12 / 18 | arada; 07 daha açık ve sıcak, 08 daha koyu ve mavi |
| **Hız şeridi / parlak halka** | 07 `#DCA97C`, çekirdeği `#FBBE88`; 08 `#FFFBCB` (beyaza yakın, turuncu haleli ışıyan halka) | krem `#F2E8B0` düz şerit + kesikli çizgiler | 26 | kaçak: referansta **ışıyan halka** (glow), bizde mat bant |
| Tribün | kalabalık silüetleri `#3A2C2F`, duvar `#1A1C28` | `#121F25` düz bant | — | kaçak: kalabalık yok |
| Ulti ekran kenarı parlaması | 08 `#E6680C` (sol ve sağ kenar) | turuncu `#FF8A3D` civarı | 14 | yakın; hex `#E6680C`'ye çekilir |
| Telegraf kırmızısı | 08 `#C82625` (eş merkezli çift halka) | `#E3350D` | 19 | belirgin; referans daha koyu ve az turuncu |
| Kor topaç | 07 `#A92C24` (gölgeli yüz) | `#E8452C` | 24 | gölge yüzü örneklendi; rampa uyumlu (koyu ton `#7A1D12`) |
| Girdap/mavi topaç | 07 `#1F50B2` | `#2A5BD7` | 15 | yakın-belirgin; rampa içinde |
| Ruh avatarı | 08 kuş `#BC7550`, `#9B5340` (yarı saydam turuncu-somon) | silüet somon-turuncu | — | ton yakın; şekil kasıtlı farklı (B-36) |

**Sonuç:** element ve köken renkleri (pixel planı § 2.3) referansla uyumlu; **arayüz paleti** (panel tonu, çerçeve rengi, turuncu vurgu, Enerji rengi, ışıyan halka) referanstan sapıyor. Pixel planı hex'leri değişmez; arayüz tokenları § 2.5'teki "hedef" sütununa çekilir.

### 2.1 Element (Gövde boyası, iz dış rengi, efekt rampası)

| Element | Silüet | Orta ton (belge) | Kod rampası koyu / orta / açık / vurgu (`renkler.ts`) | Pişirme rampası | Kaynak |
|---|---|---|---|---|---|
| Kor | alev | `#E8452C` | `#7A1D12` / `#E8452C` / `#FF8A5C` / `#FFD2A8` | → `#FF9A5C` → `#FFE0B0` → `#FFFFFF` | pixel § 2.3; efekt-k. § 5.3 |
| Kasırga | bulut/hortum | `#5BD1A5` | `#1F6B52` / `#5BD1A5` / `#9CEBC9` / `#E2FFF2` | → `#A8F0D4` → `#FFFFFF` | aynı |
| Şimşek | yıldırım | `#F7D83A` | `#8A6A08` / `#F7D83A` / `#FBE97F` / `#FFFBE0` | → `#FFF3A0` → `#FFFFFF` | aynı |
| Girdap | sarmal | `#2A5BD7` | `#14286B` / `#2A5BD7` / `#6F93EE` / `#CFDCFF` | → `#7FA8FF` → `#D8E6FF` → `#FFFFFF` | aynı |
| Kaya | kaya kümesi | `#8A7458` | `#45392A` / `#8A7458` / `#B8A283` / `#E6DBC6` | → `#C2AC86` → `#EDE0C8` | aynı |
| Don | kristal | `#9FE3F5` | `#3B7D8F` / `#9FE3F5` / `#CFF3FB` / `#FFFFFF` | → `#DDF7FF` → `#FFFFFF` | aynı |

Referans 01'deki altı element simgesi (soldan): kırmızı-turuncu alev · gri fırtına bulutu (altında hortum) · sarı yıldırım · mavi hortum · gri kaya · açık mavi kristal. Bizdeki Kasırga simgesi yeşil yatay çizgili hortum, Girdap mavi sarmal: 01'de **sarmal yok**, mavi hortum var (§ 9 Ç-16). Gövde, Çekirdeğin elementiyle boyanır (kaynak: pixel § 2.3; `nile-kapsam.md` B-13); dış çizgi 1 px rampanın en koyusu (kaynak: pixel § 2.3).

### 2.2 Köken
| Köken | Işık | İkinci | Referans 02 küre rengi | Kaynak |
|---|---|---|---|---|
| Göktaşı | `#FFE9A8` | `#FFC93C` | sıcak beyaz-krem parlayan küre | pixel § 2.3; görsel 02 |
| Maden | `#C8842B` | `#8A5718` | altın-kehribar küre | aynı |
| Yapay | `#7F95A8` | `#4D5D6B` | soğuk mavi-gri küre | aynı |
| Karanlık | `#5B2A86` | `#1A0F26` | (referansta yok) | pixel § 2.3 |

Referans 02 köken renklerini birebir doğruluyor; 02'deki stat çubukları da köken renginde (bej `#D5B787`, kahve-turuncu, mavi-gri `#6B8792`).

### 2.3 Takım
| Öğe | Varsayılan | Mavi-turuncu ön ayarı | Desen | Kaynak |
|---|---|---|---|---|
| Oyuncu | camgöbeği `#2FB8E8` | `#2F7FE8` | düz 2 px çember + ▲ | pixel § 2.2-2.3; ux § 6.1 |
| Rakip | eflatun-pembe `#E83A8C` | `#F2A33A` | kesikli çember + ◆ | aynı |
Referans 07/08'de takım çemberi **yok**; takım ayrımı yalnız topaç rengiyle (turuncu vs mavi) ve kırmızı/mavi hız çizgileriyle. Takım çemberi kasıtlı ekleme (renk tek kanal değil, İ-3).

### 2.4 Arena
| Arena | Zemin | Vurgu | Kaynak |
|---|---|---|---|
| Kuşak Arenası | `#6E6A66` (hedef: 07'ye yaklaşmak için `#7F746C` civarı, bkz. GU-07) | hız şeridi: ışıyan halka (`#FBBE88` çekirdek, `#DCA97C` hale) | pixel § 6.3; görsel 07 |
| Sallanan Çanak | `#8C5A3C` | cıvata gri | pixel § 6.3 |
| Dar Kuyu | `#3C4350` (görsel 08'in kayrağına `#464D5D` yakın) | `#E38A2B` | pixel § 6.3; görsel 08 |
| Tehlikeli | `#3A2420`+`#E8452C` · `#2A3A4A`+`#9FE3F5` | mat zemin, parlak dekal | pixel § 6.3 |
Referans 07'nin zemini **çatlaklı taş levhalar**, merkezde içe çökük çukur, kenarda koyu iç duvar ve kalabalıklı tribün; 08'in zemini radyal çizgili koyu kayrak. İkisi de arena çeşitliliğini (Kuşak / Dar Kuyu) temsil edebilir.

### 2.5 Arayüz tokenları: bugün ve hedef
| Token | Bugün | Hedef (referanstan) | Kaynak |
|---|---|---|---|
| `--bg` | `#0B1418` | `#0F1020` | görsel 01, 07 |
| `--panel` | `#10222A` | `#1B2131` | 04, 06 |
| `--panel-2` | `#173039` | `#292D39` | 06 |
| `--edge` (çerçeve) | `#24414B` | açık bej-gri `#A99E92` (2 px) + koyu iç hat | 01, 07, 09 |
| `--accent` (yeni) | — | turuncu `#E8762F` | 03, 05, 07 |
| `--bronze` (yeni) | — | `#C08E52` (vurgu çerçeve, tabela) | 01, 06 |
| `--gold` | `#F4CF47` | `#FCD35A` | 09 |
| `--ink` | `#F3F1E8` | `#FBF2C3` | 06 |
| `--back` (yeni) | — | kırmızı-kahve `#9A3D38` | 04, 06 |
| Stamina > %60 | `#F2E8B0` | bej `#C9AE72` (08'in bejı ile krem arası; CVD testinde amberden ayrılmalı) | 08; ux H1a |
| Stamina %25-60 | `#F2A33A` | sarı `#FFE45E` | 07 sarı bölge |
| Stamina < %25 | `#E3350D` + tarama | turuncu-kırmızı `#F2622F` + tarama | 07 kırmızı bölge |
| Enerji dilimi | `#7FD3FF` | dolarken yeşil `#86E065`; 3 dilim dolu ve Ulti açık: sarı-turuncu `#FEE55F` + "ULTİ" `#E8762F` (**K-3 varsayılan**, sahip itiraz etmedi) | 07, 08 |
| Telegraf | `#E3350D` | `#C82625` | 08 |
| Ulti kenar | `#FF8A3D` | `#E6680C` | 08 |
Hedef değerler bir öneridir; GU-01'de gri ton + 3 CVD simülasyonuyla (`@pebble`) sınanmadan koda girmez.

---

## 3. Tipografi

### 3.1 Referansta
Bütün dokuz ekranda **pixel yazı tipi**, başlık ve etiketlerin hepsi **BÜYÜK HARF** (ATÖLYE, MARKET, PROFİL OLUŞTUR, STAMINA, ENERJİ, ZAFER, TEKRAR); kalın, 1-2 px koyu dış çizgili ya da gölgeli; Türkçe karakterler (İ, Ş, Ç, Ğ, Ü) pixel glifle çiziliyor. Tek istisna 05'teki popup gövde metni ("Yeni bir parça eklendi:") karma harfli ama yine pixel. Rakamlar (skor 1 - 2, süre 0:47, fiyat 150) aynı pixel font, skor rakamları turuncu.

### 3.2 Bizde
HUD `"Nunito Sans", system-ui`, başlıklar `"Trebuchet MS", "Nunito Sans"` (kaynak: `index.html :root --display`, `MacHud.ts`); düzgün kenarlı sans-serif, cümle düzeni karma harf. **Kaçak fark** (en büyük tekil fark). pixelfx'in Patch Pixel fontu MIT dışında, kullanılmaz (kaynak: efekt-kaynakları § 5.5). Gereken: Türkçe glifi tam, açık lisanslı (OFL/CC0) bir pixel font; aday araştırması GU-01 işinin parçası (bu belge ad önermez, doğrulanmamış lisans yazmamak için).

### 3.3 Boyutlar (mantıksal px, 960×540 HUD çerçevesi)
| Öğe | Oyuncu | Seyirci | Referans gözlemi | Kaynak |
|---|---|---|---|---|
| Ad (H1/H2) | 10 | 14 | 07/08'de ad yok, yalnız "STAMINA"/"ENERJİ" etiketi | ux § 2, § 5 |
| Stamina % sayısı | 10 | — | referansta sayı yok | ux § 2 |
| Tuş rozeti | 10 | — | referansta yok | ux § 2 |
| Bekleme sayısı | 12 kalın | — | — | ux § 2 |
| Süre (H4) | 14 | 18 | 07'de skordan küçük, ayrı kutuda | ux § 2 |
| Skor (H3) | 20 | 28 | 07'de ekranın en büyük HUD metni, turuncu | ux § 2 |
| Olay bandı | 16 | 20 | — | ux § 2 |
| Geri sayım | 48 | — | 06'da "20" büyük | ux § 3.4 |
| Menü başlığı | — | — | ekran başlığı üst bantta ortalı, büyük harf (04 MARKET, 06 LOBİ, 05 BAŞARIMLAR) | görseller |
| Alt sınır | 10 (8 süs) | — | — | ux § 2, § 6.3 |
Pixel font seçildiğinde boyutlar glif ızgarasına (ör. 8/10/12/16/20 px yükseklik) yuvarlanır; 10 px alt sınır değişmez.

Ton: kısa, "sen" diliyle; ünlem yalnız zaferde; rakam ve birim ayrı (kaynak: ux § 7). Referans etiketleri büyük harf olduğu için büyük harf **etiket ve başlıklarda**, cümle düzeni **açıklama metinlerinde** kullanılır.

---

## 4. Şekil dili, çerçeve ve panel

### 4.1 Yuva şekilleri (H6)
| Yuva | Şekil | Referans 07 | Kaynak |
|---|---|---|---|
| 1 Yetenek | kare | 3 kare yuva, ikon dolu (alev patlaması, kırmızı yasak dairesi, mavi sarmal) | ux § 2 H6 |
| 2 Özel Yetenek | pahlı kare | kare | aynı |
| 3 Ulti | elmas | kare | aynı |
| 4 Parça Tekniği | yuvarlak (boş) | yok | aynı; B-11 |
Referansta yuvalar aynı kare; şekille ayırma kasıtlı ekleme (renk tek kanal değil). Hâller: hazır 3 px parlak çerçeve; bekleme karartma + sayı; Enerji yetersiz kesikli + nokta; kilitli asma kilit + "Lv.3"; basılı kalın + 4 px yukarı (kaynak: ux § 2 H6; C-7; D3 § 1).

### 4.2 Çizgi deseni = anlam
| Desen | Anlam | Kaynak |
|---|---|---|
| Kırmızı + çapraz tarama + dolu kenar | Tehlike | ux § 2.2, § 6.1 |
| Kesikli, taramasız | Senin önizlemen | ux § 2 H9 |
| İnce kesikli | Fırsat | ux § 2 H11 |
| Dolu kalın | Kendi tehlikende (kenar Sv.2) | ux § 2 H11 |
| Düz çember + ▲ / kesikli + ◆ | Oyuncu / rakip | ux § 6.1 |
| Kalınlaşan çizgi | Ani ölüm sınırı | ux § 3.4 |
| Gri kesikli çerçeve | Ödünç topaç | D5 § 1 |
Referans 08'deki Ulti telegrafı **eş merkezli iki kırmızı halka** (dolu, taramasız); bizde dolu kırmızı + tarama. Tarama kasıtlı (G-14); halka sayısı ve kalınlığı referansa çekilebilir.

### 4.3 Panel, köşe, çerçeve
**Referansta (01–09 ortak):**
- Paneller koyu lacivert dikdörtgen, **köşeler pixel basamaklı** (yarıçap yok ya da 2-4 px'lik merdiven), dışta **2 px açık bej/gri çizgi**, içte 1 px koyu hat (çift çizgi "kabartma" etkisi).
- Önemli öğeler **bronz/turuncu çerçeve** (01 isim kutusu ve renk şeridi, 02 başlık ve etiket plakaları, 06 mod düğmeleri, 07 skor plakası, 09 Çekirdek kartı ve başarım kartı).
- Başlıklar **plaka** içinde: 02 "İLK ÇEKİRDEK" üstte ortalı turuncu çerçeveli plaka; 04/06 tam genişlik üst bant + ortalı başlık; 05 çerçevenin üst bandı; 09 kanatlı, yıldızlı altın ZAFER plakası.
- Geri: **sol üstte kırmızı kare düğme, beyaz/krem ◄ üçgen** (04, 06); 03'te başlığın solunda turuncu ◄. Kapat: **sağ üstte kırmızı kare X** (03, 05).
- Düğmeler: koyu zemin + bronz/altın çerçeve + büyük harf beyaz yazı (06, 09); seçili mod kahve-turuncu dolgu (06 HIZLI MAÇ); 01'de tek yeşil ana düğme (GİRİŞ).
- Her ekranın **pixel sahne arka planı** var: 01 düz koyu + parlayan Çekirdek illüstrasyonu, 02 taş tapınak ve kaideler, 03 teknik çizim (blueprint) ızgarası, 04 pazar sokağı (flama, tezgâh, kasaba), 05 düz, 06 düz, 07/08 tribün, 09 siyah + konfeti.
- İkonlar: tüm parçalar, sikkeler, rozetler **pixel art sprite** (çok tonlu, ışıklı).

**Bizde:** petrol yeşili kart, 14 px yarıçap, 3 px koyu çerçeve, düğme 8 px yarıçap, ana eylem sarı dolgu, ◄ "Atölye" düğmesi kartın sağ üstünde (Lobi), sahne arka planı yok (düz radyal koyu), ikonlar düz renkli SVG silüet, parça kartları metin.

**Karar (hedef stil):** referans panel stili benimsenir: lacivert zemin, basamaklı köşe (yarıçap 0, 2 px köşe kesiği), 2 px bej dış + 1 px koyu iç çizgi, vurgu için bronz çerçeve, başlık plakası, sol üstte kırmızı kare geri düğmesi. Ana eylem kuralı: **seçili / birincil = bronz-turuncu dolgu + altın çerçeve** (06 HIZLI MAÇ dili; **K-2 varsayılan**, sahip itiraz etmedi; maket `m3-*.png` bu kuralı çizer); 01'deki tek yeşil düğme istisna kabul edilmez (tek tutarlı ana eylem rengi). Gezinti kuralı aynı kalır: Atölye ana ekran, ◄ yalnız alt ekranlarda sol üstte, X yalnız modal (kaynak: ux § 3.2; G-15).

---

## 5. Animasyon ilkeleri

| Konu | Sınır / kural | Kaynak |
|---|---|---|
| Nabız | ≤ 2 Hz | ux § 6.2 |
| Hitstop | yalnız görsel; 33 / 66 / 100 ms; bitiş ≤ 166 ms; son 300 ms'de %50 | 05 § 3.2-3.3; ux § 6.2 |
| Sarsıntı | trauma², 1 sn sönüm, ilk 2 kare normal yönünde | 05 § 3.3 |
| Tam ekran flaş | ≤ %25, ≥ 50 ms, ≤ 3/sn | ux § 6.2 |
| Topaç flaşı | tint beyaz 2-3 kare | 05 § 3.2 |
| Squash/stretch | 0,9/1,1 → 0,7/1,3, 1/3 px basamağı | 05 § 3.2-3.3 |
| Zoom | ×1,03 → ×1,08-1,10 | pixel § 1.2; 05 § 3.2 |
| Yavaş çekim | Parçalanma 0,3× | 05 § 3.2 |
| Hız kademesi | > %60 bulanık disk · %25-60 bulanık kanat · < %25 keskin + yalpa; yalpa %40'ta | pixel § 3.4; ux § 2.1 |
| Metin | kaymaz, yalnız solar | ux § 6.3 |
| Sonuç dizisi | ≤ 6 sn, atlanır | ux § 3.5 |
| Dış sheet | 12 fps adımlı | efekt-k. § 5.2 |
| Işıyan halka (referans 07/08) | hız şeridi sürekli hafif parlar; topaç şeritteyken parlaklık artar; nabız varsa ≤ 1 Hz | görsel 07/08; pixel § 6.2 |
| Konfeti (referans 09) | ZAFER'de 2-3 sn konfeti, ≤ 60 parçacık, "Parçacık: Az" ayarında ×0,4 | görsel 09; ux § 6.2 |

---

## 6. Efekt dili

### 6.1 Olay reçetelerinin dil özeti
Her olay beş kanallı cümle: **dur (hitstop) → it (sarsıntı + squash) → parla (flaş) → saç (parçacık + şok çemberi + iz) → duyur (ses)**. Şiddet `vn` eşiği: hafif 80-260, ağır 260-420, kritik ≥ 420 ya da dash + ağır (kaynak: 05 § 3.1).

| Olay | Dil | İmza öğesi | Kaynak |
|---|---|---|---|
| Hafif çarpışma | "tık": kısa beyaz, 6-8 kare kıvılcım | 2×2/3×3 parçacık | 05 § 3.2; pixel § 5.2 |
| Ağır çarpışma | "çın": tam beyaz 3 kare, şok çemberi | tek çember + iz | 05 § 3.2 |
| Kritik | "çın + thud": çift çember, %8 flaş | çift çember | 05 § 3.2 |
| Karşıt element | iki renkli iç içe çember + beyaz çekirdek | iki renk | 05 § 3.2; pixel § 5.1 |
| Dash çarpması | "swoosh → boom": hız çizgileri | hız çizgisi | 05 § 3.2 |
| Duvar | "tonk", tek yönlü sarsıntı | duvar parlaması | 05 § 3.2 |
| Ring Out | dışa fırlama, küçülme, gölge kalır | gölge ayrılması | pixel § 5.2 |
| Parçalanma | katmanlar fırlar, Çekirdek yerde parlar, 0,3× | yerde Çekirdek | pixel § 5.2 |
| Durma | yalpa → yatış, bozuk para sesi | yatış | 05 § 3.2 |
| Ulti telegrafı | titreşim, çökme, dolan halka | dolan halka | 05 § 3.2 |
| Ulti vuruşu | element flaşı, element sheet'i, zoom %5 | sheet | 05 § 3.2; efekt-k. § 3 |
| Enerji doldu | dilim parıltısı + element çemberi + "ding" | çember | 05 § 3.2 |
**Referans 07 çarpışma anı** bu dili doğruluyor: temas noktasında sarı-beyaz yıldız patlaması (ışınsal sivri parlama), iki yanda topaçların renginde **kısa kırmızı ve mavi hız çizgileri**, mavi topacın arkasında krem sarmal iz, ayrıca topaçların altında belirgin koyu gölge. Bizde (D1/D5) kıvılcım kare parçacık + şok çemberi; **ışınsal yıldız patlaması ve takım renkli hız çizgileri yok** (kaçak, GU-07). Referans 08: dash eden mavi topacın arkasında **mavi üçgen iz** (koni), çarptığı yerde sarı kıvılcım; Kor topacın üstünde alev (element aurası).

### 6.2 Element başına efekt kimliği
| Element | Şekil motifi | İz / kıvılcım | Alan dekali | Ulti efekti adayı | Ses adayı | Kaynak |
|---|---|---|---|---|---|---|
| Kor | alev, çatlak | yukarı kor; 08'deki gibi topaç üstünde alev aurası | Kor Çukuru | `fire/fire-ring` | kayıt patlama | pixel § 5.2; efekt-k. § 3, § 8.2; görsel 08 |
| Kasırga | rüzgâr çizgisi | yatay süpürme | Kasırga Alanı | `nature/tornado` | — | aynı |
| Şimşek | zikzak | kırık zikzak | Şimşek Ağı | `lightning/thunderclap`, `zap-hit` | — | aynı |
| Girdap | sarmal | içe kıvrılan iz (07 mavi topacın sarmal izi) | Girdap Çekimi | `explosions/implosion`, `water/whirlpool` | — | aynı; görsel 07 |
| Kaya | çokgen | ağır toz | Kaya Duvar | `nature/earth-spike` | S7 taş | aynı |
| Don | kristal | kristal kırığı | Don Kaygan | `ice/frost-nova` | S9 buz | aynı |
İz: iç çizgi Köken, dış Element; kıvrılma yönü = dönüş yönü (kaynak: pixel § 5.2).

### 6.3 Karşıt element çift renk kuralı
Kor–Girdap, Kasırga–Kaya, Şimşek–Don: kıvılcım havuzu iki renge bölünür; iç içe iki renkli şok çemberi + beyaz çekirdek; sayı gösterilmez (kaynak: pixel § 5.1; 05 § 3.2). Referans 07 zaten Kor (turuncu) – Girdap (mavi) karşıt çarpışmasıdır: kırmızı ve mavi çizgiler + beyaz-sarı merkez bu kuralla örtüşür.

### 6.4 Ulti / Özel Yetenek telegraf anatomisi
Beş soru (kaynak: ux § 2.2; D3 § 1): kim (bağ çizgisi + takım çemberi nabzı) · nereden/nereye · ne iniyor (alan şekli + element silüeti; kırmızı + tarama) · ne zaman (dolan halka, son 0,1 sn beyaz, ≥ 0,3 s) · ne yapmalı (ilk 3 maç "Sekme: Space").
**Referans 08 kompozisyonu:** üst-orta bantta, topaçların **arkasında**, ekran yüksekliğinin ~yarısını kaplayan yarı saydam turuncu ruh avatarı (açık kanatlı kuş); Ulti atan topacın altında eş merkezli iki kırmızı halka; ekranın **sol ve sağ kenarında** turuncu `#E6680C` dikey parlama; sol panelde Enerji'nin üç dilimi dolu + "ULTİ". Avatar boyutu pixel planının 192-216 px'inden (~%36-40) büyük görünüyor (kanat açıklığı ~430 px / 1376 genişlik ≈ ekran yüksekliğinin %50'si); okunurluk için pixel planı sınırı korunur, kompozisyon (arka, üst-orta, yarı saydam) referanstan alınır.

### 6.5 Ses dili
Metalik, kısa, görselle aynı kare; 16 sentez WAV (CC0, 199,9 KB), `@pixi/sound` 6.0.2, M tuşu; hiç kulakla dinlenmedi; 12 Kenney CC0 aday entegre değil; müzik yer tutucu (kaynak: 05 § 3.2; D3 § 1, § 8, § 11; efekt-k. § 4, § 8.3). Ayrıntı: `docs/art/efekt-oturumu.md`.

---

## 7. Referans uyum ("9 ekran")

### 7.0 Uygulama bugün (D1–D6 ekran görüntüleri)
Bakılanlar: `D5-karsilama`, `D5-profil`, `D5-ilk-cekirdek`, `D6-atolye-genel`, `D5-lobi`, `D5-takim-secimi`, `D5-mac-ortasi`, `D3-07b-ulti-ruh-siluet`, `D5-sonuc-xp`.
- **Genel:** koyu petrol arka plan, ortada tek büyük yuvarlak köşeli kart; üstte sabit bant "DEVRAN" + sarı dilim rozeti + gezinti (Atölye · Market · Başarımlar · Oyna · Ayarlar), sağda ad + Çıkış; düzgün sans-serif yazı; ana eylem sarı dolgu; sahne arka planı yok.
- **Maç:** tam üstten dairesel çanak (gri taş, krem hız şeridi kuşağı, kesikli çizgiler), topaçlar Pixi Graphics yer tutucu; köşe panelleri (ad · element · köken · Lv., segmentli stamina, Enerji 3 açık mavi dilim, Çatlak simgesi); üst ortada skor + süre; sol alt 4 yuva + adlar; alt orta Shift/Space; sağ alt 3 takım yuvası.
- **Ulti:** kanatsız, sivri kulaklı basit geometrik somon silüet, sarı çerçeveli "ULTİ · Ata Közü" bandı.
- **Atölye (D6, sürüyor):** üç sütun (Envanter · seçili topaç + 6 çubuk · Takım), metin kartları, sağ altta OYNA.

### 7.1 Özet tablo
Puan 0–5: 0 ekran yok · 1 iskelet · 2 öğeler var, düzen ve stil farklı · 3 düzen yakın, stil farklı · 4 düzen ve stil yakın · 5 ayırt etmek zor (kasıtlı farklar hariç). Puan **bugünkü** durumdur.

| # | Referans | Uygulama dosyası | Dilim | Ekran görüntüsü | Belge uyumu | Görsel uyum bugün (0-5) | Maket (öz değ.) | Tavan (K-1 Hibrit + GU) |
|---|---|---|---|---|---|---|---|---|
| 01 | `01-giris-profil.jpg` | `ekranlar/Kimlik.ts`, `Profil.ts` | D5 | `D5-karsilama`, `D5-profil` | Kısmen | **2** | — (maket yok) | 4 (illüstrasyon görseli ile 5) |
| 02 | `02-ilk-cekirdek.jpg` | `ekranlar/IlkCekirdek.ts` | D5 | `D5-ilk-cekirdek` | Uyuyor (önizleme zayıf) | **2** | 4 | 4–5 (sahne görseli) |
| 03 | `03-atolye.jpg` | `ekranlar/Atolye.ts`, `Dene.ts`, `Gunluk.ts` | D5-D6 | `D6-atolye-genel`, `D6-*` | Kısmen (D6 sürüyor) | **3** | 4 | 4 (sade düzen ve 6 çubuk kasıtlı) |
| 04 | `04-market.jpg` | `ekranlar/Diger.ts` | D7 | yok | Yok | **0** | 4 | 5 |
| 05 | `05-basarimlar.jpg` | `ekranlar/Diger.ts` | D5 iskelet, D7 | yok | Yok | **1** | 4 | 5 |
| 06 | `06-lobi.jpg` | `ekranlar/Lobi.ts` | D4-D5 | `D5-lobi`, `D5-takim-secimi` | Kısmen | **2** | 3–4 (Oyna + Lobi iki ekran) | 4 |
| 07 | `07-arena-mac.jpg` | `oyun/MacHud.ts`, `ekranlar/Mac.ts`, `oyun/KusakArenasi.ts`, `oyun/TopacGorsel.ts` | D2-D3 | `D5-mac-ortasi`, `D2-*`, `D3-01` | Uyuyor (HUD) | **2** | 3–4 | **4** (Hibrit ile; topaç sprite hattı gelince 5). A seçeneğinde tavan 3 idi |
| 08 | `08-arena-ulti.jpg` | `oyun/YetenekGorsel.ts`, `Efektler.ts`, `MacHud.ts` | D3 | `D3-07*`, `D3-08` | Kısmen | **2** | 3 | **4** (avatar sanatı gelince 4–5; kuş yerine özgün ruh kasıtlı) |
| 09 | `09-sonuc.jpg` | `ekranlar/Mac.ts` (sonuç) | D2, D5, D7 | `D5-sonuc-xp`, `D2-12-*` | Kısmen | **2** | 4 | 5 |

"Maket" sütunu `docs/art/maketler/` görsellerinin referansa göre öz değerlendirmesidir (yer tutucu sanat; ölçülmedi). "Tavan" GU-00…GU-13 bittikten ve kasıtlı farklar düşüldükten sonra beklenen en yüksek puandır.

Farklar aşağıda iki etiketle: **[K]** kasıtlı (belge kazandı, kapatılmaz) · **[S]** kaçak (sapma, GU'da kapatılır).

### 7.2 Ekran 01 · Giriş / profil
- **Referansta:** sol üstte topaç ikonlu bronz çerçeveli "DEVRAN" logo rozeti. İki eşit panel: solda kare koyu lacivert panel içinde ışıyan turuncu-altın **Çekirdek illüstrasyonu** (halkalı, parlak merkez); sağda "PROFİL OLUŞTUR" başlık bandı, altında bronz çerçeveli "OYUNCU ADI" alanı, 6 element ikonu (seçili alev, turuncu çerçeve), 14 renklik renk şeridi (siyah, koyu gri, bordo, kırmızı, turuncu, sarı, açık yeşil, yeşil, mavi, mor, eflatun, kahve, gri, beyaz), en altta büyük yeşil "GİRİŞ". Panel çerçeveleri açık bej.
- **Bizde:** Karşılama ayrı ekran (üç cümle + Kayıt ol / Giriş yap / Antrenmanı dene); Profil tek ortalı kart: ad (yazı), 6 arma düğmesi (düz SVG ikon + ad), 6 renk (Altın, Kızıl, Gök, Yeşim, Eflatun, Amber), destek kanalı alanı, önizleme şeridi, sarı "Başla".
- **Farklar:**
  - [K] "GİRİŞ" yerine "Başla" (C-12); destek kanalı alanı eklendi (C-12); Karşılama tanıtım ekranı ayrı (ux § 4.1); kimlik ad + şifre (D5 sahip kararı).
  - [S] Sol illüstrasyon paneli yok (referansta ekranın yarısı) → iki panelli düzen.
  - [S] Logo rozeti yok (bizde düz "DEVRAN" yazısı).
  - [S] Arma ikonları pixel art değil; referans sırası/çizimi farklı (bulut + hortum, sarmal yok; § 9 Ç-16).
  - [S] Renk sayısı 6, referans 14 küçük kare şerit; renk adları yazılı (bizde) vs yalnız kare (referans): sayı belge dışı, renk şeridi stili alınır, ad erişilebilirlik için ARIA'da kalır.
  - [S] Ana düğme sarı vs yeşil (§ 4.3 tek kural: bronz-turuncu).
  - [S] Yazı, panel, çerçeve stili (§ 3, § 4.3).

### 7.3 Ekran 02 · İlk çekirdek
- **Referansta:** üstte ortalı turuncu çerçeveli "İLK ÇEKİRDEK" plakası, iki yanda ince çizgi; arka plan karanlık taş tapınak (sütunlar, kabartmalı duvar). Üç sütun: üstte çerçeveli kare içinde **yandan görünüşlü topaç ikonu** (Göktaşı beyaz-altın, Maden bronz, Yapay mavi-gri), altında taş kaide üstünde **parlayan Çekirdek küresi** (köken renginde), altında köken adı plakası (GÖKTAŞI / MADEN / YAPAY), en altta 2 stat satırı segmentli çubuk (GÜÇ/HIZ · DAYANIKLILIK/KONTROL · ÇEVİKLİK/SAVUNMA), çubuk rengi köken rengi. Düğme, pasif metni ve yetenek adı **yok**.
- **Bizde:** tek kart, 3 eşit kart: başlık (element simgesi + ad), alt satır köken · element · tip · Lv., önizleme kutusu (iki nokta), 4 krem çubuk, pasif cümle, yetenek, Yapay uyarı kutusu, "Bunu seç".
- **Farklar:**
  - [K] Her kartta aynı 4 çubuk Saldırı · Savunma · Hız · Stamina (C-2, G-33); pasif, yetenek, Yapay uyarısı, 5 sn önizleme (03 US-1.3); "Bunu seç" düğmesi (ux § 7).
  - [S] Tapınak arka planı ve kaide/küre kompozisyonu yok → sahne arka planı + kaide + küre.
  - [S] Topaç ikonu yok; önizleme sprite değil iki nokta.
  - [S] Çubuklar segmentli değil ve köken renginde değil (bizde düz krem).
  - [S] Başlık plakası, köken adı plakası yok.

### 7.4 Ekran 03 · Atölye
- **Referansta:** arka plan koyu mavi teknik çizim (blueprint) ızgarası ve silik topaç çizimleri. Üst bant: sol "◄ ATÖLYE", sağ kırmızı X. Sol panel: 4 sekme (pixel ikon + ÇEKİRDEK / GÖVDE / DİSK / UÇ; seçili sekme yükseltilmiş), altında 4×5 **ikon ızgarası** (her hücre pixel parça ikonu + kısa ad), seçili hücre altın köşe çerçeve, dikey kaydırma çubuğu. Orta: alev ikonu + "BLAZE STRIKER" başlığı; topaç **dikey patlatılmış görünüm** (Çekirdek, Gövde, Disk, Uç üst üste, sol etiketler ve çizgilerle bağlı); sağında 8 turuncu çubuk + sayı. Sağ panel "TAKIM": 3 kart (topaç ikonu, ad, 4 sayı, HIZ/GÜÇ/AT mini çubukları), altta ▼.
- **Bizde (D6):** üst bant gezinti; "Atölye" başlığı + Çekirdek Günlüğü / Profil / Topaç Lab düğmeleri; sol Envanter (4 metin sekme, filtre açılır listeleri, 2 sütun metin kart, "???" gizli); orta "1. topaç · Kaya Maden" (önizleme + sağda 4 parça adı listesi), 6 krem çubuk + sayı, Uç/Yön etiketleri, 4 yuva düğmesi, uyum kutusu, Rakip seçimi + "Dene"; sağ Takım (ad alanı, 3 yuva, element çarkı, kayıtlı takımlar, Kaydet/Yeni takım); sağ altta büyük OYNA.
- **Farklar:**
  - [K] 6 çubuk Saldırı, Savunma, Ağırlık, Stamina, Hız, Sağlamlık (C-1); Türkçe parça adları (C-3); X yok, ◄ yok (Atölye ana ekran, G-15, C-9); OYNA eklendi (ux § 3.2); element çarkı ve uyum kutusu (03 US-2.1).
  - [S] Blueprint arka planı yok.
  - [S] Envanter ikon ızgarası değil metin kart; parça pixel ikonları yok.
  - [S] Patlatılmış dikey parça görünümü yok (bizde tek önizleme + liste).
  - [S] Çubuklar turuncu (`#F57817`) ve çerçeveli değil, krem.
  - [S] Takım kartlarında topaç ikonu ve mini çubuklar yok.
  - [S] Sekmelerde ikon yok.
- Düzen iskeleti (sol envanter · orta topaç · sağ takım) referansla aynı: puan 3.

### 7.5 Ekran 04 · Market
- **Referansta:** üst bant: sol kırmızı geri düğmesi, ortada "MARKET", sağda "ALTIN 1250" + altın sikke ikonu. Altında "GÜNÜN PARÇASI -30%" bandı (indirim turuncu, sağında parça ikonu). 2×2 **ahşap tabelalı raf**: ÇEKİRDEKLER, GÖVDELER, DİSKLER, UÇLAR; her rafta 4 hücre: parça ikonu + altında altın "150 ALTIN" rozeti, ya da asma kilit + turuncu ilerleme "3/10", ya da siyah silüet + "???". Arka plan pixel pazar sokağı (flamalar, tezgâhlar, bir NPC).
- **Bizde:** yer tutucu metin (D7).
- **Farklar:** [K] başarım adı ve parça adı tooltip/odakta (C-13). [S] ekranın tamamı (D7 kapsamı; referans neredeyse birebir uygulanabilir: 4 raf, 3 kilit hâli, günün parçası belgeyle örtüşüyor).

### 7.6 Ekran 05 · Başarımlar
- **Referansta:** tam ekran çerçeve, üst bantta "BAŞARIMLAR" + sağda kırmızı X; 6 sekme YOL · BİTİŞ · ELEMENT · RİSK · GÖSTERİ · SOSYAL (seçili ELEMENT, kıvılcım süsü); 4 sütunlu kart ızgarası: her kart altıgen kalkan rozet (element renkli), ad, 3 kademe ikonu, turuncu ilerleme çubuğu, asma kilit; kilitli kartlar gri ve soluk; ortada "MARKET'TE AÇILDI" popup'ı (kahve-bordo, turuncu köşe süsleri, parça görseli, "Yeni bir parça eklendi: 'Kıvılcım Çarkı'", DEVAM ET); bazı adlar bozuk (GENKİN OSTAVI, ATEŞİN GÜLUR).
- **Bizde:** liste iskeleti, yalnız İlk Devir.
- **Farklar:** [K] belge adları ve tek eşik, "Kıvılcım" parça adında yok, popup sonuç ekranında (C-14); X yerine ◄ (G-15). [S] sekmeler (kategoriler 03 US-4.1 ile **birebir aynı**, alınır), kart ızgarası, kalkan rozet, ilerleme çubuğu, kilitli gri hâl.

### 7.7 Ekran 06 · Lobi
- **Referansta:** üst bant: sol kırmızı geri, ortada "LOBİ". Sol panel: 3 büyük düğme HIZLI MAÇ (seçili, kahve-turuncu), ODA KODU, DERECELİ (bronz çerçeve). Orta: "COUNTDOWN" + kutuda "20"; "TEAM SELECT" panelinde 3 kart (sol üst köşede element rozeti, ortada topaç sprite'ı, altın çerçeve). Sağ panel "OPPONENT": 3 element ikonu. Alt bant: solda 2 rütbe kalkanı, sağda 2 kalkan + yeşil sinyal çubuğu "0".
- **Bizde:** "Oyna" kartı: Oda kodu bölümü (Oda aç, kod alanı, Odaya katıl) + Diğer (Hızlı maç devre dışı, Antrenman); ◄ Atölye kartın sağ üstünde; eşleşince ayrı "Takım seç" katmanı (rakip adı, rakibin 3 simgesi, takım kartı metin + simge, Hazır, süre yazısı).
- **Farklar:**
  - [K] Türkçe "Geri sayım / Takım seçimi / Rakip" (C-3); element simgeleri belge seti (C-10); rozetler = Galibiyet Sıralaması + Stil Puanı (C-11); ping rozeti yalnız kötü bağlantıda (H10).
  - [S] Üç sütunlu tek ekran (mod · geri sayım + takım · rakip) yerine iki ayrı ekran.
  - [S] Dereceli düğmesi yok (dereceli ilk sürümde yok: belgede de var olmayan özellik; düğme "yakında" soluk konabilir).
  - [S] Takım kartlarında topaç sprite'ı yok; geri sayım büyük sayı kutusu değil metin.
  - [S] Geri düğmesi sağ üstte ve metinli (referans ve ux: sol üst).
  - [S] Alt rozet bandı yok.

### 7.8 Ekran 07 · Maç HUD
- **Referansta:** kamera **eğik** (~35-45° yükselti; çanak geniş elips, iç duvar ve tribün görünür); zemin çatlaklı sıcak gri taş levhalar, ortada içe çökük çukur, dış kuşakta **ışıyan krem-turuncu halka**, kenarda koyu duvar, üstte ve yanlarda kalabalık silüetleri. Topaçlar **3/4 yandan** görünüşlü pixel sprite (turuncu Kor, mavi Girdap), altlarında koyu gölge, çarpışmada sarı-beyaz ışınsal patlama + kırmızı/mavi hız çizgileri + krem sarmal iz. HUD: sol üst "STAMINA" etiketi + ~480 px uzunlukta çubuk (dış uçtan kırmızı, sonra sarı bölge, sonra boş), altında "ENERJİ" + yeşil segmentli kısa çubuk; sağ üst ayna; üst ortada bronz çerçeveli trapez plaka "1 - 2" (turuncu rakam) ve altında "0:47" kutusu. Sol alt 3 ikonlu kare yuva (alev patlaması, kırmızı yasak dairesi, mavi sarmal); sağ alt 3 boş kare (ilki turuncu çerçeve).
- **Bizde:** tam üstten daire; köşe panelleri (ad satırı, stamina eşik renkli + %, Enerji 3 açık mavi dilim, Çatlak); skor + süre koyu kutular; 4 yuva + yetenek adları + Shift/Space; 3 takım yuvası element silüetli.
- **Farklar:**
  - [K] Köşe paneli (08 dili) + alt yuvalar (C-4); çubuk rengi eşikle (C-16); yasak dairesi yerine kilit (C-7); sağ alt = takım yuvaları (C-8); ad/Lv. satırı, Çatlak, Shift/Space rozetleri, 4. yuva (ux § 2); takım çemberi (İ-3, Hibrit'te zeminde elips).
  - [S] **Kamera:** referans eğik, bizde tam üstten → **K-1 = Hibrit** ile kaçak fark oldu, GU-00 kapatır (fizik düz kalır; `maketler/m1-mac-hibrit.png`).
  - [S] "STAMINA" / "ENERJİ" büyük harf pixel etiketleri yok.
  - [S] Enerji rengi açık mavi, referans yeşil (§ 2.0).
  - [S] Skor plakası bronz trapez + turuncu rakam değil.
  - [S] Zemin çatlak dokusu, çukur, ışıyan halka, tribün kalabalığı yok.
  - [S] Topaç sprite'ı yer tutucu Graphics (pixel planı boru hattı bekliyor).
  - [S] Çarpışmada ışınsal yıldız patlaması ve takım renkli hız çizgileri yok.

### 7.9 Ekran 08 · Ulti anı
- **Referansta:** kamera eğik, koyu kayrak zemin radyal çizgili; beyaza yakın ışıyan halka; sol üst panel (STAMINA bej çubuk, ENERJİ 3 dolu turuncu-sarı dilim, üçüncüsü parlıyor, yanında turuncu "ULTİ"), sağ üst ayna (rakip Enerji bej 1,5 dilim); üst ortada "2 - 1" ve "0:31" (bu ekranda rakamlar krem); arka bantta kalabalık. Kor topacın altında eş merkezli 2 kırmızı halka, üstünde alev; arkasında büyük yarı saydam turuncu **açık kanatlı kuş**; mavi topaç mavi koni iziyle saldırıyor; **sol ve sağ ekran kenarında turuncu parlama**.
- **Bizde:** silüet kanatsız geometrik, üst-orta; "ULTİ · Ata Közü" sarı çerçeveli bant; Enerji açık mavi; kenar parlaması var (yalnız "Flaş: Normal").
- **Farklar:**
  - [K] Kuş avatarı özgün yeniden çizilir (C-6, B-36); avatar boyutu pixel planı sınırında (§ 6.4); telegrafta tarama (G-14); H5 bandı (ux § 2.2). Kamera eğikliği artık [S]: GU-00 (K-1 = Hibrit; `maketler/m2-ulti-hibrit.png`).
  - [S] Gerçek avatar illüstrasyonu yok (yer tutucu silüet).
  - [S] Enerji dilimleri turuncu-sarı + "ULTİ" etiketi dilimlerin yanında değil (bizde ULTİ yazısı var, renk farklı).
  - [S] Stamina bejı (`#A88D58`) yerine krem.
  - [S] Telegraf eş merkezli 2 halka değil, tek taramalı alan.
  - [S] Topaç üstünde element aurası (alev) yok; dash izi mavi koni değil.

### 7.10 Ekran 09 · Sonuç
- **Referansta:** siyah arka plan + renkli konfeti; üstte iki yanda altın kanat ve üç yıldızlı altın "★ ZAFER ★" plakası; üst panelde tablo (başlık bozuk "FİNF / SCPR"), satırlar ikon + DURMA +1, ikon + RING OUT +2; alt panelde üç sütun: ALTIN +120 + sikke yığını · CORE kartı (parlayan Çekirdek görseli, LV.2) · BAŞARIM: DÜŞÜRÜCÜ 4/10 + çubuk; altta TEKRAR ve ATÖLYE düğmeleri.
- **Bizde:** maç sahnesi üstünde (soluk) tek sütunlu kart: kalkan simgesi + YENİLGİ/ZAFER, "Bu sefer olmadı.", skor, rakip/süre, Bitiş/Puan tablosu metin, Altın (yer tutucu), Çekirdek kartı satırı (halkalar + XP çubuğu), Başarım (yer tutucu), Yetenek kullanımı, Rövanş/Tekrar + Atölye.
- **Farklar:**
  - [K] Başlıklar "Bitiş / Puan" (C-3, C-15); "CORE" yerine "Çekirdek" (C-3); yenilgi/berabere varyantı (G-21); XP çubuğu ve "Markete git" (C-15); skor ve rakip satırı (ux § 3.5); Rövanş (oda maçı).
  - [S] Başlık plakası (kanat + yıldız; kanat süs olarak IP riski taşımaz, avatar değil) ve konfeti yok.
  - [S] Ödüllerin üç sütun görsel kartları (sikke yığını, Çekirdek görseli, başarım kartı) yerine metin satırları.
  - [S] Tablo satırlarında bitiş ikonları yok.
  - [S] Siyah arka plan yerine sahne üstü katman (ikisi de kabul edilebilir; referans: tam ekran siyah).

### 7.11 Kasıtlı farklar (belge kazandı; kapatılmaz)
| Referansta | Bizde | Neden | Kaynak |
|---|---|---|---|
| 03: 8 stat (Hız, Güç, Defans, Stamina, Denge, Ağırlık, Çeviklik, Turbo) | 6 çubuk | sim parametreleri | C-1 |
| 02: kartta farklı stat çiftleri | aynı 4 çubuk | karşılaştırma | C-2 |
| İngilizce: CORE-A, SPARK, GEAR, VAER, BLAZE STRIKER, STORM/IGNIS/FALCON, COUNTDOWN, TEAM SELECT, OPPONENT, CORE; bozuk FİNF/SCPR, GENKİN OSTAVI | Türkçe sözlük | K-12 | C-3 |
| 07: tam genişlik iki bölgeli çubuk | köşe panelinde eşik renkli çubuk | okunurluk | C-4, C-16 |
| 07/08: eğik arena, 3/4 topaç | **sunum eğik (Hibrit), fizik düz daire**; yalnız "Düz görünüm" erişilebilirlik ayarında tam üstten | sahip kararı K-1 (2026-11-04): kasıtlı fark kalktı, fizik farkı ekranda görünmez | C-5 yerine K-1 |
| 08: alevli kanatlı kuş | özgün avatar | IP | C-6; B-36 |
| 07: kırmızı yasak dairesi | asma kilit + Lv.3 | anlam | C-7 |
| 03/05: X; 03/04/06 karışık ◄ | G-15 kuralı | tutarlılık | C-9 |
| 06: su damlası, yeşil leke | 01'in element silüetleri | belge elementleri | C-10 |
| 01: GİRİŞ | Başla | giriş yapılmış | C-12 |
| 05: kademeli adlar, popup burada | belge adları, popup sonuçta | akış | C-14 |
| 09: yalnız ZAFER | ZAFER/YENİLGİ/BERABERE + XP + Markete git | belge sırası | C-15 |
| 07/08: takım çemberi yok | düz/kesikli çember + ▲/◆ | renk tek kanal değil | ux § 6.1 |
| 07/08: ad, Lv., stamina %, Çatlak yok | var | HUD bilgisi | ux § 2 |
| 07: 3 yuva | 4 yuva (4. boş) + Shift/Space | kontrol haritası | ux § 2 H6-H7 |
| 03: OYNA yok | OYNA var | akış | ux § 3.2 |
| 01: 14 renk | 6 renk | profil çerçevesi kapsamı (D5) | 03 US-1.2 (sayı belgede yok; şerit stili alınır) |

---

## 8. Uyum kapısı (nasıl tutturacağız)

### 8.1 Yöntem
1. **Normalize:** referanslar 1376×768 (16:9'a çok yakın, 1,79:1). Karşılaştırmada referans 1920×1080'e ölçeklenir (×1,395), mantıksal 960×540'a göre ×0,698.
2. **Çekim:** Playwright, viewport 960×540, DPR 2 (= 1920×1080); aynı durum (tohum, takım; maçta `__mac.olaydaDur`). Menü ekranları rem tabanlı, metin ölçeği %100.
3. **Yan yana + bindirme:** sol referans / sağ uygulama; ikinci çıktı %50 bindirme + 8 px ızgara; `docs/production/raporlar/ekran/uyum/NN-*.png`.
4. Kontrol listesi § 8.2; kasıtlı farklar (§ 7.11) ölçümden düşülür.
5. Puan § 7.1 tablosuna yeni sütun olarak yazılır.

### 8.2 Kontrol listesi ve kabul eşiği
| Ölçüt | Ölçüm | Kabul |
|---|---|---|
| Yerleşim | ana öğe kutuları, mantıksal px | ±8 px (arena dahil: Hibrit elips çanak, referans 07/08 ile bindirilir) |
| Palet | baskın renk örneği, ΔE76 (Pillow medyan) | arayüz tokenları ≤ 12; vurgu (turuncu, altın, stamina, Enerji) ≤ 8; element/köken pixel planında kalır |
| Yazı | pixel font, büyük harf etiket, cap-height | font ailesi pixel; boyut ±1 px; alt sınır 10 |
| Öğe sayısı | sayım | birebir, § 7.11 hariç |
| İkon | silüet (ikili maske) | aynı nesne okunur, 3 kişiden ≥ 2 |
| Panel stili | çerçeve rengi/kalınlığı, köşe | 2 px bej dış + koyu iç, basamaklı köşe |
| Hiyerarşi | 0,5 sn bakış | ilk iki öğe aynı |
| Okunurluk | 720p + H.264 ~3 Mb/s | ux § 2 öğeleri okunur |
**Ekran kabulü:** ≥ 4/5, yerleşim ve öğe sayısı kırmızı değil.

### 8.3 Kaçak farklardan öncelikli "Görsel Uyum Geçişi" (GU) iş listesi
Sıra: önce **GU-00 Hibrit kamera** (HUD, efekt ve arena işleri onun koordinat dönüşümüne dayanır), sonra **tüm ekranları birden etkileyen temel** (GU-01), sonra yayında en görünür ekranlar (GU-02…06), menüler (GU-07…10, 13). Tahminler ajan iş günü (tahmin, ölçülmedi). Sim, kurallar ve altın hash'ler değişmez; yalnız sunum katmanı.

| # | Ekran | İş (kaçak farkı kapatır) | Dosyalar | Tahmin | Bağımlılık |
|---|---|---|---|---|---|
| GU-00 | 07/08 | **Hibrit kamera sunumu (her şeyden önce):** `Sahne.ts` mantıksal→ekran dönüşümü (ekranX = x, ekranY = merkez + z·zOranı − yükseklik; zOranı ≈ 0,62, ayar sabiti), arena çizimi (elips çanak, iç duvar, dudak, tribün bandı), topaç yandan/üç çeyrek çizimi (yer tutucu: katmanlı Graphics; gölge elipsi, uç, disk, gövde, çekirdek), Sekme/Ring Out'ta gölge ayrılması, telegraf ve alan dekalleri zeminde taramalı elips + merkez simge, H9 nişan ve H11 kenar uyarısı elips dudakta, efekt yönleri (sarsıntı ve squash normali zOranı ile, 05 § 3.3), çarpışma noktası parlaması, Ayarlar › "Düz görünüm (erişilebilirlik)" eski tam üstten sunumu korur. Sim, tahmin, hash, bot **değişmez** | `oyun/Sahne.ts`, `KusakArenasi.ts`, `TopacGorsel.ts`, `YetenekGorsel.ts`, `Efektler.ts`, `Iz.ts`, ayarlar | **2,5** (dönüşüm 0,5 · arena 0,5 · topaç 0,5 · telegraf/dekal/nişan/kenar 0,5 · efekt + ayar + test/ekran 0,5) + sanat kolu (topaç sprite kareleri 35–45° açıdan render, pixel planı § 3; yön/eğim kare seti ~×2) | `@pebble` okunurluk testi (dikey mesafe, kenar); `@byte` determinizm kapısı yeşil kalmalı |
| GU-01 | tümü | **Temel:** pixel font (Türkçe glifli, OFL/CC0, lisans krediler'e) + büyük harf etiket kuralı; token seti § 2.5 (lacivert panel, bej çerçeve, bronz, turuncu vurgu, kırmızı geri); panel bileşeni (basamaklı köşe, çift çizgi), başlık plakası, kırmızı kare ◄ sol üstte, ana eylem bronz-turuncu; `araclar/uyum-ekran.ts` (§ 8.1 çekim + yan yana) | `index.html` (`:root`), `ekranlar/arayuz.ts`, `oyun/MacHud.ts`, `oyun/renkler.ts`, yeni araç | 1,5 | `@pebble` CVD testi; font lisansı |
| GU-02 | 07 | HUD: "STAMINA"/"ENERJİ" pixel etiketleri, Enerji yeşil → dolu turuncu-sarı, stamina tonları § 2.5, skor bronz trapez plaka + turuncu rakam | `oyun/MacHud.ts` | 0,5 | GU-01 |
| GU-03 | 07 | Arena dokusu (GU-00'ın üstüne): ışıyan halka (glow, linear katman, `#FBBE88`), çatlaklı taş + çakıl, merkez çukur, iç duvar dikişleri, tribün kalabalık bandı (tileset, uzak sıra küçük) | `oyun/KusakArenasi.ts`, `public/` arena dokuları | 1 | GU-00; `@cove` |
| GU-04 | 07/08 | Çarpışma efekti: ışınsal yıldız patlaması, takım/element renkli hız çizgileri, belirgin gölge; dash koni izi; topaç üstü element aurası | `oyun/Efektler.ts`, `Parcaciklar.ts`, `Iz.ts` | 1 | efekt-oturumu K2 (pixelfx `hit-spark`/`crit-hit` pişirme) isteğe bağlı |
| GU-05 | 08 | Ulti: eş merkezli 2 halka telegraf (tarama korunur), Enerji dilim + ULTİ etiketi rengi, kenar parlaması `#E6680C`, avatar yer tutucusunu referans kompozisyonuna (arkada, üst-orta, büyük, yarı saydam) taşı | `oyun/YetenekGorsel.ts`, `MacHud.ts` | 0,5 | avatar sanatı ayrı (PixelLab sahip onayı) |
| GU-06 | 09 | Sonuç: ZAFER plakası (kanat + yıldız), konfeti, tablo ikonları, ödül üç sütun kartı (sikke, Çekirdek görseli, başarım), siyah tam ekran zemin | `ekranlar/Mac.ts` | 1 | GU-01; Altın/başarım verisi D7 |
| GU-07 | 03 | Atölye: blueprint arka planı, ikon ızgarası envanter (geçici ikon: parça sprite'ından küçültme ya da Graphics), patlatılmış dikey parça görünümü, turuncu çerçeveli çubuklar, sekme ikonları, takım kartında topaç ikonu | `ekranlar/Atolye.ts`, `oyun/TopacOnizleme.ts` | 1,5 | D6 bitmeli; parça ikonları (pixel planı § 7) |
| GU-08 | 06 | Lobi: tek ekran üç sütun (mod · geri sayım + takım kartları · rakip), büyük geri sayım kutusu, takım kartında topaç sprite'ı, alt rozet bandı, Dereceli düğmesi (soluk, "yakında"), ◄ sol üst | `ekranlar/Lobi.ts` | 1 | GU-01 |
| GU-09 | 02 | İlk çekirdek: tapınak arka planı, kaide + köken renkli küre, topaç ikonu çerçevesi, köken adı plakası, segmentli köken renkli çubuklar; önizleme Pixi sprite'ı | `ekranlar/IlkCekirdek.ts` | 1 | sahne arka planı görseli (el çizimi ya da üretim, IP kontrolü) |
| GU-10 | 01 | Giriş/profil: iki panel (sol Çekirdek illüstrasyonu), logo rozeti, pixel arma ikonları, renk şeridi stili | `ekranlar/Profil.ts`, `Kimlik.ts`, `oyun/elementSimge.ts` | 0,75 | illüstrasyon görseli |
| GU-11 | 04 | Market: referans düzeni D7'de doğrudan uygulanır (ahşap tabelalı 2×2 raf, fiyat rozeti, kilit + ilerleme, ???, günün parçası bandı, ALTIN sayacı, pazar arka planı) | `ekranlar/Diger.ts` → yeni `Market.ts` | D7 içinde +0,5 | D7 |
| GU-12 | 05 | Başarımlar: 6 sekme, kalkan rozetli kart ızgarası, ilerleme çubuğu, kilitli gri hâl | `ekranlar/Diger.ts` → yeni `Basarimlar.ts` | D7 içinde +0,5 | D7 |
| GU-13 | menüler | **Sadelik geçişi:** `docs/design/sadelik-ilkeleri.md` § 2 "kaldır/sakla" satırları (filtreler tek düğme, element çarkı → rozet, geliştirici araçları `?gelistir=1`, Günlük → Çekirdek ayrıntı paneli, uzun açıklamalar, tek ana düğme kuralı); § 5 KS-1…KS-6 kararlanınca o satırlar | `ekranlar/*.ts`, `arayuz.ts` | 1 | GU-01; KS kararları |
| | | **Toplam** | | **~13 ajan günü** (GU-00…10 ve 13; GU-11/12 D7'ye eklenir; sanat kolu ayrı) | |

**Kapsam dışı (GU puanını sınırlar, ayrı hat):** topaç sprite'ları (Blender → pixel boru hattı, pixel planı § 7), ruh avatarları (pixel planı § 4.3), parça ikon seti (B-14 ≤ 12 şekil), sahne arka plan görselleri (02 tapınak, 03 blueprint, 04 pazar, 01 Çekirdek illüstrasyonu; üretim yolu ve IP kontrolü `@iris`), efekt pişirme (efekt-oturumu K2).

**GU kabul ölçütü:** 01, 02, 03, 06, 09 ≥ 4/5; 07, 08 HUD ve arayüz ≥ 4/5 (sanat hattı gelene kadar topaç/avatar notu ayrı); 04, 05 D7 kapanışında ≥ 4/5; konsol hatası 0; testler ve determinizm kapıları yeşil; erişilebilirlik ayarları bozulmadı; sahip yan yana görüntüleri onaylar. Rapor `docs/production/raporlar/GU.md`.

---

## 9. Çelişkiler / açık sorular

### 9.1 Sahip kararı bekleyen
**K-1 · Kamera → KARAR: Hibrit (sahip, 2026-11-04).** Sahip önce "tam nasıl olur hayal edemiyorum" dedi, maket istedi, ardından "Referanstaki gibi olsun her şey istiyorum" diyerek **hibrit**i seçti.
- **Ne demek:** sim ve çarpışma düz daire / üstten koordinatla kalır (sim, tahmin, hash, bot, telegraf alan **geometrisi** değişmez); yalnız çizim eğik görünür: elips çanak (~35–45° yükselti, referans 07/08), topaçlar yandan / üç çeyrek, iç duvar ve tribün görünür, gölgeler elips, telegraf halkaları ve alanlar zeminde elips.
- **Dönüşüm:** ekranX = merkezX + x; ekranY = merkezY + z·zOranı − yükseklik; zOranı ≈ 0,62 (0,6–0,7 aralığı, ayar sabiti; maket 0,62 kullandı). Topaç yüksekliği (Disk, Sekme) ekranda yukarı kayma; Sekme / Ring Out düşüşünde gölge ayrılır. Ekran sarsıntısı ve squash normali aynı oranla çevrilir (05 § 3.3).
- **Maliyet (tahmin):** sunum katmanı ~2–3 ajan günü (GU-00: Sahne dönüşümü, topaç çizimi, zemin/duvar/tribün, telegraf elips çizimi, efekt yönleri, kenar uyarısı ve nişan çizgisi, "Düz görünüm" ayarı, test/ekran) + sanat kolu (topaç sprite kareleri 35–45° açıdan; pixel planı § 3 render düzeneğinde kamera açısı değişir, yön/eğim kare seti ~×2).
- **Okunurluk riski:** dikey eksende mesafe ve kenar ~%38 kısalır; yukarı-aşağı çarpışmalar ve üst/alt kenara yakınlık daha zor okunur; topaç üstte duran topacı kısmen örtebilir.
- **Önlemler:** (1) telegraf alanları zeminde **taramalı elips + merkezde element simgesi** (ux § 2.2 korunur); (2) H11 kenar uyarısı **elips dudak üzerinde** yay; (3) çarpışma noktası parlaması (yıldız patlaması) temas noktasının ekran izdüşümünde; (4) takım çemberi zeminde elips (▲/◆ topacın üstünde); (5) z-sırası ekranY'ye göre, öndeki topaç önde; (6) Ayarlar › **"Düz görünüm (erişilebilirlik)"**: eski tam üstten sunum korunur ve aynı sim üstünde çalışır; (7) `@pebble` okunurluk testi (720p, H.264) ve GU-00 kabulünde dikey çarpışma senaryosu.
- **Görsel:** `maketler/m1-mac-hibrit.png`, `m2-ulti-hibrit.png`, üçlü kıyas `m4-kamera-kiyas.png`, önce/sonra `karsilastirma-mac.png`, `karsilastirma-ulti.png`.
- **Not:** bu "Hibrit" önceki taslaktaki C satırından (çanak ~%85–90 basık, ~15–20° topaç) **daha eğiktir**; sahip referansa en yakını istedi. Pixel planı § 1.1 C (zemin tam üstten) ve § 2.2 (topaç tam üstten katmanlar) bu karara göre revize edilmeli (Ç-19).

**K-2 · Ana eylem rengi → varsayılan: bronz-turuncu** (§ 4.3). Sahip cevap vermedi, itiraz etmedi; maketler bu kuralı kullanır. 01'deki yeşil GİRİŞ kullanılmaz.
**K-3 · Enerji rengi → varsayılan: dolarken yeşil `#86E065`, Ulti hazırken sarı-turuncu `#FEE55F` + "ULTİ" `#E8762F`** (§ 2.5). Sahip cevap vermedi, itiraz etmedi. CVD sınaması GU-01'de.
**KS-1…KS-6 · Sadelik önerilerinin bağlayıcı belgelerle çelişen maddeleri** (Market hizip alt başlıkları, üst gezinti, Günlük ekranı, element çarkı, Dereceli düğmesi, HUD ipuçları): `docs/design/sadelik-ilkeleri.md` § 5. KS-1 acil: D7 Market alt başlıklarını şu an yazıyor.

### 9.2 Belge çelişkileri
| # | Konu | Çelişen kaynaklar | Durum | Kime |
|---|---|---|---|---|
| Ç-1 | Atölye çubuk sayısı | 03 US-2.1 ve nile § 2 D6 "8 çubuk" · C-1/G-32 ve D6 kodu: 6 | 6 | `@helix` |
| Ç-2 | Ulti kilit etiketi | ux § 2 H6 "Lv.4" · nile K-7 ve D3: Lv.3 | Lv.3 | `@tide` |
| Ç-3 | Flaş tepe | 05 § 3.2 %25/%40/%30 · ux § 6.2 ≤ %25 | ≤ %25 | 05 yazarı |
| Ç-4 | Hız şeridi rengi | pixel § 6.2 beyaz `#F2F2EE` · § 6.3 ve kod `#F2E8B0` · referans ışıyan krem-turuncu halka | referans (glow) hedef | `@iris`, `@cove` |
| Ç-5 | Hafif hitstop | pixel § 5.1: 0 · 05: 33 ms | 33 ms | `@iris` |
| Ç-6 | Bitiş hitstop | pixel § 5.1 100 ms · 05 133/166 · ux ≤ 166 | 05 + ux | — |
| Ç-7 | CVD ön ayarında rakip turuncu `#F2A33A` = stamina amber | ux § 6.1 · ux § 2 H1a | GU-01'de stamina tonları değişince yeniden sına | `@tide`, `@pebble` |
| Ç-8 | Lobi geri düğmesi | ux § 3.2 sol üst · `D5-lobi.png` sağ üst | GU-08 | `@glyph` |
| Ç-9 | Giriş | 03 US-1.1 ve ux: Kick · D5: ad + şifre | sahip kararı | Kick dilimi |
| Ç-10 | Oda kodu | 03 § 5.1 4-6 · ux + D4: 8 harf | 8 | `@helix` |
| Ç-11 | İlk arena adı | pixel "Kuşak Çanağı" · nile B-12 "Kuşak Arenası" | Kuşak Arenası | `@iris` |
| Ç-12 | Kamera | referans eğik · belgeler tam üstten | **Çözüldü: K-1 = Hibrit** (2026-11-04) | sahip |
| Ç-13 | Yazı tipi | belgelerde yok · referans pixel · kod sans | pixel (GU-01) | `@iris`, `@glyph` |
| Ç-14 | `SAHNE_RENK.zemin` `#3B4A4F` vs Kuşak `#6E6A66` | `renkler.ts` · `KusakArenasi.ts` | tek tokena bağla (GU-01) | `@glyph` |
| Ç-15 | Enerji rengi referansın kendi içinde | 07 yeşil · 08 turuncu-sarı · kod açık mavi | **K-3 varsayılan** (yeşil → Ulti'de sarı-turuncu) | sahip (itiraz etmedi) |
| Ç-16 | Element simgeleri | ux § 6.1 Kasırga bulut/hortum, Girdap sarmal · referans 01: bulut, **mavi hortum**, sarmal yok; kod: Kasırga yeşil hortum, Girdap sarmal | belge kazanır (Girdap = sarmal); 01'in bulut simgesi Kasırga'ya alınabilir | `@iris` |
| Ç-17 | Avatar boyutu | pixel § 4.1 192-216 px · referans 08 ~%50 ekran yüksekliği | pixel sınırı (okunurluk) | `@iris` |
| Ç-18 | `tide-ux.md` C-11 "alt rozetlerin anlamı yok" ve C-10 "su damlası ve yeşil leke" | referans 06'da rakip panelinde alev, sarı güneş benzeri ve yeşil leke; takım kartlarında alev, su damlası, yeşil | C kaydı doğru; rakip ikonlarından biri güneş benzeri (kayıtta yok) | bilgi |
| Ç-19 | Topaç ve zemin bakışı | `topac-pixel-plani.md` § 1.1 C, § 2.2 (zemin ve topaç tam üstten), `tide-ux.md` C-5 · K-1 = Hibrit (sunum eğik) | K-1 kazanır; pixel planı revize edilir (render açısı 35–45°, yandan katman sırası, elips gölge) | `@iris` |
| Ç-20 | Eski "kamera bekliyor / belge kazanır tam üstten" metni | `docs/art/referans.md` son satır, `docs/design/beyblade/gorunum/README.md` ("07/08'deki eğik kamera: pixel planının tam üstten bakışı") | K-1 kazanır; iki dosya bu görevin yazma kapsamı dışında, sonraki belge geçişinde güncellenir | `@iris` |
| Ç-21 | Sadelik vs bağlayıcı lore/akış belgeleri | `04-sozluk.md`, `03` US-2.1/2.2/3.2, ux § 3.2, § 2 H6–H7 | `sadelik-ilkeleri.md` § 5 KS-1…KS-6 | sahip |

---

## 10. Maketler (2026-11-04)

Yer: [`docs/art/maketler/`](maketler/) (README orada). Hepsi **yer tutucu sanat, nihai değil**; oyun kodu import edilmeden HTML/Canvas ile çizildi (480×270 mantıksal piksel, ×4 tam sayı ölçek, Bayer dither, 4–6 tonlu rampalar), Playwright ile 960×540 DPR 2 (= 1920×1080) çekildi. Yazı tipi: Pixelify Sans (OFL, etiket ve metin) + Press Start 2P (OFL, yalnız rakamlar); ikisi de Google Fonts'tan maket için indirildi, oyuna girmeden önce GU-01'de lisans ve Türkçe glif denetimi (`krediler.md`) gerekir.

| Görsel | Ne gösterir |
|---|---|
| `m1-mac-hibrit.png` | M1 · 07 karşılığı: Hibrit eğik elips çanak, çatlak taş + çakıl, ışıyan halka `#FBBE88`, iç duvar ve tribün kalabalığı, yandan katmanlı Kor ve Girdap topaçları, elips gölge, takım elipsleri, çarpışma (yıldız patlaması, şok elipsi, iki renkli parçacık, hız çizgisi, krem sarmal iz), referans HUD (STAMINA/ENERJİ, kırmızı→sarı çubuk, yeşil Enerji, bronz skor plakası, süre, yuvalar, takım yuvaları) |
| `m2-ulti-hibrit.png` | M2 · 08 karşılığı: kenar turuncu parlaması, zeminde iki kırmızı elips halka + çapraz tarama, Kor alev aurası, Girdap atılış konisi, ruh **Közkaracal** (püsküllü kulaklı, alev yeleli kedi; kanatsız, kuş/ejderha/anka değil), Enerji 3 sarı-turuncu dilim + ULTİ, H5 bandı |
| `m3-ilk-cekirdek.png`, `m3-atolye.png`, `m3-market.png`, `m3-basarimlar.png`, `m3-oyna.png`, `m3-lobi.png`, `m3-sonuc.png` | M3 · sade menü ailesi (02, 03, 04, 05, 06 mod seçimi, 06 eşleşme, 09): aynı panel/düğme/başlık bileşenleri, tek ana düğme, referans sahneleri (tapınak, blueprint, pazar sokağı, konfeti) |
| `karsilastirma-*.png` | Önce (D5/D6 ekran görüntüsü) / sonra (maket) ve kaldırılan–eklenen öğe listesi: `ilk-cekirdek`, `atolye`, `market`, `basarimlar`, `oyna`, `lobi`, `sonuc`, `mac`, `ulti` |
| `m4-kamera-kiyas.png` | M4 · şimdiki oyun / Hibrit maket / referans 07 yan yana; kayıp, kazanç, "fizik değişmez", önlemler ve dönüşüm şeması |

