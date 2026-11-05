# FIZIK-1 raporu: girdisiz topaçlar çarpışır, çarpışınca seker

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** sim / fizik (`@byte`) · **Onay:** sahip bu tur sim değişikliğine yetki verdi;
altın senaryolar bilinçle yeniden kaydedildi.
**Dokunulmayanlar:** Kick OAuth, `src/istemci/**` (paralel görsel ajan: Efektler, HibritArena, MacHud, TopacYandan, seyirci HUD),
sim olay şeması (`Olay` tipleri aynı), `main`.

## 0. Özet

| Kalem | Durum | Kanıt (önce → sonra) |
|---|---|---|
| Teşhis | **doğrulandı (ölçüm)** | Girdisiz 90 s, 6×6 Uç × 20 tohum: 720 koşunun 249'unda hiç çarpışma yok (İğne'li her eşleşme 0, Düz × Düz 11/20 koşuda 0); merkezci/dengeli eşleşmelerde dakikada 200-450 "çarpışma" ama koşu başına 6-8 ayrılma: yapışık titreşim (§ 1) |
| 1. Kendiliğinden hareket | **yapıldı**: çanak eğimi 50 br/s² | Çarpışmasız koşu 249/720 → **0/720**; ilk çarpışma ≤ 15 s: 471 → **720/720**; en kötü (İğne × İğne) hiç → 11,4 s (§ 2) |
| 2. Sekme | **yapıldı**: `ayrilmaHizi` 90 br/s | Ayrılma/çarpışma oranı %7 → **%98** (girdisiz); bot maçında ayrı temas/dk 19-21 → 22-24 (§ 3) |
| 3. Denge | **bant içinde** (`vRO` 265 → 250, `pasifDolum` 1,5 → 1,8) | Ring Out 3×1 000 %25,7/33,8/35,6 → **%25,2/34,2/34,1**; bant 19/20/20 → **20/20/20**; p90 ≤ 81 s; Ulti %39 → %37 ort. (§ 4) |
| 4. Altın, tarayıcı, ağ, sürüm | **yapıldı** | 17 senaryo (16 + yeni `canak-carpisma`) `--yeniden`; Node = Chromium 17/17 AYNI; ağ N0/N1 iki istemci sapma 0; katalog özeti artık sim sabitlerini de kapsar (§ 5) |
| 5. tuning.md + test | **yapıldı** | tuning § 2, § 5, § 8 ve § 20 "FIZIK-1" SAPMA; `test/fizik.test.ts` (6 test) + altın `canak-carpisma` |

Kapılar (rebase sonrası): `npm test` 26 dosya / 479 test, `npm run lint`, `npm run typecheck`, `npm run build` yeşil.

## 1. Teşhis (ölçüm)

Araç: `npx tsx araclar/fizik-olc.ts [--tohum=20] [--ayrinti] [--mac]` (yeni). Sıfır girdi (`bosGirdi`), tek tur, Saldırgan gövde
(Kor Göktaşı + Ok + Hafif) × Kale gövde (Kaya Maden + Kalkan + Ağır), 6 Uç × 6 Uç, hücre başına 20 tohum (desen fazı tohumdan).
"Ayrılma" = çarpışmadan sonra topaçlar arasında > 10 br boşluk açılması.

| Eşleşme (girdisiz, 20 koşu) | Önce: çarpışma/dk · hiç çarpışmayan · ayrılma/koşu | Sonra |
|---|---|---|
| Düz × Düz (çiçek × çiçek) | 1,0 · 11/20 · 1,1 | 15,5 · 0/20 · 12,8 |
| İğne × Düz | 0 · 20/20 · 0 | 16,1 · 0/20 · 10,1 |
| İğne × İğne | 0 · 20/20 · 0 | 29,6 · 0/20 · 34,0 (ilk 11,4 s) |
| Kuşak × İğne | 0 · 20/20 · 0 | 36,9 · 0/20 · 22,6 |
| Dengeli × Dengeli | 204 · 2/20 · 7,5 | 31,8 · 0/20 · 23,6 |
| Top × Top | 447 · 0/20 · 6,0 | 69,0 · 0/20 · 28,0 |
| **Toplam 720 koşu** | 85,9/dk · **249/720** · 5,7 (80 çarpışmaya) | 31,6/dk · **0/720** · 22,2 (22,7 çarpışmaya) |
| İlk çarpışma medyan / p90 | 2,5 / 4,4 s (çarpışanlarda) | 2,2 / 4,7 s; ≤ 15 s 720/720 |

Sonuç: sahibin ön okuması doğru ama eksikti. (a) Eğim yalnız d > 0,7 R'de olduğu için desensiz İğne doğum noktasında hiç
kıpırdamıyor, çiçek desenli Düz merkezden geçmeden dönüyor: **çarpışma yok**. (b) Merkezci/dengeli Uç'lar merkeze çekiyor ama
temasta e·vn ile küçük ayrılma, desen hemen geri itiyor: 6 adımlık `temasKilidi` bitince yeniden "çarpışma", dakikada yüzlerce
zayıf olay, ayrılma yok (**yapışma**; her biri en az 3 Enerji ve hasar veriyordu).

## 2. Kendiliğinden hareket: çanak eğimi

`src/paylasilan/sim/fizik.ts hareketAdimla`: merkeze ivme büyüklüğü `a = max(kenarEğimi, çanakEğimi)`;
çanak eğimi d ≥ `canakYumusak` (40 br) iken sabit `canakEgimi` (50 br/s²), içeride `canakEgimi·d/40` (merkezde 0, titreme yok).
Toplamak yerine büyüğü: kenarda kenar eğimi baskın, Ring Out çizgisinin fiziği aynı. Yalnız `+ - * /` ve `kok2` (sqrt).

Katsayı seçimi (ölçüldü):

| `canakEgimi` | İğne × İğne ilk çarpışma | girdisiz ≤ 15 s | Ring Out tohum 1/2/3 (500, vRO 265) |
|---|---|---|---|
| 30 | > 15 s (terminal hız (30−20)/3 ≈ 3 br/s) | — | 23,3 / 30,7 / 33,7 |
| 40 | 17,5 s | 175/180 | — |
| **50** | **11,4 s** | **180/180** | 21,9 / 29,2 / 30,2 |
| 60 | 8,5 s | 179/180 | 22,6 / 29,6 / 30,2 |

50 seçildi: Coulomb sürtünmesini (20) yenen en küçük değerlerden biri, İğne × İğne'yi 15 s içine alıyor, en yavaş Uç ivmesinin
(İğne 400) %12,5'i, hızlı Uç'larınkinin (900) %5,6'sı. Sürüş tavanı (`vSurus`) dokunulmadı; çekim dış ivme olarak girer.
"Raylı" değil: oyuncu her yöne 8-18 kat güçlü ivmeyle sürer; girdisiz topaç yalnız yavaşça merkeze iner (İğne ~10 br/s).
Kenar yürüyüşü riski aynı: kuşak hız çarpanı ve kenar eğimi değişmedi.
**Varsaydım:** doğum noktasına başlangıç hızı vermedim; çanak eğimi tek başına hedefi tuttu, ek kural öğrenme yükü olurdu.

Tahmin modeli A: çanak eğimi `hareketAdimla` içinde; istemci `tahmin.ts kendiAdimi` aynı fonksiyonu çağırır. Test:
`test/fizik.test.ts` "girdisiz 90 adım: kendiAdimi sunucu sim'iyle bit bit aynı" (çarpışmadan önce, konum ve hız `toBe`).

## 3. Çarpışma sonrası: sekme

`src/paylasilan/sim/carpisma.ts`: darbe sonrası normal boyunca ayrılma hızı `(v2 − v1)·n` en az `ayrilmaHizi` (90 br/s);
eksik kalan `m2/(m1+m2)` ve `m1/(m1+m2)` oranıyla iki tarafa eklenir (momentum korunur). Hasar, tık, Enerji `Ş = μ·vn`'den
hesaplanır, değişmez. Güçlü darbelerde (ayrılma zaten > 90) etkisi yok; yalnız yavaş temas "dönen iki topaç birbirini iter" gibi
sekiyor. `ayrilmaHizi` 60 / 90 / 120 denendi: girdisizde (çanak 60) 90 → 23,6, 120 → 20,3 çarpışma/koşu, ikisinde de her çarpışmadan sonra ayrılma; bot turnuvasında 60 → çarpışma 33-34/dk (yapışma kısmen sürüyor), 90 → 29-31/dk; Ring Out ve bant farkı gürültü içinde. 90 seçildi (varsaydım: 120'nin daha seyrek ritmi "daha az çarpışma" okunur).

Kalıcı yan yana temas: çanak iki topacı merkezde buluşturur, sekme ayırır, çanak geri getirir → **çarpış-ayrıl-çarp** ritmi
(girdisiz İğne × İğne: ~30 çarpışma/dk, çarpışma başına 1 ayrılma; test bunu adım adım doğrular). `temasKilidi` (6 adım)
değişmedi; kilit sırasında yalnız konumsal ayırma sürer.
Yalpa ve sürüklenme: yalpa tasarımda salt görsel (görsel ajanın işi, dokunmadım). Vurulan topacın sürüklenmesi mevcut kodda
korunuyor (tavan üstü hız yalnız sürtünmeyle söner); `eDuvar`, esneklik, tık, `kKb` değişmedi.

## 4. Denge (önce / sonra)

Yöntem DENGE-2 ile aynı (`test/denge/turnuva.ts`: 20 rastgele build × N maç + 16×20 referans takım maçı, tohum 1/2/3; DENGE-2'nin
"önce" sayılarını bire bir verir). `MacKaydi`'ye çarpışma sayısı, ayrı temas (araya > 5 br boşluk girmiş çarpışma) ve turun
ilk çarpışma süresi eklendi. "Önce" = `5ee151d` (DENGE-2 sonrası HEAD) ayrı kopyada aynı betikle.

| Ölçüm (3 tohum × 1 000 maç) | Önce | Sonra | Hedef |
|---|---|---|---|
| Ring Out tohum 1 / 2 / 3 | %25,7 / 33,8 / 35,6 | **%25,2 / 34,2 / 34,1** | %25-35 |
| Bant (20 build, %35-65) | 19 / 20 / 20 | **20 / 20 / 20** | ≥ 19/20 |
| Durma | %61,5 / 53,5 / 52,8 | %61,6 / 52,1 / 53,3 | |
| Parçalanma | %5,1 / 5,9 / 5,1 | %5,2 / 6,9 / 6,3 | |
| Berabere (eşzamanlı bitiş) | %7,7 / 6,8 / 6,5 | %8,0 / 6,9 / 6,2 | |
| Maç süresi medyan / p90 (tohum 1) | 61,4 / 81,8 s | 60,3 / 80,7 s | p90 ≤ 90 |
| p90 tohum 2 / 3 | 77,3 / 74,0 s | 72,9 / 72,3 s | |
| Ulti görülen maç | %35 / 36 / 46 | %33 / 35 / 43 | DENGE-2 ~%44 (3×500) |
| Takım Ultisi görülen maç | %39 / 38 / 33 | %40 / 40 / 35 | |
| Çarpışma olayı/dk (maç saati) | 31,8 / 33,1 / 32,1 | 27,5 / 29,6 / 28,5 | |
| **Ayrı temas/dk** | 19,2 / 20,6 / 20,5 | **22,1 / 23,6 / 23,3** | |
| Turun ilk çarpışması medyan / p90 | 1,9 / 5,5 s | 1,8 / 5,4 s | |

| 3 tohum × 500 maç | Önce | Sonra |
|---|---|---|
| Ring Out | %26,5 / 33,0 / 34,3 | %25,9 / 33,9 / 33,0 |
| Bant | 19 / 20 / 19 | 20 / 20 / 20 |
| Ulti görülen maç | %40 / 41 / 50 (ort. 43,7) | %39 / 39 / 46 (ort. 41,3) |
| p90 | 80,1 / 77,3 / 74,3 s | 77,4 / 73,6 / 73,3 s |

| `qa:bot` 500 (Lv.3) | Önce | Sonra |
|---|---|---|
| Medyan / p90 / p99, takılan | 55,7 / 77,6 / 93,5 s, 0 | 54,1 / 72,8 / 90,0 s, 0 |
| Durma / Ring Out / Parçalanma / berabere (tur) | %56,5 / 29,1 / 9,3 / 5,1 | %53,5 / 28,8 / 10,3 / **7,4** |
| Ulti / Takım Ultisi görülen maç | %32,0 / 31,6 | %30,2 / 34,2 |

Ayar yolu (hepsi ölçüldü, 3×500 ya da 3×1 000):
- Yalnız çanak (50) + sekme (90), `vRO` 265: Ring Out tohum 1 %21,9 (bant dışı). Kaynak çanak, sekme değil (yalnız sekme: %27,6;
  yalnız çanak: %20,5). Topaçlar merkezde toplandığı için kenara itmek uzun sürüyor; kenar eğimine dokunmayan "büyüğü" biçimi de
  aynı sonucu verdi.
- `vRO` 255 / 245 / 240 / **250**: 3×1 000'de yalnız 250 üç tohumu da banda aldı (245'te tohum 3 %35,2-35,3).
- Ulti düştü (%43,7 → %40,0, `qa:bot` %32 → %25,6): sekme yapışık mikro-çarpışmaları kaldırınca onların bedava Enerjisi
  (`carpismaEnAz` 3/çarpışma, iki tarafa + takıma) gitti (çıkarım: çarpışma olayı/dk düştü, ayrı temas arttı). Telafi denemeleri
  (`qa:bot`): `carpismaEnAz` 4 → Ulti %26,8; 5 → %30,2 ama Takım Ultisi %37,8; **`pasifDolum` 1,8** → Ulti %30,2, Takım Ultisi
  %32,8 (öncesine en yakın); 2,0 turnuvada Ring Out tohum 2'yi %35,9'a itti. 1,8 seçildi.

## 5. Altın senaryolar, tarayıcı, ağ, sürüm

- **Neden yeniden üretildi:** çanak eğimi her adımda her topacın hızını değiştirir (girdisiz topaç bile hareket eder), sekme
  çarpışma sonrası hızları, `vRO` profili, `pasifDolum` Enerjiyi değiştirir: 16 hash'in hepsi bilinçli olarak değişti.
  `npm run altin:uret -- --yeniden`. Anlamlar korundu (önce → sonra, olay özetleri): `ring-out` Ring Out@20 → Ring Out@20,
  `parcalanma` @5 → @5, `durma` @86 → @85, `berabere` @12 → @12, `ulti` iki Ulti + 1 ret → aynı, `takim-ultisi` 3 ret → aynı,
  `geri-cek` değişim 1 → 1, `yetenek-kademeler` aynı yetenek/ret dizisi, `ani-olum` ilk bitiş maçı bitirir (Ring Out → Parçalanma).
  `bos-girdi` (Göktaşı × Maden, girdisiz 600 adım): **0 → 3 çarpışma**; sahibin şikâyetinin altın kanıtı.
- **Yeni senaryo `canak-carpisma`:** iki İğne, hiç girdi yok, 1 800 adım: 12 çarpışma (çanak + sekme ritmi), hash kilitli.
- `npm run test:tarayici`: Chromium 153 / Node 22, **17/17 AYNI** ("Node ve Chromium bit bit aynı").
- **Ağ matrisi** (`npx vite --port 5191` + `AG_ADRES=… npm run ag:matris -- N0 N1 --port=2691`, `FIZIK-1-ag-matris.json`):

| Profil | Maç | Wire hash A / B | Yeniden oynatma A / B | Sapma | Çarpışma | sıçrama/10 A / B | varış p95 |
|---|---|---|---|---|---|---|---|
| N0 temel | 82 s, 2-3 | 83/83 · 83/83 | 82/82 · 82/82 son eşit | **0 / 0** | 32 | 0,31 / 0,31 | 3 / 3 ms |
| N1 iyi (40 ms) | 58 s, 3-0 | 58/58 · 58/58 | 57/57 · 57/57 son eşit | **0 / 0** | 20 | 1,00 / 0,50 | 46 / 45 ms |
| N1 ek 3 maç (scratch) | 80 / 88 / 63 s | hepsi eşit | hepsi son eşit | **0** | 40 / 49 / 46 | 0,50-0,20-0,65 / 0,50-0,20-0,22 | 45-47 ms |

Hata 0, hayalet çarpma 0. Görünür sıçrama N1'de 4 maç ortalaması ~0,5/10 çarpışma (DENGE-2: 0,32); ADR-005 T2 eşiği (> 1/10)
altında. Sekme itmesi sunucu darbesi olduğu için (model A) istemci onu tahmin etmez, uzlaşma "darbe yumuşak" yoluyla düzeltir.
- **Sürüm kapısı:** `src/ag/katalog.ts` `KATALOG_OZETI` artık veri JSON'larıyla birlikte `AYAR`, `ELEMENT_EGILIM`, `KOKEN_PASIF`'i de
  hash'liyor (`JSON.stringify`, dosya sırası; tek satır). Böylece yalnız `ayar.ts`'te değişen bir sim kuralı da eski paketli istemciyi
  katılmada 4102 ("Oyun güncellendi") ile reddettirir: DENGE-2 § 5 madde 6'daki boşluk kapandı, bundan sonraki her sabit değişikliği
  için de. Bu tur özet `0a179afc0de90665` → `934bcfd25effd463` (geliştirme sunucusu `/api/saglik`). `PROTOKOL_SURUMU` 6 kaldı:
  wire şeması, mesajlar ve hash alanları aynı; seyirci (`IzleOdasi`) sim koşmaz, sunucu durumunu gösterir, ona özet gerekmez.
  Yan etki: Atölye ikon önbelleği anahtarı katalog özetini içerdiği için sim sabiti değişince ikonlar bir kez yeniden üretilir.

## 6. Gerçek çalışma zamanı (Playwright, `araclar/fizik-ekran.ts`)

Dev sunucu + headless Chromium, `?ekran=mac&debug`, 1280×720 × DPR 2. Özet: `ekran/FIZIK-1-ozet.json`, konsol hatası 0.

| Maç | Sonuç | Görüntüler |
|---|---|---|
| **Girdisiz**: yerel oyuncu hiç tuş yok, rakip "kukla" (ilk 10 s girdi sıfır); Kasırga Yapay (Dengeli) × Kaya Maden (İğne) | İlk 10 s'de **2 çarpışma**: 3,9 s (vn 70) ve 7,2 s (vn 42); aradaki ayrılma sonrası mesafe 70 br (> temas 60) | `ekran/FIZIK-1-girdisiz-1-baslangic.png`, `-2-carpisma.png`, `-3-sekme.png` |
| **Bot-bot**: yerel `dolas`, rakip `kenar` | İlk 30 s'de 8 çarpışma (ilk 1,6 s, vn 90-481); 2. çarpışmadan 12 kare sonra mesafe 102 br | `ekran/FIZIK-1-botbot-1-baslangic.png`, `-2-carpisma.png`, `-3-sekme.png` |

Aynı eşleşme (Dengeli × İğne) önceki sim'de Node ölçümünde 10/10 koşuda hiç çarpışmıyordu (§ 1).

## 7. Testler

- `test/fizik.test.ts` (yeni): 6×6 Uç girdisiz ilk çarpışma ≤ 15 s; tam maç kipinde (geri sayım + giriş koruması) girdisiz çarpışma;
  çanak eğimi radyal, merkezde 0, Coulomb'dan büyük, en yavaş Uç ivmesinin ≤ %15'i; iki İğne 30 s: ≥ 3 çarpışma ve her çarpışma
  arasında ayrılma (yapışma yok); yavaş temasta ayrılma ≥ `ayrilmaHizi` ve momentum korunur; tahmin modeli A bit bit aynı.
- Altın `canak-carpisma` (+ 16 yeniden kayıt); determinizm testleri (600/3600 adım `toStrictEqual`) aynen geçiyor.
- `test/sim.test.ts` 3 beklenti güncellendi: İğne "yerinde kalır" → "yalnız çanakla < 10 br süzülür, yan sapma yok"; Sıkı Dönüş
  oranı merkezde ölçülür (çanak eğimi 0); Durma sönümü sonu `-0` olabilir (`Math.abs`).

## 8. Kalan sorunlar / öneriler

1. **`qa:bot`'ta berabere %5,1 → %7,4** (turnuvada değişmedi: %6,2-8,0). Merkezde ritmik çarpışan iki düşük staminalı topaç aynı
   adımda Durma'ya iniyor. Kural tasarım kararı (tuning § 10); izlenmeli, insan maçında ölçülmeli.
2. **Ulti hafif düştü** (3×500 ort. %43,7 → %41,3; `qa:bot` %32 → %30). Kaynak yapışık çarpışmaların Enerjisi; `pasifDolum` kısmen
   telafi etti. DENGE-2 bandı (%35-50) içinde.
3. **Ring Out tohum yayılımı** sürüyor (DENGE-2 § 5 madde 1): tek `vRO` ile 3 havuz %25-34; Uç başına `ringOutHizi` önerisi açık.
4. **Çiçek desenli Düz Uç** girdisiz de geniş daireler çiziyor (desen 250 br/s² ≫ çanak 50): rakibe çarpması rastgele karşılaşma
   (girdisiz 15,5-16 çarpışma/dk). Desen kimliği korunmak için dokunulmadı.
5. Görsel ajanın "sürekli sürtünme kıvılcımı" (gu-e `3db5904`) yapışık temasa göre ayarlandıysa artık temas daha kısa; sekmeyle
   birlikte görsel kontrol önerilir (dosyalarına dokunmadım).

## 9. Commit'ler (devran-kod)

- `physics(fizik-1): tops drift to the bowl centre and clash without input, bounce apart after contact` (sim + veri + katalog özeti +
  testler + altın + ölçüm araçları)
- `docs(fizik-1): tuning SAPMA, report, network matrix N0/N1, runtime screenshots` (bu rapor, tuning.md, ağ JSON, ekranlar, `araclar/fizik-ekran.ts`)

Ölçüm betikleri: `araclar/fizik-olc.ts` (repo), turnuva deney/ızgara sarmalayıcıları scratch'te kaldı (repo'ya girmedi).
Paralel oturumlardan alınan: `gu-e` görsel commit'leri (`3db5904`, `a982bb0`, `a800724`, `8af847b`) rebase sırasında geldi; sim'e
dokunmuyorlar, kapılar rebase sonrası yeşil.
