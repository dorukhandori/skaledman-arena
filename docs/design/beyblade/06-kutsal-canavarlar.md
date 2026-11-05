# Kutsal canavarlar: dövüşte belirme ve görünüm

Sahip (2026-11-05): *"oyunda bulunan kutsal canavarlar, onların dövüş içerisinde tetiklenmesi ve bu canavarların görünümü çok özel ve heybetli olmalı. ... tüm pipelineları kullanmakta serbestsin, tripo dahil."*

**Sahip kararları (2026-11-05):** (1) Kapsam pixel planı § 4 gibi: ilk sürümde canavar **yalnız Ulti'de**, element başına 1 Ata. Özel Yetenek'teki ruh belirmesi (§ 1, Bağlı belirme) kodda hazır ama `RUH_PORTRE_OZEL_YETENEK = false` bayrağıyla kapalı; 21 portre varlık olarak depoda. (2) § 2'deki altı Ata türü **onaylandı**. (3) Ata **hologram** olarak belirir: topacın tam ortasından (çekirdekten) yukarı **V biçimli hologram ışığı** yansır, kutsal canavarın hologramı bu V'nin içinde alttan yukarı şekillenir (§ 1.2).

Bu belge `00-lore-cercevesi.md` § 3 (ruh taksonomisi) ve `01-arena-eslemesi.md` § 4.3'ü (ruh silueti) **somutlaştırır**. Oyuncuya görünen ad **Ruh**; "kutsal canavar" lore ve belge dilidir (`04-sozluk.md`). Sim'e dokunmaz: her şey istemci sunumudur ve sunucunun zaten yolladığı `yetenekBasladi` olayından tetiklenir (ağ maliyeti 0 bayt).

## 1. Üç belirme kademesi

| Kademe | Ne zaman | Hangi canavar | Görünüm | Süre |
|---|---|---|---|---|
| **Kıvılcım** | Yetenek (kademe 1) | Çekirdeğin ruhu | Yalnız topacın üstünde element renginde kısa bir göz parıltısı ve ruhun simgesi (sprite yok; gürültü yapmaz) | 0,25 s |
| **Bağlı belirme** | Özel Yetenek (kademe 2) | Çekirdeğin kendi ruhu (21 ruhtan biri) | Ruh portresi topacın arkasından **yükselir** (alttan yukarı açılan maske), element aurası, toz/kıvılcım parçacığı, altında ad bandı ("Közkartal · Közyağmuru") | telegraf + 0,5 s (≈1,0-1,2 s) |
| **Tam rezonans** | Ulti (kademe 3) | Elementin **Ata**'sı (6 Ata'dan biri) | 3B modelden işlenmiş kare animasyonu: Ata arenanın arkasından yükselir, döner, kükrer; ekran vinyeti, element renginde kenar parlaması, kükreme anında şok halkası ve sarsıntı, büyük ad bandı ("ATA KOR UYANDI · Alaz Bizonu") | telegraf (0,9 s) + 0,9 s |
| **Takım rezonansı** | Takım Ultisi (kademe 4, sezon 2) | Takımın üç ruhu | Üç portre 0,2 s arayla yay hâlinde yükselir | 1,4 s |

Neden böyle: Özel Yetenek maçta birkaç kez olur, Ulti maç başına bir kez. En pahalı ve en heybetli görüntü en nadir ana saklanır; böylece Ata her göründüğünde "olay" olur. Yetenek (kademe 1) sık olduğundan canavar çıkarmaz.

### 1.2 Hologram belirmesi (Ulti, sahip kararı 2026-11-05)

| An | Süre | Görünüm |
|---|---|---|
| V açılır | 0-0,18 s | Tepe noktası çağıran topacın çekirdeğinde; kollar yukarı açılır, iç yarı saydam element rengi, kenarlar parlak, içinde yukarı akan tarama çizgileri |
| Şekillenme | 0,1-0,52 s | Canavar 12 yatay şeritte alttan yukarı belirir; yeni şerit kısa kayar, şekillenme cephesinde beyaz çizgi |
| Tutuş | telegraf + 0,9 s | Kükreme karesinde zeminde tek halka ve küçük sarsıntı; titreme, iki kısa kayma (glitch) |
| Çıkış | 0,35 s | Şeritler yukarıdan söner, V kapanır |

Hologram topacın **çizildiği** yeri her kare izler ve topacın üstünde, yarı saydam çizilir. Doku önceden pişirilmiş hologram sayfasıdır (element tonu, tarama satırı, parlak kenar). Ekranda tam ×2 ölçekle, piksel ızgarasına oturtulur. Topaç uzak kenardaysa (hologram üst HUD'a taşacaksa) yarım boy sayfa kullanılır. Ad bandı alt-ortada tek satırdır: "ATA KOR UYANDI · Alaz Bizonu".

### 1.1 Okunabilirlik kuralları (ux § 2.2 ile uyumlu)

- Canavar **topaçların altında, zeminin üstünde** çizilir: hibrit sunumda basık zemin düzleminin (`zeminDuzlem`) içinde, dekal ve telegraftan önce; düzlemin basıklığı (1/k) ve kamera yakınlığı (1/B) ters ölçekle telafi edilir, canavar dik durur ve dünya ile birlikte pikselleşir. Topaç, telegraf halkası ve nişan çizgisi her zaman canavarın önündedir.
- Bağlı belirme saydamlığı en çok 0,85, Tam rezonans 0,9; topaçların bulunduğu çember içinde canavar gövdesi 0,55'e iner (merkez maskesi).
- Oyun durmaz, ara sahne yok, kamera yalnız %4 yakınlaşır (01 § 4.3). Ulti telegrafı canavarla aynı anda okunur; canavar telegrafın **yerine** geçmez.
- Rakibin canavarı aynı görünür; ad bandı rakip renginde (TAKIM_RENK) çerçevelenir. "Kim çağırdı" sorusu banttan ve canavarın hangi topacın arkasından çıktığından okunur.
- Erişilebilirlik: **Flaş: Normal** tam efekt; **Azaltılmış** vinyet ve kenar parlaması yarıda, sarsıntı yok; **Kapalı** yalnız canavar ve ad bandı (parlama, sarsıntı, şok halkası yok). Hareket azaltma açıksa yükselme yerine 0,2 s solma.

## 2. Altı Ata (Ulti canavarları)

Ata, elementin **ilk ruhu**dur; Ulti'de çekirdeğin ruhu ile tam rezonansa girip uyanır (00 § 3.5). Tür seçimi IP hijyeni kuralına uyar (00 § 3.4: ejderha, anka, kaplan, aslan, kurt, kaplumbağa, pegasus, grifon, tekboynuz yok) ve üstten bakışta siluetleri birbirinden ayrılır.

| Ata | Tür (oyuncuya görünen unvan) | Görünüm | Silüet ayırıcı | Kükreme anı |
|---|---|---|---|---|
| **Ata Kor** | **Alaz Bizonu** | Magma damarlı dev bizon, sırtındaki yele alev, boynuzları kor gibi parlar | Yüksek hörgüç + kısa kalın boynuz | Ön ayaklarını yere vurur, köz dalgası |
| **Ata Şimşek** | **Çakım Geyiği** | Dev ak geyik, boynuzları dallanan yıldırım | Gökyüzüne açılan çatallı boynuz | Başını kaldırır, boynuzlardan şimşek |
| **Ata Kasırga** | **Yel Vatozu** | Gökyüzünde süzülen devasa vatoz, kanat uçlarında sarmal rüzgâr izi | Elmas biçimli düz gövde, uzun kuyruk | Kanatlarını açar, sarmal hortum |
| **Ata Girdap** | **Dip Nautilusu** | Sarmal kabuklu, dokunaçlı kadim deniz canlısı; kabuğu bir topaç gibi döner | Sarmal kabuk + dokunaç saçağı | Kabuğu döner, çekim girdabı |
| **Ata Kaya** | **Dağ Mamutu** | Sırtında sıradağ taşıyan taş mamut, yontulmuş dev dişler | Kavisli dişler + sırtta tepe | Hortumunu kaldırır, yer yarılır |
| **Ata Don** | **Ayaz Ayısı** | Sırtında buz kristalleri sıralanan dev ak ayı | Kristal sırt dikenleri | Ayağa kalkar, buz sisi |

Ata görseli yalnız Ulti'de görünür; Atölye'de Ulti kilitliyken Ata **gölge** olarak gösterilir ("Lv.3'te uyanır"), kilit açılınca renkli.

## 3. Yirmi bir ruh (Özel Yetenek canavarları)

Türler `00` § 3.5 ve `veri/ruhlar.json` adlarından gelir; görünüm ilkesi: **elementten yapılmış canlı** (Kor'dakiler köz ve alevden tüy/kürk, Şimşek'tekiler yıldırım damarı, Kasırga'dakiler rüzgâr şeridi, Girdap'takiler su ve köpük, Kaya'dakiler yontulmuş taş, Don'dakiler buz kristali). Kökenler okunur: **Karanlık** (Külkartal) mor-siyah, kül ve çatlak; **Yapay** (Döküm ...) mavi-çelik, perçin ve dikiş çizgisi, aynı türün "döküm" kopyası.

| Ruh | Tür | Element | Poz (yükselirken) |
|---|---|---|---|
| Közkartal | kartal | Kor | Kanatlar yarı açık, pençeler önde dalış |
| Közkaracal | karakulak | Kor | Sıçrama anı, kulak püskülleri alev |
| Çakmakçakal | çakal | Şimşek | Başı yukarı uluma, sırtı kıvılcım |
| Çatırgeyik | geyik | Şimşek | Boynuz öne, kontra duruş |
| Sarmalbaykuş | baykuş | Kasırga | Kanatlar geniş, iri göz halkaları |
| Savrukkırlangıç | kırlangıç | Kasırga | Çatal kuyruk, keskin süzülüş |
| Emişahtapot | ahtapot | Girdap | Kollar sarmal açılmış |
| Çevrenbalina | balina | Girdap | Dalga içinden yükselen sırt |
| Kırağıtilki | tilki | Don | Kuyruk etrafında kırağı sarmalı |
| Ayazmors | mors | Don | Buz dişleri, ağır göğüs |
| Dağzırhlı | armadillo | Kaya | Yarı kıvrılmış taş zırh |
| Yontuboğa | boğa | Kaya | Baş eğik hücum |
| Külkartal | kartal (Karanlık) | Kor | Közkartal pozu, kül ve mor çatlak |
| Döküm Karacal | karakulak (Yapay) | Kor | Közkaracal pozu, çelik dikişli |
| Döküm Sarmalbaykuş | baykuş (Yapay) | Kasırga | Sarmalbaykuş pozu, çelik dikişli |
| Ata × 6 | bkz. § 2 | | Atölye portresi için ayrıca tek kare |

## 4. Üretim hattı (sahip izniyle: Gemini + Tripo + Blender)

| Katman | Kaynak | Çıktı (`public/ruh/`) | Kullanım |
|---|---|---|---|
| Ruh portresi | Gemini `gemini-3.1-flash-image`, pixel art, macenta zemin → alfa anahtarlama + kırpma | `portre/<id>.png` (en uzun kenar 512) | Bağlı belirme, Atölye ruh kartı |
| Ata konsepti | Gemini, aynı stil, katı "heykel" anlatımı (Tripo için) | `art-source` (depo dışı) | Tripo girdisi |
| Ata 3B | Tripo `image_to_model` (dokulu) | `art-source/ruh/*.glb` (depo dışı) | Blender işleme |
| Ata animasyonu | Blender (Eevee, şeffaf zemin): alttan yükselme + yarım tur dönüş + kükreme anında öne atılma; element renginde kenar ışığı; 24 kare, 512 px → pikselleştirme (en yakın komşu 1/3) | `ata/<id>.png` (6×4 ızgara) + `ata/<id>.json` | Tam rezonans |
| Kod efektleri | Pixi 8 | — | aura (toplamalı kopya + bulanıklık), parçacık, şok halkası, vinyet, ad bandı |

Maliyet ve kayıt: her ücretli çağrı `docs/art/ruh-uretim-kaydi.md` dosyasına (tarih, model, kredi) yazılır. Anahtarlar yalnız ortamdan; depoya, kayda, günlüğe girmez.

## 5. Kabul ölçütleri

1. Özel Yetenek kullanıldığında doğru ruh (çekirdeğin `ruh` alanı) topacın arkasından yükselir; Ulti'de elementin Ata'sı belirir. İki oyuncu için de, çevrimdışı ve çevrimiçi aynı.
2. Canavar hiçbir anda topacı, telegrafı ya da nişan çizgisini örtmez (ekran görüntüsüyle doğrulanır).
3. Flaş ayarının üç kademesi § 1.1'deki gibi davranır.
4. Ata kareleri yalnız maçtaki elementler için yüklenir; yükleme bitmemişse kod siluetine (eski `ruhCiz`) düşülür, oyun beklemez.
5. Sim, hash ve ağ protokolü değişmez (`npm test` determinizm kapıları yeşil).
