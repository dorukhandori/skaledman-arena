# Boşluk taraması: kapsam ve akış (Devran)

`[@nile · Producer]` · 2026-11-04 · Durum: karar önerisi; sahip itiraz ederse değişir. Kod yazılmadı.
Okunan: `CLAUDE.md`, `AGENTS.md`, `docs/production/roadmap.md` + `ACTIVE_WORK.md`, `docs/design/beyblade/00..05`, `docs/art/topac-pixel-plani.md`, `docs/design/oyun-konsepti.md`, `docs/tech/mimari.md`, `skaledman-eklenti.md`, `veri-cekimi.md`, `docs/research/beyblade/05` § 5 ve `06` § 5, `README.md`, kaynak ağacı (`src/`, `veri/`, `test/`), referans ekran `08-arena-ulti.jpg`.

## 0. Kararların durumu (kodlamayı ne bloklar)

Sahip 2026-11-04'te dokuz referans ekranı (giriş/profil, ilk çekirdek, atölye, market, başarımlar, lobi, maç, ulti anı, sonuç) tek tek onayladı. Bu ekranlar `03-oyuncu-yolculugu.md` akışını ve `01-arena-eslemesi.md` HUD'unu (Stamina çubuğu, 3 dilimli Enerji, puan, süre) birebir gösteriyor. **Bunu aşağıdaki maddeler için zımni onay sayıyorum; sahip itiraz etmezse roadmap'e bu notla yazılır.**

| 02'deki no | Konu | Durum | Dayanak |
|---|---|---|---|
| K-1 | Skaledman bağı | **Kesin: (a) tam bağımsız**, kimlik yalnız Kick | Sahip 2026-11-04: "Skaledman'dan bağımsız özgün" |
| K-2 | Kod adı Devran | **Kesin** (marka taraması yapılmadı) | Sahip görevi "Devran" diye verdi |
| K-12 | Terimler | **Kesin**, `04-sozluk.md` | Sahip: "terimler genel oyun terimleri olsun" |
| K-3 | Kontrol C hibrit | **Zımni onay** | 07/08 ekranı: sürüş + Stamina + Enerji, nişan çizgisi |
| K-4 | İlk 3 puan, 90 sn + ani ölüm | **Zımni onay** | 08 ekranı: "2 - 1", "0:31" geri sayım |
| K-5, K-6, K-9, K-11 | Kuyu yok, bitiş sonrası değişim, Devir kapalı, seyirci F2 sonrası | **Zımni onay** (öneri aynen) | Ekranlarda çelişen öğe yok |
| K-7 | Ulti ilk sürümde mi | **Revize kararım:** Ulti ilk sürümde **var** (Lv.3'te açılır, maçta bir kez); Lv.4, Altı Ata, görev zinciri ikinci sezon | Sahip "ulti anı" ekranını onayladı; Ulti'siz ilk sürüm onaylanan 9 ekranın birini boşa çıkarır. Şekil onayı `@helix` |
| K-8 | Eş Çekirdek | İkinci sezon | Öneri aynen |
| K-10 | Karanlık ilk sürümde | **Var, dar:** tek Karanlık çekirdek, Market'te görünür kilitli; Kararma sayacı var, Aydınlanma ve Karanlık Pazarı yok | Bkz. B-9 |
| 03 § 7-1 | Parça seviyesi | **(a) parçalar sabit**, yalnız Çekirdek seviyelenir | Güç satın almayı önler; `@ledger` dengesini sade tutar |
| 03 § 7-2..5 | Eritme, Yapay ömrü, gizli oran, destek bonusu | Eritme **ilk sürümde yok**; Yapay ömrü **maç sayısı**; gizli ~%15 kalır; destek kanalı bonusu **yok** (yalnız kozmetik alan) | Kapsamı küçültür; hiçbiri ilk oynanabilir dilimi bloklamaz |

**Sonuç: ilk dilimi (Topaç Lab) bloklayan sahip kararı kalmadı.** Sahibe tek blokaj öncesi iş: aşağıda B-1 (yarım kalan F0 değişiklikleri) ve dilim 4 öncesi alan adı (B-24).

## 1. Boşluk tablosu

Önem: **bloklar** (o dilim başlayamaz) · **yüksek** · **orta** · **düşük**. Son sütun: hangi dilimi bloklar (bkz. § 2).

### 1a. Süreç ve depo hijyeni

| # | Boşluk | Kanıt | Önem | Dolgu önerisi (kim, nerede) | Bloklar mı |
|---|---|---|---|---|---|
| B-1 | Çalışma kopyasında yarım F0 işi var (Pokémon kart panosu) ve dal hâlâ `f0/arena-prototip` | `git status`: `Arena.ts`, `BirlestirmeLab.ts`, `Hud.ts`, `KartPanosu.ts` değişmiş, commit'siz | bloklar | Sahip isterse eski iş `f0-skaledman-son` etiketiyle kaydedilir; Devran `devran/d1-topac-lab` dalında başlar. Commit yalnız sahip isterse (`@nile` sorar) | D1 |
| B-2 | K numaraları çakışıyor: `02`'de K-1..K-12, roadmap'te K-1..K-16 aynı numaralarla başka kararlar | `roadmap.md` K-7 = kontrol şeması, `02` K-7 = Lv.4/Ulti | yüksek | `02`'deki satırlar **D-1..D-12** olarak yeniden adlanır; roadmap'e K-17'den itibaren işlenir (eşleme § 4'te). `@nile` | Hayır |
| B-3 | Klasör adı "beyblade" depoda; araştırma 05 § 5b-12 ve K-H "Beyblade kelimesi depoda geçmez" der | `docs/design/beyblade/`, `docs/research/beyblade/` | yüksek | `docs/design/devran/` olarak taşınır (dosyalar henüz izlenmiyor, `mv` yeterli); araştırma klasörü yerel, `docs/research/topac/` | Hayır |
| B-4 | Tasarım belgeleri R01..R06'ya atıf yapıyor ama `docs/research/` depoda değil | commit `b5461e5` | düşük | Atıflar kalır; her belgenin başına "araştırma yerel, depoda yok" satırı. Kararı taşıyan sayı tasarım belgesine aynen yazılır | Hayır |
| B-5 | `ACTIVE_WORK.md`'de 2026-11-01'den kalan "devam eden" satırlar (@relay, @iris, @ledger) sahipsiz | dosyanın "Devam eden" bölümü | orta | Hepsi "iptal: Devran'a geçiş, 2026-11-04" ile kapanır; yeni satırlar dilim başlarken açılır | Hayır |
| B-6 | `tuning.md` her yerde anılıyor ama yok | `ls docs/design/tuning.md` → yok; roadmap K-16, 05 § 7 | yüksek | `@ledger` D1 sonunda topaç sim'i için yazar (05 § 2-3 aday katsayılar + 05 § 3.1 eşikler); eski hamle değerleri tarihçe | D2 |

### 1b. Kapsam çelişkileri

| # | Boşluk | Kanıt | Önem | Dolgu önerisi | Bloklar mı |
|---|---|---|---|---|---|
| B-7 | Ulti: K-7 "ikinci sezon" der, 01 yuva 3 = "Ulti (kilitli, Lv.4)", sahip ulti ekranını onayladı | `02` K-7, `01` § 1.1, `08-arena-ulti.jpg` | yüksek | § 0 kararı: Ulti Lv.3'te, maçta bir kez. Görsel: element başına 1 siluet + 1 avatar (`topac-pixel-plani` § 4.2 "6 avatar"). `@helix` 01/03'ü düzeltir | D3 |
| B-8 | Takım Ultisi ilk sürümde mi, belirsiz; 03 § 6 tablosunda yok | `00` § 4.6, `05` § 3.2 satırı, `03` § 6 | orta | İlk sürümde **var ama son dilimde** (D8); kesinti gerekirse ilk kesilecek iş | Hayır |
| B-9 | Karanlık (K-10) ilk sürümde "var" ama ona ulaşma yolu yok: başlangıçta yok, Karanlık Pazarı ilk sürümde yok, Kararma için Kara yetenek gerekiyor | `02` K-10, `03` US-1.3 ve § 6 | yüksek | Tek Karanlık çekirdek (örn. Külkartal) Kraterci tezgâhında **kilitli-görünür**, başarım "Mor Çatlak" yerine "50 galibiyet" türü açık şartla. Kararma sayacı çalışır, Aydınlanma yok. `@helix` | D7 |
| B-10 | Yeni oyuncunun **1 çekirdeği** var ama takımda "üç farklı Çekirdek zorunlu" ve maç 3'lü takım | `03` US-1.3, US-2.1, `01` § 2.3 | **bloklar** | Üç çekirdeğe ulaşana kadar boş yuvalar **ödünç topaç** ile dolar (Lv.1, gri çerçeve, tecrübe ve başarım almaz). `@helix` kuralı 03'e yazar, `@vault` şemaya `odunc` bayrağı | D5 |
| B-11 | Yuva 4 "Parça Tekniği" hiçbir yerde içerikle tanımlı değil | `01` § 1.1 tek satır | orta | İlk sürümde **yok**; HUD üç yuva (Yetenek, Özel Yetenek, Ulti). İkinci sezon | Hayır |
| B-12 | İlk arena belirsiz: roadmap K-14 "İskeletler Diyarı", sanat planı "Kuşak Çanağı", lore "Kuşak Arenası"; "Çanak" sözlükte lore terimi | `roadmap.md` K-14, `topac-pixel-plani` § 8.1, `04-sozluk.md` | yüksek | İlk arena **Kuşak Arenası** (daire, dış hız şeridi, kenar düşüşü). İskeletler Diyarı tarihçe. `@cove` `docs/design/arenalar/kusak-arenasi.md` yazar | D2 |
| B-13 | Element kaynağı Çekirdek mi Gövde mi | `topac-pixel-plani` § 10-1, `00` § 2.3 | yüksek | Kimlik elementi **Çekirdekte**; Gövdede `motifElement` yalnız uyum cezası ve boya için. `@helix` onaylar, şema buna göre | D6 |
| B-14 | Market ürün sayısı ile sanat bütçesi çelişiyor: ~25 Market kilidi ve tezgâh başı ≥3 kilitli parça isteniyor, sanat planı 8 parça çiziyor | `03` US-4.1, `topac-pixel-plani` § 8.1 | yüksek | İlk sürüm: **≤12 çizilmiş şekil** (5 Gövde, 3 Disk, 4 Uç) × element boyası × parametre varyantı = **~28 ürün**. Ürün = şekil + boya + sayı; çizim değil. `@iris` şekil listesi, `@ledger` sayılar | D6 |
| B-15 | Profil kartı "Galibiyet Sıralaması ve Stil Puanı sırası" gösteriyor ama dereceli ilk sürümde yok | `03` US-1.2 ve § 6 | düşük | İlk sürümde profil: maç, galibiyet, en çok kullanılan element, 3 başarım. Sıralamalar dereceli ile gelir | Hayır |
| B-16 | "Destek Kanalı" başarımı yayının canlı olduğunu bilmeyi gerektiriyor (Kick API çağrısı) | `03` US-4.1 Sosyal | düşük | İlk sürümde bu başarım yok; destek kanalı yalnız profil alanı | Hayır |

### 1c. Oyuncu yolculuğunda eksik ekran ve durumlar

| # | Boşluk | Kanıt | Önem | Dolgu önerisi | Bloklar mı |
|---|---|---|---|---|---|
| B-17 | Bağlantı kopması ve yeniden bağlanma tanımsız | `03` § 5'te yok; `06` § 5c-6 (battle-tops 30 sn) | yüksek | Maç içinde 20 sn yeniden bağlanma penceresi (topaç olduğu yerde Sıkı Dönüş'te bekler, süre işler); dolarsa terk. Takım seçimi sırasında kopma = maç iptal, ceza yok. `@relay` (Colyseus `allowReconnection`), ekran `@glyph` | D4 |
| B-18 | Terk ve AFK kuralı yarım: yalnız "terk geliri 0" var | `03` US-3.4, US-4.2 | yüksek | Terk = rakip 3-0 kazanır, terk eden 0 Altın, başarım saymaz; maçta 15 sn girdi yoksa uyarı, 25 sn'de terk. Günde 3 terk → 10 dk hızlı maç beklemesi | D4 |
| B-19 | Eşleşme bulunamadı / boş kuyruk: 112 kişilik kitlede hızlı maç sık boş kalır | `06` § 5c-8 "boş kuyrukta bot var mı" | yüksek | 30 sn sonra "Bot ile oyna (Altın yarı, başarım yalnız Yol)" önerisi; kuyrukta beklerken Antrenman. `@vault` + `@glyph` | D7 |
| B-20 | Oda kodu hata durumları yok: geçersiz, dolu, süresi geçmiş, sahibi ayrıldı | `03` US-5.1 | orta | Dört hata metni + "yeni oda aç"; oda 10 dk boş kalınca kapanır. Rövanş: iki taraf "tekrar" der, aynı oda | D4 |
| B-21 | Takım seçiminde (20 sn) seçmeyen oyuncu, rakibin ayrılması | `03` US-5.1 | orta | Süre dolunca son kullanılan takım; rakip ayrılırsa lobiye dön, ceza yok | D5 |
| B-22 | Kick giriş hataları: izin reddi, Kick kapalı, token süresi, sunucu bakımda, istemci sürümü eski | `03` US-1.1 yalnız mutlu yol | orta | Giriş hata ekranı (tekrar dene); sunucu `surum` uyuşmazsa "yenile" bandı; bakım sayfası statik. `@vault` + `@glyph` | D5 |
| B-23 | İlk kez giren: ad çakışması, küfür filtresi listesi, eğitimi atlama, eğitimde Market kilidi | `03` US-1.2, US-1.3 | orta | Ad tekil (büyük/küçük harf duyarsız); filtre sunucuda Türkçe liste (`veri/yasak-sozcukler.json`, `@vault`). Eğitim atlanabilir ama Market "İlk Devir" ile açılır (bilerek); Atölye ve lobi baştan açık | D5 |
| B-24 | Kick OAuth uygulama kaydı ve geri dönüş adresi için alan adı yok; eski öneri `arena.skaledman.com` artık geçersiz | `mimari.md` § 5, `skaledman-eklenti.md` § 6 | **bloklar** (D5) | Öneri: `devran.ovarlak.games` (sahibin Cloudflare zonu, ek maliyet yok) + Tunnel; D4 test için Cloudflare Access arkasında. Kick geliştirici uygulamasını sahip açar (istemci kimliği; sır yalnız VPS ve `~/.openclaw/credentials/`). **Sahip onayı gerekir** | D4 test, D5 |
| B-25 | Mobil/dokunmatik ve dar ekran: oyun klavye + fare | `01` § 1.1 | düşük | "Bu oyun klavye ve fare ister" ekranı; mobilde seyirci görünümü açılabilir | D5 |
| B-26 | Sekme arka plana geçince rAF durur, tahmin kayar | Colyseus tahmini + tarayıcı davranışı | orta | `visibilitychange` ile "duraklatıldı" bandı, dönüşte tam durum; süre B-17 penceresine sayılır. `@relay` | D4 |
| B-27 | Yapay çekirdeğin ömrü biterse kayıtlı takım geçersiz olur | `00` § 6.4, `03` § 7-3 | düşük | Takım kartında kırmızı uyarı; maça girişte otomatik ödünç topaç. `@vault` | D6 |
| B-28 | Kişisel veri: Kick `user_id`, ad, avatar saklanıyor; silme yolu ve gizlilik metni yok | `mimari.md` § 4 | orta | Tek sayfa gizlilik notu + profilde "hesabımı sil". Herkese açık bağlantıdan önce. `@vault` | D8 |
| B-29 | Erişilebilirlik: flaş, sarsıntı, renk körlüğü sınırları açık | `05` § 8-9, `topac-pixel-plani` § 8.4 | orta | Ayarlar: sarsıntı/flaş azalt, ses düzeyi; element ayrımı renk + desen. `@tide` `docs/ux/erisilebilirlik.md` | D3 |

### 1d. İçerik, veri dosyaları, ses, yayın

| # | Boşluk | Kanıt | Önem | Dolgu önerisi | Bloklar mı |
|---|---|---|---|---|---|
| B-30 | Hiçbir içerik veri dosyası yok; `veri/` yalnız Skaledman ve SpriteCollab anlık görüntüleri. Tek önerilen şema `veri/topac-parca.json` (yalnız görsel meta) | `ls veri/`, `topac-pixel-plani` § 7.5 | **bloklar** (D3, D6, D7) | Zod şemaları `src/paylasilan/kurallar/veri-semalari.ts` (`@byte`); dosyalar: `veri/cekirdekler.json`, `ruhlar.json`, `yetenekler.json`, `parcalar.json`, `market.json`, `basarimlar.json`. Görsel meta ayrı: `veri/topac-gorsel.json` (`@iris`). Oyun sayıları JSON'da, kodda değil | D3 |
| B-31 | 15 örnek ruh tablo hâlinde var, yetenek eşlemesi yok (hangi ruh hangi Yetenek + Özel Yetenek + Ulti) | `00` § 3.5, § 4.7 | yüksek | İlk sürüm **7 ruh**: element başına 1 + Karanlık 1. `ruhlar.json` alanları: id, ad, element, köken, yetenekler[3], avatar. İçerik `@helix`, sayılar `@ledger` | D3 |
| B-32 | 18 yetenek ailesinde Ulti, Alan ve takım karışık; ilk sürüme hangileri girer belirsiz | `00` § 4.7 | yüksek | İlk sürüm: 6 element × (Yetenek + Özel Yetenek + Ulti) = 18 + 1 Karanlık Özel Yetenek. Taklit Sıçrayış başlangıç Yapay çekirdeğinin (Kasırga) Yeteneği yerine geçer, sayıyı artırmaz. Aile = davranış şablonu (atılış, alan, çekim, kontra, zırh, duvar); yetenek = şablon + sayı | D3 |
| B-33 | 40 başarımın yalnız ~18'i örnek; sayaçların hangi sim olayından beslendiği yok | `03` US-4.1, `05` § 6.2 olay tipleri | yüksek | `basarimlar.json`: id, kategori, sayac (olay adı + filtre), esik, altin, acar (ürün id), gizli, sayilanModlar. Olay listesi sim'den (`carpisma`, `ringOut`, `parcalandi`, `durma`, `yetenek`, `maçSonu`). İçerik `@helix`, eşikler `@ledger`, sunucu sayacı `@vault` | D7 |
| B-34 | Market parça listesi, fiyatlar, tezgâh dağılımı yok | `03` US-3.1..3.4 | yüksek | `market.json`: ürün → tezgâh, fiyat katmanı, kilit (acik / basarim id / gizli). 4 tezgâh × 7 ürün. `@ledger` fiyat, `@helix` dağılım | D7 |
| B-35 | **Ses ve müzik hiç planlanmamış**; `@pixi/sound` yok; ses sorumlusu ajan yok; 05 olay tablosu "Ses" sütunu boş kanca | `05` § 1 ve § 3.3, `topac-pixel-plani` § 5.1 | yüksek | İlk sürüm asgari set: ~16 efekt (çarpışma hafif/ağır/kritik, duvar, dash, sekme, Ring Out, Parçalanma, Durma, telegraf, Ulti, geri sayım, maç sonu, UI tık, satın alma, başarım) + 2 döngü müzik (menü, arena). Kaynak: yalnız CC0 ya da kendimiz üretiriz (jsfxr), kredi `veri/manifest-gorsel.json`'a eklenir (yayında telif ihtarı riski). Ses düzeyi + kapat. Sahiplik `@iris` (ses dili + lisans), kanca `@byte`, bağımlılık onayı `@axiom` | D3 kanca |
| B-36 | IP: onaylanan 08 ekranındaki alevli kanatlı kuş "anka" okunur; `00` § 8.1 anka ve kanatlı tasarımı yasaklar | `08-arena-ulti.jpg`, `00` § 8.1 | yüksek | Ekran kompozisyon referansı kalır; Közkartal avatarı alevsiz kanat, kartal başı belirgin çizilir. `@iris` benzerlik kontrolü avatar üretiminden önce | D3 |
| B-37 | Marka taraması (TÜRKPATENT) ve depo görünürlüğü: depoda README/CONTRIBUTING/CI var, depo herkese açıksa Pokémon/fusion içeriği de açık | `02` K-2, `README.md` | orta | Herkese açık bağlantıdan önce: eski fusion sprite'ları (`public/fusion/`) depodan çıkar, marka taraması sahibe hatırlatılır | D8 |
| B-38 | Seyirci/OBS görünümü ve Kick sohbet akışı F2 notları dağınık | `03` US-5.4, `02` K-11, `mimari.md` § 4 | orta | Bkz. § 3 | D8 |
| B-39 | Bot rakip: eğitim, Antrenman, boş kuyruk ve başlangıç önizlemesi bota dayanıyor; topaç botu tanımsız | `03` US-1.3, US-2.3 | yüksek | Üç kademeli bot (`kurallar/botlar.ts` yerine yeni): dolaş-çarp, kenara it, yetenek kullan. `@byte`; bot turnuvası `@ledger` | D2 |
| B-40 | Telemetri: dengeyi ölçecek maç kaydı yok | `mimari.md` § 4 `mac` tablosu eski | düşük | `mac` satırına bitiş türleri, süre, takımlar, yetenek sayısı. `@vault` | D7 |

## 2. Kodlama sırası

Her dilim oynanabilir bir yapı bırakır ve **gerçek oynamayla** kapanır (ekran görüntüsü + kısa video, sahip ya da `@pebble`). Bir sonraki dilim öncekinin kabulünden sonra açılır.

| Dilim | İçerik | Bitince ne oynanabilir (kabul) | Sahipler |
|---|---|---|---|
| **D1 · Topaç Lab + iki topaç çarpışması** | `?ekran=topac-lab`; yeni `sim/topac.ts` + `carpisma-impuls.ts` (`05` § 2), ivmeli sürüş, Uç deseni (düz), stamina; hitstop, yönlü sarsıntı, flaş, 20 parçacık; 1 Gövde + 1 Disk + 1 Uç + 1 Çekirdek, (a) `rotation` ve (c) Blender kareleri yan yana; Stamina kaydırıcısı | WASD ile bir topaç sürülür, sabit rotalı bota çarpılır; hafif/ağır/kritik ayırt edilir (`05` § 7 ölçütleri, `topac-pixel-plani` § 9 ölçüt 1-6); 600 adım determinizm testi yeşil; p95 ≤ 16,7 ms | `@spark` + `@byte`, sanat `@iris` |
| **D2 · Tam maç, çevrimdışı** | Kuşak Arenası (`@cove`), Ring Out / Parçalanma / Durma, ilk 3 puan, 90 sn + ani ölüm, bitiş sonrası zorunlu değişim + geri çek, dash, Sekme, Sıkı Dönüş, 3 kademeli bot, HUD (07 ekranı: Stamina, Enerji yeri, puan, süre), `tuning.md` | Bot karşısında 60-90 sn'lik tam maç; üç bitiş türünün her biri en az bir kez görülür ve "neden oldu" 1 sn'de söylenir | `@byte`, `@cove`, `@glyph`, `@ledger` |
| **D3 · Yetenek, Enerji, Ulti, ses** | Veri şemaları (B-30), `yetenekler.json` + `ruhlar.json` (7 ruh, 19 yetenek), Enerji metresi, telegraf (`@relay` süre onayı), Ulti silueti + 2 avatar (Kor, Don), ses kancası + asgari ses seti, erişilebilirlik ayarları | Bot karşısında element seçilip maç oynanır; Yetenek, Özel Yetenek ve Ulti kullanılır; 08 ekranındaki an oyunda görülür; sesli ve sessiz oynanabilir | `@helix`, `@ledger`, `@byte`, `@iris`, `@tide` |
| **D4 · Çevrimiçi 1v1, oda kodu** | Colyseus 0.18 oda, `defineInput` 60 Hz, tahmin A/B kararı (`05` § 4.1), yeniden bağlanma, terk/AFK, oda hataları, rövanş; VPS'e ilk dağıtım (ayrı kullanıcı + systemd + kota, `127.0.0.1`, Tunnel, Access arkasında) | İki farklı ağdaki iki gerçek istemci oda koduyla tam maç oynar; **150 ms + 20 ms jitter + %2 kayıp** altında `05` § 7 ağ ölçütleri tutar; bir taraf koparılıp 20 sn içinde geri döner | `@relay`, `@vault`, `@pebble` |
| **D5 · Kimlik, profil, ilk çekirdek, eğitim** | Kick OAuth 2.1 PKCE, SQLite (`oyuncu`, `envanter`, `takim`), geliştirme girişi (yalnız yerel), profil oluşturma, 3 başlangıç çekirdeği (02 ekranı), Antrenman eğitimi (60 sn), ödünç topaç (B-10), takım seçimi 20 sn, giriş hata ekranları | Hiç oynamamış bir Kick hesabı girer, profil açar, çekirdek seçer, eğitimi bitirir, arkadaşının oda koduyla kendi topacıyla maç yapar | `@vault`, `@glyph`, `@tide`, `@helix` |
| **D6 · Atölye ve parçalar** | `parcalar.json` (~12 şekil), 4 yuva, 8 parametre çubuğu, uyum uyarısı, 3 kayıtlı takım, tek tuşla Antrenman (30 sn), Çekirdek Günlüğü + tecrübe + Lv.1-3 | Uç değiştirip Antrenman'da farkı hissetmek; kaydedilen takımla maça girmek; bir çekirdeğin Lv.3'e çıkıp Özel Yetenek açtığını görmek | `@byte`, `@glyph`, `@iris`, `@ledger` |
| **D7 · Ekonomi: Altın, Market, başarımlar, hızlı maç** | Altın defteri (sunucu), `market.json` (4 tezgâh, ~28 ürün, günün parçası), `basarimlar.json` (40, ~25 kilit, ~6 gizli), sunucu sayaçları, sonuç ekranı (09), hızlı maç kuyruğu + boş kuyrukta bot, Karanlık çekirdek kilidi | Maç kazan → Altın + başarım ilerlemesi gör → başarım bir parçayı açar → Market'ten al → Atölye'de tak → maçta kullan | `@vault`, `@ledger`, `@helix`, `@glyph` |
| **D8 · İlk sürüm kapısı** | Takım Ultisi, kalan 4 avatar, seyirci/OBS görünümü, gizlilik + hesap silme, krediler sayfası, eski fusion varlıklarının temizliği, QA kapısı (`@flint`), herkese açık alan adı (sahip onayı) | Yayıncının kanalında bir test gecesi: ≥10 izleyici kendi hesabıyla oynar, yayıncı OBS'te seyirci görünümünü gösterir; kritik hata yok | `@flint`, `@pebble`, `@vault`, `@tide`, sahip |

Paralel ama bloklamayan hat: `@iris` Blender düzeneği ve şekil listesi D1'den itibaren; ses seçimi D2'den itibaren; içerik JSON'ları (`@helix`/`@ledger`) bir dilim önden.

## 3. Kick entegrasyonu ve seyirci akışı (F2 notları)

- **İlk sürümde (D5, D8):** Kick yalnız kimlik (`user:read`). Destek kanalı profil alanıdır; kanal adı Kick API'den doğrulanır, bonus yok. Seyirci görünümü `?ekran=seyirci&oda=KOD`: girdi göndermeyen salt okunur istemci, 1920×1080 sabit çerçeve, iki topacın parça listesi ve Enerjisi (`03` US-5.4). Yayıncı için **kalıcı oda kodu** (`06` § 5c-6 parti modeli).
- **İlk sürümden sonra (eski F3, K-11):** sohbet komutları (`!devran katil` ile yayıncı kuyruğu, `!devran izle`), kanal puanı ödülü ile meydan okuma, sohbet oylarıyla arena olayı (`05` § 5b-10). Altyapı: Kick webhook `events:subscribe` kapsamı, imza doğrulama kicklive kalıbı. Kapsam onayı Kick uygulama incelemesine bağlı olabilir (**doğrulanmadı**).
- **Riskler:** canlı yayına çıkmak sahip onayı ister; yayın sırasında oynatılan müzik telif ihtarı riskidir (B-35, yalnız CC0/kendi).

## 4. Eski belge güncelleme listesi

Değişiklikleri sahibin "başla" demesinden sonra ilgili sahip yapar; ben (`@nile`) yalnız roadmap ve ACTIVE_WORK'ü yazarım.

1. **`CLAUDE.md`** (`@nile`, sahip onayıyla): başlık "Devran (eski Skaledman Arena)"; "What this is" baştan (özgün topaç dövüşü, kimlik Kick, Skaledman yok); "Decided" listesinden K-5 (8 yönlü sprite), fan project/Pokémon IP ve "Never call Skaledman live" çıkar, yerine D-1..D-12 karşılıkları ve sözlük; "Open" bölümünden Skaledman deposu ve sprite aynalama çıkar, alan adı (B-24) kalır; Layout'ta `docs/design/devran/`, `veri/` yeni dosyaları; ajan tablosunda açıklamalar (fighter → topaç).
2. **`AGENTS.md`**: aynı kimlik değişikliği; kontrol özeti `01` § 1.1'e göre; "Bağlayıcı gerçekler"den Pokémon/Skaledman satırları çıkar, "özgün IP, kâr amaçsız, yalnız Altın" girer; `git pull origin master` → `main`.
3. **`docs/production/roadmap.md`** (`@nile`): yeni "Durum (2026-11-04)"; aşama tablosu F0-F3 yerine D1-D8 + "ikinci sezon"; Sprint 1 kartları SA-3/4/5 iptal notu; kararlar K-17 (D-1 bağımsızlık), K-18 (D-2 Devran), K-19 (D-12 + sözlük), K-20 (D-3 kontrol, zımni), K-21 (D-4 maç bitişi, zımni), K-22 (D-5/6/9/11), K-23 (D-7 revize: Ulti Lv.3), K-24 (D-8), K-25 (D-10 dar Karanlık), K-26 (parça sabit, eritme yok), K-27 (ilk arena Kuşak Arenası; K-14 tarihçe), K-28 (ödünç topaç). K-5, K-13, K-14, K-15 "geçersiz (2026-11-04)" notu alır, silinmez. Skaledman açık noktaları bölümü kapanır. `06` § 5d risk listesi buraya taşınır.
4. **`docs/production/ACTIVE_WORK.md`**: eski "devam eden" satırları kapanır (B-5).
5. **`docs/tech/mimari.md`** (`@axiom`): başlık ve § 1 kimlik; § 2 `veri/` içeriği (Skaledman yerine içerik JSON'ları); § 3 yolculuk "vuruş" → "çarpışma"; § 4 Skaledman verisi kalkar, tablolar `oyuncu, envanter, takim, cekirdek, basarim_sayac, altin_hareket, mac`; § 5 servis adı `devran.service`, alan adı; § 6 tarihçe; § 7 tip tablosu testi yerine çarpışma determinizm ve "altın tekrar" testi; § 8 sprite kaynağı satırı kalkar; `@pixi/sound` kararı eklenir.
6. **`docs/tech/skaledman-eklenti.md`**: başa "geçersiz, 2026-11-04 (K-17); tarihçe" bandı; içerik değişmez.
7. **`docs/tech/veri-cekimi.md`**: § 1 lint kapısı **geçerli kalır** (`Math.sin/cos/atan2` eklenmesi `@axiom`, `06` § 5c-3); § 2 Skaledman çekicisi "emekli" notu; `veri:cek` betiği ve testi D2'de silinir.
8. **`docs/design/oyun-konsepti.md`**: başa "tarihçe: Skaledman/Pokémon dönemi; yerini `docs/design/devran/` aldı" bandı; § 11 referans değerlerinden hız/dash/telegraf adayları `tuning.md`'ye taşınırsa kaynak gösterilir.
9. **`docs/art/fusion-animasyon.md`**: "iptal, tarihçe (K-5 geçersiz)" bandı; `topac-pixel-plani.md`'yi gösterir. `docs/art/krediler.md` yeni yazılır (`@iris`; araç lisansları, CC0 sesler).
10. **`docs/design/arenalar/iskeletler-diyari.md`**: tarihçe bandı; yeni `kusak-arenasi.md`.
11. **`docs/tech/adr/ADR-003-kontroller.md`**: ek "anlam değişikliği" bölümü (`01` § 1.2; şema aynı). Yeni ADR-005: topaç sim'i ve fizik determinizmi (`@axiom`).
12. **`docs/design/beyblade/*` → `docs/design/devran/*`**: `02`'deki K → D yeniden adlandırma; 01 yuva tablosu (yuva 3 Ulti Lv.3, yuva 4 yok); 03 § 6 tablosu bu belgedeki kararlarla; `topac-pixel-plani` "Kuşak Çanağı" → "Kuşak Arenası", referans oyun adı geçen satırlar temizlenir (commit `c0beeb4` kuralı).
13. **`README.md`, `CONTRIBUTING.md`, `package.json` (`name`, `description`), `docs/tanitim/paylasim.md`**: özgün IP anlatımı; "fan project" ve Pokémon ibareleri çıkar; planlanan özellikler tablosu D1-D8.
14. **Paca**: proje adı "Devran (eski Skaledman Arena)" olarak değişir, kimlik ve `SA` öneki kalır (kart numaraları kırılmasın).

## 5. Paca görev yapısı (öneri; Paca'ya yazılmadı)

Sprint 2 · Devran D1-D2 (2026-11-05 →). Başlık biçimi `Ortam │ Alan │ İş`.

| Epik | Görevler |
|---|---|
| **E0 Süreç** | Process │ Depo │ Eski F0 işini etiketle, `devran/d1-topac-lab` dalı (B-1) · Process │ Belgeler │ § 4 güncelleme listesi · Process │ Kararlar │ K-17..K-28 roadmap'e · Research │ Klasör │ beyblade → devran/topac |
| **E1 Topaç sim ve his (D1-D2)** | Shared │ Sim │ `Topac` + impuls çarpışma + determinizm testi · Client │ Topaç Lab │ sürüş, çarpışma, game feel · Art │ Topaç │ Blender düzeneği + 1 set kare · Arena │ Kuşak Arenası │ özellik + çizim · Shared │ Maç │ bitişler, puan, süre, ani ölüm, takım değişimi · Shared │ Bot │ 3 kademe · Client │ HUD │ Stamina, Enerji, puan, süre · Shared │ Denge │ `tuning.md` + bot turnuvası |
| **E2 Yetenek ve Ulti (D3)** | Shared │ Veri │ zod şemaları + 6 JSON iskeleti · Shared │ Yetenek │ 19 yetenek + Enerji · Art │ Avatar │ 2 avatar + 6 siluet (IP kontrolü) · Client │ Ses │ kanca + asgari set · Client │ Erişilebilirlik │ ayarlar |
| **E3 Ağ (D4)** | Server │ Oda │ Colyseus 0.18 oda + tahmin A/B · Server │ Oturum │ yeniden bağlanma, terk, AFK · Client │ Lobi │ oda kodu + hatalar + rövanş · Backend │ VPS │ ilk dağıtım (Access arkasında) |
| **E4 Kimlik (D5)** | Backend │ Kick │ OAuth + uygulama kaydı (sahip) · Backend │ SQLite │ şema + ödünç topaç · Client │ Profil │ profil + ilk çekirdek + eğitim · Client │ Hata │ giriş/sürüm/bakım ekranları |
| **E5 Atölye (D6)** | Art │ Parçalar │ 12 şekil · Client │ Atölye │ 4 yuva, 8 çubuk, 3 takım · Shared │ İlerleme │ tecrübe ve Lv.1-3 |
| **E6 Ekonomi (D7)** | Backend │ Altın │ defter · Client │ Market │ 4 tezgâh · Backend │ Başarım │ 40 başarım sayacı · Client │ Sonuç │ 09 ekranı · Backend │ Eşleştirme │ hızlı maç + bot |
| **E7 İlk sürüm (D8)** | Shared │ Takım Ultisi · Client │ Seyirci │ OBS görünümü · Backend │ Gizlilik │ metin + hesap silme · Process │ Test gecesi │ yayıncıyla (sahip) · Process │ QA │ sürüm kapısı |
