# 12 · Parça üretimi (craft), malzeme kademesi ve pahalı Market

**Tarih:** 2026-11-06 (ikinci tur) · **Sahibin istekleri (kelimesi kelimesine):**
1. "Madenler parça üretmede kullanılsın ve madenin değerine göre üretebilen parçalar da kıymetli olsun."
2. "Bu madenlerden parça üretilebilsin. Marketteki parçalar çok çok çok pahalı olduğu için oyuncuları bu şekilde craftlamaya itelim."
3. "Bu craft - market - progress mantığını iyi oturtmak için internet araştırması da yapsın." → [`11-arastirma-craft-market-ilerleme.md`](11-arastirma-craft-market-ilerleme.md)

**Bu belge 03'ün parça kısmının yerine geçer** ve 01/02/04/05/06/07/08'deki ilgili satırları günceller (her belgede "Güncelleme: 12" notu). Sayılar: [`veri-taslak/tarifler.json`](veri-taslak/tarifler.json) `parcaUretim`, `marketFiyat`.

## 1. Bağlayıcı kurallar (değişmedi)
- **G-0 / ledger #25: güç eşit.** Aynı parçanın DEMİR biçimi ile DEVİR TAŞI biçimi **bit bit aynı `katki`** taşır. Malzeme kademesi sim'e, hash'e, takım koduna girmez.
- **S1/S2:** yeni oyuncu ilk gün rekabetçi takım kurar; craft bir keşif döngüsüdür, duvar değildir.
- **Başarım kilidi korunur:** "başarım parçayı var eder" (03-oyuncu-yolculugu § 0). Kilitli bir parça **ne craft ne Market** ile edinilebilir; başarım açınca **iki yol** da açılır: ucuz ve hızlı craft ya da pahalı Market kısayolu. (G-6 değişmez: maden ürünü kilit açmaz.)
- Gerçek para, reklam, kutu/şans satışı **yok**.

### 1.1 Varsayılan: "kıymet = prestij + kozmetik", güç eşit
İki seçenek değerlendirildi:

| Seçenek | Artı | Eksi | Karar |
|---|---|---|---|
| **A. Güç eşit; kıymet = malzeme görünümü, ad, rozet, yapımcı imzası, seri numarası, vitrin, başarım** | ledger #25 ve denge bandı (%35–65) dokunulmaz; bot turnuvası gerekmez; Kick izleyicisi "neden kaybettim" sorusuna "parçası daha pahalıydı" cevabı almaz | Kıymet yalnız prestij | **Varsayılan** |
| B. Küçük yan-grade (ör. bir eksende +%2, başka eksende −%2, toplam aynı) | "Malzeme hissedilir" | 8 kademe × 27 parça = 216 varyant; her biri bant testi ister; "Devir Taşı daha iyi" algısı kaçınılmaz (güç sanılır); S1 okunurluğu düşer | Sahibe seçenek (99 S-19) |

## 2. Hangi maden hangi parçayı üretir

Her katalog parçası (27; ilk sürümde 25, Karanlık 2'si K-10'a bağlı) Ocak'ta **DÖV** ile üretilir. Malzeme kademesi K, parçanın Market katmanının **en düşük kademesinden** başlar; daha üst kademe her zaman kullanılabilir (aynı parça, daha kıymetli biçim).

| Market katmanı | Parçalar (örnek) | En düşük malzeme | Külçe (Uç / Disk / Gövde / Çekirdek) | İşçilik Altını | İşleme eşiği (malzeme K için) | Tecrübe |
|---|---|---|---|---|---|---|
| Başlangıç | 12 başlangıç parçası | K1 Demir | 3 / 4 / 5 / 6 | 0 | E_K | 20 |
| Standart | Halka Gövde, Top Uç, Şimşek Göktaşı | K1 Demir | 6 / 8 / 10 / 12 | 100 | E_K + 5 | 40 |
| Nadir | Ayaz Gövde, Alçak Disk, Parlak Disk, Girdap Maden | **K2 Kaya** | 11 / 14 / 18 / 21 | 300 | E_K + 10 | 70 |
| Hizip | Düşürücü, Sivri, İz Gövde, Kuşak Ucu, Sabır Taşı, Kor Kalbi | **K3 Don** | 15 / 20 / 25 / 30 | 600 | E_K + 15 | 110 |
| Karanlık | Kül Çekirdeği, Tutucu Uç (K-10'a bağlı) | **K4 Kor** | 23 / 30 / 38 / 45 | 1 000 | E_K + 20 | 160 |

Formül: `külçe = tavan(katmanKülçe × türÇarpanı)`; katmanKülçe 4 / 8 / 14 / 20 / 30; türÇarpanı Uç 0,75 · Disk 1,0 · Gövde 1,25 · Çekirdek 1,5. Tüm külçe **seçilen tek kademeden** (alaşım yok: oyuncu "Kor Düşürücü" ister, yarısı Don yarısı Kor olmaz; S2).

**Üst kademe yalnız değerli biçim üretir:** Devir Taşı ile Başlangıç Uç üretilebilir (ve en kıymetli Başlangıç Uç'u olur); ama Demir ile Hizip parça üretilemez. Eşik, "USTALIK yetmiyor" ile görünür (04).

**Üretilen Çekirdek** Lv.1 başlar (XP 0), Yapay ise ömür 30; tecrübe ile büyür (mevcut kural). **Ödünç ve başlangıç kuralı aynı.**

## 3. Kıymet: malzeme biçimi neyi değiştirir

| Kıymet katmanı | Ne | Nerede görünür |
|---|---|---|
| **Malzeme biçimi** | Gövde/Disk/Uç metal paleti kademe renginde (eski "cila"nın yerini alır; köken ışığı, element kıvılcımı, stamina halkası **değişmez**); Çekirdek'te kabuk halkası | Atölye 3B, maç sprite'ı, seyirci (OBS) |
| **Ad** | "KOR DÜŞÜRÜCÜ GÖVDE" (malzeme ön adı); Market'ten alınan "DÜŞÜRÜCÜ GÖVDE" (ön ad yok) | Envanter, takım kartı, maç ad satırı (odakta) |
| **Rozet** | Kademe rozeti (1–8) parça ikonunun köşesinde | Envanter, Market (sahip olduğun biçimler), lobi |
| **Yapımcı imzası** | "YAPAN: AYLA · NO. 0042 · 06.11.2026" | Parça ayrıntısı, vitrin, seyirci kartında topaç adının altı |
| **Seri numarası** | (tanım, malzeme) başına **sunucu genelinde** artan sayı: "DEVİR TAŞI DÜŞÜRÜCÜ No. 3" dünyada üçüncü | Ayrıntı, vitrin |
| **Usta işi** | Dövme anında Usta işi zarı (03 § 5 formülü, tarif eşiği = bu tablodaki eşik): parlak parıltı + "USTA İŞİ" | Her yerde ince parıltı |
| **Değer puanı** | `değer = külçe × kademeDeğeri(K)`; kademeDeğeri 10 / 15 / 25 / 40 / 60 / 90 / 135 / 200; Usta işi ×1,5 | Vitrin toplamı, profil "Koleksiyon değeri" |
| **Vitrin** | Profilde 3 yuvalı vitrin (seçilen üretilmiş parçalar) | Profil, Lobi rakip kartında (dokun: aç) |
| **Ses/iz** | Maçta malzemeye göre çarpışma sesinin üst harmoniği hafifçe değişir (Demir tok, Don cam, Devir çan; ≤ −12 dB katman) | Maç (kozmetik) |

**Değer puanı Altın değildir.** Altına çevrilmez (§ 5 arbitraj). Yalnız prestij ve başarım sayacıdır.

## 4. Envanter modeli: aynı parçadan birden çok biçim

| Kural | Değer |
|---|---|
| Örnek | `parca` satırı = {tanim, **malzeme** (NULL = Market biçimi, 1–8), **yapimci_id**, **yapimci_ad** (o anki ad), **seri**, **uretim** (ms), usta} |
| Çoklu kopya | **Evet**: aynı tanımdan farklı (ya da aynı) malzemede birden çok örnek olabilir |
| Market'ten alma | Tanım başına **bir** Market örneği (mevcut `satin:<oyuncu>:<parça>` kuralı) |
| Takım | Bir örnek tek topaçta (mevcut). **Yeni:** takımda aynı tanımdan en çok bir parça (Çekirdek kuralının parçalara genişlemesi; craft'ın takım kompozisyonunu, dolayısıyla gücü değiştirmemesi için) |
| Takımda biçim seçimi | Atölye'de yuvaya parça tanımı yerine **örnek** takılır (bugün de öyle); aynı tanımın biçimleri envanter kartında yığın: "DÜŞÜRÜCÜ ×3" → dokun: biçim listesi (DEMİR · KOR ✦ · MARKET) |
| Eritme | Üretilmiş parça Ocak'ta eritilebilir: **külçenin %50'si aynı kademede** geri gelir (aşağı yuvarla); Market biçimi **eritilemez**; Dökümhane (Market) eritmesi üretilmiş parçayı **kabul etmez** |
| Takas | **Yok** (oyuncular arası takas/pazar yok; yapımcı her zaman sahiptir). Seçenek olarak 99 S-21 |

## 5. Market: pahalı ama dürüst kısayol (SAPMA, tuning § 16)

### 5.1 Yeni fiyatlar

| Katman | Eski fiyat | Yeni fiyat | Çarpan | Not |
|---|---|---|---|---|
| Başlangıç (12) | 100 | **0** | — | Kilitsiz parçalar ücretsiz |
| Kilitsiz Standart/Nadir (Halka Gövde, Top Uç, Girdap Maden) | 500 / 500 / 2 000 | **0** | — | "15 kilitsiz parça ücretsiz" (S1 koruması) |
| Standart (kilitli: Şimşek Göktaşı) | 500 | **2 500** | ×5 | |
| Nadir (kilitli: Ayaz Gövde, Alçak Disk, Parlak Disk) | 2 000 | **12 000** | ×6 | |
| Hizip (6) | 4 000 | **32 000** | ×8 | |
| Karanlık (2) | 6 000 | **48 000** | ×8 | Araştırma tavanı ×12, ama `T_market ≤ 75 gün` (11 § 3) için ×8 |

Kilitli 12 parçanın Market toplamı: 42 500 → **326 500** Altın. Craft ile aynı 12 parça (en düşük malzemeyle): **276 külçe + 6 600 Altın** işçilik. Kilitsiz 15 parçanın eski toplamı 3 800 → **0**.
Yapay yenileme fiyatı (Kasırga Döküm 200) **değişmez** (fiyatın %40'ı kuralı eski fiyata bağlanır; ömür bir hizmettir, parça edinimi değil).

### 5.2 "Craft ile ~N günde" (dürüst fiyat gösterimi)
Market kartında fiyatın altında tek satır: **"CRAFT: 25 DON KÜLÇESİ · ~3 GÜN"**.
- N = `tavan(eksik külçe / oyuncunun son 7 günlük ortalama külçe üretimi)`, kademesi ve Ustalığı yetiyorsa; Ustalık yetmiyorsa **"CRAFT: İŞLEME 40 GEREKİR"**; hiç üretim verisi yoksa sim p50 (Tablo G, aktif) "~3 GÜN" etiketi "(TAHMİN)" ile.
- Elinde yeterli külçe varsa: **"CRAFT: HAZIR · OCAK'A GİT"** (ikincil düğme).
- Karanlık desen yok: geri sayım yok, "son fırsat" yok, Altın dışı para birimi yok, satın alma onayında fiyat ve kalan bakiye açık (mevcut ≥ 100 Altın modal kuralı).

### 5.3 Market'in kalan rolü
Altın'ın harcama yeri: (a) pahalı kısayol, (b) Yapay yenileme, (c) **Günün parçası** (%30 indirim, mevcut), (d) Ocak işçiliği (Altın'ın asıl yeni gideri), (e) kozmetik tarif işçiliği (arma/çerçeve). Market anlamsızlaşmaz: gündelik oyuncunun Ustalığı yetmeyen üst parça için tek yoludur.

## 6. Arbitraj kanıtı (ledger #14) — kaynak/gider

| Döngü | Mümkün mü | Neden kapalı |
|---|---|---|
| Market'ten al → erit → külçe | Hayır | Market biçimi eritilemez |
| Market'ten al → Dökümhane eritmesi → Altın | Mevcut kural (%30, katman ≤ girdinin en düşüğü); yeni fiyatlarla **Altın kaybı** (32 000 → 9 600) | Kâr yok |
| Craft → Dökümhane → Altın | Hayır | Dökümhane üretilmiş parçayı kabul etmez |
| Craft → Ocak eritmesi → külçe | Evet, %50 | Kayıp döngüsü (her tur yarıya iner), Altın üretmez |
| Craft → sat | Hayır | Satış yok |
| Alt kademe külçe → üst kademe | Hayır | 03 § 6 A-5 |
| Değer puanı → Altın | Hayır | Puan para değil |

**Sonuç:** Altın'ın tek yeni kaynağı harita ödülleri ve yeni başarımlar (06 § 3); Altın'ın yeni giderleri işçilik. Cevher → Altın yolu **yoktur**; Altın → cevher yolu **yoktur**. Craft edilen parçanın "Altın karşılığı" bilerek **sıfır**dır (yalnız prestij değeri), bu yüzden "Market fiyatından düşük" şartı kendiliğinden sağlanır.

## 7. Hız hedefi ve sim sonucu (06 Tablo G)
Hedef: kilidi açılan bir parçayı craft ile edinmek Market'ten **5–10 kat hızlı**. Ölçüm: kilit X. günde açılır, birikim sıfırdan başlar, Market tarafı o andan sonraki bütün Altını biriktirir (iyimser).

| Profil (kilit 8. gün, v1) | Standart Çekirdek | Nadir Gövde | Hizip Gövde |
|---|---|---|---|
| aktif | 1 / 3 gün (×3) | 2 / 13 (×6,5) | 3 / 33 (×11) |
| tutkulu | 1 / 2 (×2) | 1 / 8 (×8) | 2 / 19 (×9,5) |
| gündelik | 2 / 4 (×2) | 2 / 17 (×8,5) | 12 / ≈ 64 |

Okuma: Nadir ve Hizip hedef bandında ya da üstünde; Standart'ta fark küçük (ucuz parça, iki yol da kısa: sorun değil). Hizip'te gündelik oyuncu Ustalık eşiğine (İşleme 40) takılır: Market onun için "çok pahalı ama imkânsız değil" (~5 hafta). Tam tablo ve tam senaryo (Karanlık) 06 § 7.5.

## 8. İlk craft (S1): 10–15 dakika
İlk 5 dakikada (01 § 8) oyuncu ≈ 15–20 Demir cevheri toplar. Akış:
1. 4:00 Ocak: ERİT → 4 Demir külçesi.
2. Pergel: "Bir parçayı kendin dövebilirsin." Tarif listesinin başında **DEMİR DÜZ UÇ · 3 KÜLÇE** (seçtiği setin Uç'u ya da bir Başlangıç Uç'u).
3. 4:30 DÖV → kart "DEMİR DÜZ UÇ · YAPAN: AYLA · NO. 0117" → ana düğme **ATÖLYE'DE TAK**.
4. Başarım **"İlk Parça"** (05).
Hedef: ilk craft ≤ 15 dk (kabul ölçütü H-H8).

## 9. Harita ve başarımlarla bağ
- **Hangi düğüm hangi kademeyi verir:** 01 § 1 tablosu (bölge n erken damar K=n, geç damar K=n+1, nadir K=n+2; patron külçesi K=n+1). Hizip parça (K3) ilk kez Bölge 2 geç damarında ya da Bölge 3'te; Karanlık parça (K4) Bölge 3 geç damarında.
- **Yeni başarımlar** (05 § 2.3): İlk Parça, Tam Takım (aynı malzemeden 4 parçalı topaç), Malzeme Defteri (aynı parçayı 4 kademede), Usta Parça (Usta işi parça), Vitrin (3 vitrin yuvası dolu), Değerli Koleksiyon (değer puanı 5 000).

## 10. Teknik etki (08'e işlendi)
- `parca` + `malzeme`, `yapimci_id`, `yapimci_ad`, `seri`, `uretim`, `usta`; yeni tablo `seri_sayac(tanim_id, malzeme, son)`; `oyuncu` + `vitrin` (JSON, 3 örnek kimliği).
- Sim ve takım kodu: **değişmez** (`cekirdek:govde:disk:uc:seviye:odunc:yon`). Malzeme **ayrı kozmetik alan**: oda durumunda (Colyseus şeması) üye başına `malzeme: [cekirdek, govde, disk, uc]` (uint8, 0 = Market). **`PROTOKOL_SURUMU` +1** (şema alanı); **`KATALOG_OZETI` değişmez** (sim verisi aynı); hash değişmez (test: aynı tohum, farklı malzeme → aynı hash).
- Seyirci odası aynı şema alanını okur (OBS'te parça adı ön adı + rozet).
- Market API: fiyat `veri/parcalar.json` `fiyat` alanından (SAPMA satırıyla), `craft:{kulce, kademe, gun, hazir, ustalikEksik}` alanı.
- Hesap silme: üretilmiş parçalar zaten oyuncuyla silinir; `seri_sayac` kalır (sayılar geri kullanılmaz).

## 11. G-0 sınaması
Malzeme biçimi `katki`yı, sim'i, hash'i ve takım kodunu değiştirmez (test). Takımda aynı tanım tek kuralı craft'ın kompozisyon gücü üretmesini engeller. Market fiyat artışı yalnız kilitli parçaları etkiler; kilitsiz 15 parça ücretsiz olduğu için yeni oyuncunun rekabetçi gücü ilk gün tamdır (önce seçilmeyen iki set + Halka/Top/Girdap için 3 800 Altın gerekiyordu, şimdi 0).
