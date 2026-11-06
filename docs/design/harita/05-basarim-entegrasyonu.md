# 05 · Başarım entegrasyonu

**Bağlı:** [`01`](01-harita-ve-dugumler.md) § 5 (sayılan maç), [`06`](06-ekonomi-ve-denge.md) § 3 (Altın dengesi), [`08`](08-teknik-tasarim.md) § 6 (sunucu). Mevcut: `veri/basarimlar.json` (46), `src/paylasilan/kurallar/basarim.ts` (`basarimIsle`, `macKapisi`), `src/sunucu/oyuncu/basarimYaz.ts`. Taslak: [`veri-taslak/basarimlar-harita.json`](veri-taslak/basarimlar-harita.json).

## 1. İki yol
1. **Mevcut başarımlar haritada ilerler** (sahibin isteği: "üzerinden bizim achievementları da ilerletebildiğimiz"): harita maçı yeni bir özet modu (`harita`) olur; başarım başına bir alan (`haritaZorlukMin`) hangi başarımın hangi zorluktaki düğümde sayıldığını söyler (§ 3).
2. **Yeni başarımlar**: harita, maden, Ocak ve parça üretimi için **29** başarım (22 ilk sürüm + 7 sezon 2), aynı JSON biçiminde (§ 2, § 2.3).

Sekme sayısı **6'da kalır** (referans 05, sadelik § 2.4): yeni başarımlar mevcut **YOL**, **GÖSTERİ** ve gizli sekmelerine dağılır. Yedinci "HARİTA" sekmesi alternatifi 99 S-4'te.

## 2. Yeni başarımlar

| # | Kimlik | Ad | Sekme | Olay (yeni) | Sayı / koşul | Altın | Açtığı | Gizli | İlk sürüm |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `ilk-adim` | İlk Adım | Yol | `dugumTamam` | 1 | 100 | — | | ✔ |
| 2 | `ilk-kazi` | İlk Kazı | Yol | `cevherKazildi` | 1 | 100 | özellik `atolye-ocak` (Ocak görünür) | | ✔ |
| 3 | `ilk-kulce` | İlk Külçe | Yol | `eritme` | 1 | 100 | — | | ✔ |
| 4 | `ocak-yamaci` | Ocak Yamacı | Yol | `bolgeTamam` | `{bolge: ocak-yamaci}` | 300 | görünüm `arma-kazma` | | ✔ |
| 5 | `ayaz-gecidi` | Ayaz Geçidi | Yol | `bolgeTamam` | `{bolge: ayaz-gecidi}` | 500 | — | | ✔ |
| 6 | `kor-kraterleri` | Kor Kraterleri | Yol | `bolgeTamam` | `{bolge: kor-kraterleri}` | 800 | görünüm `cerceve-krater` | | ✔ |
| 7 | `madenci` | Madenci | Yol | `ustalikSeviye` | `{ustalik: madencilik, seviye: 25}` | 300 | — | | ✔ |
| 8 | `usta-madenci` | Usta Madenci | Yol | `ustalikSeviye` | `{madencilik, 50}` | 800 | — | | ✔ |
| 9 | `ocakci` | Ocakçı | Yol | `ustalikSeviye` | `{isleme, 25}` | 300 | — | | ✔ |
| 10 | `usta-ocakci` | Usta Ocakçı | Yol | `ustalikSeviye` | `{isleme, 50}` | 800 | — | | ✔ |
| 11 | `cevher-defteri` | Cevher Defteri | Yol | `cevherCesidi` | 4 farklı kademe | 300 | — | | ✔ |
| 12 | `otuz-yildiz` | Otuz Yıldız | Gösteri | `yildizToplam` | 30 | 300 | — | | ✔ |
| 13 | `bolge-altin` | Altın Bölge | Gösteri | `bolgeRozet` | bir bölgede ALTIN rozet (34/34 aşama, 13 § 3.3) | 800 | görünüm `cerceve-yildiz` | | ✔ |
| 14 | `usta-isi` | Usta İşi | Gösteri | `ustaIsi` | 1 | 500 | — | | ✔ |
| 15 | `nadir-damar` | Nadir Damar | (gizli) | `nadirDamar` | 1 | 300 | — | ✔ | ✔ |
| 16 | `tam-isabet` | Tam İsabet | (gizli) | `isabetSerisi` | 10 ardışık (seanslar arası sürer, gün içinde) | 300 | — | ✔ | ✔ |
| 17 | `yel-sirti` | Yel Sırtı | Yol | `bolgeTamam` | | 800 | — | | sezon 2 |
| 18 | `cakim-yaylasi` | Çakım Yaylası | Yol | `bolgeTamam` | | 800 | — | | sezon 2 |
| 19 | `dip-magaralari` | Dip Mağaraları | Yol | `bolgeTamam` | | 1 500 | görünüm `arma-dip` | | sezon 2 |
| 20 | `buyuk-madenci` | Büyük Madenci | Yol | `ustalikSeviye` | `{madencilik, 100}` | 1 500 | görünüm `cerceve-usta-madenci` | | sezon 2 |
| 21 | `buyuk-ocakci` | Büyük Ocakçı | Yol | `ustalikSeviye` | `{isleme, 100}` | 1 500 | görünüm `cerceve-usta-ocakci` | | sezon 2 |
| 22 | `devir-tasi` | Devir Taşı | (gizli) | `cevherKazildi` | `{kademe: 8}` | 1 500 | — | ✔ | sezon 2 |
| 23 | `tam-defter` | Tam Defter | Yol | `cevherCesidi` | 8 | 800 | — | | sezon 2 |

**Ödül dengesi:** yukarıdaki 16 ilk sürüm başarımı 6 600 Altın, parça üretimi başarımları 2 500 (§ 2.0); toplam **9 100**; sezon 2 = 8 400. Gider tarafı: kozmetik işçilik 3 000 + parça işçiliği (12 kilitli parça en düşük malzemeyle 6 600; tekrar biçimlerle sınırsız) (06 § 3). Zorluk etiketi mevcut kurala göre Altından türer (Kolay 100 · Orta 300 · Zor 800 · Efsane 1 500). Yeni başarımların hiçbiri Market parçası açmaz (G-6): yalnız Altın, görünüm ve "Ocak" özelliği.
**Neden "Madenci 25 / 50"** ilk sürümde: Tablo A'ya göre aktif oyuncu 25'e 5. günde, 50'ye ≈ 14. günde ulaşır; ilk sürüm tavanında (K4) ulaşılabilir son anlamlı eşik 50'dir.

### 2.0 Parça üretimi başarımları (güncelleme, 12 § 9)

| # | Kimlik | Ad | Sekme | Olay (yeni) | Sayı / koşul | Altın | Açtığı |
|---|---|---|---|---|---|---|---|
| 24 | `ilk-parca` | İlk Parça | Yol | `parcaUret` | 1 | 100 | — |
| 25 | `vitrin` | Vitrin | Yol | `vitrinDolu` | 3 yuva | 100 | — |
| 26 | `tam-takim` | Tam Takım | Gösteri | `malzemeTopac` | bir topacın 4 parçası aynı kademede üretilmiş | 500 | — |
| 27 | `malzeme-defteri` | Malzeme Defteri | Gösteri | `tanimKademeCesidi` | aynı parçanın 4 farklı kademede biçimi | 500 | — |
| 28 | `usta-parca` | Usta Parça | Gösteri | `ustaIsi` `{tur: parca}` | 1 | 500 | — |
| 29 | `degerli-koleksiyon` | Değerli Koleksiyon | Gösteri | `koleksiyonDegeri` | değer puanı 5 000 | 800 | görünüm `cerceve-koleksiyon` |

İlk sürüm yeni başarım Altını: 6 600 + 2 500 = **9 100**. Hiçbiri parça vermez ya da kilit açmaz.

### 2.1 Taslak JSON (biçim `veri/basarimlar.json` ile birebir; ilk üç örnek, tamamı taslak dosyada)

```json
{"id":"ilk-adim","ad":"İlk Adım","kategori":"yol","sart":{"olay":"dugumTamam","sayi":1,"kosul":{}},"odulAltin":100,"acilanParcalar":[],"acilanGorunum":[],"acilanOzellik":[],"gizli":false,"ilkSurum":true}
{"id":"ilk-kazi","ad":"İlk Kazı","kategori":"yol","sart":{"olay":"cevherKazildi","sayi":1,"kosul":{}},"odulAltin":100,"acilanParcalar":[],"acilanGorunum":[],"acilanOzellik":["atolye-ocak"],"gizli":false,"ilkSurum":true}
{"id":"usta-madenci","ad":"Usta Madenci","kategori":"yol","sart":{"olay":"ustalikSeviye","sayi":1,"kosul":{"ustalik":"madencilik","seviye":50}},"odulAltin":800,"acilanParcalar":[],"acilanGorunum":[],"acilanOzellik":[],"gizli":false,"ilkSurum":true}
```
Gizli başarımlar (`nadir-damar`, `tam-isabet`, `devir-tasi`) mevcut düzende `kategori:"gizli"`.

### 2.2 Olay sözlüğüne eklenenler (tuning § 21'e)
| Olay | Kim tetikler | Tür (`basarim.ts` dönüşü) |
|---|---|---|
| `dugumTamam` | harita: düğüm ilk kez TAMAM | artış |
| `bolgeTamam` | patron ilk galibiyet; koşul `bolge` | artış |
| `yildizToplam` | harita: toplam yıldız (durum) | durum |
| `bolgeYildizTam` | harita: bir bölgenin tüm yıldızları (durum) | durum |
| `cevherKazildi` | kazı başarılı; koşul `kademe` (isteğe bağlı) | artış |
| `nadirDamar` | nadir yuvadan cevher | artış |
| `isabetSerisi` | ardışık isabet (gün içi sayaç) | en yüksek seri |
| `cevherCesidi` | farklı kademe (küme) | küme (`basarim_kume`, anahtar = kademe) |
| `eritme` | başarılı eritme partisi | artış |
| `ustaIsi` | Usta işi dövme | artış |
| `ustalikSeviye` | Ustalık seviye değişimi (durum); koşul `ustalik`, `seviye` | durum |

Yeni koşul anahtarları: `bolge`, `kademe`, `ustalik` (+ mevcut `seviye`). `DURUM_OLAYLARI` kümesine `yildizToplam`, `bolgeYildizTam`, `ustalikSeviye` eklenir; maç dışı olaylar (`cevherKazildi`, `eritme`, `ustaIsi`, `nadirDamar`, `isabetSerisi`) `OLAY_OLAYLARI` gibi uçtan (REST) işlenir.

## 3. Mevcut 46 başarımın haritada sayılması

**Kural:** harita maçı özet modu `harita` olur. `macKapisi`:
```
m.mod === "harita"  →  b.haritaZorlukMin !== undefined && m.dugumZorluk >= b.haritaZorlukMin && m.haritaSayilan
```
`haritaSayilan` = günün ilk 10 harita maçından biri (01 § 5). `modUyar` "harita"yı tanımaz: `mod: ["hizli","dereceli"]` koşullu galibiyet sayıları **haritada sayılmaz** (PvP kimliği). Durum başarımları (Çekirdek Lv.3, Yapay ömrü, parça sayısı) zaten moddan bağımsız.

| Kategori | Başarım | Haritada | `haritaZorlukMin` | Gerekçe |
|---|---|---|---|---|
| Yol | ilk-devir | — | — | Antrenman olayı |
| Yol | ilk-galibiyet, on/elli/yüz-galibiyet, yuz-mac | **Hayır** | — | `mod` filtreli; PvP sayısı kalır |
| Yol | uclu | Evet | 2 | Üç farklı Çekirdekle kazanmak bota karşı da öğretici |
| Yol | parlayan | (durum) | — | moddan bağımsız |
| Bitiş | dusurucu, kirici, son-doren | Evet | 2 | Bitiş türünü bota karşı çalışmak; yıldız şartlarıyla aynı yön |
| Bitiş | uc-yonlu | Evet | 2 | |
| Bitiş | seri | **Hayır** | — | Bota karşı seri kolay; PvP anlamı |
| Bitiş | hizli-bitis, temiz-galibiyet | Evet | 3 | Kolay botta bedava olur |
| Element | 6 × element ustası, cark-tamam | Evet | 2 | Element çeşitliliği teşviki |
| Element | zit-kutup | Evet | 2 | |
| Risk | kriz-donusu, sabir, geri-gelis, son-nefes | Evet | 3 | Gerçek baskı ister |
| Risk | kenar-yuruyusu | Evet | 2 | |
| Gösteri | takim-ultisi | Evet | 1 | Oyuncunun kendi becerisi |
| Gösteri | alan-ustasi, yetenek-ustasi, dash-ustasi, zincir | Evet | 2 | |
| Kararma | mor-catlak, aydinlanma, kara-galibiyet | (ilk sürümde kapalı) | 3 | Açılınca Risk gibi |
| Sosyal | destek-kanali, davetli, ev-sahibi | **Hayır** | — | Oda/kanal olayı |
| Yapay | asinmis | (durum) | — | Harita maçı Yapay ömrünü düşürür (normal maç) |
| Yapay | dokumhane-musterisi | — | — | Market olayı |
| Yapay | yapay-ustasi | Evet | 2 | |
| Gizli | sifir-darbe, son-saniye, ani-olum | Evet | 3 | |
| Gizli | koleksiyoncu | (durum) | — | `parcaSahip` dövme parçaları saymaz (`katman ≠ dovme`) |

Sayım: 46'nın **29**'u haritada ilerler (Kararma açılınca 32); 3 durum başarımı moddan bağımsız ilerler; 9'u ilerlemez (5 PvP galibiyet sayısı, `seri`, 3 Sosyal); 2'si maç dışı olaydır (`ilk-devir`, `dokumhane-musterisi`).

**Hile sınaması:** zorluk 1 (kukla) düğümünde yalnız `takim-ultisi` sayılır; bot çiftliği en kolay düğümde başarım kasamaz. Günlük 10 sayılan maç sınırı ve normal maç kapıları (< 20 sn, teslim, hükmen) aynen geçerli.

## 4. Sunucu sayacı
- **Maç başarımları:** `macSonuKaydet` (tek işlem) harita maçında `MacOzeti`'ne `mod:"harita"`, `dugumZorluk`, `haritaSayilan` ekler; `basarimIsle` aynı çağrı.
- **Maç dışı başarımlar:** maden ve Ocak uçları kendi işlemlerinde `basarimIsle`'ye yeni bir giriş türüyle (`{tur:"olay", olay, kosul}`) çağırır; ödül defteri referansı mevcut biçim `basarim:<id>:<oyuncu>` (idempotent).
- **Durum başarımları:** Ustalık seviyesi ve yıldız toplamı yazıldıktan sonra aynı işlemde değerlendirilir.
- Sonuç ekranı ve maden sonucu, tamamlanan başarımı mevcut "MARKET'TE AÇILDI" yerine **"AÇILDI"** kartıyla gösterir (görünüm/özellik açan başarım için; ana düğme ilgili yere götürür: OCAK, PROFİL).

## 5. G-0 sınaması (bu belge)
Yeni başarımlar Market parçası açmaz; açtıkları yalnız görünüm ve Ocak özelliğidir. Mevcut başarımların haritada sayılması Market kilitlerine giden yolu kısaltmaz, **çeşitlendirir** (aynı eşik, ikinci bir oynama biçimi); eşikler değişmez.
