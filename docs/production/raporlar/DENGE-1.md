# DENGE-1 raporu: kazanım bandı, Ring Out payı, bot Ulti'si, eşzamanlı bitiş ve maç süresi

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** denge / bot (`@ledger` + `@byte`) · **Onay:** sahibin "geliştirmelere devam et"i.
**Kapsam kuralı:** deterministik sim çekirdeğine (`src/paylasilan/sim/**`) ve `kurallar/ayar.ts`'e dokunulmadı; yalnız veri
(`veri/parcalar.json`), paylaşılan bot (`src/paylasilan/bot/bot.ts`) ve ölçüm aracı (`araclar/qa-bot.ts`) değişti. Kick OAuth,
`src/istemci/**`, `araclar/sanat`, `public/` dokunulmadı.

## 0. Özet

| Kalem | Durum | Kanıt |
|---|---|---|
| 1. Kazanım bandı | **kısmen**: iki hedef çift düzeldi (Sabır+Ayaz %75 → %44, Sabır+Sivri %29 → %38); resmi koşu (tohum 1, 200 maç) yine **17/20**, çünkü iki yeni build (%70, %68) gürültü sınırında dışarıda | § 1 |
| 2. Ring Out payı | **gerekçeyle bırakıldı** (%35,1 tohum 1; havuza göre %34-44); `vRO` 240 önerisi ölçüldü, altın hash'leri bozacağı için uygulanmadı | § 2 |
| 3. Bot Ulti'si | **yapıldı ama tavan yapısal**: bot artık 300'e biriktiriyor, kademeye göre (kolay az); Ulti görülen maç %0 → %6 (turnuva), %0 → %1,4 (`qa:bot`). Daha fazlası Enerji ekonomisi değişikliği ister (sim) | § 3 |
| 4. Eşzamanlı bitiş, p90 | **ölçüldü, tutuyor**: berabere %6,0 (ön sim %21 yerine), maç süresi p90 76,9 s (≤ 90) | § 4 |

## 1. Kazanım bandı (20 rastgele build, hedef %35-65)

**Yöntem.** Resmi ölçüm `npm run denge:turnuva` (tohum 1, 200 maç, build başına n ≈ 60). Bu örneklemde build başına standart
hata ≈ 6,4 puan; yani gerçek oranı %58 olan bir build %70 görünebilir. Bu yüzden kararı üç ek ölçüme dayandırdım (hepsi scratch
betikleri, `test/denge/turnuva.ts` kütüphanesiyle): (a) tohum 1/2/3 × 200 maç, (b) tohum 1 × 1 000 maç (n ≈ 300/build),
(c) **parça düzeyi**: 80 build'lik havuz, 2 000 maç, her parçanın bulunduğu build'lerin maç-ağırlıklı kazanma oranı.

**Teşhis (parça düzeyi, bot değişikliğinden sonra, veri değişikliğinden önce):** Ayaz Gövde %63,7 (en yüksek), Top Uç %60,0,
Halka %56,9 … Düşürücü %42,0, Sivri %40,4 (en düşük). Ayaz, Halka'dan her alanda iyiydi (havuz 110, savunma 42, kütle 19);
Sivri, Ok Gövde'den tık çarpanı dışında her alanda kötüydü (kütle 13: `40/kutle` tık böleni ve geri tepme onu kırılgan yapıyor, H3).

**Değişiklik (yalnız `veri/parcalar.json` katkı alanları; kimlik ve şema aynı; tuning.md'de SAPMA olarak işlendi, § 20 "DENGE-1"):**

| Parça | Alan | Önce | Sonra |
|---|---|---|---|
| Ayaz Gövde | `staminaHavuzu` / `savunma` / `erime` | 110 / 42 / 0,1 | 70 / 36 / 0,2 |
| Sivri Gövde | `kutle` / `savunma` / `staminaHavuzu` | 13 / 20 / 20 | 18 / 26 / 40 |
| Düşürücü Gövde | `kutle` / `staminaHavuzu` | 13 / 10 | 17 / 25 |

Parçalar altın senaryolara göre seçildi: Sivri ve Düşürücü hiçbir senaryoda yok, Ayaz yalnız `tam-bot-yetenek` takımında.
Denenip **bırakılanlar** (ölçüldü, iyileştirmedi): Tutucu Uç `erime` 5,0 → 5,5 (+ `vSurus` 230 → 220) ve İz Gövde `saldiri`
50 → 46: tohum 1 1 000 maçta %71 → %67 ama tohum 2/3'te bant 18 → 17, 20 → 16. Top Uç `erime` 3,0 → 3,6: parça düzeyi
%60 → %64 (değişmedi; gücü erimeden değil merkezci desen + esneklikten).

### 1.1 Önce / sonra: 20 build kazanma dağılımı (tohum 1, 200 maç; resmi koşu)

| Durum | Bant içi | Kazanma % (büyükten küçüğe) |
|---|---|---|
| Önce (D8 kodu, `9a6ad44`) | 17/20 | 75 66 57 57 55 55 54 54 54 53 49 47 46 44 44 42 41 40 37 **29** |
| Yalnız bot değişikliği (§ 3) | 15/20 | 67 66 63 61 60 57 57 55 54 54 49 48 47 46 46 41 41 34 33 25 |
| Sonra (bot + veri) | 17/20 | **70 68** 65 62 57 53 52 51 49 49 46 46 45 44 44 43 43 39 38 35 |

| Hedef çift (tohum 1) | Önce | Sonra |
|---|---|---|
| `sabir-tasi+ayaz-govde+denge-disk+duz-uc` | **75** | 44 |
| `sabir-tasi+sivri-govde+parlak-disk+igne-uc` | **29** | 38 |
| `kul-cekirdegi+savrulan-govde+alcak-disk+karanlik-ucu` | 54 | **70** |
| `girdap-maden+izli-govde+parlak-disk+top-uc` | 54 | **68** |
| `kor-goktasi+halka-govde+parlak-disk+kusak-ucu` | 53 | 65 (sınırda, %65,1) |

### 1.2 Sağlamlık (aynı kurallar, farklı örneklem)

| Ölçüm | Önce (D8) | Sonra |
|---|---|---|
| Tohum 1 / 2 / 3, 200 maç: bant içi | 17 / 18 / 16 | 17 / 18 / **20** |
| Tohum 1, 1 000 maç: bant içi | 18/20 (alt uç 32, 30) | **19/20** (tek dış: Kül + Savrulan + Alçak + Tutucu %71, n=352) |
| Parça düzeyi (80 build, 2 000 maç): en yüksek / en düşük parça | Ayaz 63,7 / Sivri 40,4 | Top Uç 59,6 / Düşürücü 43,4 (Ayaz 56,6, Sivri 46,8) |
| Parça düzeyi: build bandı (80 build) | 69/80 | 75/80 |

Yorum: hedeflenen iki uç kapandı ve geniş örneklemlerde bant iyileşti (60 build-ölçümünde dışarıda kalan 9 → 5); resmi tek
koşudaki 17/20 büyük ölçüde örneklem gürültüsü (n ≈ 60). Gerçek kalan dış değer **Kül Çekirdeği + Tutucu Uç** sinerjisi (%71,
n=352) ve **Top Uç + Ağır Disk** birleşimi (parça düzeyi en güçlü ikili). Bu parçalar altın senaryolarda kullanıldığı için
(Kül: `yetenek-kademeler`; Top Uç, Ağır Disk, Savrulan, Alçak Disk: çoğu senaryo) bu turda dokunulmadı (§ 5).

## 2. Ring Out payı (H1, hedef %25-35)

Değer değiştirilmedi. Ölçüm (sonra durumu, varsayılan `vRO` 200, `kEgim` 700):

| Ölçüm | Ring Out | Durma | Parçalanma | Berabere |
|---|---|---|---|---|
| Turnuva tohum 1 (200 maç, 1 472 tur) | **35,1 %** | 50,1 % | 8,8 % | 6,0 % |
| Turnuva tohum 2 / 3 | 40,9 % / 43,6 % | 42,3 / 44,3 % | 10,9 / 7,4 % | 5,8 / 4,7 % |
| Turnuva tohum 1, 1 000 maç | 33,7 % | 53,1 % | 8,3 % | 5,0 % |
| `qa:bot` 500 maç (1 392 tur) | 37,7 % | 50,6 % | 8,5 % | 3,2 % |
| Önce (D8), turnuva tohum 1 | 36,6 % | 49,7 % | 9,4 % | 4,4 % |

Duyarlılık (deney ayarı `DeneyAyari`, sim kodu değil; tohum 1 / 2 / 3, 200 maç):

| Ayar | Ring Out % | Bant | maç p90 (s) |
|---|---|---|---|
| varsayılan (`vRO` 200, `kEgim` 700) | 35,1 / 40,9 / 43,6 | 17 / 18 / 20 | 76,9 / 76,0 / 74,8 |
| `vRO` 220 | 31,4 / 37,5 / 40,2 | 18 / 18 / 20 | 77,4 / 76,9 / 75,5 |
| `vRO` 240 | 28,3 / 33,8 / 35,7 | 18 / 18 / 19 | 78,5 / 77,3 / 76,0 |
| `kEgim` 500 | 37,4 / 43,0 / 44,3 | 18 / 17 / 16 | 77,8 / 74,8 / 74,6 |
| `kEgim` 900 | 33,6 / 40,5 / 40,8 | 17 / 18 / 19 | 76,7 / 75,7 / 75,3 |

**Gerekçe (bırakma):** (1) Resmi koşu %35,1 ile hedefin 0,1 puan üstünde, 1 000 maçta %33,7 ile içinde; aynı kurallarla
havuza göre %34-44 salınıyor, yani tek sayı build karışımına bağlı. (2) Hedefi her örneklemde tutturacak tek kaldıraç
`vRO` 200 → 240, ama `ringOutHizi` her Uç'un veri alanı ve 16 altın senaryonun hepsinde kullanılıyor: tüm sim hash'leri değişir,
`ring-out` senaryosu (dash 260 + 300 br/s) yeniden kurulmalı. Görev kuralı "sim hash'leri değişmemeli" olduğu için uygulamadım.
`kEgim` `ayar.ts`'te, aynı sorun. **Öneri (@ledger / sahip):** Uç tablosunda `ringOutHizi` 240 + `npm run altin:uret -- --yeniden`
ile senaryoları yeniden kayıt; bant ve süre etkisi yukarıdaki satırda (bant bozulmuyor, p90 +1,5 s).

## 3. Bot Ulti'si

**Sorun (D8, TEMIZLIK):** bot tur başına %25 olasılıkla Ulti'yi "hedefliyordu" ama Enerji 200'ün altındayken Yetenek'e harcıyordu;
300'e hiç biriktirmiyordu. Ulti/maç 0,00.

**Değişiklik (`src/paylasilan/bot/bot.ts`):** Ulti'ye adanma artık **takım üyesi başına maç boyu tek zar** (tur numarasından
bağımsız; üye yedeğe çekilip dönse de kararı aynı). Adanmış üye Ulti hazır olana dek hiçbir yuva harcamaz, stamina %25'in
(kritik eşik, tuning § 6) altına düşerse vazgeçip eldekini harcar. Adanmayan üye D3/D8'deki tur başına Yetenek / Özel hedefiyle oynar.
Olasılık bot kademesine göre (`BOT_YETENEK.ultiHedef`): **dolaş 0,35 · kenar 0,60 · dayanıklılık 0,60 · kukla 0**. Kolay = dolaş
varsayımı (varsaydım): oyunda ayrı bir zorluk ayarı yok; nile B-39'un kademe sırası (dolaş-çarp → kenara it → yetenek/dayanıklılık)
zorluk sırası sayıldı. `qa:bot` artık `ultiMacOrani` de yazar.

| Ölçüm | Önce | Sonra |
|---|---|---|
| Turnuva tohum 1: Yetenek / Özel / Ulti / Takım Ultisi (maç başı, iki oyuncu) | 3,18 / 0,37 / 0,00 / 0,84 | 2,21 / 0,37 / 0,07 / 0,85 |
| Turnuva: Ulti görülen maç (tohum 1 / 2 / 3) | %0 / 0 / 0 | **%6 / 5 / 6** |
| `qa:bot` 500: Yetenek / Özel / Ulti / Takım Ultisi | 2,87 / 0,24 / 0,00 / 0,39 | 2,26 / 0,28 / 0,01 / 0,42 |
| `qa:bot` 500: Ulti görülen maç | %0 | %1,4 |

**Tavan yapısal (ölçüldü):** her üye Ulti'ye adansa bile (olasılık 1) Ulti görülen maç tohum 1'de ve 2'de %8 (Yetenek/maç 1,63'e
iner). Neden Enerji ekonomisi: 300 maç ölçümünde (scratch `enerji.ts`, tüm üyeler adanmış, 1 800 üye) üye başına ulaşılan en yüksek
Enerji **medyan 120, p90 182**, 300'e ulaşan üye **%0,2** (≥ 200: %5,8); üye başına sahada kalma **medyan 16,7 s, p90 27,0 s**.
Kaba hesap (varsaydım: medyan Enerji / medyan saha süresi ≈ 7 puan/s): 300 için ≈ 43 s saha süresi gerekir, üyelerin %90'ı
27 s'den az kalıyor. 300'e ulaşıldığında bot Ulti'yi basıyor (300 iken yuva durumu ölçümünde ret yok). Bot tarafında erişimi
artıracak kaldıraç bulamadım. Enerji kazanımını kabaca ikiye katlayan bir deney (`pasifDolum` 4,5 + `carpismaKatsayi` 14, yalnız
deney yaması) bile Ulti görülen maçı %10'a çıkardı. Ayrıca ölçülen bedel: adanmış üye ucuz yuvaları harcamadığı için Yetenek/maç 3,18 → 2,21.

**Öneri (sim / tuning kararı, uygulanmadı):** Ulti'nin insan oyuncuda da nadir olacağı açık (aynı ekonomi). Seçenekler @ledger'a:
elenen topacın Enerjisinin bir kısmını sıradakine devretmek, ya da Enerji'yi takım üyesi yerine oyuncu başına tutmak; ikisi de
`src/paylasilan/sim` + altın yeniden üretim gerektirir.

## 4. Eşzamanlı bitiş ve maç süresi

| Ölçüm | Önce (D8) | Sonra | Hedef |
|---|---|---|---|
| Berabere (aynı adımda iki bitiş) payı, turnuva tohum 1 | 4,4 % | 6,0 % | ön sim %21 riskliydi (H4) |
| Berabere, turnuva tohum 1 / 2 / 3 | 4,4 / 4,2 / 4,4 % | 6,0 / 5,8 / 4,7 % | |
| Berabere, `qa:bot` 500 | 3,8 % (53 / 1 394) | 3,2 % (44 / 1 392) | |
| Tur süresi medyan / p90 / p99 (turnuva tohum 1) | 15,7 / 41,7 / 69,7 s | 15,4 / 42,0 / 69,6 s | 15-25 s ortalama |
| Maç süresi medyan / p90 / p99 / en çok (turnuva tohum 1) | 59,6 / 78,3 / 104,8 / 120 s | 59,4 / **76,9** / 90,0 / 110,3 s | p90 ≤ 90 (H5) |
| Maç süresi p90, tohum 2 / 3 | 75,7 / 75,3 s | 76,0 / 74,8 s | |
| `qa:bot` medyan / p90 / p99 / en çok | 52,8 / 76,6 / 93,4 / 120 s | 52,2 / **78,0** / 98,6 / 120 s | medyan 40-90, p99 ≤ 120 |
| `qa:bot` takılan maç | 0 | 0 | 0 |
| `qa:bot` maç bitiş nedeni | puan 459 · tükenme 16 · ani ölüm 13 · süre-puan 10 · süre-stamina 1 · süre-eşitlik 1 | puan 458 · tükenme 15 · ani ölüm 14 · süre-puan 12 · süre-stamina 1 | |

Eşzamanlı bitiş ön simdeki %21'in çok altında (%3-6); H4'ün "eşzamanlı tanımı yanlış" endişesi bot turnuvasında görülmüyor.
Turnuvada %4,4 → %6,0 artışı bot değişikliğinden (yalnız bot: %5,7); Ulti'ye adanan üyeler daha az yetenek harcayıp daha uzun
stamina yarışına giriyor (varsaydım: neden, ölçülmedi). p90 ≤ 90 s her ölçümde tutuyor.

## 5. Kalan sorunlar

1. **Kül Çekirdeği + Tutucu Uç** (+ Savrulan + Alçak Disk) %70-71 (n=352'de de); **Top Uç + Ağır Disk** parça düzeyinde en güçlü
   (Top Uç %59,6). İkisi de altın senaryolarda kullanılan parçalar; dokunmak sim hash'lerini değiştirir. Öneri: Top Uç
   `esneklik` 0,75 / `kCakilma` 0,85 ya da merkezci desen (`kMerkez`) üzerinden; Tutucu Uç Dengeli Uç ile eşitlenebilir (ivme 700
   → 650, `vSurus` 230 → 210). Altın yeniden üretimiyle bir sonraki denge turunda.
2. **Saldırgan arketip genel olarak zayıf** (sonra: Ok %46,6, Kor Göktaşı %45,7, Düz Uç %45,7, Hafif Disk %44,5, Düşürücü %43,4 parça düzeyi): bot tarafı (kenar kipi) ya da
   H3 (`40/kutle`, `tikTavan`). Bu turda yalnız iki Gövde düzeltildi.
3. **Resmi bant ölçümü gürültülü**: 200 maçta build başına SH ≈ 6,4 puan; "20/20" kapısı tek koşuda şansa bağlı. Öneri: kapıyı
   1 000 maç (`--maç=1000`) ya da üç tohumun ortalamasıyla ölçmek.
4. **Ring Out** %35,1 (resmi) / %34-44 (havuza göre): `vRO` 240 önerisi § 2, altın yeniden kaydı gerekiyor.
5. **Ulti nadir** (bot %6, insan için de aynı ekonomi): Enerji ekonomisi kararı § 3, sim değişikliği.
6. `test/veri.test.ts` tip dağılımı beklentisi güncellendi (727/595/396/202 → 716/629/373/202); tuning § 13 aralıkları da.

## 6. Altın senaryolar ve kapılar

- Bot kodu altın senaryoları etkilemez (kayıtlı girdi akışı; `--yeniden` verilmedi). Veri değişikliği yalnız **`tam-bot-yetenek`**
  hash'ini değiştirdi: B takımında `DON` = Sabır Taşı + **Ayaz Gövde** var. `07806ceed5448c4c` → `2d951bb26e7a3cfb` (girdi akışı
  aynı, `npm run altin:uret` yalnız hash'i yeniden yazdı; diğer 15 hash bit bit aynı, `.json` dosyaları değişmedi).
- `npm run test:tarayici`: Chromium 153 ve Node 22, 16 senaryonun hepsi **AYNI** ("Node ve Chromium bit bit aynı").
- `npm test` 24 dosya / 466 test yeşil · `npm run lint` · `npm run typecheck` · `npm run build` yeşil.

## 7. Commit'ler (devran-kod)

- `feat(bot): bots commit to Ulti per team member and save Enerji to 300, tiered by bot level` (bot + `qa:bot` Ulti oranı)
- `balance(parts): rein in Ayaz Govde, lift Sivri and Dusurucu Govde to pull build win rates into band` (veri + tuning SAPMA + test + altın hash)
- `docs(denge-1): measure Ring Out, simultaneous finishes and match length; DENGE-1 report` (bu rapor + tuning H1 notu)

Paralel oturumlardan beklenen/alınan: yok (görsel işler `gu-c` commit'leri rebase sırasında geldi; dokunulmadı).
