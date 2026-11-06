# 03 · Atölye'de işleme: Ocak (eritme → dövme)

**Bağlı:** [`02`](02-maden-sistemi.md) (cevher), [`04`](04-ustalik-sistemi.md) (İşleme Ustalığı), [`06`](06-ekonomi-ve-denge.md) (sayılar), [`07`](07-ux-ekranlar.md) § 5 (Ocak ekranı), [`08`](08-teknik-tasarim.md) § 4 (uçlar). Sayılar: [`veri-taslak/tarifler.json`](veri-taslak/tarifler.json). Mevcut: `03-oyuncu-yolculugu.md` § 2–3, tuning § 17, ledger #14.

## 1. Ocak nedir, nerededir

**Ocak**, Atölye'nin alt ekranıdır (sahibin isteği: "atölyede işleyebildiğimiz"). Atölye ana üs kalır (menü kararı S-1); alt şerit **MARKET · BAŞARIMLAR · OCAK · GÜNLÜK · PROFİL** olur. OCAK yalnız "İlk Kazı" başarımından sonra görünür (kademeli açılma). Ocak ekranı ◄ ile Atölye'ye döner.

İki fiil, iki adım:

| Adım | Fiil (düğme) | Girdi → çıktı | Ustalık |
|---|---|---|---|
| 1 | **ERİT** | cevher (K) → külçe (K) | İşleme ≥ E_K |
| 2 | **DÖV** | külçe (K) + külçe (K−1) + Altın → ürün | İşleme ≥ tarif eşiği |

Neden iki adım (S2 sınaması): tek adım (cevher + Altın → ürün) daha sade görünür ama (a) UO'daki "eritme yeteneği / dövme yeteneği" katmanını kaybeder, (b) İşleme Ustalığına tekrarlanabilir bir kaynak bırakmaz (tarifler tek seferlik, 04 § 4). Eritme toplu yapılır (bir dokunuşla 1–20 parti), bu yüzden ek adım sürtünme yaratmaz.

## 2. Ne üretilir (G-0 ile uyumlu dört ürün türü)

| Tür | Ne | Nerede görünür | Güç etkisi |
|---|---|---|---|
| **ARMA** | Profil arması (kademe renginde cevher motifi) | Profil kartı, lobi ad satırı, sonuç plakası | Yok |
| **ÇERÇEVE** | Profil ve takım kartı çerçevesi (kademe malzemesi: demir, bakır, buz gümüşü…) | Profil, Lobi takım kartları, Atölye takım sütunu | Yok |
| **CİLA** | Gövde ve Disk **metal paleti** takası (palet-takası hattı, `araclar/sanat/palet-takasi.ts`); bir kez dövülür, sahip olunan her Gövde/Disk'e ayrı ayrı uygulanır/kaldırılır | Atölye 3B görünüm, maç sprite'ı | **Yok:** köken ışığı, element kıvılcımı, stamina halkası, dönüş izi **değişmez** (okunurluk kuralı, 00-lore § 2.4); `katki` aynı (G-2) |
| **DÖVME PARÇA** | Yalnız dövmeyle elde edilen yeni yan-grade parça (§ 4.3) | Envanter | Yan-grade; **bayrak `dovmeParcalari` kapalı başlar** (G-3, H-H5) |
| (Usta işi) | Yukarıdakilerin parlak varyantı (§ 5) | Aynı yerler + ince parıltı | Yok |

**Neden Market kilidi açan "kalıp" yok:** "Para parça alır, başarım parçayı var eder" (03-oyuncu-yolculugu § 0) kuralı Market'in kimliğidir. Maden, başarım yolunu kısaltırsa bu kural ve başarım tasarımı (46 başarım, ~12 parça kilidi) değersizleşir (G-6). Maden kendi parçalarını (dövme parça) kendisi açar.

## 3. Eritme

| Kural | Değer |
|---|---|
| Koşul | İşleme Ustalığı ≥ E_K (02 § 2) |
| Oran | **4 cevher → 1 külçe**; `U − E_K ≥ 20` ise **3 → 1** |
| Başarı | Kazı ile aynı formül: `sınırla(0,5 + 0,025·(U − E_K), 0,5, 0,95)` |
| Başarısızlık | Partiden **1 cevher** kaybolur ("CÜRUF"), kalan 2–3 cevher geri döner; yarım tecrübe |
| Tecrübe | `4 × oran × bant` (04 § 4) |
| Toplu | Tek istekte 1–20 parti; sunucu sırayla işler, sonuç listesi döner |
| Geri dönüş | Külçe → cevher **yok** |

Örnek (U = 12, Kaya cevheri E=10): başarı %55, oran 4:1. 40 cevher, 10 parti → beklenen ≈ 5,5 külçe + 4,5 parti başarısız (4,5 cevher cüruf, 13,5 geri) → kalan cevherle tekrar. Sinir bozucu kayıp yok: en kötü durumda cevherin ¼'ü gider.

## 4. Dövme tarifleri

### 4.1 Kozmetik tarifler (kademe başına)

| Tarif | Girdi (külçe) | Altın | İşleme eşiği | Tecrübe | Çıktı kimliği |
|---|---|---|---|---|---|
| ARMA K | 3 × K + 2 × (K−1); K1: 5 × K1 | 100 · K | E_K | 30 | `arma-cevher-<kademe>` |
| ÇERÇEVE K | 6 × K + 4 × (K−1); K1: 10 × K1 | 200 · K | E_K + 5 | 50 | `cerceve-<kademe>` |
| CİLA K (K ≥ 2) | 10 × K + 6 × (K−1) | 400 · K | E_K + 10 (en çok 100) | 80 | `cila: <kademe>` |

Alt kademe külçesinin her tarifte istenmesi (**alaşım**) eski cevherleri değerli tutar (UO'daki alaşım hissi) ve "artan cevher" riskini (R4) azaltır.

### 4.2 İlk sürüm tarif listesi (11 tarif, K1–K4)

| # | Tarif | Girdi | Altın | Eşik |
|---|---|---|---|---|
| 1 | DEMİR ARMASI | 5 Demir külçesi | 100 | 0 |
| 2 | DEMİR ÇERÇEVE | 10 Demir külçesi | 200 | 5 |
| 3 | KAYA ARMASI | 3 Kaya + 2 Demir | 200 | 10 |
| 4 | KAYA ÇERÇEVE | 6 Kaya + 4 Demir | 400 | 15 |
| 5 | KAYA CİLASI | 10 Kaya + 6 Demir | 800 | 20 |
| 6 | DON ARMASI | 3 Don + 2 Kaya | 300 | 25 |
| 7 | DON ÇERÇEVE | 6 Don + 4 Kaya | 600 | 30 |
| 8 | DON CİLASI | 10 Don + 6 Kaya | 1 200 | 35 |
| 9 | KOR ARMASI | 3 Kor + 2 Don | 400 | 40 |
| 10 | KOR ÇERÇEVE | 6 Kor + 4 Don | 800 | 45 |
| 11 | KOR CİLASI | 10 Kor + 6 Don | 1 600 | 50 |
| | **Toplam** | 102 külçe | **6 600** | |

Sezon 2 (K5–K8): 12 kozmetik tarif daha (Kasırga, Şimşek, Girdap, Devir; arma + çerçeve + cila), toplam 23 kozmetik; Altın 24 800 (06 § 3).

### 4.3 Dövme parçalar (yan-grade, bayraklı)

Tarif: 15 × K + 10 × (K−1) külçe, **1 500 Altın**, eşik E_K + 15, tecrübe 150. Parça `katman: "dovme"`, `fiyat: null` (Market'te satılmaz), `kilit: "dovme"`, eritilemez. **İlk sürümde bayrak kapalı**; açılış şartı H-H5.

| K | Kimlik | Ad | Tür | Rol (neden var) | Taslak `katki` (tuning § 13 aralığında) | Kıyas |
|---|---|---|---|---|---|---|
| 2 | `dag-diski` | Dağ Diski | Disk | Kale ailesini genişletir (ledger risk #4: "Kale dar") | kutle 17, savunma 8, staminaHavuzu 15, burstEsik 9, yukseklik 50 | Ağır Disk'ten (18/6/20/9) +2 savunma, −5 havuz, −1 kütle: daha az kalıcı, daha sert |
| 3 | `kiragi-ucu` | Kırağı Ucu | Uç | Kale ile Dayanıklı arası "kaygan kale" | kutle 3, erime 4,8, desen `merkezci`, burstEsik 1; uc: ivme 500, vSurus 180, surtunme 0,6, esneklik 0,5, kCakilma 1,2, dashMaliyet 16, sikiDonusCarpani 0,7, ringOutHizi 250 | İğne kadar ağır değil, Top kadar kaçmaz |
| 4 | `koz-govde` | Köz Gövde | Gövde (Kor) | Ağır saldırgan; tek vuruşta değil uzun alışverişte | kutle 20, saldiri 56, savunma 34, staminaHavuzu 45, kanat 4 | Ok Gövde'den (14/62/28/55) daha ağır, daha az sivri |
| 5 | `savruk-ucu` | Savruk Uç | Uç | (sezon 2; sayılar DENGE turunda) | — | — |
| 6 | `cakim-diski` | Çakım Diski | Disk | (sezon 2) | — | — |
| 7 | `cevren-govde` | Çevren Gövde | Gövde (Girdap) | (sezon 2) | — | — |

Bu parçalar başarım "Koleksiyoncu" (`parcaSahip` 27) sayımına girmez (koşul `katman ≠ dovme`; 05 § 4).

## 4.4 Tarif görünürlüğü (S1 kademeli)
- İlk kez Ocak'a girince yalnız **DEMİR ARMASI** görünür (eksikleri gösterir).
- Bir tarif, eşiği `U + 10` altındaysa "kilitli-görünür" (ad + "İŞLEME 25"); daha yüksekse görünmez ("???": koleksiyon merakı, 4 hücreyi geçmez).
- Sahip olunan tarif ✓ ile kalır; tekrar dövülemez (tek seferlik ürün).

## 5. Usta işi

```
olasılık = sınırla((U − tarifEşiği − 10) / 100, 0, 0,25)
```
Fark 10'un altındaysa %0; fark 20'de %10; 35 ve üstünde %25 tavan. Usta işi, dövme anında ayrı zarla belirlenir; ürünün **parlak varyantını** verir (ince bronz parıltı, profil kartında "USTA İŞİ" yazısı odakta). Tarif tek seferlik olduğu için Usta işi kaçarsa **"YENİDEN DÖV"** seçeneği vardır: aynı tarif yarı külçe + yarı Altın ile yeniden dövülür, yalnız Usta işi zarı atılır (tecrübe yok). Bu, yüksek Ustalığa bir anlam ve külçeye ikinci bir gider verir (R4).

## 6. Arbitraj kapatma (ledger #14 ve yenileri)

| # | Açık | Kapatma |
|---|---|---|
| A-1 | Cevher → Altın (satış) | **Yok.** Cevher, külçe ve maden ürünleri satılmaz |
| A-2 | Altın → cevher | **Yok.** Market cevher satmaz |
| A-3 | Parça eritme (Dökümhane 3→1) cevher verir mi | **Hayır.** Dökümhane eritmesi aynen (tuning § 17); maden sistemine bağlı değil |
| A-4 | Dövme parça Dökümhane'de eritilir mi | **Hayır** (`katman: dovme` Hizip/Karanlık gibi eritilemez) |
| A-5 | Alt kademe külçeden üst kademe külçe (3×K → 1×K+1) | **Yok.** Kademe atlama Ustalık kapısını delerdi |
| A-6 | Külçe → cevher (eritmeyi geri alıp 3:1'de yeniden eritmek) | **Yok** |
| A-7 | Yeniden dövme ile Usta işi "satmak" | Ürün satılmaz, takas yok |
| A-8 | Oyuncular arası takas | Yok (ilk sürüm) |

## 7. Başarısızlıkta ne olur (S2: sinir bozucu kayıp yok)

| Eylem | Başarısızlık var mı | Sonuç |
|---|---|---|
| Kazı | Var | Cevher yok, yarım tecrübe; damar vuruşu harcanır |
| Eritme | Var | 1 cevher cüruf, kalanı geri; yarım tecrübe |
| Dövme | **Yok** | Her dövme ürünü verir; yalnız Usta işi şansa bağlı |
| Yeniden döv | Yok | Usta işi zarı; tutmazsa yarım bedel gider (önceden yazılı: "USTA İŞİ ŞANSI %12") |

## 8. Atölye ekranına etkisi (referans 03 ile uyum)
- Atölye ana ekranı **değişmez** (envanter, patlatılmış topaç, çubuklar, takım). Tek fark: alt şeritte OCAK.
- Envanterde cilalı parçanın kartında küçük kademe renkli köşe (kalkan rozetinin karşı köşesi); parça seçiliyken alt şeritte ikincil düğme "CİLA ▾" (sahip olunan cilalar + "YOK").
- Ocak ekranı Atölye'nin blueprint dilinde (lacivert ızgara, ince bronz çizgiler): yeni "yer" değil, Atölye'nin bir masası (menü kuralı 5.1/5: bir ekran, bir yer). Wireframe 07 § 5.

## 9. G-0 sınaması (bu belge)
Ocak'ın çıktıları: kozmetik (sıfır stat) + bayraklı yan-grade parça (bant testi şartlı). Hiçbir tarif mevcut parçanın `katki` değerini değiştirmez; cila yalnız metal paletini; Usta işi yalnız parıltıyı.
