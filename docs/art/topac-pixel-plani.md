# Topaç ve avatar pixel art boru hattı planı (Devran)

**Tarih:** 2026-11-04 · **Yazar:** [@iris · Game Art Director] · **Durum:** taslak, sahip onayı bekliyor.
Bağlı belgeler: `docs/design/beyblade/00-lore-cercevesi.md` (§ 2.4, § 3.2, § 4, § 5), `01-arena-eslemesi.md` (§ 5), `docs/research/beyblade/04-...md` (§ 1, § 3.3), `docs/research/pokerivals-oynanis-gozlemi.md`.
Bu belge `docs/art/fusion-animasyon.md`'in (8 yönlü karakter, SpriteCollab kompozisyonu) yerini alır; o belge "iptal, tarihçe" notuyla kalır. Sayılar **tahmin**dir (ölçülmedi), ücretli araç kullanılmadı, yalnız plan. Terimler oyuncuya görünen yeni sözlüktür: Topaç, Çekirdek, Gövde, Disk, Uç, Element, Köken (Göktaşı / Maden / Yapay / Karanlık), Stamina, Enerji, Altın, Yetenek / Özel Yetenek / Ulti, Takım Ultisi, Durma / Ring Out / Parçalanma, Lv.1-4. Altı Element'in kendi adları (Kor, Kasırga, Şimşek, Girdap, Kaya, Don) 00 § 3.2'deki gibi kalır; sahip değiştirmedi.

**Eski belgelerdeki adların eşlemesi (okurken):** Kabuk = Gövde, Halka (parça) = Disk, Hane = Element, Soy = Köken (Düşen = Göktaşı, Çıkan = Maden, Dökme = Yapay, Kül = Karanlık), devir = Stamina, Yankı = Enerji, Kıvılcım = Altın, Teknik = Yetenek, İmza = Özel Yetenek, Nihai = Ulti, Üçleme = Takım Ultisi, Sönüş = Durma, Düşüş = Ring Out, Uyku/Uyanış/Parlama/Doruk = Lv.1/2/3/4.

---

## 0. Özet karar

| Konu | Öneri |
|---|---|
| Bakış | Zemin **tam üstten**; Topaç tam üstten çizilir, yükseklik hissi gölge kayması + katman paralaksıyla; tribün PokeRivals gibi üst bantta eğik |
| Boyut | Topaç **64 px** (mantıksal 960×540, 56-72 aralığı), arena çanağı ~440 px çap, tam sayı ölçekleme (1080p'de ×2) |
| Mimari | **Katmanlı**: Uç + Disk + Gövde + Çekirdek + sabit parlama + gölge; her katman kendi simetri periyodunda kare dizisi |
| Dönüş | **(c) 3D → üstten render → pixel** ana yöntem; (b) önceden render kareler olarak çalışma zamanında oynar; (a) `rotation` yalnız parlama/efekt ve v0 yer tutucu için |
| Hız kademesi | Yüksek: bulanık disk; Orta: hareket bulanıklı kanat; Düşük: keskin yavaş kanat + **yalpalama** (Stamina'nın görsel göstergesi) |
| Avatar | Element başına 1, toplam **6 büyük pixel illüstrasyon** (192×192); Köken = palet takası, Lv. farkı = efekt; ilk sürümde 2 ile spike |
| Efektler | Hitstop, yönlü sarsıntı, spark, iz, şok çemberi kodla; atlas yalnız 20-30 küçük doku |
| Ücret | Tek kalem PixelLab (avatar), tahmin ≤ $12; onsuz plan: 3D→pixel + Gemini taslağı + el temizliği |

---

## 1. Görsel tez

### 1.1 Üç bakış seçeneği

| Seçenek | Artı | Eksi |
|---|---|---|
| **A. Tam üstten** (ortografik, derinlik ölçeği yok) | Daire çarpışması düz okunur: temas noktası ve normal ekranda gerçek; mesafe yargısı doğru; Ring Out kenarı net; dönüş simetrisi bozulmaz; kare sayısı en düşük | Yükseklik (Disk farkı) yok; tribün/atmosfer düz kalır |
| B. 2.5D eğik (~30-40° yükselti) | Atmosfer, Pokémon tarzı; Topaç yüksekliği görünür | Topaç elipse sıkışır, dönüş kareleri bakış başına ayrı çizilir; çarpışma mesafesi dikeyde yanıltır (Sahne.ts'in z→ölçek yaklaşımının tuzağı); kare sayısı ×2 |
| **C. Karma (öneri):** zemin ve Topaç tam üstten; **yükseklik ipuçları** gölge kayması + katman paralaksı + çanak eğimi gölgesi; tribün ve kenar duvarı üst bantta eğik | A'nın okunurluğu + B'nin atmosferi; PokeRivals ekranındaki gibi zemin düz, tribün şeridi üstte (`04-mac-nisan-oku.jpg`: zemin üstten, tribün bandı eğik, iki oyuncu ~30 px ve zeminde turuncu halka) | Zemin ile tribün arasında perspektif geçiş hattı ayrı çizilir |

**Öneri: C.** Gerekçeler:
1. **Çarpışma okunurluğu:** iki dairenin temas noktası, vuruş normali, Ring Out sınırı tam üstten doğrudur. Efektler (spark, şok çemberi, geri itme) bu normale hizalanır.
2. **Gölge:** her Topaç altında elips değil **yuvarlak** gölge; Topaç yükseldikçe (Sekme, Ring Out düşüşü) gölge Topaç'tan ayrılır ve küçülür. Gölge ayrılması yükseklik bilgisini taşır, ekstra kare gerekmez.
3. **Yükseklik farkı Disk'ten gelir:** Disk yüksekliği (00 § 5.2 `yukseklik`) iki şeyle görünür: Disk'in Gövde altından taşan çapı ve **gölgenin kayma mesafesi** (yüksek Disk = gölge 2-3 px daha uzakta). Çarpışmada yüksek Disk'li Topaç rakibin Gövdesinin üstünden "bindiriyor" gibi katman sırası değişir (§ 2.4).
4. **Sahne.ts uyumu:** mevcut 2.5D `ufukY / zeminAltY / yakinOlcek / uzakOlcek` derinlik ölçeği **kalkar**; mantıksal 960×540 alan, letterbox ve ekran sarsıntısı kalır. Bu `@byte` işidir; ben yalnız gereksinim yazıyorum.

### 1.2 Ölçekler (tahmin, spike'ta doğrulanır)

| Büyüklük | Değer | Not |
|---|---|---|
| Mantıksal tuval | 960×540 (mevcut) | 1080p'de ×2, 1440p'de ×2,67 (**yalnız tam sayı ölçek**, kalanı letterbox) |
| Topaç | **64×64** (Gövde sınırı); 56-72 arası parça başına | PokeRivals ekranında karakter ~30 px / 770 px genişlik (%4); bizde 64/960 = %6,7: kasıtlı büyük, çünkü tek tip Topaç, efektler ve yalpalama okunmalı |
| Disk | 44-52 px çap | Gövde kanatları arasından görünür |
| Çekirdek | 14-16 px | Köken ışığı + Lv. işareti |
| Uç | 8-12 px | Yalnız yalpalama ve düşüşte görünür |
| Arena çanağı | ~440 px çap (üst bant HUD ~56 px, alt ~48 px, yanlarda tribün/bilgi) | Topaç/çanak çapı oranı ~%15; gerçek stadyumda ~%20, daha açık alan = daha fazla manevra |
| Kamera | **Sabit**, takip yok; çarpışmada kısa zoom darbesi (×1,03, 80 ms), Parçalanma ve Ulti'de ×1,08 (200 ms) | Sahibin izleyici (Kick) görünümü sabit çerçeve ister |
| Avatar | 192×192 yerel piksel (~%36 ekran yüksekliği), yarı saydam | § 4.1 |

### 1.3 Piksel yoğunluğu kuralı
Her şey **aynı mantıksal piksel yoğunluğunda** çizilir (1 px = 1 px). Karma yoğunluk (ör. avatar ×2) yasak; avatar yarı saydam, toplamalı karışımlı "hayalet" olarak çizilerek büyük ölçeğin kaba görünmesi önlenir. Ölçekleme: tam sayı + `nearest` (statik varlıklar); gölge, parlama ve iz gibi **bulanık** katmanlar linear.

---

## 2. Topaç sprite mimarisi: parça katmanları

### 2.1 Birleşik sprite mi, katman mı

| Ölçüt | Tek birleşik sprite | **Katmanlı (öneri)** |
|---|---|---|
| Kombinasyon | 12 Gövde × 8 Disk × 8 Uç × 6 Element = **4 608** sprite seti; imkansız | 12 + 8 + 8 parça seti (28) + Element palet takası (6); **doğrusal büyür** |
| Serbest parça karışımı (00 § 5.3) | Çalışmaz | Doğal çalışır |
| Parçalanma | Kesilmiş parçalar ayrıca çizilmeli | **Bedava:** katmanlar zaten ayrı; fırlayan parçalar hazır |
| Yalpalama / Durma | Ek animasyon gerekir | Katman ofset ve eğimleriyle kodda |
| Bellek ve çizim | 1 sprite | ~6 sprite / Topaç; tek atlas ve aynı tabaka = toplu çizim, 2 Topaç = 12 sprite, önemsiz |
| Risk | Parçalar arası ışık uyumu | Aynı render düzeneği (§ 7.2) ve ortak ışık yönü ile çözülür |

### 2.2 Katman sırası (alttan üste)

| # | Katman | Boyut | Dönüş | İçerik / kural |
|---|---|---|---|---|
| 0 | **Zemin gölgesi** | Disk çapının %110'u | Yok | Yuvarlak, 2 tonlu dither; Disk yüksekliğine göre kayma (2-5 px, sol-alt) ve Sekme'de ayrılma |
| 1 | **Takım çemberi** | Topaç çapı +6 px | Yok | İnce (2 px) çember; takımın rengi (§ 5.2). Okunurluk: tür, takım, gelen telegraf anında ayırt edilmeli |
| 2 | **Uç** | 8-12 px | Evet | Altta; yalnız yalpalama/devrilmede görünür; temas noktası olarak izlerin başlangıcı |
| 3 | **Disk** | 44-52 px | Evet, **kendi periyodu** | Kilit çıkıntıları (Parçalanma eşiğini görsel ifade eder: çok çıkıntı = sıkı kilit); Gövde boşluklarından görünür |
| 4 | **Gövde** | 56-72 px | Evet, kendi periyodu | Kanat şekli ve Element boyası; Topaç'ın silueti |
| 5 | **Çekirdek** | 14-16 px | Yavaş (Gövde'den bağımsız) | Köken ışığı, Lv. işareti, parıltı |
| 6 | **Sabit parlama** | Gövde boyutu | **Dönmez** | Işık yönüne sabit tek parlama lekesi (§ 3.1 (a)'nın zayıflığını çözer) |
| 7 | Efektler | — | — | Trail, spark, şok çemberi: Topaç'ın üstünde/altında ayrı katmanlar |

### 2.3 Palet kuralı

| Öğe | Kural | Renkler (ad + hex, tahmin; spike'ta gri tonda ve renk körlüğü simülasyonunda sınanır) |
|---|---|---|
| **Element** → Gövde boyası (4 tonlu rampa: koyu / orta / açık / vurgu) + iz rengi | Gövde, **takılı Çekirdek'in Element**ine göre boyanır; şekil ve doku parça kimliğinde kalır | Kor kızıl `#E8452C`; Kasırga turkuaz-yeşil `#5BD1A5`; Şimşek sarı `#F7D83A`; Girdap kobalt `#2A5BD7`; Kaya toprak-gri `#8A7458`; Don buz `#9FE3F5` |
| **Köken** → Çekirdek ışığı, iz iç çizgisi, Lv. çemberi | Köken Gövde rengini **değiştirmez** | Göktaşı sıcak beyaz-altın `#FFE9A8`; Maden toprak-kehribar `#C8842B`; Yapay soğuk çelik-mavi `#7F95A8` (düşük doygunluk); Karanlık mor-siyah `#5B2A86` ve `#1A0F26` |
| **Lv.1-4** | Çekirdek üstünde işaret: Lv.1 sönük nokta; Lv.2 tek ince çember; Lv.3 çift çember + ruh silueti sparkı; Lv.4 altın taç çıkıntıları + sürekli parlama | Altın `#FFC93C` (Lv.4 vurgu) |
| **Çizgi** | Her katman 1 px koyu dış çizgi, Element rampasının en koyusu (saf siyah değil) | |
| **Takım** | Zemin çemberi, Topaç renginden bağımsız | Oyuncu camgöbeği `#2FB8E8`, rakip eflatun-pembe `#E83A8C` (PokeRivals HUD'unun iki rengi okunurlukta kanıtlı) |
| Okunurluk uyarısı | Girdap kobalt ile takım camgöbeği ve Yapay çelik-mavi ile Don buz yakın; gri tonda, protanopi ve deuteranopi simülasyonunda sınanacak | `@tide` ile ortak test |

Element **kaynağı** (Gövde mi Çekirdek mi) `@helix`'e açık soru: 00 § 3.2 Element'i ruha (Çekirdek) bağlıyor; bu belge Çekirdek'ten alıyor ve Gövde'yi boyuyor. Gövde'nin kendi Element'i varsa palet takası aynı çalışır.

### 2.4 Katman davranışı (kodla, sprite gerektirmez)

| Durum | Katman hareketi |
|---|---|
| Normal | Hepsi aynı merkezde; Disk ve Gövde kendi periyotlarında kare seçer |
| Yalpalama (Stamina düşük) | Gövde+Disk+Çekirdek, Uç temas noktası etrafında **küçük yörüngede** döner (yarıçap 0-6 px = (1 - Stamina oranı)); gölge ters yöne kayar; Gövde'ye çarpık ölçek (0,94 yatay) |
| Çarpışma bindirme | Yüksek Disk'li Topaç'ın Gövdesi rakibin Gövdesinin **üstünde** çizilir (z-sırası yüksekliğe göre) |
| Sekme | Tüm katmanlar 8 px yukarı, gölge ayrılır ve %70'e küçülür, 0,3 s |
| Sol dönüş (Karanlık, Yapay çift) | Kare dizisi **ters yönde** oynar; Gövde şekli kanat süpürmesi yüzünden aynalanır (§ 3.2 sol dönüş varyantı) |

---

## 3. Dönüş gösterimi

### 3.1 Üç yöntem

| Ölçüt | (a) Pixi `rotation` | (b) Önceden render N kare | **(c) 3D → üstten render → pixel** |
|---|---|---|---|
| Kaynak | Tek elle çizilmiş sprite | Elle çizim + RotSprite türü döndürme ya da (c)'den | Blender parametrik parça modelleri |
| Kenar kalitesi | `nearest` döndürmede kenar basamak/karışık piksel ("mixel"), 1 px çizgiler kopuk; linear ile bulanık = pixel art estetiği gider | Her kare piksel mükemmel (elle düzeltilebilir) | Her kare piksel mükemmel, kuantize paletle tutarlı |
| Radyal simetri affı | Disk ve çemberlerde tam; **3 kanatlı Gövde'de bile** simetri periyodu içinde kenar hâlâ titrer | Periyot içi kare yeter | Periyot içi kare yeter |
| Işık tutarlılığı | **Bozuk:** baked parlama/gölge sprite ile döner | Sabit ışıkla çizilirse doğru | **En iyisi:** ışık sabit, nesne döner, otomatik |
| Hız bulanıklığı | Filtre/kopya katmanı gerekir | Ayrı çizim | Sahne içi hareket bulanıklığı (alt-örnekleme birikimi) ya da kare karıştırma |
| Parça sayısı çarpanı | 1 sprite/parça | 8+ kare/parça; elle çizmek pahalı | Betik üretir; **parça başına insan emeği = modelleme** |
| Yeni parça maliyeti | Düşük | Orta-yüksek | Orta (model + 1 betik çalıştırma) |
| Sol dönüş | `scale.x = -1` (ışık da aynalanır) | Ayrı çizim | Modeli aynala, yeniden render (ışık doğru kalır) |

### 3.2 Karar

**Ana yöntem (c), çalışma zamanında (b) olarak oynar; (a) yalnız dönen parlama, halo, gölge ve efekt sprite'ları ile v0 yer tutucuda.**
- Gerekçe: N × M × K kombinasyonu elle çizilemez; (c) "parça modeli bir kez → tüm kareler + bulanık varyantlar + sol aynası otomatik" verir. Blender yerel olarak kurulu (5.2.2 LTS, ücretsiz); ücret yok.
- **Elle dokunuş (Aseprite/LibreSprite):** yalnız "kahraman parçalar" ve render hataları; zorunlu değil.
- **v0 yer tutucu:** elle çizilmiş tek Gövde sprite'ı `rotation` ile; `@spark` spike'ında **(a) vs (c) yan yana** ölçülür (§ 9). (a) beklenenden iyi çıkarsa Gövde için (c) geriye düşer; Disk ve Uç yine (c).

### 3.3 Kare sayısı hesabı (simetri periyodu)

n kanatlı Gövde'nin periyodu 360°/n. Periyot başına **F = 8 kare** (adım = periyot/8), keskin kademe için. Çevrede tüm kareyi saklamak yerine yalnız periyot dilimi saklanır, indeks `floor(θ / (periyot/8)) mod 8`.

| Gövde (kanat n) | Periyot | Adım (F=8) | Tam tur eşdeğeri | Tasarruf |
|---|---|---|---|---|
| 2 | 180° | 22,5° | 16 kare | ×2 |
| **3** | **120°** | **15°** | 24 kare | **×3** |
| 4 | 90° | 11,25° | 32 kare | ×4 |
| 5 | 72° | 9° | 40 kare | ×5 |
| 6 | 60° | 7,5° | 48 kare | ×6 |
| Asimetrik (n = 1) | 360° | 45° (F=8 yetmez) | F=24 kullan, adım 15° | ×1 |

Adım seçimi **dönme hızına** bağlı: keskin kademede görsel hız ≤ 2,5 tur/sn = 900°/sn = 15°/kare (60 fps); 3 kanatlıda (periyot 120°) bu tam 1 kare/tik: periyot/8 adım hızı aşmaz. Daha hızlıda **vagon tekeri/strobo** (kare atlaması gerçek hareketle çelişir) oluşur; bu yüzden hız arttıkça kademe değişir (§ 3.4). Tahmin: bu eşik spike'ta ölçülür.

Katman başına periyot ayrı olduğundan Disk (k çıkıntı, periyot 360°/k) ve Gövde aynı θ ile farklı kare indeksi seçer. Kombinasyon sayısı katlanmaz.

### 3.4 Hız kademeleri (Stamina'nın görsel göstergesi: HUD'a bakmadan okunmalı)

**Kozmetik dönüş hızı Stamina oranından türetilir, simden bağımsızdır** (sim yalnız Stamina verir; `θ` istemci tarafında). Kademe sınırlarında histerezis (%3).

| Kademe | Stamina oranı (tahmin) | Görünüm | Kare planı (Gövde başına) | Efekt |
|---|---|---|---|---|
| **Yüksek** | > %60 | Bulanık disk: Gövde dairesel boyalı bulanıklık, dışta ince parlama dönmesi | 3 kare disk (n-katlı zayıf desen, 12 fps titreşim) + **1 dönen parlama sprite'ı** (`rotation` ile, 6 tur/sn) | Köken renkli ince iz; kenar şeridinde (hız bandı) ek spark |
| **Orta** | %25-60 | Hareket bulanıklı kanatlar (her kanat arkasında süpürme izi) | **8 kare** (periyot başına), render sırasında ±30° alt-örnekleme birikimi | İz kısalır |
| **Düşük** | < %25 | Keskin, **yavaş** dönen kanatlar, belirgin **yalpalama** | **8 kare keskin** (Orta kademenin keskin hâli) | Yalpalama yörüngesi; Uç temas izi; spark seyrek |
| Durma anı | %0 | Yatma | v1: kodla (elips kısalması + gölge yaklaşma); v2: Blender'dan **8 kare yatma dizisi** (0-80° eğim) | Toz halkası |

Hızlar (tahmin): Yüksek 6-10 tur/sn (parlama), Orta 3 → 1,5 tur/sn, Düşük 1,5 → 0,4 tur/sn. Yalpalama frekansı ~1,5-2 Hz (R04 § 3.3 precession: düşük RPM'de eksenin konik salınımı), yarıçap Stamina azaldıkça büyür. Oyuncu yalnız ekrana bakarak "yorulan" Topaç'ı fark eder; HUD yayı yalnız teyit eder.

Kare maliyeti (tahmin): bir Gövde = 8 keskin + 8 bulanık + 3 disk + 1 parlama = **20 kare**, sol dönüş aynası ×2 = **40 kare** (otomatik). 64² piksel, PNG sıkıştırmasıyla ~8-15 KB / Gövde sayfası; 12 Gövde × 6 Element boyası ≈ 72 sayfa < 1 MB (tahmin, ölçülmedi). Element boyası derleme anında pişirilir (shader gerektirmez); sonra istenirse çalışma zamanı palet filtresine (`@byte`) geçilir.

---

## 4. Ruh canavarı avatarları (Ulti anı)

### 4.1 Gösterim

| Konu | Karar (tahmin) |
|---|---|
| Süre | 0,5-1,0 sn: 0,25 sn belirme, 0,3 sn tutuş + vuruş karesi, 0,2 sn dağılma |
| Boyut | 192×192 yerel piksel = ekran yüksekliğinin ~%36'sı (sahibin %40'ı: 216 px'e kadar çıkar; 192 ile 216 arası, spike'ta karar) |
| Kare | **4 belirme + 4 boşta (döngü) + 1 vuruş** = 9 kare / avatar; dağılma kodla (piksel çözünmesi: eşik maskesi, 8×8 blok) |
| Stil | Büyük pixel illüstrasyon, 6-8 tonlu Element paleti, **yarı saydam hayalet** (%75 alfa, toplamalı parlama); karakter Topaç'tan çıkar, sahneyi bastırmaz |
| Kamera | Zemin halkası + ruh silueti + ekran kenarı parlaması (00 § 4.3); kamera ×1,08 |
| Okunurluk | Avatar **oyun alanını kapatamaz**: alfa ≤ %75, ekranın üst-orta bandına, Topaç'ların üstüne değil arkasına yerleşir |
| Takım Ultisi | Üç küçük avatar (%60 ölçek) üç Topaç'ın arkasında; **yeni çizim yok**, mevcut avatarlar kullanılır |

> **Uygulama notu (2026-11-05):** Altı Ata Tripo 3B → Blender ile üretildi: 176 px hücre, 24 kare, 6×4 sayfa (0-9 yükseliş = belirme, 10-15 kükreme = vuruş, 16-23 döngü = boşta), 192 px 4+4+1 setinin üst kümesi sayıldı; oyunda ×2,4 ekran ölçeği. Yollar: `kaynak/ruh/ata/<element>.png|json` (kaynak, dağıtılmaz; oyunda `public/ruh/ata/<element>-holo*.png`), ruh portreleri `public/ruh/portre/<ruh-id>.png` (Özel Yetenek, bayrakla kapalı). Ayrıntı `docs/art/ruh-entegrasyon-notu.md`.

### 4.2 Kaç farklı avatar

| Boyut | Sayı | Yorum |
|---|---|---|
| Element | 6 | Temel çizim |
| Köken | 4 | **Palet takası + ışık rengi**; yeni çizim yok → 6 × 4 = 24 görünüm, 6 çizim |
| Lv. | 4 | Lv.3 yalnız **siluet + göz parlaması** (tek renk anahat, 1 kare); Lv.4 tam avatar. Lv. farkı efekt (alfa, taç parlaması, halka sayısı) |
| Çeşit (00 § 3.5: 12-15 örnek ruh) | 6 → 12 → 15 | İlk sürüm element başına 1; ikinci tur ikinci avatar |

Minimum set (ilk sürüm): **6 avatar × 9 kare = 54 kare + 6 siluet**. Spike için **2 avatar** (Kor, Don: karşıt çift, spark karışımını da sınar). K-7'ye göre (Lv.4 Ulti ikinci sezona kalırsa) ilk sürümde yalnız Lv.3 siluet gerekir: 6 siluet, avatar sonra.

### 4.3 Üretim seçenekleri

| Yol | Ne yapar | Maliyet (tahmin) | Kalite | Tutarlılık (6 avatar aynı elden) | Risk |
|---|---|---|---|---|---|
| **El çizimi** (sahip, topluluk ya da ücretli çizer) | Aseprite'ta 192×192, 9 kare | Para: avatar başına ~$40-150 (piyasa **kontrol edilmedi**); zaman: 1-2 gün/avatar | En yüksek | İyi (tek çizer) | Çizer bulma ve süre; kod değil insan darboğazı |
| **PixelLab** (ücretli, sahip onayı + maliyet günlüğü) | Metin/referanstan 128-256 px karakter; animasyon aracı | Ücretsiz 40 üretim; Tier 1 $12/ay 2 000 üretim (fusion-animasyon § 3 fiyat sayfası 2026-11-01). Avatar başına ~20-30 deneme → 6 avatar ~150 üretim (**tahmin**) | Orta-iyi, 128 px'in üstünde zayıflayabilir | Orta (aynı istemle ve referans paletle) | Tutarsız stil, kare arası kayma; 192 px istenebilir sınırın ötesi |
| **Gemini / görsel üretim + el temizliği** | Büyük görsel taslak → 192 px'e indir → palet kuantize → Aseprite'ta temizle | Para düşük (≤ $5, tahmin); zaman 0,5-1 gün/avatar | Taslağa göre; temizlik şart | Zayıf-orta | Pixel art "sahte" görünür (bulanık kenar); animasyon kareleri yok (animasyon koddan) |
| **3D → pixel** (Blender, avatar modeli) | Canavar modeli, 9 poz, üstten değil **yandan/önden** render | Para 0; zaman en yüksek (organik model); Tripo reddedildi (fusion-animasyon § 4) | Mekanik nesnede iyi, **canlıda zayıf** | Çok iyi | Organik modelleme uzmanlık ister; öneri değil |

**Öneri:** avatarlar için **PixelLab ile pozlar + Aseprite temizliği**, animasyonun büyük kısmı kodda (nefes: ±2 px dikey, göz parlaması, kuyruk/ateş parçacıkları). Sahip PixelLab'ı onaylamazsa: Gemini taslağı + el temizliği (maliyet ~0). İkisi de olmazsa: **siluet + parçacık avatarı** (kod ve 3 tonlu elle çizilmiş büyük siluet); Lv.3 zaten bu.

**IP hijyeni:** avatar tasarımı özgün olmalı: canon Beyblade/Pokémon silueti yok (kanatlı/ejderli üst tasarımlar kaçınılır, 01 § 5 madde 9). Üretici istemleri **canlı marka/isim içermez**. Üretilen her varlığın manifest satırı zorunludur (kaynak, araç, tarih, lisans).

### 4.4 Avatar test planı (bir avatar, üç yöntem)

Konu: **Kor avatarı** (Element: ateş). Çıktı: aynı 9 karelik set, `?ekran=lab` benzeri tek sayfada Gövde'li Topaç yanında yan yana.

| Yöntem | Üretici | Not |
|---|---|---|
| Y1 El çizimi | Sahip ya da gönüllü çizer (ajan çizemez) | Referans: 1 sayfa stil rehberi (6 ton, siluet) |
| Y2 PixelLab | `@spark`, sahip onayı + günlük | Ücretsiz 40 üretim yeter (tahmin) |
| Y3 Gemini + temizlik | `@spark` + `@iris` | Palet kuantize, 192 px, çizgi temizliği |

| Kriter | Ağırlık | Ölçü |
|---|---|---|
| Siluet okunurluğu 0,5 sn'de | 25 | 3 izleyiciye 0,5 sn göster: "ne?" ve "hangi Element?" doğru oranı (hedef ≥ 2/3) |
| Palet/stil uyumu (Topaç ve arena ile) | 20 | Aynı kareye koy, `@iris` + sahip puanı 1-5 |
| 6 Element'e ölçeklenme | 15 | Aynı yöntemle ikinci avatar (Don) hızı ve tutarlılığı |
| Zaman ve para | 15 | Saat, $, deneme sayısı |
| Animasyon kalitesi (kare + kod) | 15 | 9 kare + kodlu nefes/dağılma; titreşim/kayma yok |
| IP güvenliği | 10 | Benzerlik taraması, istemde marka yok |

Geçiş: toplam ≥ 70/100 ve siluet ≥ 2/3. Karar sahibindir; sonuç `docs/art/topac-avatar-testi.md`'ye yazılır.

---

## 5. Efekt dili (koddan çizilen)

### 5.1 Çarpışma hissi paketi (öncelik 1: sahibin şartı)

Mevcut durum: `Efektler.ts` yalnız Graphics ile patlama/şok, `Sahne.sars()` rastgele yönlü sarsıntı; **hitstop, iz, parçacık yok**. Hedef PokeRivals çıtası: tek vuruşta üç şey eş zamanlı okunur (vurgu, ağırlık, sonuç).

| Bileşen | Hafif | Orta | Ağır | Bitiş (Parçalanma/Ring Out) | Not |
|---|---|---|---|---|---|
| **Hitstop** (görsel dondurma: Topaç animasyonu + efekt) | 0 | 2 kare (33 ms) | 4 kare (67 ms) | 6 kare (100 ms) + 250 ms yavaş çekim (×0,3) | **Yalnız istemci görseli**; sim durmaz (sunucu otoriter, `@relay` doğrular) |
| **Yönlü sarsıntı** | 1 px | 2-3 px | 5 px | 8 px | Çarpışma **normali boyunca** kuvvetli, dik eksende %30; rastgele değil sönümlü yay |
| **Kamera zoom darbesi** | — | — | ×1,03, 80 ms | ×1,08, 200 ms | |
| **Beyaz flaş** (Topaç üzerinde) | — | 1 kare | 2 kare | 3 kare | Sprite `tint` beyaz |
| **Squash/stretch** (Topaç katmanları, normal boyunca) | — | ×1,08 | ×1,15 | — | 2 kare, sonra yay |
| **Spark** (parçacık) | 6 | 14 | 28 | 50 | Hız normal etrafında 60° koni, ömür 0,25-0,5 sn |
| **Şok çemberi** | — | küçük | orta + ikinci | büyük + zemin çatlağı | Genişleyen halka (Graphics, 3 kare adım adım) |
| **Zemin izi** (çizik) | — | 1 | 2 | 3 | RenderTexture'a kalıcı basılır, 6 sn'de solar |
| Ses (`@glyph`/ses sorumlusu) | tık | tok | gümleme | patlama | Görselle aynı kare |

**Spark rengi:** iki Topaç'ın Element renklerinin **karışımı** (iki parçacık havuzu, yarı yarı). **Karşıt Element** çarpışması (00 § 3.3: Kor-Girdap, Kasırga-Kaya, Şimşek-Don) özel: **iç içe iki renkli şok çemberi + beyaz çekirdek flaşı + Enerji bonusu için "+%25" simgesi yok, yalnız ekstra çember** (okunurluk: bonusu kullanıcıya söylemeden hissettir).

### 5.2 Efekt tablosu

| Efekt | Yöntem | Renk / şekil dili | Kare/parça planı |
|---|---|---|---|
| Çarpışma sparkı | **Parçacık** (Pixi 8 `ParticleContainer` + `Particle`) | Element renk karışımı; karşıt: iki renk + beyaz; küçük 2×2 ve 3×3 kare parçacıklar (pixel uyumlu) | 1 doku: 4 parçacık boyutu; atlasta 4-6 sprite |
| **İz (trail)** | **`MeshRope`** (Pixi 8) ya da Graphics çoklu çizgi; her Topaç son 12-16 konumu | Köken rengi iç çizgi, Element rengi dış; **kıvrılma yönü = dönüş yönü** (sol dönüş = ters kıvrılan kuyruk, 00 § 2.4); hıza göre uzunluk/kalınlık: yüksek kademede uzun, düşükte yok | 1 gradyan şerit dokusu (16×4) |
| Şok çemberi | Graphics (kare adımlı genişleme) | Çarpışma kuvvetine göre; Element renkli kenar + beyaz iç | Kodla; doku yok |
| Toz | Parçacık | Zemin renginin açık tonu; Maden Köken'de kehribar; hızlanma ve yalpalamada | 3 toz sprite (4×4-8×8) |
| **Ring Out düşüşü** | Katman animasyonu + gölge ayrılması | Topaç kenardan çıkar: ölçek 1 → 0,5 (0,6 sn), dönmeye devam, **gölge ayrılır ve zeminde kalır** (şeffaflaşarak), çanak kenar çıkıntısı Topaç'ın **üstünde** çizilir (kenarın arkasına düşüş), düştüğü noktada toz ve su/ışık halkası (arenaya göre) | Kodla; 1 kenar dudak katmanı sprite'ı (arena) |
| **Parçalanma** | Katmanlar **ayrı sprite** olarak fırlar: Gövde kanat kanat ayrılır (n kanatlı Gövde periyot dilimleri, `Mesh`/maskeli dilim), Disk bütün halka olarak, Uç küçük parça, **Çekirdek parlayarak yerde kalır** (Çekirdek asla yok olmaz, lore 6.3) | Element renkli parçalar + beyaz flaş, hitstop 100 ms + ×0,3 yavaş çekim 250 ms | Yeni çizim yok; parçalar mevcut Gövde/Disk karelerinden dilimlenir |
| **Durma** | Yalpalama büyür → yatar | Yarıçap 6 → 12 px, 1-2 sn; Gövde eğimi (elips); son 0,3 sn Uç çizik sesi/sparkı; Çekirdek ışığı söner (Köken rengi sönük nokta) | v1 kod; v2 Blender 8 kare yatma |
| Ulti telegrafı | Graphics + sprite | **Kırmızı** tehlike halkası (zemin) + Element renkli ruh silueti (0,3 sn) + ekran kenarı parlaması (Kick'te okunur); süre ≥ 2× RTT (00 § 4.3) | Siluet: 6 element başına 1 sprite (Lv.3 ile paylaşılır) |
| **Alan Ulti zemin dokusu** | Zemin dekalı (sprite) + tint, 4-6 kare döngü | Kor Çukuru (kor çatlakları), Don Kaygan (buz yaması), Girdap Çekimi (sarmal), Kasırga Alanı (rüzgâr çizgileri), Şimşek Ağı (elektrik ağı), Kaya Duvar (engel sprite'ı) | 6 dekal × 4-6 kare × 128-192 px |
| Enerji dolumu | HUD yayı + Topaç çevresinde ince Köken ışığı çemberi (kısa) | Dolan dilim rengi sabit (`@glyph`) | Kodla |
| Seviye (Lv.) yükselme | Çekirdek parlaması + yükselen parçacık | Altın | Kodla |

### 5.3 Pixi 8 parçacık önerisi
- **Kendi havuzumuz + `ParticleContainer`:** Pixi 8'in `ParticleContainer` + hafif `Particle` nesneleri (tek doku kaynağı = tek atlas, yüzlerce parçacık tek çizimde). Sınır **canlı 400 parçacık**; havuzda sabit dizi, Graphics nesnesi **tek kare için** (Efektler.ts'in mevcut Graphics havuzu şekil efektlerinde (şok çemberi, telegraf) kalır).
- Parçacık verisi (konum, hız, ömür, renk) **sim dışı**; gerçek rastgele `Math.random` yerine **tohumlu** (replay/tutarlılık; paylaşılan sim'de yasak, istemci efektinde yasak değil ama tohumlu olması test edilebilirliği artırır; `@byte` kararı).
- `MeshRope` yalnız Topaç başına 1 örnek (2 Topaç → 2 rope).
- Performans bütçesi: 2 Topaç + efektler **60 fps**, hedef GPU düşük cihaz (entegre GPU, 2019 dizüstü); spike'ta ölçülür (§ 8.3).

---

## 6. Arena zemini ve dekor (`@cove` ile ortak)

### 6.1 Tileset mi tek resim mi

| Parça | Yöntem | Gerekçe |
|---|---|---|
| **Çanak zemini** | **Tek büyük resim** (~500×500 yerel px) | Radyal desen (hız şeridi, merkez, kuyu) tile'lanmaz; Blender top-down render + pixel ile ya da elle |
| Çanak ön kenarı (dudak) | Ayrı katman, Topaç **üstünde** çizilir | Ring Out düşüşünde Topaç'ın kenarın arkasına düşmesini sağlar |
| Tribün bandı | **Tileset** (16×16 / 32×32 tekrarlı) | PokeRivals'taki piksel kalabalık bandı (üst şerit): hafif parallax; tek resim yerine yüzlerce tekrar |
| Dış zemin | Düz renk + kenar çizgisi | |
| **Dinamik** | Çizik/çatlak RenderTexture, alan Ulti dekalleri, hız şeridi parıltısı | Kodla |

### 6.2 Hız şeridi (dış kuşak) görseli
Hız şeridi **dönen çizgi dokusu** + ince parıltı; Topaç şeritte iken şerit parlar ve iz uzar (oyuncuya "burada hızlanıyorsun, kontrol düşük" okunur). Şerit rengi sabit parlak sarı-beyaz, Topaç renklerinden ayrı (Şimşek sarısıyla çakışmamalı: şerit çizgileri beyaz `#F2F2EE` + gri, parıltı yalnız etkileşimde).

### 6.3 Dört arena tipi paleti (00 § 7.3; adlar `@cove`'a ait)

| Arena | Zemin ana rengi | Vurgu | Not |
|---|---|---|---|
| Kuşak Çanağı (hız rayı) | Sıcak gri taş `#6E6A66` | Şerit beyaz-sarı `#F2E8B0` | Standart, en çok oynanan; tribün parlak mavi-gri |
| Sallanan Çanak | Bakır-kahve `#8C5A3C` | Eksen cıvataları gri | Çanak yalpa animasyonu (zemin katmanı kodla eğilir) |
| Dar Kuyu | Koyu kayrak `#3C4350` | Kuyu: sıcak turuncu iç ışık `#E38A2B` | Küçük çanak, merkez kuyusu |
| Tehlikeli Çanak (kor/buz) | Bölge başına: kor `#3A2420`+`#E8452C`, buz `#2A3A4A`+`#9FE3F5` | Alan zemini dekalleri | Alan Ulti dekalleriyle aynı dil; çakışmasın diye tehlikeli zemin **mat**, Ulti dekali **parlak** |

Okunurluk kuralı: arena zemini **düşük doygunluk, orta-koyu**; Topaç ve efektler doygun. Topaç hiçbir arenada zemin renginde kaybolmaz: her Gövde katmanında 1 px açık dış çizgi seçeneği (zemin koyu ise).

---

## 7. Boru hattı ve araçlar

### 7.1 Araçlar

| Araç | Kullanım | Durum |
|---|---|---|
| **Aseprite** (ücretli, ~$20) ya da **LibreSprite** (ücretsiz çatal) | Kahraman parça temizliği, avatar el çizimi, palet | Makinede yok (`which aseprite` boş); LibreSprite önerilir, Aseprite sahip onayıyla |
| **Blender 5.2.2 LTS** | 3D → pixel parça render | Kurulu (`/opt/homebrew/bin/blender`), ücretsiz |
| **sharp** (devDependency var) | Palet indirgeme, Element boyası, atlas paketleme, bulanık kare birleştirme | Var |
| Node araçları | `araclar/topac-uret.ts` (Blender çıktısı → atlas + JSON) | Yazılacak (`@byte`, spesifikasyon bu belge) |
| PixelLab, Gemini | Avatar (yalnız sahip onayıyla) | Yok, ücretli |

### 7.2 Blender 3D → pixel kurulumu

1. **Sahne:** ortografik kamera tam yukarıdan (Z-), render çözünürlüğü **hedef piksel boyutunun kendisi** (64×64 Gövde; antialias **kapalı**); `Film → Filter Size = 0`.
2. **Işık:** tek güneş ışığı (sol-üst, ~45° yükseltilmiş), **sahnede sabit**; nesne Z ekseninde döner. Gölge yok (gölge oyun içinde).
3. **Malzeme:** Shader→RGB ile **4 kademeli toon rampa**, çıktı **gri 4 ton + çizgi + parıltı maskesi**; tüm Element/Köken renkleri sonradan paletle (tek render, 6 boya).
4. **Çizgi:** ters hull ya da Freestyle, 1 px, ayrı kanal (renk Element rampasının en koyusu).
5. **Parametrik betik** (`araclar/blender/parca_render.py`): parça modeli (`.blend` parça başına) + adım açısı + kare sayısı → PNG dizisi; kanat sayısı n'den periyot hesaplanır; `--ayna` bayrağı mesh'i aynalayıp yeniden render eder (sol dönüş varyantı).
6. **Bulanık kare:** her kare için ±30° içinde 5 alt-örnek ortalaması (sharp ile birleştirme); yüksek kademede disk bulanığı için 12 alt-örnek.
7. **Palet indirgeme:** her parçanın gri ton eşlemesi → Element rampası (4 renk), çizgi ve vurgu kanalı; ortak palet dosyası `veri/palet-element.json`.
8. **Elle düzeltme (isteğe bağlı):** kahraman parça kareleri LibreSprite'ta temizlenir; düzeltmeler `kaynak/topac/<parca>/duzeltme/` altında, betik yeniden çalışınca üzerine yazılmaz.

### 7.3 Atlas ve `AtlasYukleyici` uyumu

| Konu | Karar |
|---|---|
| Atlas biçimi | Parça başına tek PNG sayfa + `.json` (kare dilimleri sütun/satır); `Assets.load` + `Texture` dilimi (mevcut `AtlasYukleyici.ts` deseni korunur: `scaleMode = "nearest"`, önbellek haritası) |
| Değişen | Eski `[yön][kare]` dizisi (8 yön) → **`[kademe][kare]`**; fusion `id` ve shiny alanları kalkar; Element boyası dosya adı içinde (`...-kor.png`) |
| Bellek | Yalnız maçtaki parçaların boyaları yüklenir (iki Topaç, ~8 sayfa); lobi önizlemesi tek kare |
| Atlas paketleme | Aynı Element boyası olan parçalar bir sayfaya paketlenir (toplu çizim); efektler tek `efekt.png` |
| Kaldırılacaklar | `araclar/fusion/*`, `spritecollab-kapsama.ts`, `fusion-birlestir.ts`, `YuklenenAnim.golgeler` yön dizisi |

### 7.4 Dosya adlandırma

```
kaynak/topac/govde/<govdeId>/govde.blend, duzeltme/
public/topac/<tur>/<parcaId>-<kademe>-<yon>-<element>.png   // tur: govde|disk|uc|cekirdek ; kademe: kesk|bulanik|disk ; yon: s|l
public/topac/<tur>/<parcaId>.json
public/avatar/<elementId>/avatar.png, avatar.json
public/efekt/efekt.png, efekt.json
veri/manifest-gorsel.json          // her varlık: kaynak, araç, tarih, lisans
```

### 7.5 `veri/topac-parca.json` meta şeması (öneri)

```json
{
  "govde.alev-3": {
    "tur": "govde",
    "kanat": 3,
    "periyotDerece": 120,
    "kareBasinaPeriyot": 8,
    "boyut": 64,
    "dondurSimetrik": false,
    "solVaryant": true,
    "kademeler": { "kesk": "alev-3-kesk", "bulanik": "alev-3-bulanik", "disk": "alev-3-disk" },
    "golge": { "yaricap": 30, "kayma": 3 }
  }
}
```
Alanlar: `tur`, `kanat` (Gövde) ya da `cikinti` (Disk), `periyotDerece`, `boyut`, `solVaryant`, `kademeler`, `yukseklik` (Disk; gölge kaymasını sürer), `uc: { temasYaricap }`. Hasar yarıçapı **oyun tasarımının** (`@helix`); sanat yarıçapı ile **hit yarıçapı** ayrı alanlar.

---

## 8. Bütçe ve sıra

### 8.1 İlk oynanabilir dilimin minimum varlık listesi

| Varlık | Sayı | Detay |
|---|---|---|
| Gövde | **3** | 3 kanatlı süpürmeli (Saldırgan), 4 kanatlı yuvarlak (Dayanıklı), 2 kanatlı ağır (Kale); her biri 20 kare × 2 yön |
| Disk | **2** | Çıkıntılı ince (alçak), geniş kalın (yüksek) |
| Uç | **3** | Düz, yarı küre, sivri (temas ve yalpalama) |
| Çekirdek | **4 Köken × 4 Lv.** | 4 temel sprite + 3 Lv. üst katmanı (Lv.2 çember, Lv.3 çift, Lv.4 taç) |
| Element boyası | **6** | Palet takası, derleme anında |
| Avatar | **6** (ya da spike: 2) + 6 siluet | § 4.2 |
| Efekt dokuları | ~25 | Spark 6, toz 3, iz şeridi 1, parçalar (dilim, kodla), şok çemberi (kodla), ulti telegraf halkası 1, zemin dekali 6 |
| Arena | **1** (Kuşak Çanağı) | Çanak resmi + dudak + tribün tile'ı + hız şeridi; diğer üç arena sonra |
| Kombinasyon | 3 × 2 × 3 = **18 Topaç** × 6 Element × 4 Köken | **Çizilen yalnız 8 parça + 4 Çekirdek**; gerisi katman + palet |

### 8.2 İş günü tahmini (tek kişi, ajan ve sahip karışık; **tahmin**)

| İş | Gün | Kim |
|---|---|---|
| Blender düzeneği + parametrik betik + sharp atlas aracı | 3-4 | `@iris` spesifikasyon, `@byte` uygulama |
| 3 Gövde + 2 Disk + 3 Uç modeli ve render | 4-5 | `@iris` + 3D modelleme (ajan + sahip düzeltmesi) |
| Çekirdek 4 + Lv. işaretleri | 1 | El çizimi (LibreSprite) |
| Efekt paketi (hitstop, yönlü sarsıntı, parçacık, iz) kod | 4-5 | `@byte` |
| Arena çanağı + tribün tile'ı | 3-4 | `@cove` + `@iris` |
| Avatar testi (§ 4.4) | 2-3 | `@spark` + sahip |
| 6 avatar | 6-10 | PixelLab ya da çizer |
| Entegrasyon ve parlatma | 3-4 | `@byte` + `@tide` |
| **Toplam** | **~26-36 iş günü**; avatarsız oynanabilir dilim **~16-22** | |

### 8.3 Para ve ücretsiz plan

| Kalem | Tutar (tahmin) | Onay |
|---|---|---|
| **PixelLab** (avatar + isteğe bağlı Çekirdek denemeleri) | Ücretsiz 40 üretim → gerekirse Tier 1 $12 / bir ay | **Sahip onayı + maliyet günlüğü** (`docs/art/maliyet-gunlugu.md`) |
| Aseprite (LibreSprite yerine) | ~$20 bir kerelik | İsteğe bağlı |
| Diğer | 0 | Blender, sharp, Pixi ücretsiz |

**Onsuz plan:** avatar için Gemini taslağı (sahibin mevcut anahtarı ve onayıyla, düşük maliyet) + el temizliği; o da olmazsa siluet+parçacık avatarı (Lv.3 siluet zaten gerekli) ve avatarlar ikinci sezona (K-7 ile uyumlu). Topaç, efekt ve arena bu kalemden bağımsızdır.

### 8.4 Riskler

| Risk | Olasılık / etki | Önlem |
|---|---|---|
| Pixel döndürme kalitesi ((a)) | Yüksek / orta | (c) ana yöntem; (a) yalnız parlama ve efekt; spike'ta karşılaştır |
| Strobo / vagon tekeri (kare adımı > periyot/2) | Orta / yüksek | Kozmetik hız kademelendirilir, histerezis; 900°/sn eşiği spike'ta ölçülür |
| Avatar tutarlılığı (6 avatar aynı el) | Yüksek / orta | Tek stil rehberi, aynı palet; PixelLab'da aynı referans; ya da tek çizer |
| Performans: 2 Topaç + ~400 parçacık + iz 60 fps, düşük cihaz | Orta / yüksek | `ParticleContainer`, tek atlas, parçacık üst sınırı, ölçekli kalite (düşük cihazda parçacık %50, iz kısalır) |
| Element rengi ve takım rengi karışması | Orta / orta | Gri ton + renk körlüğü testi; takım çemberi ayrı katman |
| Hitstop ve sim senkronu (netcode) | Orta / yüksek | Yalnız görsel dondurma; `@relay` doğrular |
| Sol dönüş aynalama ışık bozukluğu | Düşük / orta | Mesh aynası ile yeniden render |
| Üretici tutarsızlığı / IP benzerliği (avatar, Gövde şekilleri) | Orta / yüksek | Canon parça tasarımı kopyalanmaz (yapıdan ilham: kanat sayısı, Uç şekli; şekil özgün); manifest ve benzerlik taraması |
| Blender betiğinin bakımı (Blender 5.x API değişimi) | Düşük / orta | Sürüm sabitle (5.2.2 LTS), betiği `--background` komut satırından çalıştır |

---

## 9. İlk spike önerisi (`@spark` için)

**Adı:** "Tek Topaç, üç hız kademesi, bir çarpışma" (Topaç Lab).

| Konu | Plan |
|---|---|
| Kapsam | Tek sayfa (`?ekran=topac-lab`); 960×540; 1 Gövde (3 kanatlı) + 1 Disk + 1 Uç + 1 Çekirdek (Göktaşı); Kor boyası; Stamina kaydırıcısı (100 → 0) kademeleri sürer |
| Kısım A: dönüş | (a) elle çizilmiş tek sprite + `rotation`, (c) Blender kareleri; yan yana, 3 kademe; **gerçek zamanda, 1080p ve 960×540**'ta |
| Kısım B: yalpalama | Stamina < %25'te yörünge + gölge kayması; Durma yatması (kod) |
| Kısım C: çarpışma | 2 Topaç (Kor vs Girdap: karşıt çift) fare ile sürülür; **hafif/orta/ağır** vuruş: hitstop, yönlü sarsıntı, spark karışımı, şok çemberi, iz; Ring Out düşüşü ve Parçalanma (yalnız katman fırlaması) |
| Ölçüm | 60 fps kare süresi (2 Topaç + ≤ 400 parçacık), düşük cihaz profili, Chrome Performance kaydı |

**Başarı ölçütleri**
1. Sahip + 3 izleyici, **HUD kapalıyken** Stamina kademesini ("hızlı / orta / yorgun") **≥ 3/4 doğru** söyler (her biri 2 sn gösterim).
2. Üç yöntemin (a)/(c) yan yana karşılaştırmasında 1080p'de (c) "daha temiz" seçilir (≥ 3/4); (a) seçilirse Gövde için (a) yeterli.
3. Ağır vuruş "çok iyi hissettiriyor" (sahip, 1-5 puan, ≥ 4) ve hafif/orta/ağır ayırt edilir (≥ 3/4 doğru).
4. 60 fps (çerçeve süresi p95 ≤ 16,7 ms) entegre GPU'lu bir dizüstüde; çarpışma anında düşüş yok.
5. Kor × Girdap karşıt çarpışma sparkı, aynı Element çarpışmasından **ayırt edilir** (≥ 3/4).
6. Kırık/strobo kare gözlemi **yok**; varsa kare adımı eşiği düzeltilir.
7. Her varlığın manifest satırı yazıldı; PixelLab kullanıldıysa maliyet günlüğü.

**Süre:** 3-5 iş günü. Çıktı: `docs/art/topac-lab-sonuc.md` (ekran görüntüleri gerçek tarayıcı çalışma zamanından, üretici önizlemesinden değil).

---

## 10. Açık sorular

| # | Soru | Kime |
|---|---|---|
| 1 | Element kaynağı Çekirdek mi, Gövde mi? (§ 2.3) | `@helix` |
| 2 | Sanat yarıçapı ile hit yarıçapı ilişkisi ve Disk yüksekliğinin çarpışmaya etkisi (bindirme görseli) | `@helix`, `@byte` |
| 3 | Hitstop yalnız görsel mi? Sim'e etkisi yok varsayımı | `@relay` |
| 4 | K-7: Lv.4 Ulti avatarı ilk sürümde mi, sonra mı? (6 avatar mı 6 siluet mi) | sahip |
| 5 | PixelLab onayı ve maliyet tavanı ($12 mi?) | sahip |
| 6 | Arena ölçeği ve çanak çapı (440 px) | `@cove` |
| 7 | Eski `docs/art/fusion-animasyon.md` "iptal, tarihçe" notu ve `docs/art/krediler.md` yeniden yazımı (SpriteCollab kredisi kalkar, kendi varlıklarımız + araç lisansları gelir) | `@iris` (onaydan sonra) |
