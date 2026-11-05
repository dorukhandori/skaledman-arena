# GU-F raporu: kıvılcım yeni fiziğe göre (çarp-ayrıl-çarp ritmi)

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** görsel / efekt (teknik sanat + istemci)
**Girdi:** sahip isteği *"kıvılcımı yeni fiziğe göre ayarla"*. Kıvılcım şiddete ve temas süresine göre artıp azalmalı. FIZIK-1 § 8 madde 5 de bu kontrolü öneriyordu.
Referanslar: `docs/design/beyblade/gorunum/07-arena-mac.jpg`, `08-arena-ulti.jpg`.

**Dokunulmayanlar:**
- `src/paylasilan/**`, `Olay` şeması, sim. Altın hash'ler aynı: `npm run test:tarayici` sonucu "Node ve Chromium bit bit aynı".
- Kick OAuth ve `main`. PR açılmadı.
- Varlıklar: yeni varlık eklenmedi, atlas ve sesler aynı. İlk yükleme varlığı GU-E'deki ≈ 520 KB'de kaldı (yalnız TS kodu değişti).

## 0. Özet

| Kalem | Commit | Sonuç |
|---|---|---|
| 1. Ölçüm | `e340d17` | `araclar/gu-f-olc.cjs` gerçek maçları (2 bot-bot, 1 girdisiz) kare kare kaydediyor. Temel ölçüm: `ekran/GU-F-olcum-once.json` |
| 2. Kıvılcım ayarı | `528fabf` | Kıvılcım sayısı ve ömrü puana bağlandı. Art arda gelen patlamalar kısılıyor, canlı kıvılcım tavanı 150. Sürekli temas artık bir **temas oturumu** (histerezis + 0,25 s tolerans + 0,15 s akış eşiği). Hitstop karesinde akış kıvılcımı doğmuyor. Girdisiz "yok" kademesine küçük flaş eklendi. `test/kivilcim.test.ts` 3 → 10 test |
| 3. Tepki | `5334f01` | Yalpa, hitstop bitince 50 ms içinde öbür topaçtan uzağa savruluyor; yörünge titremesi de uzak yönde başlıyor |
| 4. Görsel + rapor | bu commit | `araclar/gu-f-ekran.cjs`, 4 şerit, 07 kıyası, `ekran/GU-F-olcum-sonra.json`, `GU-F-olcum-perf.json` |

## 1. Ölçüm: yeni fizikte ne oluyor (önce)

**Yöntem.** Dev sunucu (`KIMLIK_MODU=sifre npx vite`) + Playwright Chromium (SwiftShader). Ticker durduruldu; maç `Mac.kareAt(1/60)` ile 60 s tur saati boyunca kare kare oynatıldı, böylece sonuç tekrarlanabilir. Her karede şunlar kaydedildi: sim merkez mesafesi, temas akışı, canlı kıvılcım/flaş/parçacık sayısı, kare CPU süresi. Her çarpışmada vn, şiddet puanı ve o anki canlı kıvılcım sayısı (birikme) alındı. Sürtünme sesi, çağrı yığınından (`temasGuncelle`) ayrıştırıldı.

Maçlar:
- **A:** `oto=dolas` × `bot=kenar`, tohum 9 (FIZIK-1'in bot-bot maçı)
- **B:** `oto=kenar` × `bot=dolas`, tohum 3
- **C (girdisiz):** yerel taraf tuşsuz, rakip `pasif` (hiç girdi yok), tohum 7

| Ölçüm (60 s) | A bot-bot | B bot-bot (iten) | C girdisiz |
|---|---|---|---|
| Çarpışma/dk (tur saati) | 26,0 | 33,6 | 32,8 |
| Kademe yok/hafif/ağır/kritik | 4/6/8/2 | 13/11/4/2 | 30/0/0/0 (vn 30-75) |
| Çarpışma arası medyan / en kısa | 1,98 / 0,33 s | 0,58 / **0,15 s** | 1,0 / 0,65 s |
| < 0,3 s arayla gelen çarpışma | 0 | **11** (iten bot yapışıp seriyle vuruyor) | 0 |
| Sim teması (≤ 2r + 2) süresi medyan / p90 / en çok | 0,033 / 0,13 / 0,23 s | 0,067 / 0,083 / 0,22 s | 0,083 / 0,10 / 0,33 s |
| **Akış parçası** sayısı / medyan süre | **20** / 0,10 s | **27** / 0,12 s | **31** / 0,15 s |
| Akış yanıp sönmesi (< 0,3 s arayla yeniden yanma) | 2 | **10** | 0 |
| Akışın ürettiği kıvılcım (60 s'de) | 7 | 5 | 16 |
| Işıma parçası | 9 | 20 | 20 |
| Sürtünme sesi/dk | 3,9 | 9,0 | 1,1 |
| Canlı kıvılcım en çok / p99 | 58 / 57 | 58 / 54 | 6 / 6 |
| Ağır patlama (gp ≥ 1) adedi | 52-57 | 52-56 | — |
| Önceki patlama canlıyken gelen çarpışma | 1 | 18 (canlı en çok 11) | 19 (canlı ≤ 3) |
| Flaş en çok / parçacık en çok | 3 / 51 | 3 / 43 | 3 / 18 |

**Tespitler:**
1. **Akış hiç oluşmuyor, ama her temasta "yalancı akış" var.** Temasların medyanı 2-5 kare. Her temas, 80 ms toleransla 0,10-0,15 s'lik bir akış/ışıma kırpıntısı açıyor, sonra kapanıyor (dakikada 20-31 kez). Bu kırpıntı 60 s'de yalnız 5-16 kıvılcım üretiyor, yani "akış" olarak okunmuyor. Işıma ise topaçlar ayrılırken eski temas noktasında ~0,1 s asılı kalıyor (GU-E'nin bilinen yapıntısı) ve her çarpışmada bir de topaçlar birbirine yaslanıp titriyor. Sonuç: tek bir çarpışma iki kez "konuşuyor" (önce patlama, sonra sürtünme kırpıntısı).
2. **Yanıp sönme.** İten botun 0,15-0,25 s arayla gelen seri temaslarında akış 60 s'de 10 kez söndü ve yeniden yandı. Dakikada 9 sürtünme tıkı çaldı ama hiçbiri sürekli değildi.
3. **Gürültü / birikme.** Ağır patlama ~52-57 kıvılcım üretiyor. Referans 07'de tek çarpışmada ~15-20 çizgi var. B maçında 11 seri çarpışmanın her biri tam patlama açtı. Canlı tavan 260 olduğu için ağır seri durumunda ekran bulutlanıyor. Girdisiz maçta ise çarpışmaların hepsi "yok" kademesinde: 3-4 kıvılcım, flaş yok, yani çanak buluşması zor okunuyor.
4. **Hitstop + kıvılcım.** Hitstop sırasında patlama kıvılcımları 0,15× yaşlanıyor (05 § 3.3; doğru). Ancak temas akışı hitstop'ta tam hızla kıvılcım doğuruyordu; bunlar donmuş patlamanın içine yığılıyordu.
5. **Kare süresi:** CPU'da `kareAt` (mantık + Pixi komutları) medyan 0,9-1,6 ms, p95 4,8-8 ms. Gerçek zamanlı kare: SwiftShader'da 1280×720 DPR 1'de ~10 fps (100 ms), 640×360'ta 24-27 fps. Darboğaz yazılım GL'nin dolgu hızı, efekt değil. p99'daki saniyelik sıçramalar SwiftShader GPU kuyruğunun beklemesi; efektle ilişkisi yok (önce ve sonra aynı).

## 2. Ayar (`528fabf`)

**Şiddet ölçeği.** Tek patlama, `his.ts KIVILCIM_OLCEK` + `patlamaAdedi`:
- Adet = 2 + 38·s^1,2 (eskiden 3 + 44·s^1,15). Değerler: hafif (s 0,13) ≈ 5-6, orta (0,5) ≈ 18-21, ağır (0,75) ≈ 28-32, tavan (1,2) 49 (eskiden 57).
- Ömür puana bağlı: hafif 0,09-0,16 s, ağır 0,14-0,45 s (eskiden en az 0,12-0,22 s). **Kısa temas tek patlama verir ve hızlı söner.**
- Şiddet puanı (`siddetPuani`) ve eşikler (80/260/420) aynı; hitstop/sarsıntı ölçeği de aynı.

**Birikme sınırı.** Her patlama puanını bir `yuk` değerine ekliyor; bu değer τ 0,45 s ile sönüyor. Yeni patlamanın adedi 1/(1 + 0,9·yuk) ile çarpılıyor (alt sınır %35) ve çekirdek flaş boyu en çok %25 küçülüyor. Canlı tavanı aşan kısım hiç doğmuyor; eskiden en eski kıvılcımı silip yerine geçiyordu. **Canlı tavan 260 → 150.** Örnek: 0,15 s arayla 6 ağır darbede son darbe ilkinin ≤ %40'ı kadar (test). Tek bir çarpışma eskisi kadar dolu kalıyor.

**Sürekli temas = temas oturumu** (`his.ts TEMAS`, `temasAdimi`, `akisAcik`):
- Giriş ≤ 2r + 2, oturum sürerken ≤ 2r + 3 (histerezis).
- 0,25 s'den kısa ayrılmalar oturumu bitirmiyor ve temas süresi birikiyor (çarp-ayrıl-çarp titremesi).
- **Akış, ışıma, yaslanma ve sürtünme sesi ancak oturumdaki toplam temas 0,15 s'yi geçince açılıyor.** Eşik ölçülen tek temas p90'ının (0,08-0,13 s) üstünde.
- Rampa eşik sonrası temas süresiyle büyüyor (τ 0,6 s). Kıvılcım hızı saniyede 8 + 110·güç.
- Akış kıvılcımı yalnız temas karelerinde doğuyor. Oturum içi boşlukta ışıma yavaş sönüyor (3/s), oturum bitince hızlı (10/s); yanıp sönme yok.
- **Hitstop karelerinde akış kıvılcımı doğmuyor**; o an patlamaya ait.

**Sürtünme sesi.** Yalnız açık akışta çalıyor. Eşik 0,15 → 0,20, aralık 0,2 − 0,08·güç s (≈ 5-7 tık/s), ilki oturum akışa geçince.

**Girdisiz "yok" kademesi.** vn ≥ 40 ise küçük çekirdek flaş (≈ 10 px, 80 ms) ve 4 kıvılcım, böylece çanak buluşması okunuyor. Ses aynı (kısık tık).

**Sonra (aynı 3 maç, aynı tohum; sim olayları bire bir aynı):**

| Ölçüm | A önce → sonra | B önce → sonra | C önce → sonra |
|---|---|---|---|
| Akış parçası / yanıp sönme | 20 / 2 → **2 / 0** | 27 / 10 → **2 / 0** (1 oturum 2,15 s) | 31 / 0 → **2 / 0** |
| Işıma parçası | 9 → 0 | 20 → 3 (medyan 0,53 s) | 20 → 1 |
| Sürtünme sesi/dk | 3,9 → 0 | 9,0 → 6,7 (yalnız 2,15 s'lik gerçek sürtünmede) | 1,1 → 0 |
| Canlı kıvılcım en çok / p99 | 58 / 57 → **49 / 47** | 58 / 54 → **49 / 45** | 6 / 6 → 5 / 4 |
| Ortalama canlı kıvılcım | 3,9 → 3,1 | 3,0 → 2,4 | 0,5 → 0,3 |
| Önceki patlama canlıyken çarpışma | 1 → 0 | 18 → 11 | 19 → 0 |
| Kare CPU medyan / p95 (ms) | 1,6 / 8,0 → 1,5 / 6,5 | 1,6 / 6,6 → 1,5 / 6,7 | 0,9 / 4,8 → 0,9 / 4,8 |

B maçındaki iten botun 2,15 s'lik yaslanması artık **tek, kesintisiz bir sürtünme akışı**. Ses ve ışıma süreyle güçleniyor; bu, sahibin "temas süresine göre artsın" isteği. Kısa temaslar yalnız şiddetine uygun tek patlama veriyor.

A ve C'de 60 s'de 2'şer kısa oturum eşiği (0,15 s) geçti: art arda iki temas ya da uzun bir girdisiz temas (C'de en uzun 0,33 s). Bunlar başlangıç rampasında kaldı; ışıma ≤ 1 parça, akış kıvılcımı 0-1 (sayaç tur başında `temizle()` ile sıfırlanıyor, bu yüzden toplam bir alt sınır).

## 3. Çarpışma sonrası tepki (`5334f01`)

Topaçlar hitstop'ta birbirine yatık donuyor (referans 07, değişmedi). Sorun hitstop sonrasındaydı: yalpa `cos` fazıyla başladığı için ilk yarım periyot (3-5 Hz'de 0,1-0,17 s) **ötekine doğru** sürüyordu. Bu sırada topaçlar sim'de ≥ 90 br/s ile ayrılırken gövdeler birbirine binik kalıyordu. Düzeltme:
- Faz 50 ms içinde π/2 kayıyor. Eğim sürekli kalıyor (t = 0'da e0), sonra öbür topaçtan uzağa savruluyor ve sönümlü salınıyor.
- Yörünge titremesi (≤ 5 px) rastgele faz yerine uzak yönde başlıyor.
- Zıplama değişmedi.

Kontrollü ölçüm: kafa kafaya çarpışma, hitstop sonrası 30 kare. "Binme" = gövdelerin birbirine doğru kayması − (sim mesafesi − 2r); px, > 0 ise temas çizgisini geçiyor.

| Çarpışma | Önce: ilk 4 kare | Sonra: ilk 4 kare | Binik kare sayısı |
|---|---|---|---|
| hafif (vn 140) | 3,6 / 1,3 / −1,9 / −5,5 | 3,7 / **−2,7 / −7,9 / −10,5** | 2 → 1 |
| orta (vn 232) | 3,0 / −0,3 / −4,7 / −9,8 | 3,0 / −7,0 / −13,7 / −17,7 | 1 → 1 |
| ağır (vn 348) | −0,6 / −5,0 / −10,7 / −17,3 | −0,6 / −14,5 / −22,9 / −28,8 | 0 → 0 |
| kritik (vn 564) | −9,9 / −14,6 / −20,4 / −27,4 | −9,9 / −14,6 / −32,5 / −42,4 | 0 → 0 |

Hitstop sonrası yalnız ilk kare (16 ms) ≤ 3,7 px binik kalıyor. Bu, hitstop'taki yaslanmanın sürekliliği; ardından gövdeler sim'den hızlı açılıyor. Not: görsel gövde yarıçapı (32 × 1,08 ≈ 34,6 px) sim yarıçapından (30) büyük. Bu yüzden temas anında ~9 px'lik iç içe geçme tepkiden bağımsız ve GU-E'den beri böyle (derinlik sırası ve flaş örtüyor).

## 4. Görsel doğrulama (`docs/production/raporlar/ekran/`, 1280×720 CSS × DPR 2)

Şeritler 6 kare, 33 ms arayla, çarpışma bölgesi 480×270 CSS; Kor × Girdap (referans 07 gibi). Araç: `araclar/gu-f-ekran.cjs`. Konsol hatası 0. Ayrıntı: `GU-F-ozet.json`.

- `GU-F-01-serit-hafif.png` (vn 95, puan 0,13): **6 kıvılcım**, küçük flaş. Hitstop yok denecek kadar kısa; 5. karede flaş, 6. karede kıvılcımların yarısı sönmüş. Tek patlama, hızlı sönme.
- `GU-F-02-serit-orta.png` (vn 242, puan 0,51): 21 kıvılcım, dar dikey flaş. Topaçlar 60 → 80 br ayrılıyor.
- `GU-F-03-serit-agir.png` (vn 355, puan 0,75): 32 kıvılcım (eskiden ≈ 40), şok halkası, takım renkli hız çizgileri. Hitstop sonrası yalpa dışa doğru; mesafe 60 → 98 br.
- `GU-F-04-serit-artarda-3.png`: ~0,25 s arayla 3 orta-ağır çarpışma (vn 311-296); her çarpışmanın 1. ve 6. karesi. Canlı kıvılcım sırasıyla 27 → 37 → 24. Birikme yükü 1,16 ve 1,38 olduğu için 2. ve 3. patlama kısıldı ve bulut oluşmadı. Hesap: eski ayarla (kısma yok, 3 + 44·s^1,15) üç patlama ~30 + 30 + 28 kıvılcım doğururdu; şimdi 27 + ~12 + ~11.
- **Kıyas:** `GU-F-kiyas-07.png` (sol referans | sağ biz, kritik çarpışmadan 1 kare sonra) ve `GU-F-kiyas-07-yakin.png` (çarpışma bölgesi × 2). Temas yarığında dikey, sivri, sarı-beyaz patlama ve dağınık sarı çizgiler referansa yakın. Sayı ve yoğunluk referansın seyrekliğine daha yakın.
- Önceki şeritler (GU-E-06/07/08) değişmeden duruyor, karşılaştırma için.

**Perf:**
- Parçacık en çok 51 (bütçe 400, değişmedi).
- Kıvılcım en çok 58 → 49 (tavan 260 → 150).
- Flaş en çok 3 → 1-5 (yalnız B'deki gerçek sürtünme oturumunda 5; tavan 7).
- Kare CPU medyan 1,5-1,6 ms, p95 6,5-8 ms. Gerçek zamanlı 1280×720 SwiftShader: önce 104,5 ms/kare (10 fps), sonra 99,9 ms (10 fps), `GU-F-olcum-perf.json`. Fark yazılım GL gürültüsü içinde; efekt maliyeti ölçülebilir ölçüde değişmedi.

## 5. Kapılar

Her kalemden sonra:
- `npm test`: 26 dosya, 487 test yeşil (rebase sonrası; GU-F +7: patlama ölçeği, birikme, ömür, oturum histerezisi/tolerans/eşik).
- `npm run lint`, `npm run typecheck`, `npm run build` yeşil.
- `npm run test:tarayici`: 17/17 AYNI.

Rebase'le paralel oturumun sanat commit'leri geldi (`344eb5e` Mac parça hattı). Kapılar sonrasında da yeşil. "Sonra" ölçümü ve şeritler bu yeni topaç görselleriyle alındı (sim aynı, kıvılcım bundan etkilenmez).

## 6. Varsayımlar

- **Varsaydım:** "sürekli temas" artık tek temasın uzunluğu değil, bir **oturum**. 0,25 s'den kısa ayrılmalarla bölünen temaslar tek sürtünme sayılıyor. Akış eşiği 0,15 s; ölçülen tek temas p90'ı 0,08-0,13 s. Böylece botların ve oyuncunun ittiği yaslanmalar akış veriyor, tek çarpışmalar vermiyor.
- **Varsaydım:** referans 07'deki seyreklik hedef alındı. Ağır patlama ≈ 30, tavan ≈ 49 kıvılcım (eskiden 57); hafif ≈ 5.
- **Varsaydım:** birikme kısması yalnız kıvılcım adedini ve flaş boyunu etkiliyor. Hitstop zaten 300 ms penceresinde yarıya iniyor (05 § 3.2), sarsıntı ve ses her darbede tam kalıyor; her vuruş duyulmalı.
- **Varsaydım:** girdisiz çanak buluşmalarına (hep "yok" kademesi) küçük flaş eklemek ölçeğe uygun. Sim kademesi değişmedi; ses aynı kısık tık.
- **Varsaydım:** hitstop'ta topaçların birbirine yatık donması (referans 07) korunmalı; düzeltme yalnız sonrasına uygulandı.
- Ölçümün kayıt geçişi 640×360'ta yapıldı (SwiftShader GPU kuyruğu kayıt döngüsünü bekletmesin diye). Yalnız temel ölçümün A maçı 1280×720'de. Sim ve efekt sayıları çözünürlükten bağımsız; perf ayrı geçişte 1280×720'de ölçüldü.

## 7. Sahibe kalan kararlar

1. Girdisiz çanak buluşmasındaki küçük flaş (≈ 10 px) yeterli mi, yoksa bunlar hiç flaşsız mı kalsın?
2. Sürtünme sesi hâlâ `carpisma-hafif`'in tiz tekrarı. Artık yalnız gerçek uzun yaslanmada çalıyor (B maçında 2,15 s); gerçek kulakla dinlenmedi (headless).
