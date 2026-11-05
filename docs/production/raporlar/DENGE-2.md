# DENGE-2 raporu: Ulti sıklığı (Enerji Mirası), Ring Out payı, kalan kazanım sapmaları

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** denge / bot (`@ledger` + `@byte`) · **Onay:** sahibin "devam et"i;
bu tur sim ve veri değişikliğine yetki var, altın senaryolar bilinçle yeniden kaydedildi.
**Dokunulmayanlar:** Kick OAuth, `src/istemci/**`, `araclar/sanat`, `public/`, `docs/art`, `main`.

## 0. Özet

| Kalem | Durum | Önce → sonra (kanıt) |
|---|---|---|
| 1. Ulti sıklığı | **yapıldı** (sim: Enerji Mirası + bot eşiği) | Ulti görülen maç, turnuva 3×500: %4,0 → **%43,7** (tohum 1/2/3: 40,0 / 41,1 / 49,9); `qa:bot` 500: %1,4 → %32,0. Oyuncu başına Ulti/maç 0,02 → 0,25 (§ 1) |
| 2. Ring Out %25-35 | **yapıldı** (`vRO` 200 → 265) | 3×500: %33,4 / 39,9 / 44,2 → **%26,5 / 33,0 / 34,3**; 3×1 000: toplam %39,4 → %31,7 (tohum 3 %35,6, sınırda) (§ 2) |
| 3. Kalan sapmalar, bant ≥ 19/20 | **yapıldı** (veri + Karanlık emiş katsayısı) | Bant 3×1 000: 19 / 17 / 19 → **19 / 20 / 20**; Kül + Savrulan + Alçak + Tutucu %70,7 → bant içi; Saldırgan arketip %46,2 → %47,8 (§ 3) |
| 4. Altın, tarayıcı, ağ | **yapıldı** | 16 senaryo `--yeniden` kaydı; Node = Chromium 16/16 AYNI; ağ matrisi N0 / N1 iki istemci wire ve yeniden oynatma sapması 0 (§ 4) |

Kapılar: `npm test` 24 dosya / 469 test, `npm run lint`, `npm run typecheck`, `npm run build` yeşil (rebase sonrası).

## 1. Ulti sıklığı

**Teşhis (DENGE-1 § 3'ten devam, yeniden ölçüldü).** Enerji takım üyesi başına tutuluyordu; üye sahada medyan ~17 s kalıyor,
300'e ulaşan üye %0,2. En az müdahaleli yolu bulmak için önce kazanım katsayılarını ölçtüm (turnuva 3×200, varsayılan dışında
her şey aynı):

| Deney | Ulti görülen maç | Yetenek / Özel / maç |
|---|---|---|
| varsayılan (önce) | %5,5 | 2,24 / 0,44 |
| `pasifDolum` 1,5 → 2,5 | %5,1 | 2,54 / 0,54 |
| `pasifDolum` 2,0 + `carpismaKatsayi` 9-10 + Miras 0,75-0,8 | %28-31 | 2,5-2,6 / 0,6 |
| Yalnız elenende Miras 0,5 / 0,75 / 1,0 | %13,8 / 23,4 / 31,0 | 2,45-2,48 / 0,61-0,73 |
| Elenende 1,0 + geri çekte 1,0 (tam Miras), bot eşiği yok | %44,4 (3×500) | 3,08 / 0,85 |

Kazanım katsayıları Ulti'yi oynatmadı: Enerji artınca bot onu Yetenek'e harcıyor (Yetenek/maç artıyor, Ulti aynı). Sınır
dolum hızı değil, **Enerjinin üye değişiminde kaybolması** (eleme ve geri çek; geri çek maç başına ~3). Seçilen kural tek
cümleyle anlatılabiliyor: **"Enerji topaç değişince yeni topaca geçer."** Oyuncunun tek Enerji çubuğu oluyor; bu, S1'e
(kolay öğrenilir) üye başına ayrı çubuklardan daha yakın. Ustalık tarafı korunuyor: Ulti için 300'ü harcamadan taşımak gerekiyor,
yani ucuz yetenekleri bırakmak bir karar.

**Değişiklik:**
- `src/paylasilan/sim/mac.ts` `uyeSahayaKoy`: sahadan çıkanın Enerjisinin `enerjiElenenDevir` (elenen) ya da
  `enerjiGeriCekDevir` (geri çekilen) oranı (aşağı yuvarlanır) girene eklenir, komşu devri +40 ile birlikte, tavan 300; çıkanın
  kaydından düşülür. `ayar.ts`: ikisi de **1,0** (önce davranış = 0 / 0). Olay `degisim.enerjiDevri` toplam devri taşır (şema aynı).
- `src/paylasilan/bot/bot.ts`: `BOT_YETENEK.ultiYakin` = 250. Enerji ≥ 250 iken Ulti zarı tutmamış üye de biriktirir
  (insan da Ulti'ye yarım dilim kalınca harcamaz). Etkisi küçük (turnuva %44,4 → %45,8, `qa:bot` %29,8 → %31,8), ama Miras'la
  gelen Enerjinin boşa gitmesini önlüyor. Varsaydım: "orta oyuncu" = DENGE-1'deki kademe karışımı (Ulti'ye adanma 0,35 / 0,60 / 0,60).
- Denendi, bırakıldı: Ulti adanma zarını üye yerine oyuncu başına atmak (ölçülen etki +0-3 puan, gürültü düzeyinde).

**Sonra (son veriyle):**

| Ölçüm | Önce | Sonra |
|---|---|---|
| Turnuva Ulti görülen maç, tohum 1/2/3 × 500 | %4,0 / 3,3 / 4,8 | %40,0 / 41,1 / 49,9 |
| Turnuva Ulti görülen maç, tohum 1/2/3 × 1 000 | %2,5 / 2,2 / 4,6 | %34,5 / 35,9 / 46,2 |
| `npm run denge:turnuva` (tohum 1, 200 maç, referans takımlar ağırlıklı) | %6 | %51 |
| `qa:bot` 500 (Lv.3, kademeler sırayla) | %1,4 | %32,0 |
| `qa:bot`: 300'e ulaşan oyuncu / en az bir oyuncunun ulaştığı maç | %0,2 / %0,4 | %11,1 / %21,4 |
| Her bot Ulti'ye adansa (`ultiHedef` = 1, `qa:bot` 500) Ulti görülen maç | %2,8 | %55,6 (tam Miras ölçümünde) |
| Yetenek / Özel / Ulti / Takım Ultisi, maç başı (iki oyuncu, turnuva 3×500) | 2,23 / 0,39 / 0,04 / 0,68 | 3,23 / 0,90 / 0,49 / 0,55 |

Yorum: Ulti oyuncu başına maçta ~0,25 kez (her dört maçın birinde) görülüyor; hedef bandın (%35-50) içinde ve hâlâ "maç başına en
çok bir". `qa:bot` (%32) bant altı sınırında, turnuva (%40-50) içinde; ikisinin farkı takım kurgusu (turnuvada referans takımlar ve
tip-kademe eşlemesi). Takım Ultisi biraz azaldı (0,68 → 0,55): Ulti süresince ve +1 s hiçbir Enerji dolmuyor (flint #14), Takım
Enerjisi de o kapıdan doluyor. Yetenek ve Özel kullanımı arttı (Miras Özel'i de besliyor); tempo tuning § 8'deki "1 dilim / 15-20 s"
hedefinin üstünde değil (Yetenek oyuncu başına maçta ~1,6).

## 2. Ring Out payı (H1)

Duyarlılık (bu turun son verisiyle, tohum 1/2/3 × 500 maç):

| `vRO` | Ring Out tohum 1 / 2 / 3 | toplam | `qa:bot` 500 |
|---|---|---|---|
| 200 (önce, önceki veri) | 33,4 / 39,9 / 44,2 | 39,2 | 37,7 |
| 200 (son veri) | — | — | 42,9 |
| 250 | 27,9 / 36,2 / 38,2 | 34,1 | 32,1 |
| 260 | 26,7 / 34,3 / 36,0 | 32,4 | 30,4 |
| **265** (seçilen) | 25,8 / 33,1 / 35,4 (ara ölçüm), **26,5 / 33,0 / 34,3** (son) | 31,4 / **31,3** | **29,1** |
| 270 | 24,5 / 31,8 / 33,9 | 30,1 | 28,8 |

Son durum 1 000 maçta: %25,7 / 33,8 / 35,6 (toplam %31,7); `npm run denge:turnuva` (tohum 1, 200) %28,8. `ringOutHizi` 6 Uç'ta ve
`ayar.ts` varsayılanında 265. `kEgim` değişmedi (DENGE-1: etkisi ters ya da küçük).
**Neden tek değerle her tohum tam banda girmiyor:** tohumlar arası ~10 puan fark havuzdan. Ring Out'la kaybetme payı Uç'a çok bağlı
(scratch ölçümü, 3×500): Top Uç kayıplarının %49-66'sı, Hafif Disk %8-71'i (havuza göre), İğne Uç %4-10'u Ring Out. 265, iki uç
tohumu banda en yakın tutan değer; 1 000 maçta tohum 3 %35,6 ile 0,6 puan dışarıda (500 maçta içeride).
Yan etki: Durma payı %43-53 → %54-61, berabere %4,6-5,6 → %5,9-7,0, maç süresi p90 76,6 → 77,2 s (≤ 90 tutuyor).

## 3. Kalan sapmalar

**Teşhis (parça düzeyi: 80 build, 2 000 maç, tohum 5).** Önce: Top Uç %59,6, Halka %57,4, Ayaz %56,6, Ağır Disk %55,1, Kül %54,6 ...
Kor Göktaşı %45,7, Düz Uç %45,7, Dengeli Uç %44,9, Hafif Disk %44,5, Düşürücü %43,4. Arketip: Dayanıklı %59,0, Saldırgan %46,2.

- **Kül + Tutucu (%70,7, n = 352):** Kül Çekirdeği tek `sol` dönüşlü Çekirdek; Karanlık emiş zıt yönde %40 (en çok 20) ve rakip
  bu kadar ek stamina da kaybediyor. Deney: Kül'ün yönünü `sag` yapınca build bant içine girdi; Kül'ün katkılarını kısmak
  (saldırı, havuz, erime) tek başına %71 → %69'du. Karar: zıt yön emişi %30 / en çok 15 (`KOKEN_PASIF.karanlik`) + Kül katkıları.
  Kül'ün kimliği (sol, Karanlık) korunur.
- **Top Uç + Ağır Disk:** Top Uç `esneklik` / `kCakilma` / `surtunme` / `ivme` / merkezci `kMerkez` deneyleri ölçülebilir fark
  vermedi (hepsi gürültü içinde); `erime` 3,0 → 4,5 belirgin (59,4 → 52,8), 4,0 yetmedi (3×1 000'de iki Top'lu build %66). 4,6 seçildi.
  Ağır Disk havuzu 30 → 20.
- **Saldırgan arketip:** Düşürücü, Ok, Sivri Gövde, Hafif Disk, Kor Göktaşı, Düz Uç katkıları yükseltildi (tablo § 3.1).

### 3.1 Veri değişiklikleri (tümü tuning.md § 20 "DENGE-2"de SAPMA olarak)

| Parça / sabit | Alan | Önce | Sonra |
|---|---|---|---|
| `KOKEN_PASIF.karanlik` | `emisZitOran` / `emisZitEnFazla` | 0,4 / 20 | 0,3 / 15 |
| Top Uç | `erime` | 3,0 | 4,6 |
| Halka Gövde | `staminaHavuzu` / `savunma` | 100 / 40 | 70 / 37 |
| Ayaz Gövde | `staminaHavuzu` | 70 | 62 |
| Ağır Disk | `staminaHavuzu` | 30 | 20 |
| Kül Çekirdeği | `saldiri` / `staminaHavuzu` / `erime` | 6 / 10 / 0,3 | 3 / 0 / 0,5 |
| Tutucu Uç | `ivme` / `vSurus` | 700 / 230 | 650 / 215 |
| Düşürücü Gövde | `savunma` / `staminaHavuzu` | 16 / 25 | 24 / 50 |
| Ok Gövde | `staminaHavuzu` | 45 | 55 |
| Sivri Gövde | `savunma` | 26 | 30 |
| Hafif Disk | `kutle` / `staminaHavuzu` | 8 / 10 | 10 / 25 |
| Kor Göktaşı | `saldiri` / `staminaHavuzu` | 4 / 30 | 6 / 40 |
| Düz Uç | `erime` | 5,5 | 5,0 |
| Tüm Uç'lar + `ayar.ts` | `ringOutHizi` | 200 | 265 |

Denenip bırakılan: azaltılmış set (Kül katkıları, Düz Uç, Sivri hariç) 3×1 000'de bant 58/60, tam set 60/60 (ara ölçüm), son 59/60.
`kEsit` 0,06 → 0,03 Kül build'ini düzeltmedi (%73).

### 3.2 Önce / sonra

| Ölçüm | Önce | Sonra |
|---|---|---|
| Bant, tohum 1/2/3 × 1 000 maç | 19 / 17 / 19 (55/60) | **19 / 20 / 20 (59/60)** |
| Bant, tohum 1/2/3 × 500 maç | 18 / 18 / 20 | 19 / 20 / 19 |
| `npm run denge:turnuva` (tohum 1, 200 maç; n ≈ 60/build, SH ≈ 6 puan) | 17/20 | 19/20 |
| Bant dışı build'ler (1 000 maç) | Kül+Savrulan+Alçak+Tutucu 70,7 · Kor Kalbi+İz+Alçak+Top 70,1 · Kül+Halka+Denge+Top 69,3 · Kor Göktaşı+Halka+Ağır+Top 66,7 · Kasırga+Ayaz+Alçak+Top 67,6 | Şimşek Göktaşı+Ayaz+Alçak+İğne 34,2 (n = 345; SH ≈ 2,6) |
| Parça düzeyi en yüksek / en düşük | Top Uç 59,6 / Düşürücü 43,4 | Halka 55,4 / Düşürücü 45,5 |
| Parça düzeyi build bandı (80 build) | 75/80 | 77/80 |
| Arketip Dayanıklı / Denge / Saldırgan / Kale | 59,0 / 48,9 / 46,2 / 45,5 | 56,4 / 49,6 / 47,8 / 48,3 |
| En güçlü ikili (n ≥ 300) | Ağır Disk + Top Uç 69,7 (Miras + `vRO` 250 ara ölçümü) | Kül + İz 59,1 · İz + Düz 59,1 · Ağır + Top 58,6 |
| Maç süresi medyan / p90 / p99 (turnuva tohum 1, 200) | 59,4 / 76,9 / 90,0 s | 60,8 / 76,7 / 90,5 s |
| `qa:bot` 500 medyan / p90 / p99 / takılan | 52,2 / 78,0 / 98,6 s / 0 | 55,7 / 77,6 / 93,5 s / 0 |

§ 13 etki: 1 920 kombinasyonda tip dağılımı 716 / 629 / 373 / 202 → **761 / 653 / 268 / 238** (Saldırgan / Denge / Dayanıklı /
Kale); Top Uç erimesi yükseldiği için Dayanıklı etiketi daraldı (yalnız etiket; ama bot kademesi etikete göre seçiliyor). Aralıklar:
kütle 29-48, savunma 24-76, havuz 355-460, erime 4,1-7,4. Başlangıç setleri: Göktaşı 29 / 68 / 28 / 420 / 5,0, Maden havuz 390.
`test/veri.test.ts` ve `test/d6.test.ts` (Düz = İğne erime) beklentileri güncellendi, tuning § 13 tabloları da.

## 4. Altın senaryolar, tarayıcı, ağ

- **Neden yeniden üretildi:** (a) `ringOutHizi` her Uç'ta ve profil sim'e giriyor, (b) parça katkıları, (c) Miras üye değişiminde
  Enerjiyi değiştiriyor. Hepsi bilinçli. `npm run altin:uret -- --yeniden`: bot ve duruma bağlı girdi akışları (`bot-mac`,
  `tam-bot-*`, `ani-olum`, `geri-cek`, `rastgele-girdi`, yetenek senaryoları) yeni sim'le yeniden kaydedildi; 15 hash değişti,
  `berabere` (12 adımda biten, iki Maden) bit bit aynı kaldı. Anlamlar korunuyor: `ring-out` yine Ring Out (dash 260 + 300 > 265),
  `parcalanma`, `durma`, `berabere`, `ulti` (iki Ulti + ret), `takim-ultisi`, `geri-cek` (değişim olayı) beklenen olayları üretiyor.
- `npm run test:tarayici`: Chromium 153 / Node 22, 16 senaryonun hepsi **AYNI** ("Node ve Chromium bit bit aynı").
- **Sürüm:** `KATALOG_OZETI` `parcalar.json`'dan hesaplandığı için kendiliğinden değişti (geliştirme sunucusu `0a179afc0de90665`);
  eski paketli istemci katılmada 4102 ile reddedilir ("Oyun güncellendi"). `PROTOKOL_SURUMU` 6 kaldı: wire şeması, mesajlar ve
  hash alanları değişmedi. Varsaydım: katalog özeti yeterli kapı; ileride yalnız `ayar.ts` değişen bir sim düzeltmesi katalog özetini
  değiştirmez, o zaman protokol sürümü artırılmalı (açık risk, § 5).
- **Ağ matrisi** (`npm run dev` + `npm run ag:matris -- N0 N1 --cikti=docs/production/raporlar/DENGE-2-ag-matris.json`):

| Profil | Maç | Wire hash A / B | Yeniden oynatma A / B | Sapma | Çarpışma | sıçrama/10 A / B | varış p95 |
|---|---|---|---|---|---|---|---|
| N0 temel | 48 s, puan 4-2 | 49/49 · 49/49 | 48/48 · 48/48 son eşit | **0 / 0** | 14 | 0,00 / 0,00 | 5 / 5 ms |
| N1 iyi (40 ms) | 98 s, ani ölüm 4-2 | 99/99 · 99/99 | 98/98 · 98/98 son eşit | **0 / 0** | 62 | 0,32 / 0,32 | 45 / 46 ms |

Hata 0, hayalet çarpma 0. İki maçta da birden çok eleme var (4-2), yani Miras'lı değişim iki istemcide de aynı hash'i verdi.

## 5. Kalan sorunlar / öneriler

1. **Ring Out tohum yayılımı:** 1 000 maçta tohum 3 %35,6. Tek `vRO` ile bütün havuzlar banda girmiyor; kaynak Uç'a göre Ring Out
   kırılganlığı. Öneri: Uç başına `ringOutHizi` (alan zaten var), ör. İğne düşük, Top yüksek; bu tasarım kararı (tuning "ileride Top
   Uç düşer" notunun tersi) olduğu için uygulamadım.
2. **`qa:bot` Ulti oranı %32** (turnuva %44): bant altı sınırında. Bot kademe karışımı `qa:bot`'ta tipten bağımsız. İnsan ölçümü yok.
3. **Takım Ultisi azaldı** (maç %57 → ~%45): Ulti kilidi Takım Enerjisini de durduruyor. İzlenmeli.
4. **Dayanıklı etiketi daraldı** (373 → 268 kombinasyon): bot kademesi etikete bağlı; sezon 2 parçalarıyla dengelenebilir.
5. **Berabere hafif arttı** (%5-6 → %6-7) ve Durma payı %60'a yaklaştı (tohum 1): `vRO` yükselişinin bedeli.
6. Sim kuralı yalnız `ayar.ts`'te değişirse katalog özeti değişmez (§ 4): `KATALOG_OZETI`'ne sim sabitlerini katmak ya da protokol
   sürümünü artırmak için ayrı bir karar gerekir.

## 6. Commit'ler (devran-kod)

- `balance(denge-2): Enerji carries over on swap, Ring Out speed 265, rein in Top Uc and Kul, lift Saldirgan parts` (sim + bot + veri
  + testler + altın + tuning SAPMA)
- `docs(denge-2): balance report, network matrix N0/N1` (bu rapor + ağ matrisi JSON)

Ölçüm betikleri scratch'te kaldı (repo'ya girmedi): turnuva çok tohumlu deney, parça düzeyi, Ring Out kaybı dağılımı, `qa:bot` +
Ulti erişimi. "Önce" değerleri HEAD'in (`430e723` üstü, DENGE-1 sonrası) ayrı bir kopyasında aynı betiklerle ölçüldü.
Paralel oturumlardan alınan: `gu-d` / `gu-e` görsel commit'leri rebase sırasında geldi (`src/istemci`, `public/`, `veri/topac-gorsel.json`,
`test/kamera.test.ts`); dokunulmadı, kapılar rebase sonrası yeşil.
