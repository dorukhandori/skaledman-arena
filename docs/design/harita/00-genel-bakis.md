# Harita, Maden ve İşleme: genel bakış

**Tarih:** 2026-11-06 · **Dal:** `devran-kod` · **Durum:** tasarım taslağı, sahip onayı bekliyor · **Şapkalar:** `@helix` (tasarım), `@ledger` (sayılar), `@vault` (sunucu), `@tide`/`@glyph` (ekran)
**Sahibin isteği (2026-11-06, kelimesi kelimesine):** "Oyuna yeni mekanik eklemek istiyorum: bir haritada, üzerinden bizim achievementları da ilerletebildiğimiz, aynı zamanda maden elde edebildiğimiz, bu madenleri atölyede işleyebildiğimiz (madenler UO'daki (Ultima Online) gibi level level olmalı ve işlemek için yetenek gerekmeli). https://youtu.be/DI24ts76itI?t=18 linkteki gibi haritadaki pointlerden ilerleme kaydedilsin ve bazı pointler düşman, bazı pointler maden olsun. Bununla alakalı tasarım dökümanlarını oluştur, dinamiklerini yaz, her şeyi hazır hale getir; en sona stil ve asset üretimleri kalsın."

> **Video varsayımı (açıkça):** Videonun başlığı ve kanalı doğrulandı: *"While the Iron's Hot: Buried Treasure!: Episode 9"* (Steven Thomas Gaming; oEmbed). Açıklama, bölüm işaretleri, döküm ve 0:18'deki görüntü **alınamadı** (sayfa JavaScript ile çiziliyor). Bu yüzden **varsaydım:** kamera sabit, noktalar arasında yol çizgileri olan bir dünya haritası; oyuncu bir noktaya gidip onu tek tek tamamlıyor, tamamlanan nokta komşularını açıyor; bazı noktalar dövüş, bazıları kaynak toplama. Bütün belgeler bu varsayımla tutarlı. Sahip videodaki haritanın başka çalıştığını söylerse yalnız `01` § 2 (yerleşim) ve `07` § 2 (Harita ekranı) değişir; maden, Ustalık ve ekonomi aynen kalır.

## Belge dizini

| # | Belge | Ne anlatır |
|---|---|---|
| 00 | bu belge | Vizyon, döngü, ilkeler, riskler, "ne DEĞİL" |
| 01 | [`01-harita-ve-dugumler.md`](01-harita-ve-dugumler.md) | Düğüm grafiği, bölgeler, kilit, düğüm türleri, ilerleme kaydı, ilk 5 dk, Bölge 1 tablosu |
| 02 | [`02-maden-sistemi.md`](02-maden-sistemi.md) | 8 kademe cevher, kazı etkileşimi, başarı formülü, günlük sınır, anti-bot |
| 03 | [`03-atolye-isleme.md`](03-atolye-isleme.md) | Ocak: eritme → dövme, tarifler, Usta işi, arbitraj kapatma |
| 04 | [`04-ustalik-sistemi.md`](04-ustalik-sistemi.md) | Madencilik ve İşleme Ustalığı (0–100), eğri, öğrenme bandı |
| 05 | [`05-basarim-entegrasyonu.md`](05-basarim-entegrasyonu.md) | 23 yeni başarım (taslak JSON), mevcut 46'dan haritada sayılanlar |
| 06 | [`06-ekonomi-ve-denge.md`](06-ekonomi-ve-denge.md) | Kaynak/gider, Monte Carlo sonuçları, hipotezler H-H1…H-H7, güç yok kanıtı |
| 07 | [`07-ux-ekranlar.md`](07-ux-ekranlar.md) | Harita, düğüm şeridi, Maden, Ocak, Sonuç eki, Ustalık; ASCII wireframe, mobil |
| 08 | [`08-teknik-tasarim.md`](08-teknik-tasarim.md) | Sunucu modeli, göç 5, REST/Colyseus, zod, veri dosyaları, test, gizlilik |
| 09 | [`09-uygulama-dilimleri.md`](09-uygulama-dilimleri.md) | H1…H8 kod dilimleri, kabul ölçütleri, sıra |
| 10 | [`10-stil-ve-asset-plani.md`](10-stil-ve-asset-plani.md) | EN SONA bırakılan sanat ve ses planı (yalnız plan) |
| 99 | [`99-acik-sorular.md`](99-acik-sorular.md) | Sahibe kalan kararlar, her birinin varsayılanı |
| veri | [`veri-taslak/`](veri-taslak/) | `madenler.json`, `ustalik.json`, `tarifler.json`, `harita.json`: tek sayı kaynağı (H1'de `veri/`'ye taşınır) |
| sim | `araclar/harita-ekonomi-simulasyonu.ts`, çıktılar [`sim-cikti-v1.md`](sim-cikti-v1.md), [`sim-cikti-tam.md`](sim-cikti-tam.md) | Sayıların Monte Carlo doğrulaması |
| maket | [`maketler/`](maketler/) | Harita ve Maden ekranı yerleşim maketleri (stil değil) |

**Sayı otoritesi:** bu klasördeki sayılar `veri-taslak/*.json`'dan gelir; belgeyle JSON çelişirse **JSON kazanır**, belge düzeltilir. H1 diliminde JSON'lar `veri/`'ye taşınınca otorite oraya geçer (tuning.md'ye § 22 olarak özet eklenir).

---

## 1. İlk sayfa kuralı: GÜÇ SATIN ALMA VE GÜÇ KAZANMA YOK

> **Kural G-0.** Harita, maden, Ustalık ve İşleme **hiçbir topacın maçtaki gücünü artırmaz.** Bir oyuncu hiç madene girmeden, hiç dövme yapmadan, aynı parçalarla aynı maçı aynı şansla oynar.

Bu kural ledger #25'in ("parça seviyesi YOK, güç satın alma riski sıfır") ve 03 US-3.4'ün ("pahalı = farklı, daha güçlü değil") devamıdır. Somut olarak:

| # | Alt kural | Nasıl sınanır |
|---|---|---|
| G-1 | Ustalık sim'e girmez: `Dunya`, `TakimUyesi`, hash alanları ve `veri/parcalar.json` `katki` değerleri Ustalık okumaz | Lint kapısı: `src/paylasilan/sim/**` `kurallar/harita*`, `kurallar/maden*`, `kurallar/ustalik*` içe aktaramaz; altın hash'ler değişmez (08 § 9) |
| G-2 | Kozmetik ürün (arma, çerçeve, cila, Usta işi) `katki` değiştirmez; cila yalnız Gövde/Disk **metal paletini** değiştirir, köken ışığı ve element kıvılcımı aynı kalır (okunurluk, 00-lore § 2.4) | Birim test: cilalı ve cilasız parçanın `topacParametreleri` çıktısı bit bit aynı |
| G-3 | Dövme parçalar (Dağ Diski, Kırağı Ucu, Köz Gövde…) **yan-grade**: aynı parça bütçesinde, mevcut aralıklarda (tuning § 13) | Bayrak `dovmeParcalari` **kapalı başlar**; bot turnuvası her build'e karşı %35–65 bandını geçince açılır (06 H-H5) |
| G-4 | Ustalık, cevher ya da külçe maç eşleştirmesine, Elo'ya, Enerji'ye, XP çarpanına girmez | Kod incelemesi + `macSonu` testleri (08 § 9) |
| G-5 | Harita maçının Çekirdek XP'si hızlı maçla aynı tabloyu izler ve günlük 10 maç sayılır; harita "XP çiftliği" değildir | 06 Tablo E, sunucu testi |
| G-6 | Hiçbir maden ürünü Market kilidini açmaz: **"para parça alır, başarım parçayı var eder"** (03 § 0) bozulmaz | Market kuralı `market.ts` maden ürününü tanımaz |

Mekaniğin her belgesinde bu kural ayrıca sınanır (her belgenin "G-0 sınaması" satırı).

## 2. Vizyon (tek cümle)

Arena dışında, Devran dünyasının altı element bölgesini düğüm düğüm geçtiğin, botlarla dövüşüp eski ocaklarda **cevher kazdığın**, cevheri Atölye'nin **Ocak**'ında işleyip topacına ve profiline **kimlik** (arma, çerçeve, cila) kazandırdığın sakin bir ilerleme katmanı; maçın kendisini ise hiç değiştirmez.

## 3. Hedef oyuncu

| Oyuncu | Harita ona ne verir |
|---|---|
| **Yeni oyuncu** (ilk saat) | Antrenmandan sonra "ne oynayayım?" sorusuna cevap: kolaydan zora sıralı bot maçları; ilk düğüm kukla bot. PvP baskısı olmadan Yetenek ve bitiş türlerini öğrenir |
| **Gündelik oyuncu** (10 dk/gün) | Günde 2 maç + 15 kazı ile ölçülebilir ilerleme (Ustalık sayısı her gün artar); hızlı maç kuyruğu beklemeden oynar |
| **Koleksiyoncu** | 8 kademe cevher, 23 kozmetik tarif (ilk sürümde 11), Usta işi parlak varyantlar, harita yıldızları |
| **Rekabetçi oyuncu** | Etkisi yok (G-0). Başarım avlarken bitiş türlerini (Ring Out, Parçalanma) bota karşı çalışabilir; dövme yan-grade parçalar yeni meta seçenekleri |
| **Yayıncı (Kick)** | Yayın arası "maden turu": kısa, tekrarlanabilir, izlenebilir (Kuşak halkası isabet anı) |

Misafir (hesapsız) oyuncu Harita'yı görmez; Antrenman ve oda maçı aynen açıktır (S1: hesapsız oyuncu da maç oynar).

## 4. Temel döngü

```
            ┌────────────── Harita (bölge, düğümler) ◄──────────────┐
            │                      │                                 │
            ▼                      ▼                                 │
   DÜŞMAN / PATRON düğümü      MADEN düğümü                          │
   (bota karşı normal maç)     (Kazı seansı, ≤ 8 vuruş)              │
            │                      │                                 │
            ▼                      ▼                                 │
   Yıldız + Altın + cevher     Cevher + Madencilik Ustalığı          │
   + başarım sayaçları                │                              │
            │                         ▼                              │
            └────────────────►  ATÖLYE › OCAK                        │
                               ERİT (cevher → külçe, İşleme Ust.)    │
                               DÖV  (külçe + Altın → arma/çerçeve/   │
                                     cila; Usta işi şansı)           │
                                      │                              │
                                      ▼                              │
                       Profil/Atölye'de kimlik ── yeni düğüm açılır ─┘
```

**Kapı ilişkisi (çift yönlü bağ):**
- Harita ilerlemesi **maden'e kilitlenmez**: maden düğümü görüldüğü an TAMAM sayılır; dövüş sever oyuncu hiç kazmadan patronlara gider.
- Maden ilerlemesi **haritaya kilitlenir**: yüksek kademe damarlar ileri bölgelerde; Ustalık öğrenme bandı (04 § 3) düşük damarda ilerlemeyi keser. UO'daki "yetenek yetmiyorsa kazamazsın; kolay damar artık öğretmez" hissi buradan gelir.

## 5. Neden S1 ve S2'ye uyuyor

| Sütun | Nasıl |
|---|---|
| **S1 kolay öğrenilir** | Harita tek eylem: noktaya dokun, alttaki düğmeye bas (GİR / KAZ / AÇ). Kazı tek düğme (KAZ); isabet isteğe bağlı, kaçırmanın cezası yok. Ocak iki fiil: ERİT, DÖV. Yeni oyuncu ilk 5 dakikada bir maç kazanır, bir damar kazar (01 § 6) |
| **S1 zor ustalaşılır** | Yıldız şartları (Ring Out ile kazan, 60 sn altında kazan…) maçın kendi derinliğini çalıştırır; isabet halkası zamanlama becerisi; Ustalık öğrenme bandı hangi damarı ne zaman kazacağını düşündürür; Usta işi yüksek Ustalık ister |
| **S1 kademeli açılma** | Harita yalnız İlk Devir'den sonra görünür; Ocak yalnız "İlk Kazı"dan sonra; İşleme sekmesi ilk külçeye kadar tek tarif gösterir; Bölge 2 Bölge 1 patronuyla açılır |
| **S1 öğretmeyen kural yok** | Ustalık eşiği damarda açık sayı ("USTALIK 25"); başarı şansı yüzde olarak görünür; öğrenme bandı damar üstünde "ÖĞRETİR / AZ ÖĞRETİR / ÖĞRETMEZ" etiketi (07 § 4) |
| **S2 sadelik > lore** | Oyuncu "KAYA CEVHERİ" görür; lore adı "Dağ Bakırı" yalnız Dünya sayfasında. Düğüm adı yok, tür + zorluk var. Ekran başına tek ana düğme |
| **S3 referans** | Harita yeni "yer": Kuşak Taşı kabuğu (◄, başlık plakası, Altın yuvası) + çizilmiş arazi; Ocak, Atölye'nin blueprint dilinde (referans 03) |
| **S4 Dereceli kapılı** | Dokunulmadı. Harita Dereceli'ye kapı değildir; Dereceli kapısı (ilk Çekirdek Lv.3) aynen |

## 6. "Ne DEĞİL" listesi

| Değil | Neden |
|---|---|
| Güç ilerlemesi (parça seviyesi, Ustalıkla stat) | G-0, ledger #25 |
| Açık dünya / serbest yürüme | S2; sabit kamera düğüm haritası yeter |
| Kalıcı can/stamina taşıyan "koşu" (roguelite) | Her düğüm maçı bağımsız tam maç; dinlenme düğümüne gerek kalmaz (01 § 3.6) |
| Enerji/stamina ile oynatma kısıtı (bekle ya da öde) | Kâr amaçsız proje; sınır yalnız günlük **ödül** sınırıdır, oynama sınırı değil |
| Ticaret, açık artırma, oyuncular arası cevher takası | Bot çiftliği ve RMT riski; ilk sürüm kapsam dışı |
| Cevherin Altın'a dönüşmesi (ya da tersi) | Arbitraj (ledger #14 ruhu, 03 § 6) |
| Market kilidi açan maden ürünü | G-6 |
| PvP harita, asenkron "gölge" rakip | Ölçeği büyütür; 99 S-8'de sezon sonrası fikri |
| Gerçek zamanlı maden mini oyunu (topaçla damar sürme) | Sim'e yeni mod demek; sim değişmez kuralı. Kazı REST tabanlı kısa seans |
| UO'nun adları, varlıkları, kademe adları | IP hijyeni (00-lore § 8). Yalnız mekanik ilham: kademe eşiği, kullanarak artış, başarısızlık şansı |

## 7. Riskler

| # | Risk | Etki | Önlem |
|---|---|---|---|
| R1 | Harita bot maçları PvP kuyruğunu boşaltır | Hızlı maç bekleme uzar | Harita Altın/saat ≤ hızlı maçın %50'si (06 § 4); günlük 10 sayılan maç; Dereceli ve sıralamalar yalnız PvP |
| R2 | Kozmetik ödül yeterince çekici değil | Maden boş kalır | Kademe renk dili + Usta işi parlaklığı + profil kartında görünür arma/çerçeve; dövme parçalar (bayrak açılınca) |
| R3 | Bot/makro kazı | Ekonomi şişer | Günlük 60 vuruş tavanı, 41–60 yarım, sunucu isabet doğrulaması, vuruş aralığı ≥ 700 ms; 06 Tablo E: bot ÷ tutkulu 1,08 |
| R4 | Artan cevher (v1'de tarif bitince cevher işe yaramaz) | "Neden kazıyorum?" | v1 içeriği aktif oyuncuda ≈ 13 gün sürer (06 Tablo F); sezon 2'de bölge 4–6 + dövme parçalar + Devir Taşı; 99 S-6 "artık cevher" varsayılanı |
| R5 | Dövme parça dengeyi bozar | G-0 ihlali | Bayrak kapalı başlar, bot turnuvası şartı (H-H5) |
| R6 | Menü sadeliği (Atölye alt şeridine 5. öğe) | S-4 küme sayımı | Ocak yalnız İlk Kazı sonrası görünür; alt şerit 5 öğe (≤ 7) |
| R7 | Yeni oda modu ağ/protokol riski | Eski istemci | `PROTOKOL_SURUMU` 6 → 7, katılmada açık hata (08 § 5) |
| R8 | Tasarım insan testinden önce kodlanır | Yanlış his | Dilim sırası: veri + sunucu önce, ekranlar test gecesi geri bildirimi sonrası (09 § 1) |

## 8. Tasarım sütunlarıyla tutarlılık notu
`docs/design/tasarim-sutunlari.md` S1–S4'ün hiçbirini değiştirmez. S1'in "kademeli açılma" sırasına yalnız bir ara basamak eklenir: **sürüş ve çarpma → (İlk Devir) → Harita Bölge 1 → dash/sekme/Yetenek (Lv.2)…**. Harita bu sırada "ikinci antrenman" görevi görür; zorunlu değildir (hızlı maç aynı anda açıktır). Sütunlar belgesine bu not tek satır olarak eklendi.
