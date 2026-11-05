# Fusion Pokémon'ları arenada canlandırma

> **TARİHÇE / İPTAL (D8, B-37):** Bu belge iptal edilen ilk fikrin (hayran kartlarıyla arena, 2026-11-01) kaydıdır; içerik değiştirilmeden tarihçe olarak tutulur. Proje **Devran**'a (özgün dönen topaç dövüşü, kâr amaçsız) döndü; marka, kart, sprite ve dış site bağımlılığı yoktur. Güncel belgeler: `docs/production/devran-kod-brief.md`, `docs/production/raporlar/D1.md … D8.md`.

Tarih: 2026-11-01 (ikinci sürüm; sahibin kararıyla yeniden yazıldı). Bağlam: [oyun-konsepti.md](../design/oyun-konsepti.md), [mimari.md](../tech/mimari.md).

## 0. Karar (K-5)

Sahip, 2026-11-01: *"'resmin kendisini zıplatarak, eğerek, esneterek' hareket edecek. bunu istemiyorum. direkt arena içerisinde gerçek modellenmiş 2d karakterlerin dövüşünü istiyorum aynı gönderdiğim ilk örnekteki gibi."*

Hedef görünüm: **gerçek kare animasyonlu, 8 yönlü piksel karakterler**; yürüyen, saldıran, hasar alan, bayılan. Prosedürel zıplatma ve mesh deformasyonu **temel yöntem olmaktan çıktı**; yalnız kare animasyonun üstüne ikincil efekt (vuruş flaşı, geri itme kayması) olarak kalabilir.

## 1. Kaynak sprite seti

PMD **SpriteCollab** ([github.com/PMDCollab/SpriteCollab](https://github.com/PMDCollab/SpriteCollab), CC BY-NC 4.0) sprite'ları. Her Pokémon için klasörde animasyon başına üç sayfa var: `Walk-Anim.png` (kareler; satır = 8 yön, sütun = kare), `Walk-Offsets.png`, `Walk-Shadow.png`; süreler `AnimData.xml`'de (ör. Walk 32×32, Attack 64×64, `HitFrame`/`RushFrame` işaretli). Animasyon seti: Walk, Attack, Hurt, Idle, Charge, Shoot, Hop, Rotate, Swing, Double, Sleep, Strike… Benzer tarayıcı oyunları bu sayfaları bir betikle web'e dışa aktarıp 3× büyütülmüş gösteriyor.

Sorun: SpriteCollab'da **fusion yok**; yalnız gerçek Pokémon'lar var. Bu yüzden iki yol var.

## 2. Yol A: PMD sprite'larından fusion birleştirme (önerilen temel)

Infinite Fusion'ın kendi otomatik üretecinin mantığı: **gövde Pokémon'unun şekli + baş Pokémon'unun başı + baş Pokémon'unun renkleri**. Aynısını PMD animasyon kareleri üzerinde, otomatik, kart başına sıfır insan emeğiyle yapıyoruz.

### Neden mümkün (doğrulandı 2026-11-01)
- `*-Offsets.png` sayfalarında her karede **dört tek piksellik işaret** var: siyah = merkez, **yeşil = baş**, kırmızı = sol el, mavi = sağ el (Charmander Walk sayfasında 32 karenin her birinde dördü de sayıldı). Yani başın her karede, her yönde nerede olduğu veri olarak elimizde.
- Kapsama (düzeltme 2026-11-01 akşam, SA-3): Infinite Fusion'ın `head.id`/`body.id` numaraları **ulusal Pokédex değil**, IF'in kendi sırası (IF 538 = Camerupt, ulusal 538 = Throh). SpriteCollab ulusal dex ile anahtarlı; eşleme **ada göre** yapılır (`veri/spritecollab-kapsama.json`, IF yazım hataları için takma ad tablosu: Ratata, Dito, Turwig, Peliper, Victreebell…). Doğru eşlemeyle Skaledman'ın bugünkü **226/226** kartı üretilebilir. Önceki "224/226, Simipour ve Throh eksik" tespiti yanlış kimlik eşlemesinden kaynaklanıyordu. `tracker.json`'daki `sprite_files` alanı güvenilmez (Zubat, Muk için boş); kapsama GitHub klasör listesinden alınır. Cascoon, Silcoon ve Dragonair gövdelerinde Idle sayfası yok → Idle için Walk kullanılır.

### Hat (`araclar/fusion-birlestir.ts`, Node + sharp)
1. **Palet çıkarımı:** sanatçının 288 px fusion resminden baskın 6–8 renk; gövde B'nin PMD paletiyle en yakın eşleme (açıklık sırasına göre) → renk değiştirme tablosu. Böylece gövde, sanatçının çizdiği fusion'ın renklerini alır.
2. **Baş kesimi:** baş Pokémon A'nın Idle karesinden, yeşil işaret etrafındaki bağlı silüet parçası (işaretin üstü ve yanları, gövdeye inen boyun çizgisinde kesilir) 8 yön için ayrı ayrı; A'nın da paleti fusion paletine çevrilir.
3. **Birleştirme:** B'nin her animasyonunun her karesinde yeşil işaret alınır; B'nin baş bölgesi (işaret etrafında, Idle'dan ölçülen baş yarıçapı) silinir, A'nın aynı yöndeki başı B'nin baş boyutuna ölçeklenip işarete oturtulur. Saldırı karelerindeki baş hareketi B'nin işaretini takip ettiği için doğal gelir.
3b. **Boyun köprüsü** (`araclar/fusion/boyun.ts`, 2026-11-01): yerleştirilen baş gövdenin kalın piksellerine değmiyorsa (ya da yalnız 1 px'lik tel/kalıntıyla bağlıysa) baş işaretine en yakın gövde pikselinden başın çekirdeğine kısa, daralan bir şerit çizilir; dolgu rengi gövdenin o bölgedeki açık tonu, kenarı fusion çizgi rengi. Belirleyici, rastgelelik yok. Çok büyük boşluk (> 2,2 × baş yarıçapı + 2 px) köprülenmez.
3c. **Kontrast güvencesi** (`araclar/fusion/kontrast.ts`): birleşik sayfaların dolgu parlaklığı p5–p95 aralığı, sanatçının kart resmi aralığının %80'inin ([70,130]) altındaysa tek bir monoton eğri (çapa + katsayı ≤ 2,5) ile açılır; çizgi ve beyaz dokunulmaz, en koyu dolgu çizgiden ≥ 38 birim açık kalır. Atlasa `kontrast: {capa, katsayi}` yazılır.
3d. **Shiny** (`araclar/fusion/parlak.ts`): Skaledman shiny'yi aynı PNG + CSS `hue-rotate(hue) saturate(1.3)` ile gösterir; shiny kartlar için tüm sayfalar aynı matrisle (feColorMatrix hueRotate sonra saturate, sRGB) `<ad>-Anim-shiny.png` olarak ayrıca üretilir, atlasta `shiny: {hue, doygunluk}`. İstemci `atlasYukle(id, shiny)` / `animatorYukle(id, renk, shiny)` ile seçer. `hue` kart başına değil açılış kaydı başınadır; aynı fusion başka bir hue ile açılırsa o hue için yeniden üretim gerekir.
4. **Çıktı:** fusion başına tek atlas (`sprite/fusion/251.443.png` + `.json`: animasyonlar, yönler, süreler, `HitFrame`, gölge boyutu). Önbelleklenir; kart ilk kez kullanıldığında üretilir, sonsuza dek saklanır.
5. **Kredi:** `tracker.json`'daki `sprite_credit` (gövde ve baş sanatçıları) + Skaledman'daki `artists` (fusion resmi) kredi sayfasına girer. CC BY-NC: kâr yok, kredi var.

### Ne kadar "o kart" olur
Gövde B'nin duruşu ve hareketi, A'nın başı, sanatçının renkleri. Sanatçının elle çizdiği yaratıcı dokunuşlar (kanat eklemesi, farklı poz) gelmez; kart resmi HUD'da ve seçim ekranında sanatçının çizimi olarak kalır, arenada PMD tarzı animasyonlu hâli dövüşür. Benzer oyunlarda da kart/portre ile arena sprite'ı farklı kaynaklardan gelir.

### Riskler
- Baş yapıştırma bazı çiftlerde kötü durur (kuş başı balık gövdeye, kocaman baş küçük gövdeye). Ölçütler: 20 rastgele fusion'ın en az 16'sı "bu o kart" dedirtmeli; kalanlar için Yol B.
- Palet eşlemesi düz renklerde iyi, gradyanlı sanatçı çizimlerinde yaklaşık.
- SpriteCollab'da Shoot/Strike eksik olanlarda saldırı türüne göre Attack'e düşülür.

### İlk sonuç (2026-11-01, 29 fusion üretildi)
`araclar/fusion-birlestir.ts` çalışıyor; `?ekran=lab` sayfasında 60 fps. Ajanın kendi sınıflandırması (sahip/izleyici değil): tohumlu 20 kartta 13 iyi, 7 orta, 0 kötü; 24 kartta 14 iyi, 10 orta. Sorunlar: uzun boyunlu/boyunsuz gövdelerde baş kopuk durabiliyor, soluk renkli kartlarda kontrast düşüyor, pastel kartlarda hafif beneklenme. (Düzeltme: 149.375'in gövdesi Deino'dur, Dragonair gövdeli olan 213.148'dir; ayrıntı ve düzeltmeler `docs/research/spikes/2026-11-01-birlestirme-duzeltmeleri.md`.) Palet eşlemesi ikinci turda ton ailelerine göre yapıldı (ilk histogram eşlemesi benek üretmişti). Gölge halkaları `ShadowSize`'a göre tek renk yarı saydam siyaha çevriliyor. Eksikler: kredi adları Discord kimliği olarak kalıyor. Shiny `hue`, boyun köprüsü ve kontrast güvencesi sonradan eklendi (3b–3d).

## 3. Yol B: PixelLab ile sanatçı resminden animasyon üretimi (ödül katmanı ve yedek)

[PixelLab](https://www.pixellab.ai) tek referans resimden **4/8 yön döndürme** ve **iskelet tabanlı animasyon** (yürüme, saldırı, özel) üretiyor; API ve MCP var; ücretler: ücretsiz 40 üretim, Tier 1 $12/ay 2 000 üretim, Tier 2 $24/ay 5 000 (512 px), Tier 3 $50/ay 10 000 (2026-11-01 fiyat sayfası). "Bazı araçlar görüntü başına birden çok üretim harcar"; kart başına 8 yön × 4 animasyon için kaba tahmin 100–200 üretim, yani **tüm albüm ≈ 25–45 bin üretim**, Tier 3 ile birkaç ay ya da yalnız kullanılan kartlar için talep anında üretim.

- Artısı: sanatçının çizimine birebir yakın, yaratıcı dokunuşlar korunur.
- Eksisi: insansı olmayan vücutlarda kalite belirsiz; sanatçının eserinden türev üretim izin açısından en hassas yol; para ve süre.
- Kullanım: önce 5 kartla deneme (sahip onayı, ücretsiz kota yeter). İyi çıkarsa yayıncının takımı, haftanın şampiyonu ve Yol A'nın kötü durduğu kartlar için. Üretilen her atlas Yol A ile aynı biçime yazılır; oyun hangisinin geldiğini bilmez.

## 4. Reddedilenler
- **Prosedürel/mesh deformasyonu temel olarak:** sahibin kararı (K-5).
- **Tripo ile 3D:** piksel resimden güvenilmez, rig vücut planıyla bozulur, kredi yetmez, izin açısından en sorunlu.
- **Meta AnimatedDrawings (12.8k yıldız):** tek çizimi iskeletle oynatır ama kâğıt kukla görünümü ve yalnız insansı; aynı itiraz.
- **Elle çizim:** kart başına saatler; yalnız topluluk gönüllüsü getirirse, ödül olarak.

## 5. Oyun içi gösterim
- Atlas kareleri nearest-neighbour ile 3× (Walk 32 → 96 px, Attack 64 → 192 px).
- 8 yön: hareket yönü yürüme animasyonunu, nişan açısı saldırı animasyonunun yönünü seçer.
- Durum → animasyon: boşta Idle, hareket Walk, dash Hop, temas saldırısı Attack/Strike, menzilli Shoot, hazırlık Charge, hasar Hurt, bayılma Faint, zafer Pose.
- `HitFrame`, hasarın uygulandığı sunucu anıyla hizalanır: hamle kuralındaki `aviso` süresi = kareler `RushFrame`'e kadar; `network-programmer` ile.
- Gölge `*-Shadow.png`'den; sanatçı kredisi sonuç ekranında.
- Hamle efektleri yine kodla çizilir; karakter saldırı karesini oynarken alev/dalga/ışın efekt katmanından çıkar.

## 6. Kanıt planı: Birleştirme Lab (F0'ın ilk işi)
Tek sayfa: 20 rastgele fusion; solda sanatçının kart resmi, sağda Yol A ile üretilmiş karakter Idle/Walk/Attack/Hurt oynarken, 8 yön döndürülebilir. Ölçüt: sahip ve 3 izleyici "bu o kart" diyor mu (hedef 16/20); baş eklemi bozuk kare oranı < %10; 10 karakter ekranda 60 fps. Aynı sayfada 5 kart için Yol B çıktısı yan yana (ücretsiz kota ile, sahip onayı). Sonuç `docs/research/spikes/` altına.

## 7. Stüdyo ajanlarına dağılım
| İş | Ajan |
|---|---|
| Birleştirme hattı (`fusion-birlestir.ts`): offset okuma, palet eşleme, baş kesme/yapıştırma, atlas yazma, kredi | **art-director** (spesifikasyon) + **gameplay-programmer** (uygulama) |
| Birleştirme Lab sayfası ve 20 kartlık değerlendirme | **prototyper** |
| PixelLab 5 kart denemesi ve maliyet raporu | **prototyper** (sahip onayıyla) |
| Durum → animasyon tablosu, `HitFrame`/`aviso` hizası | **game-designer** + **network-programmer** |
| Atlas biçimi, önbellek, talep anında üretim kuyruğu | **technical-director** + **backend-engineer** |
| SpriteCollab kapsama takibi (`tracker.json`), eksik gövdeler | **art-director** |
