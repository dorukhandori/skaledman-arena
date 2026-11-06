# 02 · Maden sistemi: damarlar, kademeler, kazı

**Bağlı:** [`00`](00-genel-bakis.md) (G-0), [`01`](01-harita-ve-dugumler.md) (maden düğümü), [`04`](04-ustalik-sistemi.md) (Ustalık), [`06`](06-ekonomi-ve-denge.md) (sayı doğrulaması), [`08`](08-teknik-tasarim.md) (sunucu). Sayılar: [`veri-taslak/madenler.json`](veri-taslak/madenler.json), [`ustalik.json`](veri-taslak/ustalik.json), [`harita.json`](veri-taslak/harita.json).

## 1. UO'dan ne alındı, ne alınmadı

| UO mekaniği (yalnız yapı) | Devran karşılığı | Fark ve gerekçe |
|---|---|---|
| Cevher türleri düşükten yükseğe kademe kademe (yaygın demirden en nadir son metale) | **8 kademe cevher** (§ 2) | Adlar özgün; kademe 2–7 altı elemente, 8 lore'daki İlk Devir'e bağlı |
| Her kademe için Madencilik yeteneği eşiği | **Madencilik Ustalığı eşiği** (0–100) | "Yetenek" sözcüğü topaç yeteneklerine ayrıldığı için **Ustalık** (04 § 1) |
| Kullanarak yetenek artışı | Her vuruş Ustalık tecrübesi verir | UO'da artış zar; bizde **deterministik tecrübe** + görünür çubuk (S1: öğretmeyen kural yok) |
| Kolay kaynak artık öğretmez | **Öğrenme bandı** (fark ≥ 15 yarım, ≥ 30 onda bir) | Aynı his, sayı ekranda etiketle |
| Başarısızlık şansı | Başarı %50'den başlar, eşik + 18'de %95 tavan | Başarısızlıkta cevher yok, yarım tecrübe; hiçbir şey kaybolmaz |
| Yüksek kademe nadir | Üst kademeler ileri bölgelerde, verim 1, nadir damar olasılığı düşük | |
| Demircilik ile metal işleme | **İşleme Ustalığı** + Ocak (03) | |
| Yerde sınırsız damar, makro madencilik | Günlük damar kapasitesi + günlük vuruş tavanı + sunucu doğrulaması | Bot çiftliği önlemi (§ 7) |

## 2. Kademe tablosu (8 kademe)

| K | Kimlik | Oyuncunun gördüğü ad | Lore adı (yalnız Dünya sayfası) | Element | Ustalık eşiği | Verim (başarılı vuruş) | Nadirlik | Renk (ana / koyu) | Bulunduğu yer |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `demir` | DEMİR | Ham Demir | — (nötr) | 0 | 3 | yaygın | `#8C8A88` / `#4A4846` gri | Bölge 1 |
| 2 | `kaya` | KAYA CEVHERİ | Dağ Bakırı | Kaya | 10 | 3 | yaygın | `#B0743A` / `#45392A` kehribar | Bölge 1 (geç), Bölge 2 |
| 3 | `don` | DON CEVHERİ | Kırağı Gümüşü | Don | 25 | 2 | orta | `#9FE3F5` / `#3B7D8F` buz mavisi | Bölge 2 (geç), Bölge 3 |
| 4 | `kor` | KOR CEVHERİ | Köz Demiri | Kor | 40 | 2 | orta | `#E8452C` / `#7A1D12` kızıl | Bölge 3 (geç), Bölge 4 · **ilk sürüm tavanı** |
| 5 | `kasirga` | KASIRGA CEVHERİ | Savruk Kuvars | Kasırga | 55 | 2 | nadir | `#5BD1A5` / `#1F6B52` yeşim | Bölge 4–5 (sezon 2) |
| 6 | `simsek` | ŞİMŞEK CEVHERİ | Çakmak Taşı | Şimşek | 70 | 1 | nadir | `#F7D83A` / `#8A6A08` sarı | Bölge 5–6 (sezon 2) |
| 7 | `girdap` | GİRDAP CEVHERİ | Çevren İncisi | Girdap | 82 | 1 | çok nadir | `#2A5BD7` / `#14286B` derin mavi | Bölge 6 (sezon 2) |
| 8 | `devir` | DEVİR TAŞI | İlk Devir kırıntısı | hepsi | 92 | 1 | efsane | `#F4E9FF` / `#6B5A8A` inci, yanardöner | Yalnız Bölge 6 Derin Damar nadir yuvası (%35/gün) ve Bölge 6 patronu (sezon 2) |

**Neden bu sıra:** Maden kökeninin lore'u (00-lore § 2.4: "yerin derininden, eski ocaklardan") Kaya'yı ilk element yapar; başlangıç Çekirdeklerinden Kaya Maden zaten ilk üçte. Sonraki elementler çark sırasını izler (Kaya → Don → Kor → Kasırga → Şimşek → Girdap, 00-lore § 3.2). **Element kademesi güç sırası değildir**: Girdap cevheri Kor cevherinden "daha iyi" bir şey vermez, yalnız daha zor bulunan bir **görünüm** verir (G-0). Kademe 8 "Devir Taşı" altı elemente bölünmeden önceki dönüşün kırıntısıdır (00-lore § 2.2); renk dili yanardöner, ayrı bir element rengi değildir.

**Renk erişilebilirliği:** Kademe hiçbir zaman yalnız renkle okunmaz: her ikon sol üstte kademe numarası rozeti taşır (1–8) ve elementli kademelerde element simgesi (`elementSimge.ts`) vardır (sadelik S-11, İ-3).

## 3. Kazı nasıl yapılır (etkileşim kararı)

Üç seçenek değerlendirildi:

| Seçenek | Artı | Eksi | Karar |
|---|---|---|---|
| A. Zamanlı (bekle, sonra topla) | En sade | Beceri yok; "bekleme oyunu" kâr amaçsız oyunda anlamsız; yayında izlenmez | Hayır |
| B. Mini oyun (topaçla damara çarp, gerçek zamanlı) | Temaya en yakın | Sim'e yeni mod/oda = sim değişmez kuralına aykırı; mobilde ikinci bir kontrol şeması | Hayır |
| **C. Sunucu zarı + isteğe bağlı isabet halkası** | Tek dokunuş; sunucu yetkili; beceri ifadesi var ama cezası yok; Kuşak halkası imzasını kullanır | İsabet zamanlaması sunucuda tolerans ister | **Evet** |

**Kazı akışı (C):**
1. Harita'da maden düğümüne dokun → alt şeritte **KAZ** (ana düğme). Seans açılır (`POST /api/maden/basla`).
2. Maden ekranı: ortada damar kayası, çevresinde **Kuşak halkası** 1,4 sn'de bir tur döner. Halkanın bir yayı bronz renkli **isabet yayıdır** (turun %22'si, ≈ 308 ms).
3. Oyuncu **KAZ**'a basar (ya da ekranın herhangi bir yerine dokunur, Boşluk/Enter). Işıklı uç bronz yaydayken basarsa **İSABET**: o vuruş başarılı olursa verime **+1**.
4. Sunucu zarı atar (§ 4), sonucu döndürür: "+3 KAYA CEVHERİ" ya da "ISKA · +5 TECRÜBE". Damar kalan vuruşu bir azalır (●●●○○○).
5. Kapasite bitince ya da oyuncu ◄ ile çıkınca seans kapanır.

**Neden ceza yok:** isabeti kaçırmak normal vuruştur (S2: sinir bozucu kayıp yok). İsabet usta oyuncuya ≈ +%20 verim kazandırır (06 Tablo D'de gündelik %40 / tutkulu %85 isabet farkı), ama Ustalık tecrübesi isabetten bağımsızdır: Ustalık **beceriyle değil emekle** artar, verim beceriyle biraz artar.

**Mobil:** tek büyük düğme (≥ 64 CSS px, alt orta) + ekranın tamamı dokunma alanı; hover yok; uzun basma = aynı vuruş (tekrarlı basış ≥ 700 ms aralıkla sınırlı, § 7). Masaüstü: fare tıkı, Boşluk, Enter.

## 4. Başarı formülü

```
U = Madencilik Ustalığı (0–100, tam sayı seviye)
E = damar kademesinin eşiği (§ 2)
U < E  → kazılamaz (damar kilitli: "USTALIK E GEREKİR")
başarı = sınırla(0,50 + 0,025 · (U − E), 0,50, 0,95)
```

| U − E | 0 | 4 | 8 | 12 | 16 | ≥ 18 |
|---|---|---|---|---|---|---|
| Başarı | %50 | %60 | %70 | %80 | %90 | %95 |

- **Başarılı vuruş:** cevher = `verim(K)` (+1 isabet), günlük çarpanla (§ 6); tecrübe `10 × bant × günlük çarpan`.
- **Başarısız vuruş:** cevher yok; tecrübe `5 × bant × günlük çarpan`. Damar kapasitesinden yine düşer.
- Başarı yüzdesi damar seçiliyken ekranda yazılıdır ("BAŞARI %70").

**UO'dan bilerek ayrılan:** UO'da eşikte başarı ≈ %0'dır; bizde %50. Neden: S1 ilk dakikada ilk kazının en az yarı yarıya başarmasını ister; ayrıca öğrenme bandı (04 § 3) zaten "kolay damar öğretmez" gerilimini veriyor, düşük başarıyla ikinci bir ceza katmanı gerekmiyor.

## 5. Damar: kapasite, nadir yuva, yenilenme

| Kural | Değer | Kaynak |
|---|---|---|
| Normal maden düğümü kapasitesi | **6 vuruş/gün** | `harita.json` `kapasite` |
| Derin Damar (bölge sonu, düğüm 12) | **8 vuruş/gün** | |
| Yenilenme | Her gün **04:00 TRT** (sunucu günü, `ekonomi.ts` ile aynı) tüm damarlar dolar | backend § 8 |
| Nadir yuva | Her damar her gün sunucu tohumuyla (`fnv(oyuncuId, gun, dugumId)`) bir kez zar atar; tutarsa kapasitedeki **bir vuruş sırası** bir kademe üst cevher verir | Normal %10, Derin Damar %15; Bölge 6 Derin Damar Devir Taşı için %35 |
| Nadir yuva görünürlüğü | Seans açılınca damar üstünde parlayan bir çatlak: "NADİR DAMAR · USTALIK 25"; Ustalık yetmiyorsa o sıra ana kademeyi verir ve etiket "USTALIĞIN YETMİYOR" der (öğretir) | 07 § 4 |
| Kazılmayan kapasite | Ertesi güne **taşınmaz** | Basit; "kaçırdım" stresi küçük çünkü günlük tavan zaten kapasiteden önce dolar |

Nadir yuva tohumu sunucu sırrı + oyuncu + gün + düğümden üretilir (istemci bilmez); aynı gün ikinci seans aynı sırayı görür, seans açıp kapatarak yeniden zar attırılamaz.

## 6. Günlük sınır ve azalan getiri (ledger #18 çerçevesi)

| Günün vuruşu (tüm damarlar toplamı) | Verim | Tecrübe | Gerekçe |
|---|---|---|---|
| 1–40 | ×1,0 | ×1,0 | Aktif oyuncunun doğal günü (≈ 7 damar × 6) |
| 41–60 | ×0,5 (aşağı yuvarla, başarıda en az 1) | ×0,5 | Tutkulu oyuncu ilerler, bot avantajı küçülür |
| 61+ | — | — | **Kazı kapanır**: "BUGÜNLÜK KAZI BİTTİ · 04:00'TE YENİLENİR" |

Ledger #18'deki maç Altını eşiğine (15 / 30) benzer iki basamak. Sayaç günlük, sunucuda (`maden_gunluk`), gün 04:00 TRT. Harita maçları bu sayaca girmez (ayrı sayaç: günlük 10 sayılan harita maçı, 01 § 5).

Sim sonucu (06 Tablo E): bu kural setiyle bot çiftliği tutkulu oyuncunun **1,08 katı** cevher toplar; azalan getiri kaldırılırsa 1,29 (v1) / 1,40 (tam), tavan kaldırılırsa 1,21 / 1,99.

## 7. Anti-bot ve hile önlemleri

| # | Önlem | Ne keser |
|---|---|---|
| A1 | Sonuç, kademe, nadir yuva, tecrübe **yalnız sunucuda**; istemci yalnız "vuruyorum" ve isabet zamanını yollar | Sahte verim |
| A2 | Vuruşlar arası en az **700 ms** (sunucu saati); hızlısı 429 `erken` | Makro hızlandırma |
| A3 | İsabet doğrulama: sunucu her vuruşun başlangıç anını kendi saatiyle tutar; istemcinin bildirdiği `isabetMs` sunucu geçen süresiyle **±150 ms** içinde (H-H6 ölçümüne göre en çok 250 ms'ye genişletilebilir) değilse isabet sayılmaz (vuruş yine işler) | Zaman uydurma |
| A4 | Halka fazı her vuruşta sunucu rastgelesiyle kayar (`fazMs`) | Sabit ritimli makro |
| A5 | Günlük 60 vuruş tavanı, 41+ yarım (§ 6) | Çiftlik ölçeği |
| A6 | Seans 5 dk hareketsizlikte kapanır; aynı anda tek açık seans | Çoklu sekme |
| A7 | Telemetri: `maden_vurus` tablosu 30 gün tutulur; günlük isabet oranı ≥ %98 ve vuruş aralığı varyansı < 20 ms olan hesap `@vault` raporuna düşer (otomatik ceza yok, insan bakar) | Mükemmel bot |
| A8 | Hesap kaydı zaten kaba kuvvet sınırlı (backend § 2); çoklu hesap çiftliği G-0 sayesinde maç gücüne dönüşmez, yalnız kozmetik üretir | Değer sızıntısı |

Mükemmel isabetli bir bot bile tavanı aşamaz; isabet kazancı en çok +1/vuruş ve 60 vuruşla sınırlı (06 Tablo E "bot çiftliği" profili isabet %100 ile koşuldu).

## 8. G-0 sınaması (bu belge)
Cevher ve Madencilik Ustalığı maçta hiçbir sayıya girmez. Cevherin tek çıkışı Ocak'tır (03); Ocak'ın çıktıları kozmetik ya da bayraklı yan-grade parçadır. Maden ekranı sim koşmaz (REST seansı), `src/paylasilan/sim` dokunulmaz.
