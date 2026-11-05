# Devran tuning: formüller ve her sabit (ilk sürüm, v1)

**Tarih:** 2026-11-04 · **Yazar:** [@ledger · Balance Designer] · **Durum:** ilk tuning; sayılar kararlıdır ama **ölçülmemiştir**, bot turnuvasıyla değişecek (§ 20). Eski Pokémon tuning'in yerine geçer (`ayar.ts` HP/stat tabloları çöpe gider).
**Dayanak:** `docs/design/beyblade/00..05`, `04-sozluk.md`, araştırma R04 § 3-4. Formül iskeleti `05-carpisma-hissi.md` § 2'den; **sapmalar** § 5'te "SAPMA" etiketiyle işaretli.
**Veri dosyaları (şemaları § 21):** `veri/parcalar.json`, `veri/basarimlar.json`, `veri/ruhlar.json`, `veri/yetenekler.json`.
**Kural:** kodda sihirli sayı yok; her sabit bu belgedeki `anahtar` ile `src/paylasilan/kurallar/ayar.ts`'e girer. Sim yalnız `+ - * /` ve `Math.sqrt/min/max/abs/floor` kullanır (05 § 2.8); bu belgede `pow` ve trig yoktur.

Birimler: uzunluk = birim (arena mantıksal piksel, 960x540 ekranda 1 birim = 1 px), hız = birim/s, ivme = birim/s², süre = s, stamina = "puan", kütle = g benzeri birim (boyutsuz), Enerji = puan (100 = 1 dilim).

---

## 1. Sabit adım ve genel

| Anahtar | Değer | Gerekçe |
|---|---|---|
| `dt` | 1/60 s | K-6 |
| `vMutlak` | 700 br/s | 05 § 2.2; r+r=60 iken adım başına 11,7 br, tünelleme yok |
| `sabitSurtunme` (Coulomb) | 20 br/s² | Çok yavaşta durdurur, titremeyi keser; 05 § 2.2 madde 4 |
| `yorgunlukCarpani` | 0,5 + 0,5 · stamina/maxStamina | 05 § 2.2; yorgun topaç yavaş ve ağır |
| `temasKilidi` | 0,10 s (6 adım) | Aynı çiftte çoklu vuruş yok; 05 § 2.3 |

## 2. Arena (daire çanak)

| Anahtar | Değer | Gerekçe |
|---|---|---|
| `topacYaricap` (`r`) | 30 br (hepsi aynı, hit kutusu sabit) | **BOŞLUK #1:** 05 `r=14` yazıyor, pixel planı Gövde 56-72 px diyor; 60 px çapla orta nokta |
| `arenaYaricap` (`R`) | 240 br | 540 px yükseklikte 480 px çap + kenar halkası sığar; R/r = 8 |
| `merkezKucukAlan` | d < 0,35 R = 84 br | Maden "Kök" pasifi için "merkez" tanımı |
| `kusakIc` / `kusakDis` | 0,60 R = 144 / 0,85 R = 204 | Hız şeridi; kenar eğimiyle (0,70 R'den) kısmen örtüşür: hız ödülü, geri çekim riski |
| `kusakHizCarpani` | 1,25 (Kuşak Ucu 1,40) | Sürüş tavanına çarpan; 260 -> 325 br/s, `vRO`'yu aşar: şeritte kenar ölümcül |
| `egimBaslangic` | 0,70 R = 168 br | 05 § 2.2 |
| `kEgim` | 700 br/s² (kenarda tam) | Kenarda ivme 238 br/s² (d=210); sürüş ivmesi 400-900 olduğundan kaçılabilir ama yavaşlatır |
| `eDuvar` | 0,5 | Duvar sekmesi; 05 § 2.5 |
| `kDuvar` | 0,08 stamina / (br/s) | 200 br/s çarpma = 16 stamina (~%4) |
| `duvarTik` | +0,15 tık birimi (vd > 120 br/s ise) | Duvara çarpmak kilide hafif yük |
| `ringOutHizi` (`vRO`) | **265 br/s** (hepsinde; Uç tablosunda ayrı alan, ileride Top Uç düşer). **SAPMA (DENGE-2):** önce 200 | 05 adayı 220; DENGE-2 ölçümüyle H1 bandına (%25-35) çekildi (§ 20 DENGE-2) |
| Ring Out koşulu | merkez d >= R - r **ve** dışa hız >= `vRO` **ve** d > `egimBaslangic` | 05 § 2.5 |
| `dogum` | (-130, 0) ve (+130, 0) | R'nin %54'ü; ilk temas ~1,2 s |

## 3. Hareket

Sıra 05 § 2.2. Uç başına sayılar `veri/parcalar.json` `uc` alanında:

| Uç | ivme | vSurus | sürtünme (1/s) | sekme `e` | `kCakilma` | dash stamina | Sıkı Dönüş erime çarpanı | desen |
|---|---|---|---|---|---|---|---|---|
| Düz | 900 | 260 | 0,9 | 0,60 | 1,00 | 12 | 0,70 | çiçek |
| Dengeli | 650 | 210 | 1,0 | 0,60 | 1,00 | 13 | 0,50 | dengeli |
| Kuşak | 800 | 240 | 1,0 | 0,60 | 1,00 | 13 | 0,50 | kuşak |
| Tutucu (Karanlık) | 650 (**SAPMA DENGE-2**, önce 700) | 215 (önce 230) | 1,0 | 0,60 | 1,00 | 13 | 0,50 | dengeli |
| Top | 700 | 220 | 0,5 | 0,75 | 0,85 | 14 | 0,50 | merkezci |
| İğne | 400 | 160 | 3,0 | 0,40 | 1,40 | 18 | 0,80 | çakılı |

Desen ivmeleri (oyuncu girdisinin üstüne toplanır):

| Desen | Formül | Sabitler |
|---|---|---|
| çiçek | `a = Ad · (cos φ, sin φ)`, `φ = ωd · t + faz` | `Ad`=250 br/s², `ωd`=2,0 rad/s; faz maç başında tohumla (sim RNG), trig yazılı tablodan (05 § 2.8) |
| merkezci | `a = -kMerkez · p` | `kMerkez`=2,0 1/s² (150 br'de 300 br/s²) |
| dengeli / kuşak | çiçek (`Ad`=100, `ωd`=1,5) + merkezci (`kMerkez`=0,8) | |
| çakılı | yok | |

Element eğilim bonusları ve köken pasifleri bu tabloların **üstüne çarpan** olarak biner (§ 11-12).

## 4. Dash, Sekme, Sıkı Dönüş

| Anahtar | Değer | Gerekçe |
|---|---|---|
| `dashHiziEki` | +300 br/s anlık (yöne eklenir) | 05 adayı 400 anlık; vMutlak 700'ü aşmamak için 300 |
| `dashPenceresi` | 0,25 s; içinde vuran taraf `f x kDash` | 05 § 2.7 |
| `kDash` | 1,30 | |
| `dashBekleme` | 4,0 s (Şimşek x0,8) | Eski 10 s canavar dövüşü içindi; topaçta sık dash |
| `dashDokunulmazlik` | **yok** | 05 § 8 soru 1: hayalet hissi; risk dash'in kendisinde (**karar**) |
| `dashStamina` | Uç tablosunda (12-18) | |
| `sekmeSure` | 0,30 s havada, çarpışma geçirmez | 01 § 1.1 |
| `sekmeBekleme` | 2,5 s | |
| `sekmeStamina` | 8 | |
| `sikiDonus` | hareket 0, `erime` x Uç çarpanı, Enerji pasif dolumu durur, itilmeye açık (`kb` x1,0) | 01 § 1.1 |

## 5. Çarpışma formülleri

Sıra ve notasyon 05 § 2.3-2.4: `n` normal, `vn` yaklaşma hızı, `m_i = kutle_i · kCakilma_i`, `mu = m1·m2/(m1+m2)`, `Ş = mu · vn`.

| Anahtar | Formül / değer |
|---|---|
| Darbe | `J = (1 + e) · Ş`, `e` = iki Uç `esneklik` ortalaması |
| Hız değişimi | `v1 -= (J/m1)·n·kb1`, `v2 += (J/m2)·n·kb2` |
| `kb_i` | `1 + kKb · (1 - stamina_i/maxStamina)²`, **`kKb` = 1,2** |
| Yön çarpanı `f` | ön 1,0 · yan `fYan`=0,6 · arka/hızsız `fArka`=0,3 (dash penceresinde x `kDash`) |
| Ön açı | `alfaOn = 30° + 10°·kanat` (en çok 80°), cos² ile karşılaştır; kanat bonusu ön çarpanı `1,5 - 0,1·kanat`. **Sim'de test edilmedi** (sabit 36,9° kullanıldı); ilk turnuvada aç/kapa |
| Stamina hasarı (SAPMA) | `H_i = Ş · kH · ( sqrt( s_j·f_j / sv_i ) + kGeriOran · geriGimmick_i · s_i·f_i )` |
| `s`, `sv` | `saldiri/50`, `savunma/50` (50 = referans 1,0) |
| `kH` | **0,006** |
| `kGeriOran` | 0,25 (geri tepme = alınan hasarın çeyreği ölçeğinde); Düşürücü Gövde `geriGimmick` 1,3 |
| Tek vuruş tavanı | `H_i <= 0,30 · maxStamina_i` |
| Temas eşikleri (his) | hafif 80-260, ağır 260-420, kritik >= 420 br/s `vn` (05 § 3.1; **sim'e etkisi yok**) |
| Zıt yön eşitleme | zıt dönen çiftte temas başına: yüksek stamina oranlı taraftan düşüğe `kEsit = 0,06 · (oranFarkı) · maxStamina` aktarılır (en çok 20); aynı yönde yok |

**SAPMA #1 (neden `sqrt`):** 05'in `kH · s_j/sv_i` oranı saldırı/savunma 0,29..4,4 aralığında 15 kat salınıyor; ilk denemede (oran formülü, `kH`=0,004, `kTik`=1/4000, tavansız; n=40) Saldırgan-Saldırgan turu 1,1 s sürdü, Saldırgan-Kale 91 %. `sqrt` oranı 0,54..2,1'e sıkıştırır, üstelik `pow` yerine `sqrt` kullanılabildiği için determinizm kuralıyla uyumlu.

## 6. Stamina

| Anahtar | Değer | Gerekçe |
|---|---|---|
| `staminaTaban` | 300 | Havuz = 300 + parça katkıları; pratik aralık 355-460 (§ 13, DENGE-2) |
| Erime/s | `erime_toplam · (sikiDonus ? uç çarpanı : 1) + kHiz · |v|²/vRef²` | 05 § 2.5 |
| `kHiz` | 2,0 stamina/s (hız vRef'te) | Hareket pahalı ama ana neden değil |
| `vRef` | 260 br/s | |
| `erime_toplam` | Uç + Gövde + Disk + Çekirdek katkıları (2,5-7,2 stamina/s) | |
| Hedef | tur ortalaması 15-25 s; erime tek başına 55-170 s | Çarpışma + dash gerisini yer |
| Kritik eşik | %25 | HUD kırmızı nabız, yalpa belirginleşir, Tab "geri çek" açılır, Kriz Alevi eşiği (%30) yakın |
| Yalpa başlangıcı | %40 (salt görsel) | 05 § 2.6 |
| Puan sonrası iyileşme (kazanan) | +%20 `maxStamina` | 01 § 2.3; karar |
| Geri çekilen topaç | stamina ve tık korunur, iyileşme yok | Yedeğe çekmek bedava can değil |
| Geri çekme | stamina < %25, 2,0 s savunmasız (`kb` x1,5), sonra swap | 01 § 2.3 |

## 7. Tık ve Parçalanma

| Anahtar | Değer / formül |
|---|---|
| `burstEsik` aralığı | **6-10** (Disk 6-9 + Uç şaft 0-1) |
| Darbe -> tık | `dTik_i = min(tikTavan, kTik · Ş · s_j·f_j · tikCarpani_j · 40/kutle_i)` |
| `kTik` | 1/5000 (bir "referans darbe" Ş=5000: mu 20 · vn 250) |
| `tikTavan` | 1,2 birim / vuruş (en az `burstEsik/1,2` = 5-9 vuruş) |
| Kütle böleni | `40/kutle_i` (ağır topaç zor parçalanır; R04 § 4.1 "burst hasarı ÷ kütle") |
| Parçalanma | `tik_i >= burstEsik_i` |
| Duvar | +0,15 (§ 2) |
| Geri dönüş | **yok** (`tikGeriDonus` = 0); tur/swap'ta yeni topaç tık 0 |
| Sivri Gövde | `tikCarpani` 1,20 |

Bulgu: kütle böleni ve `tikTavan` olmadan Kale `burstEsik`=10 olsa da 70/80 turda parçalandı (n=80); bölen + tavan eklendi (§ 20).

## 8. Enerji

| Anahtar | Değer | Gerekçe |
|---|---|---|
| `dilim` | 100 puan | |
| `metreDilim` | 2 (ilk sürüm), 3 (sezon 2, Ulti) | **BOŞLUK #7:** Ulti ilk sürümde kapalı (K-7) |
| `pasifDolum` | 1,5 puan/s | Metre hiç durmasın |
| Çarpışma (vuran ve vurulan ayrı) | `clamp(8 · Ş/4000, 3, 12)` puan | Hafif ~3, ağır ~7, kritik 12 |
| Hasar alma | `50 · H_alinan/maxStamina` puan | %10 stamina kaybı = 5 puan; geri dönüş dengesi |
| Risk: kuşakta | 2,0 puan/s | |
| Risk: kenar (d > 0,85 R) | 1,5 puan/s (kuşakla çakışırsa büyüğü) | |
| Risk: yakın geçiş | 3 puan (iki tarafa), bekleme 2 s | boşluk < 20 br ve bağıl hız > 150 br/s, temas yok |
| Zıt element çarpışması | çarpışma kazanımı x1,25 | 00 § 3.3 |
| Uyum (swap) | komşu elementten devralan: yeni topaç +40 puan ile başlar | 00 § 3.3 |
| **Miras** (`enerjiElenenDevir`, `enerjiGeriCekDevir`) | **1,0 / 1,0**: sahadan çıkan topacın (elenen ya da geri çekilen) Enerjisi sahaya girene geçer (aşağı yuvarlanır, + komşu devri, tavan 300); çıkanın kaydı sıfırlanır. Oyuncunun tek Enerji çubuğu var | **SAPMA (DENGE-2):** önce üye başına Enerji (devir 0 / 0): üye sahada medyan 17 s kalıyor, 300'e ulaşan üye %0,2, Ulti görülen maç %3-6. Kazanım katsayıları (`pasifDolum` 2,5, `carpismaKatsayi` 10-12) tek başına Ulti'yi %5'ten oynatmadı; Miras %4 → %44 (§ 20 DENGE-2) |
| Uyum cezası | Gövde elementi Çekirdeğinkine aynı/komşu değilse Enerji dolumu x0,80 | 00 § 2.3 |
| Takım Enerjisi | 4. dilim 100 puan; her topaç kazancının %25'i; **sezon 2** | |
| Tavan | taşan puan kaybolur | 01 § 4.1 |
| Hedef tempo | ~1 dilim / 15-20 s | ilk Yetenek ilk turda, Özel Yetenek ikinci turda |

## 9. Yetenek kademeleri

Tüm yetenekler `veri/yetenekler.json`; kademe kuralları:

| Kademe | Bedel | Telegraf | Süre | Bekleme | Not |
|---|---|---|---|---|---|
| 1 Yetenek | 1 dilim (100) | 0,20-0,30 s | 0,45-1,50 s | 6 s | Lv.2'den |
| 2 Özel Yetenek | 2 dilim (200) | 0,45-0,80 s | 0,5-4,0 s | 10-12 s | Lv.3'ten |
| 3 Ulti | 3 dilim | 0,90 s | 3-4 s | maç başına 1 | Lv.4, **sezon 2** |
| 4 Takım Ultisi | paylaşılan 4. dilim | 1,00 s | 3,5 s | maç başına 1 | **sezon 2** |

- Telegraf süreleri `@relay` onayına bağlı (en az 2 x RTT, hedef >= 0,45 s Özel'de); Yetenek 0,20 s RTT < 100 ms için.
- Yetenek kullanımı: ilk dilimde hareket kilidi yok; Özel'de `bedel.kilitSn` ve `kendiHizCarpani` yazılı (savunmasız an = risk/ödül).
- Hasar: `hasarKatsayisi` = temas anında `f` çarpanı (dash gibi); alan yetenekleri `alanHasarYuzdeSn` = rakibin `maxStamina` yüzdesi/s, Ulti'de 3-4.
- Etki parametre sözlüğü § 21.

## 10. Maç kuralları

| Anahtar | Değer |
|---|---|
| `kazanmaPuani` | 3 (ilk 3) |
| Puanlar | Durma 1, Ring Out 2, Parçalanma 2 (Kuyu yok, K-5) |
| `macSuresi` | 90 s tüm maç; puan aralarında saat durmaz |
| Takım | 3 topaç, 3 farklı Çekirdek zorunlu |
| Hazırlık | takım seçimi 20 s, geri sayım 3 s |
| Bitiş sonrası | 1,2 s kutlama, kaybeden swap, yeni topaç doğum noktasında 1,0 s **giriş koruması** (çarpışmaz, hasar almaz) |
| Kazanan | +%20 stamina (§ 6), yerinden devam |
| Zaman dolunca | puan fazla olan kazanır (**karar**); eşitse ani ölüm |
| Ani ölüm | `R` 20 s içinde doğrusal 1,0 -> 0,60; `erime` x(1 + 0,05·t); ilk bitiş maçı bitirir (WebBeyblade 22 s dersi); 30 s'de hâlâ bitmediyse toplam stamina oranı yüksek olan kazanır |
| Eşzamanlı bitiş | aynı adımda ikisi de biterse puan yok, iki topaç da elenir |
| Self-düşüş | rakibe puan (Ring Out 2) |
| Öncelik | Parçalanma > Ring Out > Durma (aynı adımda tek topaçta) |
| Terk | terk eden maçı kaybeder; 30 s yeniden bağlanma penceresi (R06 § 5c-6) |

## 11. Köken pasifleri

| Köken | Pasif | Sayılar | Bedel |
|---|---|---|---|
| Göktaşı | Kriz Alevi | stamina < %30: Enerji dolumu x1,5, Yetenek/Özel telegrafı x0,85. **Kor Kalbi:** dolum x1,75, telegraf x0,80 | Sahaya girişin ilk 12 s Enerji dolumu x0,8 (00'daki "ilk 20 s" maç başı yerine **giriş başına 12 s**; Kor Kalbi'nde yok). **BOŞLUK #11** |
| Maden | Kök | d < 0,35 R ve hız < 40 br/s ise `erime` x0,8 | ivme x0,90 |
| Yapay | Uyum | element uyum cezası yok; her topaçta ilk yetenek -100 Enerji (alt sınır 50) | `erime` x1,10; yetenek tavanı kademe 2; her maçta ömür -%3,4 (30 maç); Çekirdek XP x1,5; yön maç öncesi seçilir (çift) |
| Karanlık | Emiş | temasta rakipten çalınan stamina = verilen hasarın %20'si (en çok 12/temas); **zıt yönde %30** (en çok 15; **SAPMA DENGE-2**, önce %40 / 20: Kül Çekirdeği tek `sol` Çekirdek, hemen her eşleşme zıt yön) | `erime` x1,35; Kara yetenek Kararma +25; sayaç 100'de Çekirdek sonraki maç söner; maçta Kara yetenek kullanılmazsa -10 sayaç |

Kararma: sayaç 0-100; Tutucu Uç bedeli x0,5; Aydınlanma = Karanlık modunda 10 maç sayaç 100'e değmeden bitirmek (başarım `aydinlanma`).

## 12. Element eğilim bonusları (hareket karakteri)

Çarpanlar Çekirdeğin elementine göre **her zaman** biner; tipe ek güç vermez (tipin yerine geçmez, 00 § 3.2):

| Element | Bonus | Not |
|---|---|---|
| Kor | ivme x1,08; `kusakHizCarpani` +0,10 | Saldırgan eğilim |
| Kasırga | sürtünme x0,90; dash eki x1,05 | Denge |
| Şimşek | dash bekleme x0,80; ivme x1,04 | Saldırgan |
| Girdap | `erime` x0,92 | Dayanıklı |
| Kaya | etkin kütle x1,06; `kb` alınan x0,92; ivme x0,92 | Kale |
| Don | sürtünme x0,80; `erime` x0,96; ivme x0,95 | Dayanıklı |

Uyum: Gövde `element` ile Çekirdek `element` **aynı** -> Enerji dolumu x1,10; **komşu** (çark: Kor-Kasırga-Şimşek-Girdap-Kaya-Don) -> x1,00; diğer -> x0,80 (§ 8). Karşıt (+3) çarpışma bonusu § 8.

## 13. Parçalardan 8 parametre

Bir topacın değeri parçaların `katki` toplamıdır; `staminaHavuzu` hariç hepsi toplam, havuz `staminaTaban`'a eklenir:

| Parametre | Toplam | Gerçek aralık (1 920 geçerli kombinasyon, ölçüm) |
|---|---|---|
| `kutle` | Σ katkı | 29-48 (ort. 36,1; DENGE-2 öncesi 27-48, 35,6; DENGE-1 öncesi 26-48, 34,5) |
| `saldiri` | Σ katkı | 22-80 (ort. 50,4) |
| `savunma` | Σ katkı | 24-76 (ort. 42,8; DENGE-2 öncesi 16-76, 41,6) |
| `staminaHavuzu` | 300 + Σ | 355-460 (ort. 408,6; DENGE-2 öncesi 345-490, 408,0; DENGE-1 öncesi 330-500, 408,6) |
| `erime` | Σ (Uç ana) | 4,1-7,4 (ort. 5,4; DENGE-2 öncesi 2,5-7,2, 5,2) stamina/s |
| `desen` | Uç | enum |
| `burstEsik` | Σ (Disk + Uç) | 6-10 (ort. 8,1) |
| `yon` | Çekirdek | sag / sol / cift |

### Tip sınıflaması (yalnız etiket; mekanik tipe bakmaz)
`sSaldirgan = saldiri/50`, `sKale = (savunma/50 + kutle/40)/2`, `sDayanikli = (havuz/430) · sqrt(5,5/erime)`; en yüksek skor tip, ilk ikisi arasındaki fark %12'den azsa **Denge**. 1 920 kombinasyonda (DENGE-2 sonrası): Saldırgan 761 (40 %), Denge 653 (34 %), Dayanıklı 268 (14 %), Kale 238 (12 %) (DENGE-1 sonrası 716 / 629 / 373 / 202; önce 727 / 595 / 396 / 202; Dayanıklı daraldı çünkü Top Uç `erime` 3,0 → 4,6): Kale dar, çünkü ağır ve savunmalı parça az; sezon 2 parçasıyla genişlet.

### Denge üçgeni: tablo (ilk sim, n=150 tur/hücre, § 20; sayılar DENGE-2 sonrası parça katkılarıyla)
| Build (tipe göre) | kutle | saldırı | savunma | havuz | erime | burst |
|---|---|---|---|---|---|---|
| **S** Saldırgan: Kor Göktaşı + Ok + Hafif Disk + Düz Uç | 29 | 68 | 28 | 420 | 5,0 | 7 |
| **K** Kale: Kaya Maden + Kalkan + Ağır Disk + İğne | 48 | 22 | 76 | 390 | 5,2 | 10 |
| **D** Dayanıklı: Girdap Maden + Halka + Parlak Disk + Top | 34 | 36 | 40 | 450 | 4,6 | 7 |
| **B** Denge: Kasırga Döküm + Savrulan + Denge Disk + Dengeli | 34 | 44 | 47 | 405 | 6,0 | 8 |

Tasarım dayanağı: **S > D** (D'nin kilidi 7 ve kütle 34: ağır vuruşta kırılır), **D > K** (K'nın `erime`si 5,2 > D'nin 3,0: stamina yarışı; K'nın burst/kütlesi onu parçalanmadan korur ama sürede kaybeder), **K > S** (K savunma 76, S'nin geri tepmesi S'yi yer). Sim sonucu § 20: üçgenin K>S ve D>K ayakları göründü, S>D ayağı yok (43/57); B fazla iyi çıktı.

## 14. Çekirdek seviyeleri (tecrübe)

| Seviye | Kümülatif XP | Açılan | Yaklaşık maç (kazanma ort. 40 XP) |
|---|---|---|---|
| Lv.1 | 0 | kimlik | satın alınca |
| Lv.2 | 150 | pasif + Yetenek | ~4 |
| Lv.3 | 700 | Özel Yetenek, ruh silueti | ~17 |
| Lv.4 | 2 200 | Ulti, tam ruh (**sezon 2**; ilk sürümde Lv.3 tavan) | ~55 |

Başlangıç Çekirdeği Lv.2 (150 XP) ile gelir. Çekirdek ilk sürümde Lv.3'te tavan.

| XP kaynağı | XP |
|---|---|
| Galibiyet / mağlubiyet / terk | 40 / 25 / 0 |
| Krizden galibiyet (maç içinde stamina < %25 görüp kazanmak) | +30 (Kriz İlerlemesi) |
| Temiz galibiyet (kalan toplam stamina >= %50) | +20 |
| Çarpanlar | Yapay x1,5; oda maçı x0,5 |

## 15. Altın gelirleri

| Anahtar | Değer | Gerekçe |
|---|---|---|
| `galibiyetAltin` | 100 | Fiyat katmanları "1 maç = 100" birimi |
| `maglubiyetAltin` | 60 | Katılım ödülü; kaybetmek de ilerletir |
| `terkAltin` | 0 | 03 |
| `ilkGalibiyetGunluk` | +150 | Günün ilk galibiyeti; gün sıfırlama 04:00 |
| Stil bonusu | +10 Yetenekle bitiş, +5 her farklı bitiş türü (en çok +15), +25 Takım Ultisi | 03 US-3.4; maç başına en çok +40 |
| Azalan getiri | günlük 1-15. maç x1,0; 16-30. x0,5; 31+. x0,2 | 03: 15'ten sonra yarı; 30'dan sonra bot caydırma |
| Oda maçı | Altın x0,25, XP x0,5 | İki hesapla çiftlik caydırma (03 US-4.2) |
| Minimum süre | maç < 20 s ise Altın 0 | Anlaşmalı hızlı bitiş caydırma |
| Gelir tahmini | 8 maç/gün ≈ 870 Altın; 15 maç/gün ≈ 1 500 Altın | hesap (kazanma %50, stil ort. +10, ilk galibiyet +150), ölçüm değil |
| Başarım ödülü | Kolay 100 · Orta 300 · Zor 800 · Efsane 1 500 | 46 başarım toplam 22 100 Altın |

## 16. Market katmanları ve fiyatlar

| Katman | Fiyat (Altın) | Maç karşılığı | Kullanım |
|---|---|---|---|
| Başlangıç | 100 | 1 | 3 başlangıç setinin 12 parçası; seçilmeyen iki set rafta |
| Standart | 500 | 5 | Halka Gövde, Top Uç |
| Nadir | 2 000 | 20 | Girdap Maden, Ayaz Gövde, Alçak Disk, Parlak Disk, Şimşek Göktaşı |
| Hizip | 4 000 | 40 | Düşürücü, Sivri, İz Gövde, Kuşak Ucu, Sabır Taşı, Kor Kalbi |
| Karanlık | 6 000 | 60 | Kül Çekirdeği, Tutucu Uç |

Katalog toplamı 46 700 Altın (27 parça); başarımlarla gelen 22 100 ile birlikte tamamlama tahmini 8 maç/gün'de ~28 gün (başarım Altını dahil) / ~55 gün (başarımsız); hesap, ölçüm değil. Kural: **pahalı = farklı, daha güçlü değil**; parçalar ilişkisel olarak aynı bütçede (hedef, ölçülecek).
Günün parçası: Açık raftan 1 parça %30 indirim. Ligin Parçası (sezon 2): başarım eşiği x0,5. Kilitli parça satın alınabilir yalnız başarım açıldıktan sonra.

## 17. Eritme ve Yapay Çekirdek

| Anahtar | Değer |
|---|---|
| Eritme girdisi | 3 sahip olunan parça (aynı tür); Karanlık ve Hizip katmanı parçalar eritilemez |
| Çıktı A | sahip olunmayan, Açık raftan, aynı türden **1 rastgele parça; katman <= girdilerin en düşüğü** (sunucu tohumlu) |
| Çıktı B | Altın: girdi fiyatları toplamının %30'u |
| Not | Çıktı kuralı olmadan 3 Başlangıç (300) -> Standart (500) ticari kazanç; katman bağı bunu keser. **BOŞLUK #14** |
| `yapayOmur` | 30 maç (her maçta %3,4); 0'da Çekirdek devre dışı |
| Yenileme | Dökümhane, fiyatın %40'ı (Kasırga Döküm: 200 Altın); `asinmis` başarımı ile %50 indirim |

## 18. Anti-snowball (3'lü takım)

| Kaldıraç | Durum |
|---|---|
| Swap'ta yeni topaç tam stamina, tık 0 | **açık** (loser'a tazelik) |
| Kazanana +%20 stamina | **açık** (çok küçük; snowball'u pekiştirmesin diye tavan %20) |
| Hasar alma Enerji'ye dönüşür | **açık** (geri dönüş) |
| Geri çekilene iyileşme | **kapalı** |
| Ani ölüm | yalnız eşitlikte |

Karar sahibe ait değil, deneyle: kazanan iyileşmesi %0 / %20 / %40 turnuvada üçü de denenecek (H5).

## 19. Elo (Dereceli)

| Anahtar | Değer |
|---|---|
| Başlangıç | 1 000 |
| K | ilk 10 maç 40; 11-50. maç 24; sonrası 16 |
| Beklenen skor | `1/(1+10^((Rb-Ra)/400))` (yalnız sunucu, sim dışı) |
| Skor çarpanı | 3-0: x1,15 · 3-1: x1,10 · 3-2: x1,05 (zaman/ani ölüm kazanımı x1,0) |
| Terk | terk eden kaybeder, tam K |
| Eşleştirme | ±100 Elo, her 10 s +50 genişler, en çok ±400 |
| Sezon sıfırlama | `yeni = 1000 + 0,5·(eski - 1000)` |
| Oda maçı / hızlı maç | Elo değişmez |
Elo sunucudan hesaplanır, istemciden gelmez.

## 20. Ön tarama bulguları (simülasyon, tek tur, basit bot)

**Yöntem:** Python 3 ön tarama, 60 Hz, 05 § 2'nin kod karşılığı (kendi yazım; `src/paylasilan/sim` henüz yok), 4 build x 4 build, tek tur 1v1 (maç değil), hücre başına n=150 tur (yarısında taraflar yer değiştirir), 2026-11-04. Botlar kaba kurallı: Saldırgan merkez tarafından yaklaşıp dash atar, Kale/Dayanıklı merkezde Sıkı Dönüş yapar. **Bu bir kabul testi değil; bot turnuvası (`test/denge/botTurnuvasi.ts`) bunu ezer.**

| İlk \ ikinci (ilkin kazanma %) | S | K | D | B |
|---|---|---|---|---|
| S | 54 | 9 | 43 | 9 |
| K | 91 | 50 | 0 | 43 |
| D | 64 | 100 | 50 | 83 |
| B | 96 | 53 | 18 | 55 |

- Ort. tur süresi 5-35 s (S-S 5,8 s; K-D 32 s). Bitiş dağılımı (360 tur): Durma ~51 %, Parçalanma ~28 %, eşzamanlı ~21 %, **Ring Out ~1 %**.
- Sonuçlar: (a) K>S ve D>K göründü, S>D yok; (b) B, S'yi ve K'yı ezdi (96/53) ama D'ye kaybetti; (c) Ring Out botların kenardan kaçınması yüzünden ölçülemedi (`vRO` 200 -> 100 indirilince bile %3); (d) `sqrt` formülüyle `kH`=0,003'te stamina hasarı erimeye göre çok zayıftı (Saldırgan 16 s'de erimeden öldü), bu yüzden `kH`=0,006 seçildi. Hiçbiri "düzeldi" değildir, yalnız çalışır başlangıç noktasıdır.

### Bot turnuvasında ilk test edilecek 5 hipotez
| # | Hipotez | Test |
|---|---|---|
| H1 | Ring Out ölçülemedi; gerçek oyuncu kenarı kullanır. `vRO`=200 ve `kEgim`=700 ile Ring Out payı %25-35 olmalı | Kenarı hedefleyen bot ekle; `vRO` 140/170/200, `kEgim` 400/700 |
| H2 | Denge (B) S ve K'yı >%90 yeniyor: parça bütçesi eşit değil, ya da B'nin bot davranışı avantajlı | 20 rastgele build, 200 maç, kazanma bandı %35-65 |
| H3 | `40/kutle` bölen Saldırgan'ı (kutle 27) aşırı kırılgan yapıyor (S-B %9) | Böleni kapat / `tikTavan` 1,2 -> 0,9 / S `burstEsik` 8 |
| H4 | Durma ~%51 + eşzamanlı ~%21 çok; `kH`=0,006 ile erime/hasar oranı ve eşzamanlı bitiş tanımı yanlış | Eşzamanlı sayısı, `kH` 0,005-0,009 |
| H5 | Kazanan +%20 stamina iyileşmesi snowball yapıyor; K-D 32 s turları 90 s maçı aşırır (ani ölüm sıkışması) | İyileşme %0/%20/%40; tam maç süre dağılımı p90 <= 90 s |

### DENGE-1 (2026-11-05): parça katkısı sapmaları (ölçüm: `docs/production/raporlar/DENGE-1.md`)
Bot turnuvası (`npm run denge:turnuva`, TS sim + paylaşılan bot) D8'de kazanım bandını tutturamadı: Sabır Taşı + Ayaz Gövde %75, Sabır Taşı + Sivri Gövde %29 (tohum 1). Parça düzeyinde ölçüm (80 build, 2 000 maç): Ayaz Gövde %63,7 (en yüksek), Sivri %40,4 ve Düşürücü %42,0 (en düşük). Ayaz, Halka'dan her alanda iyiydi (havuz 110 > 100, savunma 42 > 40, kütle 19 > 18); Sivri, Ok Gövde'den gimmick dışında her alanda kötüydü. Kural "pahalı = farklı, daha güçlü değil" (§ 16).

| Parça | Alan | Önce | Sonra | |
|---|---|---|---|---|
| Ayaz Gövde | `staminaHavuzu` / `savunma` / `erime` | 110 / 42 / 0,1 | 70 / 36 / 0,2 | **SAPMA** |
| Sivri Gövde | `kutle` / `savunma` / `staminaHavuzu` | 13 / 20 / 20 | 18 / 26 / 40 | **SAPMA** (tıkçarpanı 1,2 korunur; 40/kütle böleni H3 hafiflir) |
| Düşürücü Gövde | `kutle` / `staminaHavuzu` | 13 / 10 | 17 / 25 | **SAPMA** |

Sonuç (tohum 1, 200 maç): Sabır+Ayaz %75 → %44, Sabır+Sivri %29 → %38; parça düzeyi Ayaz %63,7 → %56,6, Sivri %40,4 → %46,8, Düşürücü %42,0 → %43,4. Kalan sapma kaynağı Top Uç (+ Ağır Disk) birleşimi (%60 parça düzeyi); altın senaryolarda kullanıldığı için bu turda dokunulmadı (DENGE-1 § kalan sorunlar). `vRO` / `kEgim` değişmedi (H1 ölçümü raporda).

**H1 (Ring Out payı) DENGE-1 ölçümü, değer değiştirilmedi:** tohum 1/2/3 (200 maç) Ring Out %35,1 / %40,9 / %43,6; tohum 1 1 000 maç %33,7; `qa:bot` 500 maç %37,7. Duyarlılık (aynı üç tohum): `vRO` 220 → %31,4 / 37,5 / 40,2; `vRO` 240 → %28,3 / 33,8 / 35,7 (bant 18/18/19, süre p90 değişmez); `kEgim` 500 → %37,4 / 43,0 / 44,3 (artar); `kEgim` 900 → %33,6 / 40,5 / 40,8. Hedefe en yakın tek kaldıraç `vRO` 200 → 240; ama `ringOutHizi` her Uç'ta veri alanı ve tüm altın senaryolarda kullanılır (sim hash'lerinin hepsi değişir, `ring-out` senaryosu yeniden kurulmalı), `kEgim` de `ayar.ts`'te tüm sim'e girer. Pay build havuzuna çok bağlı (aynı kurallarla %34-44); bu yüzden bu turda bırakıldı, karar sahibe/@ledger'a: önerilen `vRO` 240 (Uç tablosu, altın yeniden üretimiyle).

### DENGE-2 (2026-11-05): Enerji Mirası, Ring Out hızı, parça katkıları (ölçüm: `docs/production/raporlar/DENGE-2.md`)
Sahibin "devam et"iyle sim ve veri değişti; altın senaryolar `npm run altin:uret -- --yeniden` ile yeniden kaydedildi (§ 21'deki sim alanları ve şema aynı; Node = Chromium). Ölçüm yöntemi: `test/denge/turnuva.ts` (20 rastgele build, tohum 1/2/3), `qa:bot` (500 maç, Lv.3) ve parça düzeyi (80 build, 2 000 maç).

| # | Değişiklik | Önce | Sonra | Neden | |
|---|---|---|---|---|---|
| 1 | Enerji Mirası (`mac.enerjiElenenDevir` / `enerjiGeriCekDevir`, `src/paylasilan/sim/mac.ts`) | 0 / 0 (üye başına Enerji) | 1,0 / 1,0 (çıkanın Enerjisi girene) | Ulti görülen maç %3-6: üye sahada medyan 17 s, 300 için ~43 s gerekiyordu (DENGE-1 § 3) | **SAPMA** |
| 2 | Bot `ultiYakin` (davranış, tuning değil) | yok | 250: Enerji ≥ 250 iken adanmamış üye de biriktirir | Mirasla gelen Enerjiyi bot Yetenek'e harcıyordu | |
| 3 | `ringOutHizi` (6 Uç + `ayar.ts` varsayılanı) | 200 | 265 | H1: Ring Out %39 (3 tohum, 500 maç) | **SAPMA** |
| 4 | Karanlık emiş, zıt yön (`KOKEN_PASIF.karanlik`) | %40 / en çok 20 | %30 / en çok 15 | Kül + Savrulan + Alçak + Tutucu %71 (n=352); Kül tek `sol` Çekirdek. Kül'ün yönünü `sag` yapmak deneyde onu bandın içine aldı: kaynak zıt yön | **SAPMA** |
| 5 | Top Uç `erime` | 3,0 | 4,6 | parça düzeyi en güçlü (%59,6); 3,6 ve 4,0 yetmedi (ölçüldü) | **SAPMA** |
| 6 | Halka Gövde `staminaHavuzu` / `savunma` | 100 / 40 | 70 / 37 | %57,4 | **SAPMA** |
| 7 | Ayaz Gövde `staminaHavuzu` | 70 | 62 | %56,6 | **SAPMA** |
| 8 | Ağır Disk `staminaHavuzu` | 30 | 20 | Ağır + Top ikilisi %69,7 (#1 + `vRO` 250 ara ölçümü) | **SAPMA** |
| 9 | Kül Çekirdeği `saldiri` / `staminaHavuzu` / `erime` | 6 / 10 / 0,3 | 3 / 0 / 0,5 | #4 ile birlikte (#4 tek başına yetmedi) | **SAPMA** |
| 10 | Tutucu Uç `ivme` / `vSurus` | 700 / 230 | 650 / 215 | DENGE-1 önerisi: Dengeli Uç'a yakınlaştır | **SAPMA** |
| 11 | Düşürücü Gövde `savunma` / `staminaHavuzu` | 16 / 25 | 24 / 50 | en zayıf parça (%43,4), Saldırgan arketip | **SAPMA** |
| 12 | Ok Gövde `staminaHavuzu` | 45 | 55 | Saldırgan arketip (%46,6) | **SAPMA** |
| 13 | Sivri Gövde `savunma` | 26 | 30 | Saldırgan arketip | **SAPMA** |
| 14 | Hafif Disk `kutle` / `staminaHavuzu` | 8 / 10 | 10 / 25 | %44,5; Ring Out'ta en çok kaybeden Disk (tohum 3'te kayıplarının %71'i) | **SAPMA** |
| 15 | Kor Göktaşı `saldiri` / `staminaHavuzu` | 4 / 30 | 6 / 40 | %45,7 | **SAPMA** |
| 16 | Düz Uç `erime` | 5,5 | 5,0 | %45,7 | **SAPMA** |

Sonuç (önce → sonra; ayrıntı raporda):

| Ölçüm | Önce | Sonra | Hedef |
|---|---|---|---|
| Ulti görülen maç, turnuva tohum 1/2/3 (500 maç) | %4,0 / 3,3 / 4,8 | %40,0 / 41,1 / 49,9 | %35-50 |
| Ulti görülen maç, `qa:bot` 500 | %1,4 | %32,0 | |
| Ulti / maç / oyuncu (turnuva 3×500) | 0,02 | 0,25 | "nadir": oyuncu başına < 1 |
| Yetenek / Özel / maç (iki oyuncu, 3×500) | 2,23 / 0,39 | 3,23 / 0,90 | |
| Ring Out, tohum 1/2/3 (500 maç) | %33,4 / 39,9 / 44,2 | %26,5 / 33,0 / 34,3 | %25-35 |
| Ring Out, tohum 1/2/3 (1 000 maç) | %33,7 / 39,9 / 44,5 | %25,7 / 33,8 / 35,6 (toplam %31,7) | %25-35 |
| Bant, tohum 1/2/3 (1 000 maç) | 19 / 17 / 19 | 19 / 20 / 20 | ≥ 19/20 |
| Parça düzeyi en yüksek / en düşük (80 build, 2 000 maç) | Top Uç 59,6 / Düşürücü 43,4 | Halka 55,4 / Düşürücü 45,5 | |
| Arketip (parça düzeyi) Dayanıklı / Denge / Saldırgan / Kale | 59,0 / 48,9 / 46,2 / 45,5 | 56,4 / 49,6 / 47,8 / 48,3 | |
| Maç süresi p90 (3×500 ort.) | 76,6 s | 77,2 s | ≤ 90 |
| Berabere (3×500) | %4,6-5,6 | %5,9-7,0 | |
| Takım Ultisi / maç (3×500) | 0,68 | 0,55 | |

**H1 (Ring Out) DENGE-2 ölçümü:** `vRO` 250 / 260 / 265 / 270 (bu turun verisiyle, tohum 1/2/3 × 500 maç): %27,9-38,2 / 26,7-36,0 / 25,8-35,4 / 24,5-33,9 (toplam %34,1 / 32,4 / 31,4 / 30,1); 265 seçildi (iki uç tohum banda en yakın). Tohumlar arası ~10 puanlık fark havuzdan: Top Uç ve Hafif Disk'li topaçlar kayıplarının yarısından çoğunu Ring Out'la, İğne Uç %4-10'unu veriyor. `kEgim` değişmedi.

## 21. Veri şemaları (veri dosyalarında yorum yok)

**`parcalar.json`:** `{surum, parcalar[], baslangicSetleri[]}`. Parça: `id, ad, tur(govde|disk|uc|cekirdek), element, tipEgilimi, katki{kutle, saldiri, savunma, staminaHavuzu, erime, desen, burstEsik, yon}, katman, fiyat, kilit("acik"|başarım id), gorunum(acik|kilitli-gorunur|gizli), set, aciklama` + türe özel: Gövde `kanat`, `gimmick`; Disk `yukseklik`; Uç `uc{ivme, vSurus, surtunme, esneklik, kCakilma, dashMaliyet, sikiDonusCarpani, ringOutHizi}`; Çekirdek `koken, ruh`. `yon`: `sag|sol|cift`. `desen`: `cicek|merkezci|cakili|dengeli|kusak`.
**`basarimlar.json`:** `{surum, basarimlar[]}`; `sart{olay, sayi, kosul{}}`, `odulAltin`, `acilanParcalar[]`, `acilanGorunum[]`, `acilanOzellik[]`, `gizli`, `ilkSurum`. Olay sözlüğü (sunucu sayar): `antrenmanBitti, macKazanildi, macOynandi, farkliCekirdekKazanma, altiElementKazanma, cekirdekSeviye, bitisYap, tekMacBitisCesidi, galibiyetSerisi, zitElementCarpisma, kusakSuresi, takimUltisi, alanYetenegiyleBitis, yetenegiyleBitis, dashCarpismasiylaBitis, zincirCarpisma, kararmaSayaciDoldu, karanlikModdanGeriDonus, destekKanaliMaci, odaMaci, odaAc, yapayOmurBitti, yapayYenileme, puanKazan, aniOlumKazan, parcaSahip`. Koşul anahtarları: `mod, tur, kazandi, sureMaxSn, kalanStaminaMinOran, enAzStaminaOran, bitisStaminaMaxOran, cekirdekElementi, cekirdekKoken, puanGeriden, alinanCarpisma, ozelYetenekKullanilmadi, tekMac, farkliYetenek, yetenekSonrasiMaxSn, pencereSn, macSnAraligi, macKazandiran, enAzFarkliRakip, seviye`.
**`ruhlar.json`:** `id, ad, element, koken, tipEgilimi, kisilik, yetenek(kademe 1 id), yetenekAilesi(kademe 2 id), ozelYetenek(ad), ulti(id | null), ata`.
**`yetenekler.json`:** `id, ad, kademe, element, tur(hucum|savunma|alan|sayac), tipUyumu, telegrafSn, sureSn, beklemeSn, enerjiDilimi, etki{hizCarpani, itme, hasarKatsayisi, yaricap, + yeteneğe özel}, bedel{staminaYuzde, kilitSn, kendiHizCarpani, ek}, kaynak("00-4.7"|"ek"), eksikTamamlama, ilkSurum`. Etki sözlüğü: `itme` br/s anlık darbe (negatif = çekme), `cekim` br/s² alan çekimi, `atilisHizi` br/s, `kbCarpani` alınan itme çarpanı, `hasarAlmaCarpani`, `surtunmeCarpani`/`ivmeCarpani` alandaki herkese, `yanKaymaItme`, `alanHasarYuzdeSn` rakip `maxStamina` yüzdesi/s, `staminaEmisYuzdeSn`, `emisYuzde` (temas başı çalma), `zincirSayisi`, `engelSayisi`, `karsiPencereSn`, `kavisYaricap`, `kendineDeEtki` (alanın kullanana etkisi 0-1).
