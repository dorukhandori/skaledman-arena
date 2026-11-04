# Boşluk taraması: sayılar, veri, ekonomi

**Yazar:** [@ledger · Balance Designer] · **Tarih:** 2026-11-04 · **Kapsam:** `docs/design/beyblade/00..05` + `docs/research/beyblade/04, 06` + `ayar.ts`.
**Çıktılar:** `docs/design/tuning.md`, `veri/parcalar.json` (27 parça), `veri/basarimlar.json` (46 başarım), `veri/ruhlar.json` (21 ruh), `veri/yetenekler.json` (29 yetenek). Hepsi **ilk tuning**'dir, ölçülmemiştir (tuning § 20 ön tarama hariç).

## 1. Boşluklar ve çelişkiler

| # | Boşluk / çelişki | Kanıt | Karar (kim onaylar) |
|---|---|---|---|
| 1 | Topaç ve arena yarıçapı hiçbir belgede yok; 05 `r=14` varsayıyor | 05 § 2.2 "r+r = 28"; `iskeletler-diyari` `govdeYaricap 14`; pixel planı Gövde 56-72 px | `r`=30, `R`=240 (tuning § 2). `@cove`, `@byte` |
| 2 | 05 hasar oranı `sal/sav` aşırı sert (15 kat salınım) | Ön sim n=40: S-S turu 1,1 s, S-K %91 | `sqrt(oran)` + `kH`=0,006 (SAPMA #1). `@byte` formülü böyle yazar |
| 3 | Tık birimi ve `burstEsik` 6-10 ile 05'in 0..1 sayacı uyuşmuyor; tavan yok | Ön sim: Kale (10) 70/80 turda parçalandı | Birim "referans darbe" (Ş=5000); `burstEsik` 6-10; `tikTavan` 1,2; kütle böleni `40/kutle`. `@byte` |
| 4 | Lore "Dayanıklı > Kale (stamina yarışı)" ama Kale zaten pasif ve düşük erimeli çıkar | 00 § 3.3 + R04 § 3.1; ilk build'de Kale erimesi 3,2 < Dayanıklı 4,5 -> üçgen ters | İğne erimesi 5,0, Top 3,0, Kale Sıkı Dönüş çarpanı 0,80. `@helix` bilsin: Kale "tutucu" değil "ağır" |
| 5 | Dash: 05 "10 s bekleme, 0,12 s dokunulmazlık" eskiden kalma; 05 § 8 soru 1 açık | `ayar.ts` `dash` | Bekleme 4 s, dokunulmazlık **yok**. `@helix` |
| 6 | Slot 4 "Parça Tekniği" (Gövde/Uç kaynaklı, ucuz) hiçbir yerde tanımlı değil | 01 § 1.1 | İlk sürümde **kapalı** (yuva 4 boş); `gimmick` alanları ileride bağlanır. `@helix` karar versin |
| 7 | Metre 3 dilim ama Ulti ilk sürümde yok (K-7) | 00 § 4.3, 02 K-7 | İlk sürüm 2 dilim, sezon 2'de 3. HUD buna göre. `@glyph` |
| 8 | 03 "~25 market kilidi" ama 27 parçanın 12'si kilitlenebilir (15'i Başlangıç/Açık) | 03 § 4.1 vs pixel planı 8/5/6/8 | 12 parça kilidi + 11 görünüm + 5 özellik; kalan ~25 başarım Altın/arma verir. Parça sezon 2'de artınca 25'e gider. `@helix` |
| 9 | 03 § 6 Karanlık Pazarı ilk sürümde "yok"; K-10 Karanlık kökeni "var" | 03 § 6 tablosu vs 02 K-10 | Karanlık parçalar (`kul-cekirdegi`, `karanlik-ucu`) verisinde var ama başarımları `ilkSurum:false`; sahip K-10'u netleştirsin |
| 10 | Kozmetik Disk (Takım Ultisi, Konuk) 5 Disk'e sığmaz | 03 § 4.1 | `acilanGorunum` alanı (görünüm katmanı), ayrı parça yok. `@iris` |
| 11 | Kriz Alevi "ilk 20 sn Enerji x0,8" maç başı mı, giriş başı mı belli değil | 00 § 2.4 | **Sahaya giriş başına 12 s**; Kor Kalbi'nde yok. Aksi hâlde 3 topaç de ceza yer |
| 12 | 4.7'nin 18 ailesi her elemente Yetenek/Ulti vermiyor (Kasırga, Girdap, Kaya'da Yetenek yok; Ulti yalnız 2 element) | 00 § 4.7 | 11 ek aile (`eksikTamamlama:true`), toplam 29. `@helix` isim onayı |
| 13 | 3.5 "Ulti teması" sütunu aslında Özel Yetenek adları (Közyağmuru = 4.7 #2 Özel) | 00 § 3.5 vs § 4.7 | `ruh.ozelYetenek` o adlar, `ruh.ulti` = elemente özgü "Ata ..." ulti (sezon 2); Yapay/Karanlık ulti `null` |
| 14 | Eritme "3 -> 1 rastgele aynı raf" katman bağsız arbitraj açar | 03 § 3.1 | Çıktı katmanı <= girdilerin en düşüğü; ya da Altın %30; Hizip/Karanlık eritilemez |
| 15 | "Galibiyet Sıralaması x5: Ulti kullanmadan" ama Ulti ilk sürümde yok | 03 § 4.1 | `sabir`: Özel Yetenek kullanmadan 5 galibiyet |
| 16 | 90 sn sonunda ne olacağı belirsiz (ani ölüm "dolunca") | 01 § 2.3 | Önde olan kazanır; eşitse ani ölüm 22 s |
| 17 | Eşzamanlı bitiş "tur tekrar" tanımsız (3 topaçlık havuzda tur tekrarı nasıl) | 01 § 2.2 | İki topaç da elenir, puan yok. Ön sim'de turların ~%21'i eşzamanlı, riskli (H4) |
| 18 | Altın: azalan getiri tek eşik, oda maçı Altın'ı belirsiz, bot çiftliği | 03 US-3.4, US-4.2 | 15'ten sonra x0,5, 30'dan sonra x0,2; oda maçı Altın x0,25; maç < 20 s = 0. `@vault` sunucu sayar |
| 19 | Maden "Kök": "arena merkezi" tanımsız | 00 § 2.4 | d < 0,35 R ve hız < 40 br/s |
| 20 | Zıt yön eşitleme/çalma için sayı yok | 00 § 2.4, R04 § 4.1 #8 | `kEsit`=0,06; Karanlık Emiş %20 (zıtta %40) |
| 21 | Üç stamina eşiği (Kriz Alevi %30, kritik %25, yalpa %40) | 00, 01, 05 | Kasıtlı üçü de kalır: yalpa görsel, %30 köken, %25 kritik/geri çek |
| 22 | `asinmis` ödülü "çift yön Gövde": yön Gövdede değil Çekirdekte, öyle bir Gövde yok | 03 § 4.1, 00 § 5.2 | Ödül: yenileme indirimi %50 (özellik); Gövde yok. `@helix` |
| 23 | Element kaynağı: Gövde mi Çekirdek mi (pixel planı açık soru) | `topac-pixel-plani.md` (Element kaynağı açık sorusu) | Çekirdek elementi mekanik ve boya; Gövde `element` yalnız **uyum** ölçer (aynı x1,10 / komşu x1,00 / uzak x0,80). `@iris` |
| 24 | Elo tanımı yok | 03 US-5.1 "Elo @ledger" | Tuning § 19 (K 40/24/16, ±100 eşleştirme). `@vault` |
| 25 | Parça seviyesi var mı (03 § 7 #1) | 03 § 7 | **Yok**, parçalar sabit (güç satın alma riski sıfır). `@helix` onaylar |
| 26 | Kuşak ucu + Kor: kuşakta tavan 325 > `vRO`=200, serbest sürüş kenardan çıkabilir | tuning § 2 | Kasıtlı risk ("Kenar Yürüyüşü"); yeni oyuncuyu kurtarmak için `vRO` Düz Uç'ta 220 test edilir (H1) |

## 2. Kalan riskler
1. **Sayıların hiçbiri ölçülmedi.** Ön sim (Python, kaba bot, tek tur) yalnız 3 şeyi gösterdi: oran formülü kırık, burst kütle bölensiz kırık, `kH` 0,003 çok zayıf. Üçgenin bir ayağı (Saldırgan > Dayanıklı) görünmedi, Denge fazla güçlü çıktı.
2. **Ring Out hiç ölçülemedi.** Botlar kenardan kaçındı; Ring Out payı %1-3. Bu bitiş türü (2 puan) sayısal olarak boşta; `vRO` ve `kEgim` en çok oynanacak iki sabit.
3. **Eşzamanlı bitiş ~%21** (ön sim): gerçek oyunda da böyleyse "tur tekrar/iki eleme" kuralı oyuncuyu kızdırır.
4. **Parça sayısı 27**: Kale tipi 1 920 kombinasyonun yalnız %11'i (202). Meta çeşitliliği dar; sezon 2 parçalarında ağır/savunmalı eklenmeli.
5. **Başarım sayıları (10 galibiyet, 10 Ring Out) maç süresi/ring out payına bağlı**; Ring Out nadirse `dusurucu` başarımı ulaşılmaz olur.
6. **Altın ölçeği** hesaptır (8 maç/gün ≈ 870 Altın); gerçek maç sayısı/gün bilinmiyor, ilk canlı haftadan sonra katman fiyatları revize edilecek.
7. Telegraf süreleri (0,20 s Yetenek) `@relay` onayına bağlı; RTT > 100 ms'de Yetenek 0,2 s adil değil.

## 3. Bot turnuvasında ilk test edilecek 5 hipotez
Ayrıntı ve test yöntemi: `docs/design/tuning.md` § 20.
1. **H1:** Ring Out payı %25-35 olabilir mi (`vRO`, `kEgim`; kenarı hedefleyen bot gerekir).
2. **H2:** Denge build'i S ve K'yı >%90 yeniyor; 20 rastgele build, 200 maç, %35-65 bandı.
3. **H3:** `40/kutle` bölen Saldırgan'ı fazla kırılgan yapıyor (S-B %9).
4. **H4:** Durma ~%51 ve eşzamanlı bitiş ~%21; `kH` 0,005-0,009 ve eşzamanlı tanım.
5. **H5:** Kazanan +%20 stamina snowball yapıyor mu; tam maç süre p90 <= 90 s.
