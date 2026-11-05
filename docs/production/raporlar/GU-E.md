# GU-E raporu: kıvılcım çarpışması, sürekli temas akışı, çarpışma sonrası tepki, seyirci köşe kartları

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** görsel uyum / efekt (teknik sanat + istemci)
**Girdi:** GU-D "Sahibe kalan kararlar" yanıtları ve sahibin çarpışma şikâyeti.
Referanslar: `docs/design/beyblade/gorunum/07-arena-mac.jpg`, `08-arena-ulti.jpg`.
`src/paylasilan/**` **değişmedi**. Altın hash'ler aynı (`npm run test:tarayici`: Node ve Chromium bit bit aynı). Kick OAuth'a dokunulmadı.
Yeni üçüncü taraf varlık yok, bu yüzden krediler ve manifest değişmedi. Kıvılcım yordamsal, sesler mevcut CC0 sentez ve Kenney katmanı.

**Sahip kararları:**
1. Halka %78'de kaldı, değişiklik yok.
2. Shift/Space sol altta kaldı, değişiklik yok.
3. Seyirci kartları köşelere taşındı (A).
4. Düşen gölge dolu koyu leke oldu (aşağıda D-0).

Sahip şikâyeti: *"Kıvılcım şeklinde olmalı; şiddete ve sürtünme/temas süresine göre artıp azalsın; sonra sekme, yalpalama olsun."*

## 1. Ne değişti

| # | Kalem | Commit | Ne |
|---|---|---|---|
| A | Seyirci alt kartları köşelerde | `c381c52` | Her tarafın üç parça kartı artık köşede dikey bir yığın. Aktif kart iki satır (Çekirdek + Lv / Gövde · Disk · Uç), diğerleri tek satır, simgeler 14 px. Yığınlar 8–148 × 450–532 ve 812–952 × 450–532. Playwright ölçümüne göre oynanabilir elipsle kesişim 0 (önceki yerleşimde y 484–532 ve x 8–946 arasında kesişiyordu). Paneller (8–308 × 8–86) de kesişmiyor. `test/kamera.test.ts` bütün seyirci kutularını elipse karşı sınıyor. |
| B | Kıvılcım çarpışması | `3db5904` | **Yeni `Kivilcim.ts`** (yordamsal, atlas yok). Üç katmandan oluşuyor. (1) **Çekirdek flaş:** turuncu-altın, sarı ve krem-beyaz katmanlı sivri yıldız lekesi. Temas normali boyunca %45'e basık, yani iki topacın arasındaki dik yarıkta uzun ve dar duruyor (referans 07). (2) **Kıvılcım çizgileri ve noktaları:** zemin düzleminde elips dağılımla saçılıyor; %60'ı teğet koniye gidiyor (sürtünen yüzeyler kıvılcımı yana atar). Yükseklik yerçekimiyle düşüyor ve kıvılcım zemine değince bir kez sekiyor. Renk yaşla beyaz → sarı → altın → turuncu değişiyor. Çizgiler 1 sanat pikseli kalınlıkta (ağırda %25'i 2 piksel), 2 px ızgarada çiziliyor. (3) **Temas ışıması.** **Şiddet puanı** `his.siddetPuani` sürekli bir değer (0–1,2): vn, hasar/tek vuruş tavanı, dTik/tikTavan, kritik ve dash'ten hesaplanıyor. Puan şunları ölçekliyor: kıvılcım adedi (3 → ~50), hız, çizgi uzunluğu, flaş boyu ve parlaklığı, hitstop (25 → 100 ms; tavanlar aynı), sarsıntı (1 → 7 px), squash, ses hacmi ve perdesi (ağır vuruş pes; `Ses.cal` artık `perde` alıyor). 0,45 puandan itibaren zeminde halka şok dalgası çıkıyor. Kritikte GU-D'nin dar yıldızı korunuyor. Pişmiş yumuşak `kivilcim` ve `kritik` sheet'leri (sarı halka, referansta yok) çarpışmadan çıkarıldı. **Sürekli temas:** merkezler arası ≤ 2r + 2 ise (sim durumundan yalnız okunuyor, sim olayı beklenmiyor) temas noktasında kıvılcım akışı, ışıma, ara sıra küçük flaş titremesi ve kısık, tiz sürtünme tıkları çıkıyor. Güç şu formülle hesaplanıyor: (0,22·dönüş + bağıl teğet hız/350 + itme/400) · rampa(temas süresi, τ 0,7 s). Temas bitince 80 ms toleransla sönüyor. **Görsel konum düzeltmesi:** daha önce görsel konum her karede sim'in τ = 60 ms gerisinden geliyordu. Bu yüzden hızlı çarpışmada iki topaç ekranda **birbirine değmiyordu** (300 br/s'de ~66 px boşluk). Artık görsel konum doğrudan sim'i (ara değerli) izliyor; yalnız hitstop sonrası bekleme farkı sönümleniyor. **Tembel atlas:** `efekt-cekirdek` artık açılışta değil, yalnız Parçalanma için (stamina yarıya inince) yükleniyor. |
| C | Çarpışma sonrası tepki | `a982bb0` | `TopacCizimi`'ne isteğe bağlı `darbe()` ve `yaslan()` eklendi (hibrit topaç). **Hitstop boyunca** iki topaç darbeye doğru yatık donuyor (referans 07'deki gibi). Sonra şiddete göre sönümlü bir öne-arkaya yalpalama başlıyor: eğim 0,04–0,22 rad, 5 → 3 Hz, τ 0,22–0,60 s. 0,2 puan üstünde küçük bir zıplama oluyor (bir kez seker, gölge küçülür). Dönüş yönünde sönümlü bir yörünge titremesi de var (≤ 5 px). Daha çok hasar alan taraf daha güçlü tepki veriyor (pay 0,7–1,3). Squash puanla sürekli ölçekleniyor (0,92 → 0,68). **Sürekli temasta** topaçlar birbirine yaslanıyor (≤ 0,09 rad) ve titriyor. Fizik ve sim değişmedi. Düz görünüm (`TopacGorsel`) bu tepkiyi almıyor (yöntemler isteğe bağlı). |
| D-0 | Dolu gölge | `a800724` | Sahip kararı 4: düşen gölgenin dış saçağı 2×2 dama dokusuydu ve ekranda Bayer daması gibi okunuyordu. Artık düz, düşük alfalı bir dolgu. |
| D | Kareler ve rapor | bu commit | `araclar/gu-e-ekran.cjs`: bütün zorlamalar `?debug` ile yapıldı. Ticker durdurulup `Mac.kareAt(1/60)` ile kare kare ilerlendi, böylece çekimler tekrarlanabilir. |

## 2. Ekran görüntüleri (`docs/production/raporlar/ekran/`, 1280×720 CSS × DPR 2)

- Seyirci: `GU-E-01-seyirci-kartlar.png`. SeyirciHud bileşeni aynı çerçeveyle maç sahnesinin üstüne konarak çekildi; gerçek oda gerekmedi.
- Çarpışma, olaydan 1 kare sonra. Yakın plan (480×270 CSS) ve `-tam` (tam ekran) iki sürüm var:
  - `GU-E-02-hafif` (vn 93)
  - `GU-E-03-orta` (vn 207)
  - `GU-E-04-agir` (vn 366)
  - `GU-E-05-kritik` (vn 535)
- **Kare şeritleri** (6 ardışık kare, 33 ms arayla): `GU-E-06-serit-hafif`, `GU-E-07-serit-agir`, `GU-E-08-serit-kritik`. Şeritlerde şu sıra görülüyor: hitstop'ta birbirine yatık iki topaç ve demet, sonra kıvılcımların saçılıp düşmesi, öne-arkaya yalpa, şok halkası.
- **Sürekli temas:** topaçlar 2r − 1 mesafede tutuldu, teğet yönde zıt hızla sürtündü, sim çarpışma olayı **0**.
  - `GU-E-09-temas-yavas` (30 br/s, 0,13 s): güç 0,15, birkaç kıvılcım ve sönük ışıma
  - `GU-E-10-temas-hizli` (140 br/s, 0,67 s): güç 0,89, akış ve parlak ışıma
  - Her ikisinin `-serit` ve `-tam` sürümleri var. `GU-E-11-temas-biter-serit`: ayrılınca akış söner.
- **Kıyas (sol referans | sağ uygulama):** `GU-E-kiyas-07.png`, `GU-E-kiyas-07-yakin.png` (çarpışma bölgesi ×2), `GU-E-kiyas-08.png`
- Özet: `GU-E-ozet.json`. İlk yükleme: `GU-E-yukleme.json`. Konsol hatası 0.

## 3. Doğrulama

- **Kapılar (her kalemden sonra):**
  - `npm test`: 25 dosya, 472 test yeşil. Yeni testler: `test/kivilcim.test.ts` (şiddet puanı), seyirci kutuları, tembel atlas.
  - `npm run lint` ve `npm run typecheck` temiz.
  - `npm run build` yeşil (yalnız önceden var olan chunk boyutu uyarısı).
  - `npm run test:tarayici`: Node ve Chromium bit bit aynı.
- **Çalışma zamanı:** `KIMLIK_MODU=sifre npx vite --port 5491` + Playwright (SwiftShader). Maç, dört şiddet, üç şerit, sürekli temas, Ulti ve seyirci HUD'u koşturuldu; konsol hatası 0.
- **İlk yükleme varlığı:** **551,9 → 520,3 KB** (−31,6 KB). `efekt-cekirdek` artık açılışta inmiyor. Kıvılcım yordamsal olduğu için yeni varlık yok (bütçe +20 KB sınırı içinde).
- **Bilinen yapıntı:** temas bitince ışıma ~0,1 s boyunca son temas noktasında sönerek kalıyor.

## 4. Uyum puanı (0–5)

| Ekran | GU-D | Şimdi | Gerekçe |
|---|---|---|---|
| 07 maç | 4,7 | **4,8** | Çarpışma anında topaçlar artık ekranda gerçekten temas ediyor ve birbirine yatık (görsel gecikme hatası giderildi). Temas yarığında referanstaki gibi dikey, sivri, sarı-beyaz bir patlama var; sarı kıvılcım çizgileri saçılıyor; takım renkli hız çizgileri var. Yumuşak sarı halka sheet'i kalktı, gölge dolu. Fark: referansın uzaktaki dağınık tek tük sarı çizgileri bizde olaydan 2–4 kare sonra oluşuyor (1. karede demet daha yoğun ve toplu); ağır vuruşta zeminde bir şok halkası var (referansta yok, görev istedi). |
| 08 Ulti | 4,4 | **4,4** | Ulti sahnesi değişmedi; kıvılcım dili 08'deki topaç kenarı kıvılcımıyla aynı (sarı, kısa çizgi). |

## 5. Varsayımlar

- **Varsaydım:** sahip kararı 4 ("düşen gölge dolu koyu leke, zaten öyle"): çekimlerde dış saçak hâlâ dama dokusuydu, bu yüzden düz dolguya çevirdim (`a800724`).
- **Varsaydım:** "sürekli temas" = merkezler arası ≤ 2r + 2 br, iki topaç aktif, havada değil, korumada değil. Değerler `d.topaclar`'dan **yalnız okunuyor**; düşük vn'li (`yok`) sim olayları da birkaç flaşsız kıvılcım üretiyor.
- **Varsaydım:** görsel konumun her karede τ = 60 ms gecikmesi bir hataydı. Belgedeki niyet "hitstop sonrası yetişme"ydi; düzelttim.
- **Varsaydım:** pişmiş `kivilcim` ve `kritik` sheet'leri çarpışmadan çıkarılabilir; `kritik` Parçalanma'da kalıyor. Atlas dosyaları değişmedi.
- **Varsaydım:** sürtünme sesi mevcut `carpisma-hafif` sesinin kısık ve tiz (perde 1,35–1,65) tekrarı. Yeni ses kaynağı eklenmedi.
- **Varsaydım:** düz görünüm (Ayarlar › Düz görünüm) yeni sekme ve yalpa tepkisini almıyor; kıvılcım ve temas akışı orada da çalışıyor (yüksekliksiz).
- Hitstop artık 05 § 3.2'nin üç sabit değeri yerine puanla sürekli (25–100 ms); tavanlar ve 300 ms penceresi aynı.

## 6. Sahibe kalan kararlar

1. Ağır vuruştaki zemin şok halkası (görev gereği) referansta yok. Kalsın mı, yalnız kritikte mi çıksın?
2. Sürtünme sesi (hafif metal tıkının tiz tekrarı) gerçek kulakla dinlenmedi (headless). Kalsın mı, ayrı bir "cızırtı" kaydı mı aransın?
