# Çarpışma hissi: altyapı denetimi ve topaç dövüşü game feel spec'i

**Tarih:** 2026-11-04 · **Yazar:** [@byte · Gameplay Programmer] · **Durum:** taslak, sahip ve `@helix` / `@ledger` / `@relay` / `@iris` yanıtı bekliyor. Kod yazılmadı.
**Önkoşul:** `01-arena-eslemesi.md` (kontrol, tek stamina barı, bitişler), `00-lore-cercevesi.md` § 3.2 (altı Element), § 5.2 (8 parametre). Araştırma: R04 § 3, R05 § 2 ve § 5, `pokerivals-paket-analizi.md`.
**Terimler:** Topaç, Çekirdek, Gövde, Disk, Uç, Element, Köken, Stamina, Enerji, Altın, Özel Yetenek, Ulti, Takım Ultisi, Durma / Ring Out / Parçalanma, Lv.1-4. Eski belgelerdeki adlar bu belgede kullanılmaz.
**Durum etiketleri:** state nerede yaşar sorusu her bölümde yanıtlanır: **[sim]** sunucu simüle eder, istemci tahmin eder · **[süs]** yalnız istemci, sim'e dokunmaz.

---

## 0. Sahibin iddiasına kısa cevap

> "Bu altyapı bizde vardır büyük ihtimal." → **Kısmen. Sahne, efekt ve sabit adım iskeleti var; çarpışma hissini üreten parçaların çoğu yok.**

- **Var ve yeniden kullanılır:** 60 Hz sabit adım + paylaşılan sim ayrımı, `Girdi` şeması ve sanitize, 2.5D sahne + derinlik sıralama, zamanlı `Graphics` efekt havuzu, aviso (telegraf) çizimi, temel ekran sarsıntısı, vuruş flaşı, pikselli (nearest, 3×) ölçekleme, determinizm testi.
- **Yok:** momentum / impuls, kütle, ivme ve sürtünme, hitstop, squash/stretch, topaç izi, gerçek parçacık sistemi, ses (pakette bile yok), kamera (zoom / takip), stamina / tık çubuğu, ağ tahmini (`src/ag` yalnız sabitler ve zod şemaları; `src/sunucu` boş iskelet).
- **"PokeRivals kalitesinde animasyon" nereden geliyordu:** karakterlerin kare kare PMD sprite'ları (SpriteCollab), `Dovuscu.ts` + `FusionAnimator.ts` ile oynatılır. **Topaç için karşılığı yok**: topaç sprite'ı, dönüş animasyonu ve yalpalama bu çizim hattından gelmez; ya yeni çizilecek ya kodla üretilecek (§ 6, `@iris`). PokeRivals'ın *efektleri* de kodla çizilir (`pokerivals-paket-analizi.md:178`: `fx.shake`, `fx.flash`), yani bizim `Efektler.ts` ile aynı sınıftadır; fark, onların aile başına ayrı efekt kodu yazmış olması ve bizim topaç efektlerini sıfırdan yazacak olmamızdır.
- **Hisin asıl motoru yeni sim'dir** (§ 2). Efektler (§ 3) onun üstüne biner; sim doğru değilse parıltı kurtarmaz.

---

## 1. Denetim: elimizde ne var, ne yok

Satır numaraları `f0/arena-prototip` dalındaki çalışma kopyasından, grep ile doğrulandı. "Yeterli mi" sütunu **topaç dövüşü** içindir.

| Özellik | Dosya:satır | Durum | Topaç için yeterli mi |
|---|---|---|---|
| Sabit adım sim | `ayar.ts:7` (`dt = 1/60`), `Dunya.ts:98-118` (`adim`), `Oyun.ts:107-120` (birikimli döngü, `enFazlaAdimKare` = 6, `ayar.ts:9`) | var | Evet. Aynen kalır. |
| Girdi şeması | `sim/Girdi.ts:5-25`, `girdiTemizle` `:37`, ağ bit maskesi `:63-70`, istemci `istemci/oyun/Girdi.ts` (WASD, fare, Shift) | var | Evet. `01` § 1.2: alanlar aynı, anlamlar değişir. Analog sürüş için `yonX/yonZ` zaten −1..1. |
| Daire çarpışması | `carpisma.ts:32-42` (`daireDaireCoz`), `:8-30` (daire-dikdörtgen), `:45-57` (`konumCoz`) | var, yalnız **konumsal** | Hayır. Yalnız "içe girme" düzeltir, hız değiştirmez. |
| Topaç-topaç çözümü | `adim.ts:75-90` (`dovuscuAyir`): ikisini eşit paylaşımlı iter | var, konumsal | Hayır. Kütle yok, hız yok, itme darbesi yok. |
| Impuls / momentum | yok. `Dovuscu` (`durum.ts:25-70`) hız tutmaz; `hizX/hizZ` yalnız animasyon için konum farkından türetilir (`adim.ts:68-69`) | **yok** | Hayır. Yeni durum alanı (`vx, vz`) gerekir. |
| Kütle | yok (`grep kutle` boş). `DovuscuProfili` hız / saldırı / savunma stat'ı taşır (`dovuscu.ts:21,45`) | **yok** | Hayır. `00` § 5.2'deki `kutle` yeni. |
| Sürtünme / ivme | yok. Hız anında: `adim.ts:48-50` (`dx = g.yonX * hiz * dt`) | **yok** | Hayır. Topaç hissinin kalbi, sıfırdan. |
| Dash | `adim.ts:13-26`, `:36-41`; `ayar.ts:38` (60 br / 0,15 s / 10 s bekleme / 0,12 s dokunulmazlık) | var, **betikli yer değiştirme** | Kısmen. Hız impulsuna çevrilir; dokunulmazlık kararı `@helix`'te (§ 2.7). |
| Knockback | `vurus.ts:30-35` (sabit 40 birim / 0,22 s, hasardan bağımsız), `adim.ts:59-65` | var, **sabit** | Hayır. Şiddet, açı ve stamina'ya bağlı değil. |
| Hitstop | sim'de yok, istemcide yok. `hitStun` (`ayar.ts:43`, `vurus.ts:34`, `Dunya.ts:59,69`) **hareket kilididir**, kare dondurma değildir | **yok** | Hayır. |
| Ekran sarsıntısı | `Sahne.ts:79-81` (`sars`), `:93-97` (uygulama, `Math.random`), çağrılar `Efektler.ts:126,196,205` (2-5 px, 0,08-0,25 s) | var, basit | Kısmen. Genlik düşüş eğrisi yok, yön yok, `Math.random` süs olduğu için sorun değil ama tekrarlanamaz (replay / test). |
| Vuruş flaşı | `Dovuscu.ts:27-28,96,110-111` (0,12 s kırmızı tint) | var, basit | Kısmen. Tek renk, tek süre. |
| Squash / stretch | yok | **yok** | Hayır. |
| Topaç izi (trail) | yok. Yalnız mermi izi: `Efektler.ts:296-297,307-311` (6 nokta daire); toz `:230-235`, `:265-267` | **yok** (mermi izi örnek olur) | Hayır. |
| Parçacık | `Efektler.ts:214-228` (`vurusPatlamasi`: bir `Graphics` içinde 7 çizgi + 2 daire, her karede `clear()` + yeniden çizim). `Graphics` havuzu `:63,82-101`, `Text` havuzu `:64,237-249`. `ParticleContainer` kullanımı yok | **kısmen** (havuz var, gerçek parçacık sistemi yok) | Hayır. Yüzlerce bağımsız parçacık için `Graphics` yeniden çizimi ölçeklenmez. |
| Ses kancaları | yok. `@pixi/sound` `package.json`'da bile yok (`grep` 0) | **yok** | Hayır. `Efektler.olay` anahtarı (`:105-131`) doğal kanca noktası. |
| Kamera | `Sahne.ts:88-89` yalnız letterbox ölçeği; zoom, takip, kamera sallama ayrımı yok. PokeRivals'ta var: `cameraLerp .08`, kendini takip (`pokerivals-paket-analizi.md:176`) | **yok** | Hayır, ama arena tek ekrana sığdığı için takip şart değil; yalnız zoom darbesi lazım. |
| Telegraf çizimi | `Efektler.ts:133-148`, alan `:188-197`, `:270-285`; süreler `ayar.ts:40` (0,08 / 0,2 / 0,45) | var, iyi | Ulti telegrafı için aynen yeniden kullanılır. |
| HUD çubukları | HP: `Dovuscu.ts:140-159`; `Hud.ts:17-18,121` (CSS çubuk); zıplama enerjisi 3 parça `Hud.ts:37-39,185-186` | var (HP), **Stamina / Enerji / tık yok** | Çubuk bileşeni uyarlanır; stamina / tık / Enerji göstergesi yeni (`@glyph`). |
| Prediction / reconciliation | **kod yok.** `grep predict` src'de boş. `src/ag/protokol.ts` (73 satır): sabitler (`SIM_HZ`, `YAMA_HZ = 20`, `ARA_DEGER_GECIKMESI_MS = 100`, `GERI_SARMA_MS = 250`) + zod şeması. `src/sunucu/index.ts` (16 satır) ve `odalar/ArenaOdasi.ts` (29 satır): durum `faz` + `oyuncuSayisi`, `adim` çağrılmıyor. `Oyun.ts:36` açıkça "F0 çevrimdışı oyun" | **yok** | Hayır. Tasarım belgede (`mimari.md` § 3), uygulama yok. |
| Determinizm | `sim/rastgele.ts:8` (tohumlu), test `test/sim.test.ts:45-63` (300 adım, JSON eşitliği), eslint kapısı `eslint.config.*:40-43` | var | Evet, **bir açıkla**: sim'de `Math.hypot` ×14 ve `Math.cos` (`hamle.ts:83,94`) kullanılıyor (§ 2.8). |
| Piksel ölçekleme | `Animator.ts:10` (`OLCEK = 3`), `AtlasYukleyici.ts:35` (nearest), `main.ts:38-39` (`antialias:false`, `roundPixels:true`) | var | Evet. |
| Karakter animasyonu | `Dovuscu.ts` (durum → animasyon tablosu `:13-23`), `FusionAnimator.ts` | var, **Topaç'a uygulanmaz** | Hayır. Topaç görseli yeni iş. |

### 1.1 Dürüst sonuç
- **Altyapı var mı?** Evet: render iskeleti, sabit adım döngüsü, efekt havuzu, telegraf, sarsıntı, determinizm kapısı. **Çarpışma hissi altyapısı hayır:** impuls fiziği, hitstop, squash/stretch, izler, parçacık sistemi, ses, kamera darbesi, stamina HUD'u ve ağ tahmini yok.
- Mevcut kodun yaklaşık yarısı topaç oyununda kullanılmaz (hamle aileleri, mermiler, takım geçişi animasyonu, Animator). Bu bir geriye gidiş değil, ama "hazır var" demek de yanlış olur.
- Sahibin şartının iki yarısı ayrı ele alınır: **animasyon kalitesi** (topaç görseli, `@iris`, § 6.1) ve **çarpışma hissi** (bu belge).

---

## 2. Topaç çarpışma modeli (paylaşılan sim) **[sim]**

Hedef: iki Topaç çarpar; sonuç **bağıl hıza, kütleye, çarpma açısına, saldırı / savunmaya ve stamina'ya** bağlıdır; okunur, tekrarlanır, ağda aynı çıkar. Tüm katsayılar `kurallar/` tablosundan okunur (`tuning.md`); aşağıdakiler **aday değerdir**, denge `@ledger`'ındır.

### 2.1 Durum (yeni alanlar, `Dovuscu` yerine `Topac`)
`x, z` (konum), **`vx, vz` (hız, birim/s; artık durum)**, `stamina` (0..`maxStamina`), `tik` (Parçalanma sayacı), `enerji` (0..1), `dashKalan`, `temasKilidi` (tik cinsinden), `durma` (bool). `faz` (dönüş fazı) ve yalpalama **sim durumunda değil**, salt görseldir (§ 2.6).

### 2.2 Hareket: ivmeli sürüş + Uç deseni + oyuncu girdisi
Her adımda, her Topaç için, sırayla:
1. **Sürüş ivmesi:** `a = ivme(Uç) · yorgunlukCarpani(stamina) · u` (`u` = sanitize edilmiş girdi yönü, uzunluk ≤ 1). Sürüş hız tavanı `vSurus(Uç)`: hız bu tavanın altındaysa ivme uygulanır, üstündeyse (knockback / dash sonrası) ivme yalnız tavanı aşmayan bileşende uygulanır. Dışarıdan gelen hız bozulmaz, sürtünmeyle söner.
2. **Uç deseni ivmesi (kendi başına hareket):** oyuncu girdisinden bağımsız, **üstüne toplanır**.
   - **Düz uç:** çiçek deseni. `a_desen = Ad · döndür(r̂_dışa, φ)`, `φ = tik · ωd`: merkezden dışa itme yönü yavaşça döner, Topaç kenara gider, dönüp merkeze geçer, petal çizer. Kenar bölgesinde çanak eğimi (aşağıda) geri çeker.
   - **Top uç:** merkeze çekim `a = −kMerkez · p` (yay), düşük sürtünme, yüksek sekme (`e`).
   - **İğne uç:** desen yok, yüksek sürtünme, düşük ivme, **itilmeye direnç** (çarpışmada etkin kütle çarpanı `kCakilma` > 1, § 2.3).
   Oyuncu girdisi desenle savaşır: düz uçta WASD desene karşı dümen kırar, iğne uçta neredeyse doğrudan sürer. Bu fark Uç seçimini hissedilir yapar (R04 § 3.6).
3. **Çanak eğimi:** kenar bölgesinde (`d > R·0,7`) merkeze doğru ek ivme `kEgim · ((d - 0,7R)/(0,3R))²`. Kenarın "yokuş" hissi budur; Ring Out'u hak edilen bir şey yapar. Arena biçimi `@cove`'un; sim yalnız `kenarMesafesi(x, z) → { derinlik, nx, nz }` arayüzünü ister (daire çanak varsayılır, dikdörtgen eski engellerle çalışmaya devam eder).
4. **Sürtünme:** `v -= v · sürtünme(Uç) · dt` (doğrusal sönüm) ve küçük sabit Coulomb terimi `v -= v̂ · sabitSurt · dt` (çok yavaş hızda durdurur; titreme yok).
5. **Stamina çarpanı:** `yorgunlukCarpani = 0,5 + 0,5 · (stamina / maxStamina)`. Stamina azaldıkça ivme ve tavan düşer. **Sim'de yalnız hız düşer; hit kutusu sabittir.**
6. **Hız tavanı:** `|v| ≤ vMutlak` (aday 700 birim/s, `r + r = 28` birimde bir adımda 11,7 birim; tünelleme yok).
7. Konum güncelle, sonra Ring Out / duvar çözümü (§ 2.5).

Aday sayılar (birim/s ve birim/s²; mevcut referans: yürüme 105-240, dash 400): ivme 900 (düz) / 700 (top) / 400 (iğne); `vSurus` 260 / 220 / 160; sürtünme 0,9 / 0,5 / 3,0 (1/s).

### 2.3 Daire-daire elastik olmayan çarpışma
Algılama: `d² < (r1 + r2)²`. Tek `sqrt` (IEEE doğru yuvarlanır, deterministik): `d`, normal `n = (p2 − p1) / d`.
- `vn = (v1 − v2) · n` **yaklaşma hızı** (pozitif = birbirine geliyor). `vn ≤ 0` ise yalnız konumsal ayırma yapılır (mevcut `daireDaireCoz` kodu burada korunur), darbe yok.
- **Etkin kütle:** `m_i = kutle_i · (Uç iğne ise kCakilma, değilse 1)`. İndirgenmiş kütle `μ = m1·m2 / (m1 + m2)`.
- **Darbe şiddeti** `Ş = μ · vn`. Bütün sonraki ölçüler `Ş`'tan çıkar; aynı büyüklük olayı, hitstop'u ve sarsıntıyı sürer (§ 3).
- **Impuls:** `J = (1 + e) · Ş`, `e` = sekme (aday 0,6; Top uç artırır, İğne düşürür; iki tarafın ortalaması). `v1 -= (J / m1) · n · kb1`, `v2 += (J / m2) · n · kb2`.
- **Yorgunluk büyütmesi (Smash dersi, R05 § 2-3):** `kb_i = 1 + kKb · (1 − stamina_i / maxStamina)²` (aday `kKb = 1,2`). Yorgun Topaç çok daha uzağa savrulur. Momentum tam korunmaz, bilinçli (okunur his).
- **Teğet bileşen (isteğe bağlı, v2):** `Jt = clamp(μSurt · J)`; çarpışmaya yan kayma verir. İlk spike'ta kapalı.
- **Temas kilidi:** çözümden sonra 6 adım (100 ms) aynı çift için darbe uygulanmaz (içiçelik takılması, çoklu vuruş yok).
- **Çözümün sırası bağımsızdır:** iki hız da ön-çarpışma değerlerinden hesaplanır, sonra birlikte yazılır. Mevcut "tek adımda dönüşümlü sıra" hilesi (`Dunya.ts:105-107`) gerekmez.

### 2.4 Çarpma açısı, Gövde ve saldırı / savunma
**"Ön" tanımı:** vuran Topaç i için çarpma normali `n_i` (karşıya doğru) ile kendi hız yönü `v̂_i` arasındaki açı `α_i`. Kosinüs eşiği karşılaştırılır (kök gerekmez: `(v_i·n_i)² ≥ cos²(α_ön) · |v_i|²` ve `v_i·n_i > 0`).
- **Ön:** `α ≤ α_ön` → yön çarpanı `f = 1,0`. **Yan:** `α_ön < α ≤ 90°` → `f = fYan` (0,6). **Arka / hız yok:** `f = fArka` (0,3).
- **Gövde kanat sayısı `kn`** (2 / 3 / 4 / 6) `α_ön`'ü ve ön bonusunu belirler: `α_ön = 30° + 10° · kn`; ön çarpanı `1,5 − 0,1 · kn`. Az kanat = dar ama keskin vuruş penceresi; çok kanat = geniş ama yumuşak (her yönden tutarlı). Rocket League dersi (R05 § 2-1): açı penceresi dar tutulmaz (≥ 60°), yoksa "vurdum ama saymadı" hissi çıkar.
- Kanat dönüş fazı (hangi kanat tam temas noktasında) sim'e **girmez**: tick'e duyarlı sonuç, ağda tutarsızlık ve "şans" hissi üretir. Faz yalnız görseldir ve çarpışma anında en yakın kanadı vuruş noktasına çevirir (§ 3.2).
- **Stamina hasarı** (iki tarafa, simetrik formül):
  `H_i = Ş · ( kH · (saldiri_j · f_j) / savunma_i  +  kGeri · saldiri_i · f_i )`
  İlk terim **alınan hasar**, ikinci terim **geri tepme (recoil)**: vuran da kaybeder, ağır ve keskin Topaç kendi stamina'sını yakar (R04 § 3.2-3.3). Aday: `kH = 0,004`, `kGeri = 0,25 · kH`, saldırı / savunma 1,0 referansında. Tek vuruş tavanı: `H_i ≤ %30 maxStamina` (tek temasla bitmesin).
- **Tık artışı:** `Δtik_i = kTik · Ş · saldiri_j · f_j / parcalanmaEsigi_i` ölçeğinde, Disk'in `parçalanma eşiği` parametresine bölünür (R04 § 3.5: çıkıntı vurulması). Parçalanma: `tik_i ≥ 1,0`.
- **Tık geri dönüşü:** **Hayır, zamanla dönmez.** Gerekçe: kilit gevşemesi gerçekte geri sarılmaz (R03 § 3.2) ve R05 § 2-3 "Parçalanma eşiği Smash ölüm çizgisi gibi görünür ve tahmin edilebilir olmalı". Dönen sayaç bu okunurluğu bozar. `kurallar/`'a `tikGeriDonus = 0` anahtarı konur (kapalı); `@helix` / `@ledger` denge testinde açabilir. Tur arası ve topaç değişiminde sayaç sıfırlanır (`01` § 2.3 ile uyumlu, onay bekler).
- **Karşıt element:** `00` § 3.3'ün "zıtlık" kuralı sim'de yalnız Enerji kazanımını +%25 yapar (hasarı değil). Hasar tablosu Element'ten bağımsız kalır; Element çarpışmanın **hissi** ve **kazanımı** için.

### 2.5 Ring Out, duvar, Durma
- **Kenar çarpışması:** merkez `d > R − r`'ye ulaşınca dışa doğru normal hız `vd = v · n_dışa` hesaplanır.
  - `vd < vRO` (aday 220 birim/s): **sekme.** `v_n = −eDuvar · v_n` (aday 0,5), stamina bedeli `kDuvar · vd`, küçük tık. Duvar çarpması olayı doğar (§ 3).
  - `vd ≥ vRO` **ve** Topaç kenar bölgesinde: **Ring Out.** Olay `ringOut`; Topaç sahadan çıkar (`sahaDisi`), tur kararı sim'de verilir.
  Böylece "kenarda kalmak" riski görünür: aynı itme ortada zararsız, kenarda ölümcüldür. Eşik `vRO` Disk / Uç farkına göre (Top uç itilir → düşük eşik) tablodan okunur.
- **Durma:** `stamina ≤ 0` → olay `durma`; hızlanma kilitlenir, 40 adım (0,67 s) hız sönümü (devrilme görseli için), sonra bitiş. Karar `stamina ≤ 0` anında verilir, devrilme yalnız süstür.
- **Stamina erimesi (adım başına):** `dS = −( erime(Uç) + kHiz · |v|² / vRef² + desenBedeli ) · dt` + çarpışma bedelleri (§ 2.4) + dash bedeli + Ulti bedeli. Hareketsiz de erir (iğne en yavaş, düz en hızlı: R04 § 3.1 üçgeni).

### 2.6 Yalpalama (precession): **salt görsel** (öneri)
- Sim'de Topaç her zaman aynı çaplı daire; yalpalama hit kutusunu **değiştirmez**. Nedenleri: (1) ağda hit kutusu salınımı, ek durum ve tahmin hatası demek; (2) oyuncu "neden vurdum ama kaçırdı" yaşar; (3) sim'de zaten stamina düştükçe hız ve `kb` değişiyor, mekanik karşılığı var.
- Görsel: yalpa genliği `w = clamp((0,4 − stamina/maxStamina) / 0,4, 0, 1)` (stamina < %40'ta başlar), %25 civarı belirgin, Durma'ya doğru eğilme (§ 3.3, olay 9). Girdi yalnız `stamina` okur, ayrı sim durumu yok.

### 2.7 Dash
- Mevcut betikli yer değiştirme (`adim.ts:36-41`) kalkar. Yerine: `v += dir · dashHizi` (aday 400 birim/s, 0,15 s boyunca her adımda ivme olarak uygulanır), stamina bedeli (Uç'a bağlı), bekleme.
- **Dash penceresi (`dashKalan > 0`)** içinde vuran taraf `saldiri · kDash` (aday 1,3). Rocket League'in supersonic'i gibi, dash'in "vuruş niteliği" olması hızla gelir; ayrı olay `dashCarpisma` (§ 3).
- **Karar `@helix`'te:** eski 0,12 s dokunulmazlık (`ayar.ts:38`) çarpışma oyununda "hayalet" hissi verir. Öneri: topaç dash'inde dokunulmazlık **yok**, risk-ödül dash'in kendisinde.

### 2.8 Determinizm kuralları (yeni sim için)
- Sim yalnız `+ − * /`, `Math.sqrt`, `Math.min/max/abs/floor` kullanır. **`Math.hypot` ve trig sim'den çıkar:** bunlar ECMAScript'te yaklaşık, Node ile tarayıcı arasında son bit farkı verebilir. Bugün `Math.hypot` 14 yerde (`adim.ts:17,51`, `carpisma.ts:66,131`, `hamle.ts:20,39,71,155`, `takim.ts:52,116`, `mermiler.ts:23,69`, `Girdi.ts:40`, `zipla.ts:32`) ve `Math.cos` `hamle.ts:83,94`; `atlas.ts:84` `Math.atan2` (yalnız görsel yön, `yonBul`, ama `adim.ts:55` sim içinde çağırıyor). Yeni dosyalarda `kok2(x*x + z*z)` yardımcısı kullanılır; trig ihtiyacı (çiçek fazı `φ`) **yazılı sabit tablodan** (`kurallar/sinTablo.ts`, betikle üretilip repoya konan literal sayılar) okunur, çalışma anında üretilmez.
- Float64 + yukarıdaki işlem seti iki tarafta bit-bit aynı çıkar. Ağda şema float32 taşırsa istemci / sunucu sapması küçülür ama sıfırlanmaz; nicemleme kararı `@relay`'ın (§ 4).
- Test: mevcut `sim.test.ts:45-63` kalıbı iki Topaç, 600 adım, çarpışmalı senaryoyla genişler; ayrıca "yer değiştirme simetrisi" (A-B ve B-A sırası aynı sonuç).

---

## 3. Game feel katmanı (istemci, sim dışı) **[süs]**

İlke: sim `adim` sonunda `d.olaylar`'a **çarpışma olayı** koyar; istemci bu olaydan hissi üretir (bugünkü akış: `Oyun.ts:101-104` → `Efektler.olay`). Sim olayı şu alanları taşır: tür, `Ş`, `vn`, çarpma noktası, normal, iki taraf (`f`, element, dash mi), `tikSonrasi`. Efektin şiddeti **`vn` eşiğine** göre seçilir (Rocket League dersi, R05 § 2-1); `Ş` ölçeklemeyi ince ayarlar. Stamina düştükçe hem knockback artar (sim) hem **parlaklık söner, yalpa artar** (görsel): oyuncu "yorgun, savrulacak" diye okur (Smash dersi).

### 3.1 Eşikler (aday, `vn` birim/s)
`hafif` 80-260 · `ağır` 260-420 · `kritik` ≥ 420 veya (dash penceresi **ve** `ağır`). `vn < 80`: efektsiz sürtünme teması (ses yok, çok hafif toz).

### 3.2 Olay reçeteleri
Hitstop **yalnız görsel**; sim durmaz (§ 3.3 mekanizma). Süreler ms (60 Hz'de 16,7 ms'nin katı), sarsıntı = tepe piksel genliği (mantıksal 960×540) / süre.

| Olay | Hitstop | Sarsıntı | Flaş | Knockback görsel abartı | Parçacık | İz | Ses | Kamera |
|---|---|---|---|---|---|---|---|---|
| **Hafif çarpışma** | 33 | 1,5 / 80 ms | 2 kare, iki Topaç beyaz tint %60 | squash 0,9 / 1,1 (normal ekseninde), 80 ms | 6-8 çarpma parçacığı, element renkli, normal çevresinde koni | temas noktasında 80 ms kısa çizgi | metal "tık", perde ±%8 rastgele (süs RNG) | yok |
| **Ağır çarpışma** | 66 | 4 / 160 ms | 3 kare tam beyaz + element tint | squash 0,8 / 1,2, ek geri itiş 6 px (150 ms, ease-out) | 14-18 parçacık + şok çemberi 220 ms | 150 ms parlak iz | metal "çın" + alt vuruş | zoom darbesi %3, 150 ms |
| **Kritik çarpışma** | 100 | 7 / 220 ms | tam ekran %8 beyaz 50 ms + tint | squash 0,7 / 1,3, geri itiş 12 px; çarpma anında çatlak çizgisi | 24 parçacık, çift şok çemberi | 250 ms | iki katman: "çın" + bas "thud" | zoom %5, 200 ms |
| **Karşıt element** | +16 (taban olaya ek) | taban +%20 | iki elementin karışık rengi | taban olayla aynı | +%25 parçacık, iki renkli | iki renkli | taban + ince "çıtırtı" katmanı | taban |
| **Dash çarpması** | min 66, +33 | 5 / 180 ms | 3 kare | squash 0,75 / 1,25; vurulan 10 px ek geri itiş | sonik çember + 14 parçacık | dash boyunca hız çizgileri (150 ms), çarpmada kopar | "swoosh" → "boom" | zoom %4 |
| **Duvar / kenar çarpması** | 0-33 (`vd`'ye göre) | 2 / 100 ms, **tek yönlü** (normal boyunca) | yok (duvar parlar 60 ms) | squash 0,85 / 1,15 | duvar boyunca çizgi parçacıklar, 6-10 | yok | "tonk" (alçak metal) | yok |
| **Ring Out** | 133 | 8 / 300 ms | tam ekran %25 beyaz 80 ms | Topaç dışa fırlar: görsel yükseklik + ölçek küçülme 500 ms, dönerek | 20 parçacık, kenarda toz | uzun, fırlama yönünde | "swoosh" + düşüş ıslığı (perde düşer) | çıkış noktasına zoom %6, 400 ms geri dön |
| **Parçalanma** | 166 | 10 / 400 ms | %40 beyaz 80 ms | Topaç dağılır: 6-10 çokgen parça, her biri kendi dönüşü ve hızıyla, bir kez yerden sekip kayar | 40 parçacık + toz bulutu | parçalar kısa iz bırakır | cam / metal kırılma + bas patlama | zoom %8; sonuç kesinleşince 0,3× yavaşlatma 500 ms |
| **Durma (devrilme)** | 0 | yok | yok | yalpa → 20° eğilme → yan yatma 400 ms, yerde kayma, küçük toz çemberi | 6 toz parçacığı | yok | vızıltı perdesi düşer + "tıkırtı" (bozuk para yatışı) | yavaş zoom %4, 600 ms |
| **Ulti telegrafı** | 0 | sürekli 0,5 px | Topaç element renginde parlar (aviso boyunca artar) | Topaç hafifçe çöker (squash 0,95) | zemin çemberi şarj (mevcut aviso sistemi, `Efektler.ts:133-148`) | yok | yükselen ton, süre = aviso (`ayar.ts:40`: 0,2-0,45 s) | zoom %2 yavaş |
| **Ulti vuruşu** | 100-133 (ulti boyutuna göre) | 8 / 250 ms | element renkli %30 ekran | vurulan: abartılı geri itiş 14 px | geniş, element desenli | uzun | katmanlı, ulti özgü | zoom %5 |
| **Takım Ultisi** | 200 | 10 / 500 ms | vinyet %40 karartma 300 ms + iki element çakışması | iki Topaç birlikte vurur | çok katmanlı | ortak iz | özel müzik vurgusu | zoom %10, 400 ms |
| **Stamina kritik (%25)** | 0 | yok | HUD çubuğu kırmızı nabız (1,2 s döngü) | yalpa başlar / belirginleşir | parçacık rengi soluk | iz kısalır | alçak kalp atışı (isteğe bağlı) | yok |
| **Enerji doldu** | 0 | yok | HUD çubuğunda 120 ms parıltı | Topaç etrafında element çemberi bir kez | 8 yukarı doğru parçacık | yok | kısa "ding" | yok |

### 3.3 Mekanizmalar
- **Görsel hitstop (sim durmaz):** Çarpışma olayı gelince çarpışan iki Topaç'ın **render konumu** `T_hold` süresince son konumunda bekler (±1 px dik titreme). Sim ve tahmin adım atmaya devam eder. Süre dolunca görsel konum sim konumuna `τ = 60 ms`'lik kritik sönümlü yaklaşma ile yetişir; fark 40 birimi aşarsa doğrudan atlar. Dondurulan: Topaç sprite'ı, yalpa, kamera; çalışmaya devam eden: parçacıklar (yaşları dondurulur), HUD. Yetişme anı "dışarı fırlama" gibi okunur; bu abartı sevilir. Risk: yüksek hızda atlama; spike'ta ölç (§ 7).
- **Hitstop sınırı:** son 300 ms içinde bir hitstop yaşandıysa yenisi %50 ölçeklenir (dalga halinde art arda vuruş akışı bozulmasın). `kritik` ve bitiş olayları sınırı aşar.
- **Sarsıntı (trauma modeli):** `trauma ∈ [0,1]` olay başına eklenir, `genlik = trauma² · maksPiksel`, 1 s'de lineer söner. İlk 2 kare normal ekseninde tek yönlü itme (vuruşun yönü okunsun), sonra gürültü. Gürültü tohumlu süs üreteci (`Math.random` yerine, kayıt oynatma ve test için).
- **Squash / stretch:** Topaç kapsayıcısı normal ekseninde döndürülür, ölçeklenir, geri döndürülür; 3× nearest ölçekle uyumlu olması için ölçek değerleri 1/3 piksel basamağına yuvarlanır. 2.5D'de ekran normali `(nx, nz · zOrani)` olarak çevrilir (`Sahne.zOrani` ≈ 0,69).
- **Flaş:** Topaç tint'i (`FusionAnimator.renkle` kalıbı, `:117-119`) + `kritik`'te ekran katmanı `Graphics` (0 draw call artışı: tek dikdörtgen).
- **Çatlak göstergesi:** `tik` 0,5 / 0,75 / 0,9 eşiklerinde Disk üzerinde kademeli çatlak çizgileri (`@iris`), sesli ipucu. Parçalanma'nın "görünür ve tahmin edilebilir" olması buradan gelir.
- **Ses (kanca):** `Efektler.olay` anahtarı ses tetikler; ses yoksa sessiz çalışır. Bağımlılık eklemeden önce `@axiom` onayı (`@pixi/sound` bugün yok).

---

## 4. Prediction ile uyum

**Durum:** Çarpışma sonucu **sunucuda kesinleşir [sim]**. İstemci hissi **olaydan** üretir **[süs]**. Bugün tahmin altyapısı yok (§ 1); bu bölüm tasarım önerisidir, uygulaması `@relay` ile.

**Sorun:** PokeRivals yalnız kendi konumunu tahmin eder (`pokerivals-paket-analizi.md:46-47`: 120 girdi, 1,5 birim altı yok sayılır, 96 birim üstü atlama, arası üstel düzeltme, ≤ 240 birim/s). Oysa bizde **çarpışma bir hareket olayıdır**: karşı Topaç yerel ekranda 100 ms geriden ara değerlenir (`protokol.ts:20`), yani yerel tahmin "geçmişteki" rakiple çarpışır; sunucu gerçeği ise başka bir an ve konumdur.

**Öneri (iki aşama, spike'ta ölçülecek, § 7):**
- **A, sade (başlangıç):** İstemci yalnız **kendi sürüşünü, sürtünmesini ve duvar çarpmasını** tahmin eder. **Topaç-Topaç darbe tahmin edilmez**; sunucudan `carpisma` olayı + yeni `v` gelince `reconciler` hızı yumuşak düzeltir (3-5 adımda eğri) ve **o an** hitstop + efekt oynar. Bedel: darbe hissi ~ RTT/2 + ara değerleme gecikmesi kadar geç gelir (150 ms'de yaklaşık 175 ms); hitstop 66-100 ms bunun bir kısmını **maskeler** (his donarken sunucu cevabı gelir).
- **B, ileri:** Rakip konumu *geri ara değerleme* yerine hız ile **ileri tahmin** edilir (dead reckoning, düşük ivme olduğu için makul), yerel sim darbeyi *kendi tahmini olarak* uygular ve olay "tentative" işaretlenir; sunucu aynı olayı doğrularsa efekt zaten oynamıştır, doğrulamazsa geri alınır. Bedel: yanlış pozitiflerde "hayalet çarpma".
- **Rollback (yanlış tahmin) kuralı:** görsel efektler (parçacık, ses, sarsıntı, hitstop) **geri alınmaz**; yalnız Topaç **konumu / hızı / stamina / tık** düzeltilir (`reconciler`: küçük hata yok sayılır, orta hata yumuşak, büyük hata atlama). Yanlış pozitif "tentative" çarpmada: efekt zaten çıkmıştır, 80 ms içinde Topaç'a hafif ters yönlü düzeltme uygulanır; kayıp gizlenir, bildirim yok. **Hitstop sırasında gelen düzeltme** hitstop bitince uygulanır (yetişme aşamasında kaybolur).
- **Hitstop ve tahmin:** hitstop render zamanını durdurur, tahmin döngüsünü değil (§ 3.3). Sim adım atmaya, girdi göndermeye, reconcile etmeye devam eder; oyuncu hitstop sırasında bile yön girdisi gönderir (his "sıkışmaz", girdi gecikmesi artmaz).
- **Gecikme telafisi:** `allowRewindState` / `lastSeenBy` (`protokol.ts:18`) isabet testine uygundu; bizde çarpışma bir *fizik etkileşimi* olduğundan geri sarma anlamlı değildir. Adalet, **girdinin hangi sunucu adımına bağlandığıyla** (`defineInput` tick damgası) sağlanır.

### 4.1 `@relay` ile netleşecek maddeler
1. Ağ biçimi: konum / hız / stamina / tık için nicemleme (`float32` mı, 1/16 birim sabit nokta mı); istemci tahmini ile aynı nicemlemeyi uygulamalı mı.
2. Aşama A mı B mi; B için rakip ileri tahmin (extrapolation) üst sınırı (ms).
3. Çarpışma olayı taşıması: yamayla (20 Hz) mı, `defineEvent` ile anında mı (hisin gecikmesini 0-50 ms belirler).
4. `reconciler` eşikleri Topaç için: `umbral / salto / ritim` (PokeRivals: 1,5 / 96 / 10, 240 birim/s tavan). Topaç hızı ve savrulma daha yüksek; `salto` büyür mü.
5. Kendi hızının tahmini: knockback sonrası ilk 100 ms'de yerel hız doğrulanmadan gösterilsin mi.
6. Hitstop sırasında sunucudan gelen düzeltmenin uygulanma kuralı (§ 4 son madde).
7. Float64 ↔ float32 nicemleme için `Math.hypot`/trig temizliğinin (§ 2.8) tahmin sapmasına etkisi.
8. Sunucu `setFixedTimestep(60)` ile istemci birikimli döngüsü arasındaki saat kayması (`Oyun.ts:107-120`).

---

## 5. Performans bütçesi

Hedef: 60 fps, dizüstü iGPU, iki Topaç + efektler. Sayı sahibi `@axiom`; aşağıdakiler öneridir.
- **Draw call:** efekt katmanı ≤ 10, sahne toplamı ≤ 40. Parçacıklar tek `ParticleContainer` (Pixi 8 `Particle`), ön üretilmiş küçük dokular (`renderer.generateTexture` ile bir kez); mevcut "efekt başına bir `Graphics`, her karede `clear()`" yöntemi (`Efektler.ts:255-262`) yüzlerce parçacıkta pahalı.
- **Parçacık tavanı:** canlı ≤ 400; olay başına bütçe: hafif 8, ağır 18, kritik 24, Parçalanma 40 (+ 10 çokgen parça). Tavan dolunca eskiyen en yaşlıyı yer.
- **Zamanlı efekt (Graphics):** aynı anda ≤ 12 (şok çemberleri, aviso). Mevcut havuz (`Efektler.ts:63`) korunur.
- **Trail:** iki Topaç × 10 nokta halka tampon, tek `Graphics` poligon / `MeshRope`; maliyet önemsiz.
- **Çerçeve süresi:** efekt güncelleme + çizim ≤ 1,5 ms (iGPU), sim adımı ≤ 0,3 ms.
- **Düşük cihaz modu (otomatik + elle):** 2 sn boyunca kare süresi p95 > 20 ms ise kademeli düşürür: (1) parçacık ×0,4, trail kapalı; (2) çatlak / yalpa basitleşir, sarsıntı ×0,5; (3) zoom darbesi kapalı. **Hitstop ve squash korunur** (ucuz ve hissin çoğu). Yazılım rasterizer'ı tespit edilirse (PokeRivals: `YC` regex'i, `pokerivals-paket-analizi.md:177`) baştan kademe 2. Telemetri anahtarı `lentosPorEfectos` kalıbı (`:184`) ile ölçülür.
- **Ayar:** "Efektleri azalt" tek anahtar, "Ekran sarsıntısı" ayrı (erişilebilirlik; epilepsi riski için flaş yoğunluğu kısıtı: tam ekran flaş ≤ 3/sn).

---

## 6. Uygulama planı: mevcut koddan topaç sim'ine

### 6.1 Görsel (karar `@iris`)
Topaç sprite'ı: çok kareli dönüş sayfası mı, tek sprite + kodla dönüş (sahte perspektif döndürme / `Mesh`) mi, yoksa 3 katmanı (Gövde, Disk, Uç) ayrı çizip kodla döndürmek mi? Bu seçim animasyon kalitesinin bir numaralı belirleyicisidir; `fusion-animasyon.md` (SpriteCollab hattı) Topaç'a uygulanmaz. Öneri: katmanlı sprite + kodla dönüş (parça karışımı `00` § 5.3'e uyar, Gövde / Disk / Uç değişimi ücretsiz olur).

### 6.2 Dosya kaderi
| Dosya | Kader |
|---|---|
| `istemci/oyun/Dovuscu.ts`, `istemci/sprite/FusionAnimator.ts`, `Animator.ts`, `AtlasYukleyici.ts`, `araclar/fusion-birlestir.ts`, `BirlestirmeLab.ts` | **silinir** (Topaç görseli yeni `Topac.ts`); `OLCEK`/nearest ayarı taşınır |
| `sim/hamle.ts`, `sim/mermiler.ts`, `sim/vurus.ts`, `sim/takim.ts`, `sim/zipla.ts`, `sim/durumlar.ts`, `kurallar/hamleler.ts`, `tipler.ts`, `statlar.ts` | **silinir / yerine geçer** (Ulti tablosu ayrı iş) |
| `sim/carpisma.ts` | **evrilir**: `daireDaireCoz` ve `konumCoz` kalır (ayırma ve kenar), `kok2` yardımcısı eklenir |
| `sim/adim.ts` | **evrilir**: `hareketAdimla` ivme / sürtünme / desen modeline; `dovuscuAyir` kalkar (yerine `carpisma-impuls.ts`) |
| `sim/durum.ts`, `Dunya.ts` | **evrilir**: `Dovuscu` → `Topac` (§ 2.1), olay tipleri (`carpisma`, `duvar`, `ringOut`, `parcalandi`, `durma`) |
| `sim/Girdi.ts`, `istemci/oyun/Girdi.ts` | **kalır** (anlam değişir); sağ tuş nişanı Ulti yönü olarak kalır |
| `istemci/oyun/Efektler.ts` | **evrilir**: `olay` anahtarı yeni olaylara; zamanlı `Graphics` ve `aviso` çizimi kalır, parçacık `Parcaciklar.ts`'e çıkar |
| `istemci/oyun/Sahne.ts` | **evrilir**: trauma sarsıntısı, kamera zoom darbesi, görsel hitstop saati |
| `istemci/oyun/Hud.ts`, `KartPanosu.ts` | `@glyph`: HP → Stamina + tık + Enerji |
| **Yeni** `sim/topac.ts`, `sim/carpisma-impuls.ts`, `kurallar/uc.ts`, `kurallar/sinTablo.ts` | § 2 |
| **Yeni** `istemci/oyun/Topac.ts`, `Parcaciklar.ts`, `Iz.ts`, `KameraDarbesi.ts` (isteğe bağlı: `Sahne` içinde), `Hitstop.ts` | § 3 |

### 6.3 Sıra ve "iyi hissediyor mu" ölçütü
Her adım **gerçek oynama** ile kapanır (kod okuyarak değil): ekran görüntüsü + 15-30 sn video, sahip ya da `@pebble` oynar, kayıt Paca'ya düşer.
1. **Tek Topaç sürüş + sürtünme:** ivme, kayma, Uç desenleri (düz / top / iğne). *Ölçüt:* gözler kapalı bile kontrol "kaygan ama güvenilir"; düz uç girdisizken çiçek çizer; iğne neredeyse sürüş; yeni oyuncu 30 sn içinde kenara düşmeden dolaşır.
2. **İki Topaç impuls çarpışması + stamina:** § 2.3-2.4, HUD'da stamina. *Ölçüt:* ağır Topaç hafifi belirgin savurur, tersi çok az; yorgun Topaç daha uzağa gider; vuran da stamina kaybeder (sayı olarak görünür); 5 çarpışmanın hiçbiri "yapışma" ya da "sıfır tepki" vermez.
3. **Game feel katmanı:** § 3 (önce hitstop + sarsıntı + flaş + squash, sonra parçacık / iz / ses). *Ölçüt:* sesi kapalı bile hafif / ağır / kritik farkı ayırt edilir (kör test, `@pebble`); art arda 5 çarpışma yorucu / bulanık olmaz.
4. **Ring Out / Parçalanma / Durma:** § 2.5. *Ölçüt:* her bitiş "neden oldu" sorusuna 1 sn içinde cevap verir (oyuncu söyler); Parçalanma'nın yaklaştığı çatlak aşamalarından anlaşılır.
5. **Ulti:** telegraf + vuruş + Takım Ultisi (tablo `01` § 3 sonrası).

---

## 7. İlk spike (`@spark`): "iki Topaç çarpışıyor" dilimi

**Kapsam (en küçük, hissi sınayan):** düz bir daire çanak, iki Topaç (biri oyuncu WASD, biri sabit rotada bot), tek Uç tipi (düz), `Ş` + stamina + kenar sekmesi + hitstop + sarsıntı + tek flaş + 20 parçacık. Ring Out ve Parçalanma yok.
**Adımlar:**
1. Sim: `Topac` + `carpisma-impuls.ts`, 600 adımlık determinizm testi geçer. (`@byte`)
2. Yerel (çevrimdışı) oynanış, tek ekran: eşikler (`hafif` / `ağır` / `kritik`) için 5 katsayı oynanabilir (`?debug` kancası, `Oyun.ts:65`).
3. Ağ: sabit gecikme **150 ms + %2 paket kaybı + 20 ms jitter** altında iki gerçek istemci; yerel sürücü A (yalnız olay + reconciler) ile B (ileri tahmin) kıyaslanır. (`@relay` + `@spark`)
**Başarı ölçütleri:**
- Gecikmesiz yerel oynanışta (`pebble` + sahip): "çarpışma güzel" cevabı; hitstop yetişme atlaması fark edilmiyor.
- 150 ms + %2 kayıp altında: çarpmadan görsel tepki gecikmesi ≤ 200 ms (video kare sayımı); düzeltme sıçraması (`reconciler` atlama) 10 çarpışmada ≤ 1 kez görünür; "hayalet çarpma" (B) 10'da ≤ 1.
- Bozulursa kaydedilir: hangi eşikte, hangi gecikmede; hitstop süresini kısmak, A'ya dönmek, `salto`yu büyütmek denenir.
- Kare süresi: iGPU dizüstüde p95 ≤ 16,7 ms (efekt yoğun çarpışma dizisi dahil).
**Çıktı:** video (yerel + ağ), eşik tablosu, "A mı B mi" önerisi; sonuç `docs/design/tuning.md` ve bu belgeye işlenir.

---

## 8. Açık sorular (karar bekleyenler)
| # | Soru | Kimde |
|---|---|---|
| 1 | Dash dokunulmazlığı topaç oyununda kalkar mı (§ 2.7) | `@helix` |
| 2 | Tık geri dönüşü: kapalı (öneri) / yavaş açık (§ 2.4) | `@helix`, `@ledger` |
| 3 | Aday katsayıların (`kH`, `kGeri`, `kKb`, `vRO`, `vSurus`, eşikler) denge testi | `@ledger` |
| 4 | Topaç görsel hattı: katmanlı sprite + kodla dönüş (§ 6.1) | `@iris`, sahip |
| 5 | Arena biçimi (daire çanak + kenar eğimi), `kenarMesafesi` arayüzü | `@cove` |
| 6 | `@pixi/sound` bağımlılığı | `@axiom` |
| 7 | Prediction A / B, olay taşıması, nicemleme (§ 4.1) | `@relay` |
| 8 | Stamina / tık / Enerji HUD'u | `@glyph` |
| 9 | Hitstop uzunlukları ve ekran flaşı için erişilebilirlik sınırları | `@tide` |
