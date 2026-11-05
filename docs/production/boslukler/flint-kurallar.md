# Boşluk taraması: kurallar, kenar durumlar, test edilebilirlik (QA)

**Tarih:** 2026-11-04 · **Yazar:** [@flint · QA Lead] · **Durum:** öneri; `@helix` (kural), `@ledger` (sayılar), `@relay` (ağ) sonradan değiştirebilir, ama değiştirirken test sütununu da günceller.
**Okunanlar:** `01`, `02`, `04`, `05` (§ 2, § 7), `03` (ekonomi parçaları), `00` § 4.6 (yalnız Takım Ultisi satırı), `test/sim.test.ts`, `src/paylasilan/sim/`. `docs/research/beyblade/04-*` bu taramada okunmadı; canon atıfları 01'deki alıntılardan.
**Ortak ilke:** her tur kararı **tek geçişte, tick sonunda** çözülür. O tick'te olan tüm olaylar toplanır, sonra tabloya göre tek sonuç çıkar. Olay sırası (oyuncu 1 mi 2 mi) sonucu asla değiştirmez. Karar verildikten sonra gelen olaylar yok sayılır.

## 1. Maç kuralları

Terimler: **tur** = bir puanlık bitişe kadar; **elenen topaç** = bitişte yenilen topaç (bu maçta bir daha girmez); **tükenme** = takımın 3 topacının da elenmesi.

| # | Belirsizlik | Kanıt | Önem | Kural kararı | Test |
|---|---|---|---|---|---|
| 1 | İki topaç aynı tick'te Ring Out | 01 § 2.2 "eşzamanlı bitiş: berabere, tur tekrar" ama "self-düşüş rakibe puan" çelişir | S1 (takılma) | **Berabere, puan yok.** "Self-düşüş rakibe puan" yalnız farklı tick'te olursa. İki taraf da elenir (#3'e bak). | sim testi: simetrik iki topaç kenara aynı hızla, A-B ve B-A sırası: aynı sonuç `berabere`. |
| 2 | Parçalanma ile Ring Out aynı tick | 01 § 2.2 "Parçalanma baskın", canon doğrulanmamış | S2 | **Aynı topaçta:** Parçalanma yazılır (ikisi de 2 puan, fark yalnız etiket/başarım). **Farklı topaçlarda** (A parçalanır, B ring out): berabere. Başarım sayacı yalnız yazılan bitişe işler. | tablo testi: 3x3 bitiş kombinasyonu (Durma/Ring Out/Parçalanma) x (aynı/farklı topaç) = 18 hücre, hepsi beklenen sonuç. |
| 3 | Berabere sonrası kim değişir | 01 § 2.3 "kaybeden değiştirir"; beraberde kaybeden yok | S2 | Beraberde **iki taraf da değiştirir** (iki topaç elenir). Kazanan taraf kalır, stamina'sını %30 geri alır (01'deki "%x" = 30). Elenen topaç bu maçta geri dönmez. | maç akışı testi: 3-2 senaryoları; elenen listesi doğru. |
| 4 | Tükenme (3 topaç elendi) | belgede yok | S1 | Takımın 3. elenmesi **maçı kaybettirir**, puana bakılmaksızın. İki takım aynı turda tükenirse: ani ölüm (#7). Not: 3 puan hedefiyle çakışmaz, ama beraberlikler tükenmeyi öne çeker; bilinçli. | senaryo: 3 ardışık beraberlik -> iki takım da tükenir -> ani ölüm. |
| 5 | Stamina 0 ve Ring Out aynı tick, aynı topaç | 05 § 2.5 "Durma karar anında verilir" | S2 | Öncelik **Parçalanma = Ring Out > Durma** (aynı topaçta). Gerekçe: Durma'nın 40 adımlık sönümü sırasında yeni olay beklenmez, karar 0 anındadır; aynı tick'te başka bitiş varsa o yazılır. | tablo testi #2'nin parçası. |
| 6 | Durma sönümü (40 adım) sırasında rakip kendini düşürür | 05 § 2.5 | S2 | Karar stamina<=0 tick'inde verildi; sönüm sırasındaki hiçbir olay sonucu değiştirmez, çarpışma/hasar uygulanmaz (topaç "hayalet" değil, yalnız süs). | sim: Durma sonrası 40 adım içinde rakip ring out, sonuç hâlâ Durma. |
| 7 | Süre bitince eşitlik / ani ölüm tanımı | 01 § 2.3 "90 sn üst sınır, dolunca ani ölüm" tanımsız | S1 | **90 sn = maç saati** (tur arası 3 sn sayılmaz). Dolunca **ani ölüm**: arena yarıçapı sn'de %2 küçülür (taban %40), erime x2, **ilk bitiş maçı bitirir** (puan fark etmez). 30 sn'de bitmezse: kalan stamina **oranı** yüksek olan kazanır; tam eşitse tohumlu `rastgele(tohum, sira)` yazı-tura. İki bitiş aynı tick: ani ölüm 10 sn tekrar, sonra stamina oranı. | sim: saat testi; bot çifti pasif -> 90+30 sn'de sonuç var (sonsuz maç yok). |
| 8 | Süre dolduğunda öndeki oyuncu | 01 "ani ölüm" ama 2-0 öndeki neden risk alsın | S3 | Ani ölümde **önde olan** ilk bitiş eşitliğinde (#7 yedek sıra) puanla öncelik alır: stamina oranı tam eşitse yazı-tura yerine **puan**. Önde olan ani ölümü kaybedebilir (bilinçli, gerilim). | birim test: yedek sıra eşitlik. |
| 9 | Terk eden (teslim) | belgede yok | S1 | **Teslim** düğmesi (2 sn basılı tutma) anında 0-3 yenilgi. Sekme kapatma/oda terk = kopma (#10). Terk eden Altın alamaz, rakip alır (%50), rakibin **başarım sayaçları ilerlemez** (bitişsiz maç). | e2e: teslim, sonuç ekranı, sayaç değişmedi. |
| 10 | Bağlantı kopması sırasında maç | belgede yok; `allowReconnection` var (Colyseus) | S1 | Kopan oyuncunun girdisi **nötr**; sim akar **ilk 3 sn**. 3 sn'yi aşarsa maç **dondurulur** ("rakip bağlanıyor"). Toplam bekleme 20 sn; aşılırsa kopan **0-3 yenik**. Bot devralma yok (sonuç farm'ı ve hile yüzeyi). Dondurma sayacı maç başına 2 kez (sonra ilk kopmada hükmen). Dereceli: hükmen yenilgi sayılır. | iki gerçek istemci: ağ kes 2 sn / 10 sn / 25 sn; yeniden bağlanma durumu aynı mı (hash). |
| 11 | Terk sırasında ikisi birden kopar | - | S2 | İkisi de 20 sn'de dönmezse **maç iptal**, sonuç/Altın/başarım yok. | e2e. |
| 12 | Tur arası geçiş sırasında kopma | - | S2 | Tur arası sayaç (3 sn) kopma sayılmaz; geri sayım sunucuda akar, kopan tur başında hazır değilse #10. | e2e. |
| 13 | Takım değişimi sırasında dokunulmazlık | 01 § 2.3 "geri çek: 2 s savunmasız" vs yeni topaç girişi | S2 | **Zorunlu (bitiş sonrası) değişim:** 3 sn geri sayım, başlangıç noktasında hareketsiz, iki taraf da hasar almaz. **Tur içi geri çek** (stamina<%25, 20 sn bekleme): çıkan topaç 2 sn **her darbeyi alır**, bu sürede biterse tur biter (geri çek başarısız). Yeni topaç **0,4 s (24 tick) temas kilidi** ile iner (darbe vermez/almaz, Ring Out geçerli), iniş noktası rakipten >= 2R uzak değilse sunucu kaydırır. | sim: geri çek sırasında vuruş -> alınır; iniş çakışması -> kaydırma deterministik. |
| 14 | Ulti sırasında ulti | K-7: ilk sürümde Ulti yok | S3 (ertelenmiş) | Aktif Ulti (telegraf + etki) sürerken ikinci girişi **sunucu reddeder**; Enerji dilimleri ulti süresince ve +1 sn dolmaz. İki rakip aynı tick ulti: ikisi de çalışır, sıra bağımsız. Ulti bedeli yetersiz stamina ile başlatılamaz. | birim test (K-7 gelince): reddedilen girdi `sanitize` + sunucu. |
| 15 | Ulti telegrafı sırasında hasar/bitiş | 01 § 4.2 | S2 | Hasar telegrafı **kesmez**; Parçalanma/Ring Out/Durma kesinti. Tur karar sonrası havadaki mermi/alan **hasar vermez**. | sim: telegraf sırasında bitiş -> etki yok. |
| 16 | Takım Ultisi şartı sağlandıktan sonra kart düşerse | 00 satır 18 "üç kart ayakta + paylaşılan dilim"; "dizilim" sahada tek topaç olduğundan **uygulanamaz** | S2 | Şart **basış anında** denetlenir: en az **2 elenmemiş kart** ve aktif kart Lv.4. Dilim dolduktan sonra kart elenirse dilim **kalır**, şart sağlanıyorsa kullanılabilir; 1 kart kalırsa kilitli ("Takım düştü"). Yay/Üçgen dizilim şartı **ilk sürümde yok** (K-7 ile ertelenir); `@helix` onayı gerekir. | birim test: 3/2/1 elenmemiş kartla basış. |
| 17 | Aynı anda iki bitiş türü başka topaçlarda + Durma | #2 ile birleşik | S2 | Öncelik tablosu yalnız **aynı topaç** içindir; farklı topaçlar -> berabere. | tablo testi. |
| 18 | Maç başlangıcında iki oyuncu aynı noktada/çakışık | - | S3 | Başlangıç noktaları zıt, sabit, elementten bağımsız; **tur başı 3 sn kilit**. | sim. |
| 19 | Geç katılım / oda dolu | Colyseus | S2 | 1v1 oda; ikinci oyuncu gelmezse 60 sn sonra oda kapanır. Üçüncü gelen reddedilir. İzleyici ilk sürümde yok. | iki istemci + üçüncü bağlantı denemesi. |
| 20 | Dash/Sekme stamina yetersiz | 01 § 1.1, 05 § 2.7 | S3 | Bedel > stamina-5 ise reddedilir; **eylem stamina'yı 0'a indiremez** (kendi kendine Durma yok). Sıkı Dönüş erime düşürür ama 0'ı engellemez. | birim test. |

## 2. Sim determinizmi

**Yasak (sim içinde):** `Math.random`, `Date`, `performance`, `Math.hypot`, `Math.sin/cos/tan/atan/atan2/pow/exp/log/cbrt`, `**` operatörü, `sort` karşılaştırıcısız, `for..in` ve `Object.keys` sırasına dayanan iterasyon, `Map/Set` yerine nesne-anahtar sırası, `toFixed/parseFloat` ile durum üretme, `Math.fround` (aşağıda).
**İzinli:** `+ - * /`, `Math.sqrt`, `Math.min/max/abs/floor/trunc/sign`, tam sayı tick.
**Mevcut ihlaller (kanıt):** `Math.hypot` 14 yerde (`sim/adim.ts`, `carpisma.ts:66`, `hamle.ts`, `takim.ts:52,116`, `mermiler.ts:23,69`); `Math.atan2` `atlas.ts:84` (muhtemelen görsel; sim'e girmediği ESLint ile kanıtlanmalı). `05` § 2.8 zaten "hypot ve trig çıkar" diyor; ben bunu **kapı** yapıyorum.
**Trig ihtiyacı** (Uç deseni `döndür(r̂, φ)`): 256 girişli `cos/sin` **sabit literal tablo** (üretici betikle bir kez, dosyaya yazılmış), `φ` tam sayı tick'ten indeks. Çalışma zamanında trig çağrısı yok.
**fround kararı:** sim **saf Float64**, `fround` yok. Gerekçe: IEEE 754 `+ - * / sqrt` her motorda bit-bit aynı; fround yeni bir yuvarlama yüzeyi ekler. Ağ şeması nicemleyebilir (konum 1/64 birim, hız 1/16), ama bu **yalnız wire** biçimidir; sunucu sim'i nicemlenmemiş tutar, istemci reconcile eşiği (`> 0,5 birim` yumuşak, `> 8 birim` sıçrama) nicemleme hatasından büyük olmalı.
**Testler (hepsi kapı):**
1. **Mevcut kalıp genişler:** `sim.test.ts` determinizm testi (aynı tohum+girdi -> aynı durum) iki topaç, çarpışmalı, **600 ve 3600 adım**, `toEqual` yerine **tam eşitlik** (`Object.is` her alan, `-0` ve `NaN` dahil) -> `toStrictEqual`.
2. **Altın tekrar hash:** `test/altin/*.json` girdi dizileri + `*.hash` (FNV-1a 64, tüm sim durumunun Float64 baytları üzerinden, alan sırası sabit). 8 senaryo: boş girdi, rastgele-tohumlu girdi, her bitiş türü, ani ölüm, geri çek, dash-çarpışma. Hash değişirse test kırılır; **bilinçli değişiklikte** PR, hash güncelleme gerekçesini ve `@ledger` onayını yazar.
3. **Çapraz motor:** aynı altın dosyalar Node 22 + headless Chromium (V8) + Firefox (SpiderMonkey) + WebKit (JSC) altında koşar (Playwright), hepsi aynı hash. İlk iki ucuz; WebKit/Firefox **öneri CI** (zorunlu kılmak sahibin kararı).
4. **Simetri:** A-B / B-A oyuncu sırası, olay sırası ve girdi sırası permütasyonu aynı sonuç (05 § 2.8).
5. **Statik:** ESLint `no-restricted-properties` + `no-restricted-globals` (`Math.hypot` ... `Date`) `src/paylasilan/**` için; ihlal = CI kırmızı. Ek: sim dosyalarında `import` yalnız `paylasilan/` içinden.
6. **Sunucu-istemci:** aynı girdi dizisi sunucu sim'inde ve istemci sim'inde (tarayıcıda) çalışır, her 60 tickte hash karşılaştırılır; tek sapma = S1.

## 3. Netcode test matrisi (05 § 7 üzerine)

İki gerçek istemci (iki tarayıcı profili, ayrı kutular; `@colyseus/sdk/debug` ile enjekte), Localhost-only kanıt sayılmaz. Her hücrede: **hash eşitliği tur sonunda**, reconcile sıçraması, hayalet çarpma, ölçüt video kare sayımı.

| Profil | Gecikme (tek yön) | Jitter | Kayıp | Beklenen |
|---|---|---|---|---|
| N0 temel | 0 | 0 | 0 | referans, hitstop hissi |
| N1 iyi | 40 ms | 5 ms | 0 | sıçrama yok |
| N2 orta | 75 ms | 20 ms | %1 | 10 çarpışmada <= 1 görünür düzeltme |
| N3 kötü (05'in profili) | 150 ms | 20 ms | %2 | tepki gecikmesi <= 200 ms; 10 çarpışmada sıçrama <= 1; hayalet çarpma <= 1 |
| N4 aşırı | 250 ms | 60 ms | %5 | **oynanabilir** kalmalı (sıçrama artabilir), desync (hash sapması) **0** |
| N5 asimetrik | 20 ms / 200 ms | 30 ms | %2 | ucu sıkı olan haksız avantaj almamalı |
| N6 patlama | 30 ms, 3 sn'lik 100 ms kayıp penceresi | - | - | kopma kuralı (#10) devrede değil (<3 sn) |

Ek senaryolar: aynı tick'te iki bitiş (#1), geri çek sırasında paket kaybı, **geç katılım** değil (1v1), **yeniden bağlanma** (#10: 2/10/25 sn), tab arka plana gidince (`requestAnimationFrame` durur: sim sunucuda akmalı, istemci geri dönüşte yetişmeli), bellek: 20 maç peş peşe, sızıntı yok. Her rapor değerleri **yazar**; "localhost'ta çalıştı" ifadesi kabul edilmez.

## 4. Game feel doğrulama

"İyi hissediyor" ölçülür, tahmin edilmez:
- **Kör test (sesi kapalı):** 10 çarpışmayı (3 hafif, 4 ağır, 3 kritik) oynatıp oyuncudan sınıflamasını ister; hedef **>= %80 doğru sınıf** (05 § 6 ölçütü). Sahip + 2 kişi; sınıflayan `@pebble` değil, **oyun tasarımına karışmamış kişi**.
- **Puan tablosu (1-5), 5 madde:** çarpışma ağırlığı, kontrol tepkisi, kenar tehlikesi okunurluğu, bitiş tatmini, "haksız öldüm" duygusu (ters). Her biri en az 3 oyuncu; **geçme: ortalama >= 3,5 ve hiçbir maddede ortalama < 3**. Puanı verenler ve sürüm commit'i kayıt altında.
- **Video kare sayımı:** 60 fps ekran kaydı, kare sayımı ile girdi-tepki <= 200 ms (N3), hitstop 2-6 kare aralığında.
- **Performans:** p95 kare <= 16,7 ms (iGPU dizüstü), yoğun çarpışma dizisi dahil.
- **Erişilebilirlik güvenliği:** hitstop/sarsıntı/flaş "azalt" ayarı kapalıyken de saniyede >3 flaş yok (WCAG 2.3.1).
Kanıt biçimi: ekran kaydı + tablo; "oynadım" tek başına yetmez. **Sahibin "güzel" cevabı** kapıdır, ama sayısal tablo ona eşlik eder.

## 5. Ekonomi / başarım hile vektörleri

| Vektör | Risk | Kural |
|---|---|---|
| İki hesap, biri teslim eder | Altın/başarım farm | Aynı iki hesap çifti arasında **günde 3 maçtan** sonra Altın/başarım sayılmaz; Teslim/hükmen maçlarda kazanana başarım sayacı işlemez (#9). |
| Bot farm / kendi kendine oda | Altın | Yalnız **Kick kimlikli, 2 farklı hesap** gerçek maç Altın verir (K-1: misafir yok). Antrenman Altın vermez (03). Günde 15. maçtan sonra yarı gelir (03). |
| Oda kodu istismarı | Arkadaşla sıra manipülasyonu, Altın | Özel oda maçı **Altın ve sıralama vermez** (yalnız eğlence); başarım yalnız dereceli/hızlı eşleşmeden. Oda kodu 6 harf, 10 dk geçerli, 1 kullanım. |
| Terk ederek kayıp önleme | Sıralama | Kopma/teslim = yenilgi (#9, #10). |
| İstemci sayaç gönderir | Hile | Sayaç **yalnız sunucuda**: maç sonucu sunucu olaylarından türer (SQLite, maç kaydı + başarım satırı aynı işlemde). İstemci hiçbir Altın/sayaç değeri göndermez. `security-reviewer` geçişi kapı. |
| Çifte ödeme | Race | Maç sonu işlemi `maç_id` ile **idempotent** (UNIQUE); iki bitiş sinyali tek ödeme. |
Test: birim (sayaç yalnız sunucu olayı), entegrasyon (aynı maç_id iki kez), manuel (iki hesapla teslim döngüsü).

## 6. Erişilebilirlik ve okunurluk

- **Renk körlüğü:** 6 element (Kor, Kasırga, Şimşek, Girdap, Kaya, Don) renk **tek ipucu olamaz**: her elementin ayrı **desen/siluet + simge** vardır. Test: ekran görüntüsünü protan/deutan/tritan benzetimiyle (Chromium DevTools emülasyonu) süzer; **6 elementi 5 sn'de eşleştirme** testi, hedef >= %90 doğru.
- **HUD kapalı okunurluk:** HUD gizliyken de görünmeli: kimin topacı (iz yönü + takım halkası), kenar tehlikesi (zemin çizgisi), Parçalanma yakın (çatlak görseli). Screenshot + 3 kişiye "hangisi sen, kim kazanıyor" testi.
- Kontrast: yazılar >= 4,5:1; telegraf kırmızısı zemin renginden ayrılır (gri tonlama kontrolü).
- Hareket: "azalt" anahtarı hitstop+sarsıntı+flaşı kapatır/yumuşatır; varsayılan açık (05 açık soru 9).
- Klavye: tüm menüler klavyeyle; Kick yayınında okunurluk: 720p sıkıştırılmış kayıttan aynı testler.

## 7. Sürüm kapıları

**Dilim 1 (Topaç Lab) "geçti":** (a) `npm run` testleri yeşil ve her kapı **adıyla raporda** (kırmızı/atlanan listelenir); (b) determinizm: mevcut 600 adım + **altın hash** + Node/Chromium aynı; (c) ESLint yasak listesi temiz (`hypot` kalmadı); (d) Lab'de Gövde/Disk/Uç/Çekirdek değişince 8 parametre doğru yansır (tablo testi: 4 x 6 x 3 Uç kombinasyonu, hiçbiri NaN/negatif/sınır dışı); (e) bot karşısında 30 sn deneme ekranda çalışır, **ekran görüntüsü** eklenir (play pass değil, hangisi olduğunu yaz); (f) hiç S1/S2 açık yok.
**İlk test gecesi (sahip + yayın izleyicisi) kapısı:** (1) N2 ve N3 profilinde iki gerçek istemci, 20 maç, hash sapması 0; (2) kopma/yeniden bağlanma (#10) çalışır; (3) maç içinde tüm bitişler + berabere + ani ölüm test edilmiş; (4) 90 sn'de takılan maç yok (bot-bot 500 maç, süre dağılımı: medyan 40-90 sn, p99 <= 120 sn); (5) bot turnuvası **kazanım bandı 35-65 %** (20 rastgele topaç kombinasyonu) -- bant dışı dengeleme sürümünü bloklar; (6) `security-reviewer` `Girdi`+Kick OAuth+hand-off geçişi kayıtlı; (7) sunucu çökme/kapama: yeniden başlatmada devam eden maç kaydı (maç iptal, Altın yok) tutarlı; (8) rapor: her kapının sonucu tek tabloda, kırmızı hiçbiri gizlenmez.

## 8. Başlangıç tuning tablosu (`docs/design/tuning.md` taslağı; `@ledger` değiştirir)

**Bulgu (S2):** 05'in `kH = 0,004` ve `Ş = μ·vn` ile `kutle = 1` için tipik çarpışma (vn 300) hasarı `0,004 x 150 = 0,6` stamina; `maxStamina = 100` iken tek bitiş yüzlerce çarpışma ister. Bu tablo **`kutle` referansı 10** ve `maxStamina = 100` varsayar: `μ = 5`, `Ş = 1500`, `H ≈ 6` (tek temas, ~%6), tur başına ~7 temas + erime ile 15-25 sn hedefine uyar. Bu varsayım doğrulanmazsa `kH` 10 kat sapar.

| Anahtar | Değer | Not |
|---|---|---|
| `adimHz` / `dt` | 60 / 1/60 | K-6 |
| `yaricapTopac` `r` | 14 | 05 (r+r=28) |
| `yaricapArena` `R` | 300 | `Arena.ts` ile hizala (doğrulanmadı) |
| `kutleReferans` | 10 | yukarıdaki bulgu |
| `maxStamina` | 100 | |
| `ivme` düz/top/iğne | 900 / 700 / 400 | 05 |
| `vSurus` düz/top/iğne | 260 / 220 / 160 | 05 |
| `vMutlak` | 700 | 05 |
| `surtunme` düz/top/iğne | 0,9 / 0,5 / 3,0 | 05 |
| `sekme e` | 0,6 (top +0,1, iğne -0,2) | 05 |
| `eDuvar` | 0,5 | 05 |
| `vRO` | 220 (top 180, iğne 260) | 05 + öneri |
| `kH` / `kGeri` | 0,004 / 0,001 | kutle=10 varsayımıyla |
| `kKb` | 1,2 | 05 |
| `fYan` / `fArka` / `α_ön` (kn=3) | 0,6 / 0,3 / 60° | 05 |
| `temasKilidi` | 6 adım | 05 |
| tek vuruş tavanı | %30 maxStamina | 05 |
| `kTik` | 0,00013 | ağır temas ~0,2 tık -> ~5 ağır temas Parçalanma |
| `tikGeriDonus` | 0 | 05 |
| `erime` düz/top/iğne | 2,0 / 1,5 / 1,0 stamina/s | tur 15-25 sn için |
| `dashHizi` / süre / bedel | 400 / 0,15 s / 6 stamina, bekleme 6 s | 01'deki 10 s bekleme yerine 6 s öneri |
| `sekmeSuresi` / bedel | 0,3 s / 4 | 01 |
| `durmaSonumu` | 40 adım | 05 |
| `turArasiGeriSayim` | 3 s | #13 |
| `macSaati` / ani ölüm | 90 s / 30 s (+10 s tekrar) | #7 |
| `geriCek` eşik / savunmasız / bekleme | %25 / 2 s / 20 s | 01 + #13 |
| `kazananStaminaGeri` | %30 | #3 |
| kopma | 3 s akış, 20 s toplam, 2 dondurma | #10 |
| Enerji dolum: temas / hasar / risk | %6 / hasar oranı x0,3 / %2 sn | `@ledger` |
| `zitElementBonus` | +%25 | 01 |
| bot kazanım bandı | 35-65 % | kapı |
