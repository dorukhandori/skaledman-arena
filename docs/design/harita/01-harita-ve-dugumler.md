# 01 · Harita ve düğümler

**Bağlı:** [`00`](00-genel-bakis.md) (döngü, G-0, video varsayımı), [`02`](02-maden-sistemi.md) (maden düğümü), [`05`](05-basarim-entegrasyonu.md) (başarım sayımı), [`06`](06-ekonomi-ve-denge.md) (ödül sayıları), [`07`](07-ux-ekranlar.md) § 2–3 (ekran), [`08`](08-teknik-tasarim.md) § 3–6 (kayıt, uçlar). Sayılar: [`veri-taslak/harita.json`](veri-taslak/harita.json).

## 1. Harita yapısı

- **Dünya = 6 bölge**, her bölge bir element (çark sırası, Kaya'dan başlar; 02 § 2 "neden bu sıra"). **İlk sürüm: Bölge 1–3**; 4–6 sezon 2 (`ilkSurum:false`).
- **Bölge = tek ekran, sabit kamera** (S2: kaydırma/yakınlaştırma yok). Bölgeler arası geçiş başlık plakasındaki ◄ ► ile (07 § 2). Mobilde de aynı: yatay telefon 640×360 mantıksal alanına bir bölge sığar.
- **Bölge = 12 düğümlü yönlü grafik (DAG)**, tek giriş (düğüm 01), iki dallı orta, tek patron (11), patron sonrası Derin Damar (12). Bütün bölgeler aynı topolojiyi kullanır (öğrenilen harita okuması bölgeden bölgeye taşınır, S1); farkı element, zorluk, kademe ve konumlar verir.

| Bölge | Kimlik | Ad (ekranda) | Element | Damar kademeleri (erken / geç / nadir) | Düşman zorluğu | Patron | Sürüm |
|---|---|---|---|---|---|---|---|
| 1 | `ocak-yamaci` | OCAK YAMACI | Kaya | K1 / K2 / K2–K3 | 1, 1, 2, 2, 3 | OCAK USTASI (4) | ilk |
| 2 | `ayaz-gecidi` | AYAZ GEÇİDİ | Don | K2 / K3 / K3–K4 | 2, 2, 3, 3, 3 | AYAZ USTASI (5) | ilk |
| 3 | `kor-kraterleri` | KOR KRATERLERİ | Kor | K3 / K4 / K4–K5* | 2, 3, 3, 4, 4 | KRATER USTASI (5) | ilk |
| 4 | `yel-sirti` | YEL SIRTI | Kasırga | K4 / K5 / K5–K6 | 3, 3, 4, 4, 4 | YEL USTASI (5) | sezon 2 |
| 5 | `cakim-yaylasi` | ÇAKIM YAYLASI | Şimşek | K5 / K6 / K6–K7 | 3, 4, 4, 4, 5 | ÇAKIM USTASI (5) | sezon 2 |
| 6 | `dip-magaralari` | DİP MAĞARALARI | Girdap | K6 / K7 / K7–K8 | 4, 4, 4, 5, 5 | DİP USTASI (5) | sezon 2 |

\* İlk sürümde K5 yoktur: kademe tavanı 4 olduğundan Bölge 3'ün nadir yuvası K4'te kalır (sunucu `min(kademe, surumTavani)`).

## 2. Yerleşim (topoloji, tüm bölgeler)

Mantıksal ızgara 480×270 (menü ızgarası, `menu-tasarim-arastirma.md` § 5.4); harita alanı x 8–472, y 28–214 (altında düğüm şeridi, y 218–266). Düğüm merkezleri y 40–192 aralığında: altta yıldız satırı için 20 px boşluk (maket kontrolüyle bulundu). Koordinatlar `harita.json` `konum`.

```
                         (05)M───────(07)D───(08)M──┐
                        ╱             ╱   ╲          ╲
               (03)D───╯             ╱     ╲          (10)S───(11)P
              ╱                     ╱       ╲        ╱          │
       (02)M─╯                     ╱         (09)D──╯           │
      ╱     ╲                     ╱                            (12)M  Derin Damar
 (01)D       (04)S───────(06)D───╯
  giriş
D = DÜŞMAN · M = MADEN · S = SANDIK · P = PATRON
```

Kenarlar (yönlü, `komsu`): 01→02 · 02→03, 02→04 · 03→05 · 04→06 · 05→07 · 06→07 · 07→08, 07→09 · 08→10 · 09→10 · 10→11 · 11→12 · 11→(sonraki bölgenin 01'i).

İki dal (03–05 / 04–06) birleşip 07'de buluşur: oyuncu ilk turda **bir** dalı seçerek 07'ye ulaşabilir (en kısa yol 7 düğüm). İkinci dal yıldız ve damar için geri dönülecek yerdir. 08 ve 09 da aynı biçimde 10'da birleşir.

## 3. Düğüm türleri

| Tür | Simge | Amaç | Giriş koşulu | Süre | Ödül (ilk) | Başarısızlık sonucu | TAMAM sayılması |
|---|---|---|---|---|---|---|---|
| **DÜŞMAN** | çapraz iki topaç | Bota karşı normal maç (ilk 3 puan, 90 sn + ani ölüm); yıldız şartları | Düğüm AÇIK, oynanabilir takım | ≈ 1,5–2,5 dk | Yıldız başı Altın + cevher (§ 4) | Mağlubiyet: 30 Altın (sayılan maçsa), düğüm AÇIK kalır, tekrar sınırsız | İlk galibiyet (en az 1 yıldız) |
| **MADEN** | kazma + kademe rengi | Kazı seansı (02 § 3) | Düğüm AÇIK; kazmak için Ustalık ≥ damar eşiği | 6–8 vuruş ≈ 15–25 sn | Cevher + Madencilik tecrübesi | Iska: cevher yok, yarım tecrübe; hiçbir şey kaybolmaz | **Görüldüğü an** (açılınca); Ustalık yetmese de harita ilerler |
| **SANDIK** | sandık | Tek seferlik hediye; dallar arası "uğrama" sebebi | Düğüm AÇIK | Tek dokunuş | `150·n` Altın + 6 cevher (bölge kademesi) | — | Açınca |
| **PATRON** | taç + topaç | Bölge sonu: güçlü takım (Lv.3 Çekirdekler, bölge elementinin hizip parçaları) | Düğüm AÇIK | ≈ 2–3 dk | Altın + 3 külçe (K+1) + yıldız ödülleri; **sonraki bölgeyi açar**; başarım | Mağlubiyet aynı DÜŞMAN gibi | İlk galibiyet |

### 3.1 DÜŞMAN ve PATRON: "özel kurallı maç" ne demek
Sim **değişmez**: düğüm maçı tam olarak hızlı maçın bot maçıdır (D7: `mod:"hizli"` bot dolgusu yolu). Düğümü farklılaştıran yalnız **sim dışı** parametrelerdir:

| Parametre | Kaynak | Nereye gider |
|---|---|---|
| `botKip` (`kukla` · `dolas` · `kenar` · `dayaniklilik`) | `harita.json` | `MacYonetimi` bot kipi (mevcut `BOT_KADEMELERI`) |
| `botSeviye` (1–3) | `harita.json` | Bot takım üyelerinin `seviye` alanı (yuva kapıları; Lv.1'de yetenek yok) |
| `takim` (3 × [Çekirdek, Gövde, Disk, Uç]) | `harita.json` | Bot takım kodu (mevcut takım kodu biçimi) |
| `yildiz` (3 şart) | `harita.json` | **Sunucu, maç sonunda** maç özetinden değerlendirir (`ozetSayaci`) |
| tohum | sunucu | mevcut |

Zorluk → bot eşlemesi (her bölgenin tek takımı vardır: üç tip, bölge elementinin parçaları; `harita.json` `takim`):

| Zorluk | Bot kipi | Bot seviyesi | Takım | Hedef kazanım (insan, ilk deneme; H-H4) |
|---|---|---|---|---|
| 1 | `kukla` | Lv.1 | Bölge takımı | %85+ |
| 2 | `dolas` | Lv.2 | Bölge takımı | %70–80 |
| 3 | `kenar` | Lv.2 | Bölge takımı | %60–70 |
| 4 | `dayaniklilik` | Lv.3 | Bölge takımı | %50–60 |
| 5 | `dayaniklilik` | Lv.3 | Bölge takımı (Kor, Şimşek, Girdap bölgelerinde hizip parçalı) | %40–55 |

### 3.2 Yıldız şartları (sunucu, maç özeti)

| Kimlik | Ekranda | Koşul (maç özeti alanı) |
|---|---|---|
| `kazan` | KAZAN | Maçı kazan |
| `temiz` | TEMİZ KAZAN | Kazan ve kalan takım staminası ≥ %50 (mevcut "temiz galibiyet" tanımı, tuning § 14) |
| `hizli` | 60 SN'DE KAZAN | Kazan ve maç süresi ≤ 60 sn |
| `ringOut` | RING OUT İLE PUAN | Kazan ve en az bir turu Ring Out ile al |
| `durma` | DURMA İLE PUAN | Kazan ve en az bir turu Durma ile al |
| `parcalanma` | PARÇALANMA İLE PUAN | Kazan ve en az bir turu Parçalanma ile al |
| `yetenekBitis` | YETENEKLE BİTİR | Kazan ve bir turu Yetenek kullandıktan ≤ 3 sn içinde bitir (mevcut `yetenegiyleBitis`) |

Her düşman düğümünde 3 yıldız: ilki hep `kazan`, diğer ikisi düğüme özgü (`harita.json` `yildiz`). Yıldızlar **birikimlidir** (bit maskesi): her yıldız bir kez ödüllenir; sonraki denemede eksik yıldız alınabilir. Yıldız şartları maçın kendi derinliğini (Ring Out kenar kontrolü, Yetenek zamanlaması) öğretir: S1 "zor ustalaşma" ana kaldıraç budur.

### 3.3 Neden "Dinlenme / Yolcu" düğümü yok
Maçlar arasında hiçbir şey taşınmaz (stamina, hasar, Yapay ömrü hariç): her düşman düğümü taze bir tam maçtır. Dinlenme düğümünün iyileştireceği bir şey yok; "yolcu/tüccar" düğümü Market'in kopyası olur (S2). İleride gerekirse SANDIK türü bu rolü genişletir (99 S-2).

## 4. Ödüller (ilk tamamlama)

| Düğüm | Altın | Cevher / külçe | Not |
|---|---|---|---|
| DÜŞMAN, yıldız başı | `50 + 25(n−1)` | 2 cevher, kademe = bölge no (K=n) | 3 yıldız: Bölge 1'de 150 Altın + 6 Demir |
| PATRON, ilk galibiyet | `500 + 250(n−1)` | 3 **külçe** K=n+1 (bir üst kademenin tadı) | + başarım (05) |
| PATRON, yıldız başı | `100 + 50(n−1)` | 2 cevher K=n+1 | |
| SANDIK | `150·n` | 6 cevher K=n | tek sefer |
| MADEN | — | 02 § 2–5 | |

Bölge 1 tam yıldızla tek seferlik toplam: **1 850 Altın**, 42 Demir + 6 Kaya cevheri + 3 Kaya külçesi (06 § 3).

## 5. Tekrar oynanabilirlik ve yenilenme

| Konu | Kural |
|---|---|
| Tamamlanan DÜŞMAN/PATRON | Sınırsız tekrar. **Günde ilk 10 harita maçı "sayılır"**: galibiyet 2 cevher (DÜŞMAN: K=n, PATRON: K=n+1) + 50 Altın, mağlubiyet 30 Altın; Çekirdek XP (hızlı maç tablosu); başarım sayaçları (05 § 3). 11. maçtan sonra: maç oynanır, hiçbir ödül, XP ya da sayaç yok (ekranda "BUGÜNLÜK ÖDÜL BİTTİ" etiketi) |
| Eksik yıldız | Her zaman alınabilir; ilk-yıldız ödülü **10 sınırına takılmaz** (bir kez verilir) |
| MADEN | Her gün 04:00 TRT dolar (02 § 5) |
| SANDIK | Tek sefer; açıldıktan sonra boş sandık simgesi |
| Harita maçı ve günlük maç sayısı | Harita maçları hızlı maçın günlük azalan getiri numarasına sayılır (06 § 4) |
| Maç < 20 sn, teslim, hükmen | Mevcut kurallar: Altın 0, yıldız/ödül yok, sayaç işlemez (backend § 8 kapılar) |
| Antrenman | Haritadan bağımsız; değişmez |

## 6. İlerleme kaydı: ne kalıcı?

| Veri | Kalıcı mı | Nerede (08 § 3) |
|---|---|---|
| Düğüm durumu (kilitli/açık/tamam) ve yıldız maskesi | Evet, sonsuza dek | `harita_dugum` |
| Günlük damar kullanımı, nadir yuva | Gün boyu; ertesi gün sıfır | `maden_gunluk` |
| Cevher ve külçe | Evet | `cevher` |
| Ustalık | Evet, sıfırlanmaz | `ustalik` |
| Kozmetik ürünler, cila | Evet | `gorunum_sahip`, `parca.cila` |
| Açık kazı seansı | 5 dk; kopmada kaybolur (vuruşlar zaten yazılmıştır) | `maden_seans` |
| Harita maçı | Normal maç satırı + `dugum_id` | `mac` |

**Kilit mantığı:** düğüm, gelen kenarlarından **herhangi biri** TAMAM ise AÇIK'tır (tek bir ön koşul yeter). Sunucu durumu türetebilir ama kayıt tutar (sezon 2'de topoloji değişirse eski oyuncunun açık düğümleri korunur). Bölge n+1'in 01'i, bölge n patronu TAMAM olunca açılır. Bölge listesinde kilitli bölge "???" değil, adı ve "BÖLGE 1 PATRONU" kilit etiketiyle görünür (hedef göstermek, sadelik S-8).

## 7. Harita ne zaman açılır (S1 kademeli açılma)

| Durum | Oyuncu ne görür |
|---|---|
| Misafir | Harita yok (oyna ekranında mod da yok) |
| Hesap var, İlk Devir (Antrenman eğitimi) yok | Oyna ekranında HARİTA yok |
| İlk Devir tamam | Oyna ekranında 4. mod **HARİTA** belirir; Pergel tek ipucu: "Haritada bota karşı oyna, cevher kaz." |
| İlk düğüm (01) TAMAM | "İlk Adım" başarımı |
| İlk kazı | "İlk Kazı" başarımı → Atölye alt şeridinde **OCAK** belirir |

## 8. Yeni oyuncu: ilk 5 dakika (S1 senaryosu)

| Dakika | Ne olur | Öğrettiği |
|---|---|---|
| 0:00 | Eğitim biter ("İlk Devir"), sonuç ekranında ana düğme ATÖLYE; Oyna'da yeni HARİTA modu parlar (tek seferlik çentik animasyonu) | Yeni yer var |
| 0:20 | HARİTA → Ocak Yamacı; yalnız 01 açık, diğerleri sönük yol çizgileriyle görünür. 01 seçili gelir; alt şerit: "DÜŞMAN · ZORLUK ●○○○○ · ★ KAZAN · ★ TEMİZ KAZAN · ★ 60 SN'DE KAZAN" + **DÖVÜŞ** | Düğüm = maç; yıldız = hedef |
| 0:30–2:30 | Kukla bota karşı maç (kendi takımı, ödünçler dahil). Kazanır (%85+) | Maç aynı maç |
| 2:30 | Sonuç ekranı: yıldızlar tek tek yanar (Kuşak halkası çentiği), "+100 ALTIN · +4 DEMİR"; ana düğme **HARİTA** | Ödül |
| 2:45 | Haritada 01→02 yolu ışıklanır (halka rengi), 02 MADEN seçili gelir: "MADEN · DEMİR · USTALIK 0 · 6/6"; ana düğme **KAZ** | Yeni düğüm açıldı |
| 3:00–3:30 | Maden ekranı; Pergel: "Işık bronz yaydayken bas: İSABET." 6 vuruş; ilk vuruş en az %50 başarı | Kazı, isabet, Ustalık |
| 3:30 | "İlk Kazı" başarımı kartı: "OCAK AÇILDI" | Ocak |
| 3:45 | Haritaya dönüş: iki yol açık (03 DÜŞMAN, 04 SANDIK). SANDIK'a dokunur: AÇ → 150 Altın + 6 Demir | Dallanma |
| 4:00–5:00 | Atölye › OCAK: Demir satırı "12 CEVHER", ana düğme **ERİT** → "3 KÜLÇE"; tek tarif görünür: "DEMİR ARMASI · 5 KÜLÇE · 100 ALTIN" (henüz 3 külçe: eksik gösterilir) | Ocak döngüsü; bir sonraki hedef |

Ölçüt: ilk 5 dakikada bir galibiyet, bir kazı, bir eritme (H-H7).

## 9. Bölge 1 "Ocak Yamacı": düğüm tablosu

Takım (bütün DÜŞMAN ve PATRON): `kaya-maden + kalkan-govde + agir-disk + igne-uc` · `girdap-maden + halka-govde + alcak-disk + top-uc` · `kor-goktasi + ok-govde + hafif-disk + duz-uc` (Kale, Dayanıklı, Saldırgan: tip üçgenini görmek).

| Düğüm | Tür | Konum | Komşu → | Zorluk / bot | Yıldızlar | Damar | Ödül (ilk) |
|---|---|---|---|---|---|---|---|
| b1-01 | DÜŞMAN | 40, 188 | 02 | 1 · kukla Lv.1 | kazan · temiz · hizli | — | 3★: 150 Altın + 6 Demir |
| b1-02 | MADEN | 92, 160 | 03, 04 | — | — | K1 Demir, 6/gün, nadir K2 %10 | kazı |
| b1-03 | DÜŞMAN | 150, 110 | 05 | 1 · kukla Lv.1 | kazan · yetenekBitis · hizli | — | 3★: 150 Altın + 6 Demir |
| b1-04 | SANDIK | 160, 190 | 06 | — | — | — | 150 Altın + 6 Demir |
| b1-05 | MADEN | 215, 80 | 07 | — | — | K1 Demir, 6/gün, nadir K2 %10 | kazı |
| b1-06 | DÜŞMAN | 228, 180 | 07 | 2 · dolas Lv.2 | kazan · ringOut · hizli | — | 3★: 150 Altın + 6 Demir |
| b1-07 | DÜŞMAN | 285, 140 | 08, 09 | 2 · dolas Lv.2 | kazan · ringOut · temiz | — | 3★: 150 Altın + 6 Demir |
| b1-08 | MADEN | 335, 80 | 10 | — | — | K2 Kaya, 6/gün, nadir K3 %10 | kazı |
| b1-09 | DÜŞMAN | 345, 188 | 10 | 3 · kenar Lv.2 | kazan · durma · hizli | — | 3★: 150 Altın + 6 Demir |
| b1-10 | SANDIK | 392, 140 | 11 | — | — | — | 150 Altın + 6 Demir |
| b1-11 | PATRON "OCAK USTASI" | 440, 95 | 12, b2-01 | 4 · dayaniklilik Lv.3 | kazan · durma · hizli | — | 500 Altın + 3 Kaya külçesi; 3★: +300 Altın + 6 Kaya |
| b1-12 | MADEN "DERİN DAMAR" | 440, 188 | — | — | — | K2 Kaya, 8/gün, nadir K3 %15 | kazı |

Not: b1-12 patron sonrası açılır; Bölge 1'e "geri dönme" sebebi olarak Kaya cevherinin en verimli kaynağıdır (Bölge 2'nin erken damarları da K2'dir, bilerek örtüşür).

## 10. G-0 sınaması (bu belge)
Düğüm ödülleri Altın, cevher, külçe ve başarım ilerlemesidir. Altın Market'te zaten açık parçayı alır (mevcut kural); hiçbir harita ödülü parça açmaz, parça vermez, stat vermez. Çekirdek XP hızlı maç tablosuyla aynı ve günlük 10 maçla sınırlı.
