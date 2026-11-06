# 06 · Ekonomi ve denge: kaynak/gider, sayılar, simülasyon, hipotezler

**Şapka:** `@ledger` · **Bağlı:** [`02`](02-maden-sistemi.md), [`03`](03-atolye-isleme.md), [`04`](04-ustalik-sistemi.md), [`01`](01-harita-ve-dugumler.md) § 4–5. Mevcut ekonomi: `docs/design/tuning.md` § 14–17, ledger #14, #18, #25.
**Güncelleme (2026-11-06, ikinci tur):** parça üretimi ve pahalı Market ([`12`](12-parca-uretimi-ve-market.md)), araştırma bulguları ([`11`](11-arastirma-craft-market-ilerleme.md)): başarı eğrisi fark 0–25'e yayıldı (eğim 0,018), 3 ardışık ıskadan sonra garanti başarı, 1–40 vuruş "DİNÇ VURUŞ" adıyla, 61+ vuruş cevher 0 / tecrübe ×0,1 (kilit yok; damar kapasitesi sert sınır), cila kalktı. Tablolar A–F yeniden koşuldu (fark ≤ 1 gün; ham çıktı `sim-cikti-*.md`); yeni Tablo G § 7.5.
**Durum:** ilk tuning. Sayılar Monte Carlo ile **iç tutarlılık** için doğrulandı; insan verisiyle ölçülmedi (ledger "Kalan riskler" § 1 ile aynı uyarı).

## 1. Kaynak ve gider modeli

```
KAYNAKLAR (faucet)                         GİDERLER (sink)
─────────────────                          ─────────────────
Kazı vuruşu ──► cevher (K)                 Eritme: cevher ──► külçe (4:1 / 3:1), başarısızlıkta 1 cevher
Düşman yıldızı ─► cevher (bölge K) + Altın Dövme: külçe K + külçe K−1 + Altın ──► görünüm / parça
Patron ─► Altın + külçe (K+1)              (Cevher ve külçe başka hiçbir yere gitmez; satılmaz)
Sandık ─► Altın + cevher
Tekrar galibiyet ─► 2 cevher + 50 Altın    Altın'ın yeni gideri: dövme işçiliği (v1 toplam 6 600)
Yeni başarımlar ─► Altın (v1 toplam 6 600)
```

**Kapalı kurallar (arbitraj yok, 03 § 6):** cevher ↔ Altın dönüşümü yok; külçe → cevher yok; alt kademeden üst kademe üretimi yok; parça eritme (Dökümhane) cevher vermez; maden ürünü eritilemez ve Market'te satılmaz.

## 2. Tasarım hedefleri (sim'den önce yazıldı)

| # | Hedef | Ölçüt |
|---|---|---|
| T1 | Gündelik oyuncu her gün Ustalık artışı görür | 14 günde Madencilik ≥ 25 (p50) |
| T2 | Aktif oyuncu ilk sürüm kademe tavanına (K4, eşik 40) ilk iki haftada ulaşır, ama ilk haftada değil | K4 eşiği gün 8–12 (p50) |
| T3 | Sezon 2 içeriği aktif oyuncuya ≈ 2 ay | Devir Taşı eşiği (92) gün 45–60 |
| T4 | Bot çiftliği tutkulu insandan anlamlı fazla üretemez | Bot ÷ tutkulu cevher ≤ 1,25, tecrübe ≤ 1,10 |
| T5 | Harita PvP'yi boşaltmaz | Harita tekrar Altın/gün ≤ hızlı maç Altın/gün × %50 |
| T6 | İlk kozmetik ilk gün | arma-1 gün 1 (tüm profiller) |
| T7 | Bölge 1 patronu yeni oyuncuya ilk hafta | Gündelik p50 ≤ 7 gün |

## 3. Sayısal ilk tuning (özet; ayrıntı ilgili belgede, kaynak JSON)

| Konu | Değer | Belge |
|---|---|---|
| Kademe eşikleri | 0 / 10 / 25 / 40 / 55 / 70 / 82 / 92 | 02 § 2 |
| Verim (başarılı vuruş) | 3 / 3 / 2 / 2 / 2 / 1 / 1 / 1; isabet +1 | 02 § 2–3 |
| Başarı | `sınırla(0,5 + 0,018·(U−E), 0,5, 0,95)` (fark 25'te %95); 3 ardışık ıskadan sonra garanti | 02 § 4, 11 § 5 |
| Tecrübe | kazı 10 / 5; eritme 4×oran; dövme 30/50/80/150; bant 1 / 0,5 / 0,1 (fark 0–14 / 15–29 / ≥30) | 04 § 3–4 |
| Eğri | `adim(L) = yuvarla(20 + 1,2L + 0,03L²)`; 100'e 17 791 | 04 § 3 |
| Damar | 6 vuruş (Derin 8); nadir yuva %10 (Derin %15; B6 Derin Devir %35) | 02 § 5 |
| Günlük vuruş | 1–40 "dinç" tam, 41–60 yarım, 61+ cevher 0 + tecrübe ×0,1; düğüm başına ≤ 8 | 02 § 6, 11 § 5.1 |
| Harita maçı | günde 10 sayılan maç (tekrar ödülü + başarım sayacı + Çekirdek XP) | 01 § 5 |
| Düşman yıldızı (ilk) | Altın `50 + 25(n−1)` / yıldız; cevher K=n × 2 / yıldız | 01 § 4 |
| Patron (ilk) | Altın `500 + 250(n−1)`; 3 külçe K=n+1; yıldız başı `100 + 50(n−1)` Altın + 2 cevher K=n+1 | 01 § 4 |
| Sandık (tek sefer) | `150·n` Altın + 6 cevher K=n | 01 § 4 |
| Tekrar galibiyet / mağlubiyet | 2 cevher + 50 Altın / 30 Altın | 01 § 5 |
| Eritme | 4:1, `U − E ≥ 20` ise 3:1; başarısızlıkta 1 cevher kaybı | 03 § 3 |
| Tarif | arma 3K+2(K−1) külçe, 100·K Altın, eşik E · çerçeve 6+4, 200·K, E+5 · cila 10+6, 400·K, E+10 · parça 15+10, 1 500, E+15 | 03 § 4 |
| Usta işi | `sınırla((U − tarifEşik − 10)/100, 0, 0,25)` | 03 § 5 |

**Harita tek seferlik Altın (ilk sürüm, bölge 1–3, tüm yıldızlar):** Bölge 1: 750 (düşman) + 800 (patron) + 300 (sandık) = **1 850**; Bölge 2: 1 125 + 1 200 + 600 = **2 925**; Bölge 3: 1 500 + 1 600 + 900 = **4 000**. Toplam **8 775** (mevcut 46 başarımın 22 100'ünün %40'ı).
**Dövme Altın gideri:** ilk sürüm 8 kozmetik tarif = **3 000**; tam 16 kozmetik **10 800** + 6 dövme parça **9 000**. **Parça üretimi işçiliği** (12 § 2): 0 / 100 / 300 / 600 / 1 000 Altın (katman); 12 kilitli parça en düşük malzemeyle 6 600, her yeni biçim yine işçilik öder (sürekli gider).
**Yeni başarım Altını:** ilk sürüm 22 başarım = **9 100** (05 § 2): kozmetik + kilitli parça işçiliği (3 000 + 6 600 = 9 600) ile dengede; maden döngüsü Altın ekonomisini net şişirmez. **Market SAPMA** (12 § 5): kilitsiz 15 parça 0, Standart ×5 (2 500), Nadir ×6 (12 000), Hizip ×8 (32 000), Karanlık ×8 (48 000; araştırma tavanı ×12 ve `T_market ≤ 75 gün` sınırı için ×8'de tutuldu).

## 4. Altın etkisi (T5)

| Kaynak | Altın/gün (aktif, ≈ 5 maç) | Not |
|---|---|---|
| Hızlı maç (tuning § 15) | ≈ 870 (8 maç) | Kazanma %50, stil ort. +10, ilk galibiyet +150 |
| Harita, ilk 14 gün (tek seferlik dahil) | 649 (sim, Tablo D v1) | Tek seferlik 8 775 ilk iki haftaya yayılıyor |
| Harita, tekrar dönemi (tek seferlik bitince) | ≤ 10 × (0,7·50 + 0,3·30) = **440 tavan** | Hızlı maçın 15 maç ≈ 1 500'ünün %29'u → T5 ✔ |

Harita maçları hızlı maçın **günlük maç numarasına da sayılır** (azalan getiri `ekonomi.ts`): 16. maçtan sonra hızlı maç Altını yarıya iner; harita bir "yan kapı" olmaz.

## 5. Bot ve simülasyon doğrulama planı (hipotezler)

| # | Hipotez | Yöntem | Kabul | Durum |
|---|---|---|---|---|
| **H-H1** | Ustalık eğrisi T1–T3 hedeflerini karşılar | `araclar/harita-ekonomi-simulasyonu.ts`, 500 koşu × 4 profil | T1 ✔ (gündelik 14. gün U=32), T2 ✔ (aktif K4 gün 10), T3 ✔ (aktif 92'ye gün 53) | **geçti** (sim) |
| **H-H2** | Öğrenme bandı ilk sürümde Ustalığı ≈ 50–60'ta yavaşlatır, oyuncuyu ileri bölgeye iter | Aynı sim; 14. gün U dağılımı | tutkulu = bot = 50 (tavan haritadan) | **geçti** (sim) |
| **H-H3** | Günlük tavan + azalan getiri bot çiftliğini sınırlar | Bot profili (60 maç, sınırsız vuruş denemesi, isabet %100) ÷ tutkulu | cevher 1,08 ≤ 1,25 ✔; tecrübe 1,00 ≤ 1,10 ✔ | **geçti** (sim) |
| **H-H4** | Bölge zorluk basamakları insan için doğru (patron ilk denemede %40–60) | Bot turnuvası: oyuncu yerine `kenar` kademe bot + başlangıç takımı, her düğüm 200 maç (`test/denge/botTurnuvasi.ts` + harita bot ayarları) | Bölge n düşman kazanım %55–80, patron %40–60 | **açık** (H2 dilimi) |
| **H-H5** | Dövme parçalar G-3'ü sağlar | Bot turnuvası: her dövme parçalı build × mevcut 4 tip build, 1 000 maç × 3 tohum | Kazanım %35–65; Ring Out payı ±%3; Kale payı genişler | **açık** (bayrak açılmadan önce) |
| **H-H6** | İsabet halkası gecikmede adil | `ag:matris` N0–N6 + maden ucu; 150 ms + 20 ms jitter + %2 kayıp | Gerçek isabetin ≥ %95'i sunucuda kabul; sahte (±400 ms) %0 | **açık** (H3 dilimi) |
| **H-H7** | Kazı S1'e uyar (ilk kazı 5 dk içinde, isabet öğrenilir) | İlk test gecesi gözlemi, 5 yeni oyuncu | ≥ 4/5 ilk 5 dakikada kazar; ≥ 3/5 isabeti 3. vuruşta fark eder | **açık** (insan) |

## 6. Güç satın alma YOK: kanıt ve test (G-0)

| Kanıt | Tür | Nerede |
|---|---|---|
| Sim kodu harita/maden/Ustalık modülü içe aktaramaz | Lint kapısı (`eslint.config.js` `no-restricted-imports` `src/paylasilan/sim/**`) | H1 |
| Altın hash'ler değişmez (17/17, Node = Chromium) | Mevcut test (`test/altin.test.ts`, `npm run test:tarayici`) | her dilim |
| Cilalı parça ↔ cilasız parça aynı `topacParametreleri` | Birim test `harita-guc.test.ts` | H4 |
| Ustalık 0 ve 100 olan iki hesabın aynı takımla aynı tohumda aynı maç hash'i | E2E test (sunucu, iki hesap) | H2 |
| Dövme parça `katki` değerleri tuning § 13 aralığında | Veri testi (zod + aralık) | H1 |
| Dövme parça kazanım bandı | H-H5 (bayrak şartı) | bayraktan önce |
| Market kuralları maden ürününü tanımıyor | `market.test` (dövme katmanı rafta yok) | H1 |

## 7. Simülasyon

### 7.1 Model
`araclar/harita-ekonomi-simulasyonu.ts` (tek dosya, üretim koduna dokunmaz; taslak JSON'ları okur). Tohumlu (mulberry32), her profil 500 koşu.
- **Profiller:** gündelik (2 harita maçı + 15 vuruş/gün, isabet %40, beceri 0,55), aktif (5 + 40, %65, 0,65), tutkulu (10 + 60, %85, 0,72), **bot çiftliği** (60 maç + sınırsız vuruş denemesi, isabet %100, beceri 0,80).
- **Maç:** sim koşulmaz; kazanma = `sınırla(beceri + 0,25 − 0,1·zorluk, 0,15, 0,95)`; ek yıldız olasılığı profil başına.
- **Harita:** önce açık en kolay düşman/patron; hepsi bittiyse en zor düğümü tekrar (yalnız sayılan 10 maç). Maden/sandık açılınca ziyaret.
- **Kazı:** en yüksek bantlı kazılabilir damar, eşitlikte üst kademe; nadir yuva; günlük çarpan.
- **İşleme:** üstten alta eritebildiği kadar erit; Altın ve külçe yeterse en ucuz sahip olunmayan tarifi döv (dövme parçalar hariç). Profil "diğer Altın" geliri: 400 / 800 / 1 300 / 0.
- **Komut:** `npx tsx araclar/harita-ekonomi-simulasyonu.ts --kosu 500` (v1, 14 gün) · `--senaryo tam --gun 60` (6 bölge, 8 kademe). Ham çıktı: [`sim-cikti-v1.md`](sim-cikti-v1.md), [`sim-cikti-tam.md`](sim-cikti-tam.md).

### 7.2 Sonuçlar: ilk sürüm (bölge 1–3, K1–K4), 14 gün

**Tablo A: Madencilik eşiğine ulaşma günü** (p10 / **p50** / p90)

| Profil | K1 (0) | K2 (10) | K3 (25) | K4 (40) |
|---|---|---|---|---|
| gündelik | 1 / **1** / 1 | 3 / **4** / 4 | 9 / **9** / 10 | ulaşamadı (%0) |
| aktif | 1 / **1** / 1 | 3 / **3** / 3 | 5 / **5** / 6 | 10 / **10** / 10 |
| tutkulu | 1 / **1** / 1 | 3 / **3** / 3 | 5 / **5** / 5 | 9 / **9** / 9 |
| bot çiftliği | 1 / **1** / 1 | 3 / **3** / 3 | 5 / **5** / 5 | 9 / **9** / 9 |

**Tablo B: İşleme eşiğine ulaşma günü**

| Profil | K1 | K2 | K3 | K4 |
|---|---|---|---|---|
| gündelik | 1 / **1** / 1 | 2 / **2** / 3 | 6 / **7** / 8 | ulaşamadı |
| aktif | 1 / **1** / 1 | 1 / **2** / 2 | 3 / **4** / 4 | 7 / **8** / 8 |
| tutkulu | 1 / **1** / 1 | 1 / **1** / 2 | 3 / **3** / 4 | 7 / **7** / 7 |
| bot çiftliği | 1 / **1** / 1 | 1 / **1** / 2 | 3 / **3** / 3 | 6 / **7** / 7 |

**Tablo C: bölge patronunu yenme günü**

| Profil | Bölge 1 | Bölge 2 | Bölge 3 |
|---|---|---|---|
| gündelik | 4 / **5** / 8 | 9 / **12** / — | %7 ulaşır |
| aktif | 2 / **2** / 3 | 3 / **4** / 5 | 5 / **7** / 8 |
| tutkulu | 1 / **1** / 2 | 2 / **2** / 3 | 3 / **3** / 4 |
| bot çiftliği | 1 / **1** / 1 | 1 / **1** / 1 | 1 / **1** / 1 |

**Tablo D: 14. gün sonu (ortalama; U p50)**

| Profil | Madencilik U | İşleme U | vuruş/gün | cevher/gün | külçe (toplam) | harita maçı/gün | harita Altın/gün | dövme Altını (toplam) |
|---|---|---|---|---|---|---|---|---|
| gündelik | 32 | 36 | 14,1 | 36,3 | 130 | 2,0 | 348 | 3 059 |
| aktif | 48 | 52 | 35,6 | 91,8 | 363 | 5,0 | 649 | 6 587 |
| tutkulu | 50 | 55 | 49,9 | 126,6 | 518 | 10,0 | 885 | 6 600 |
| bot çiftliği | 50 | 56 | 49,9 | 136,5 | 561 | 11,3 | 988 | 6 600 |

**Tablo E: bot çiftliği sınırı (bot ÷ tutkulu)**

| Kural seti | cevher | Madencilik tecrübesi | külçe | harita Altını |
|---|---|---|---|---|
| **Taslak** (azalan getiri + 60 tavan + 10 sayılan maç) | **1,08** | **1,00** | **1,08** | **1,12** |
| Azalan getiri yok | 1,29 | 1,05 | 1,32 | 1,12 |
| Günlük tavan yok | 1,21 | 1,02 | 1,23 | 1,12 |
| (tam senaryo, 60 gün) taslak / azalan yok / tavan yok | 1,07 / 1,40 / 1,99 | 1,00 / 1,04 / 1,07 | 1,08 / 1,47 / 2,15 | 1,09 |

**Tablo F: ilk dövme günü (p50)**

| Profil | arma-1 | arma-2 | arma-3 | arma-4 | çerçeve-1 | çerçeve-2 | çerçeve-3 | çerçeve-4 | cila-2 | cila-3 | cila-4 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| gündelik | 1 | 4 | 11 | — | 3 | 6 | 12 | — | 7 | 14 | — |
| aktif | 1 | 2 | 4 | 8 | 2 | 3 | 5 | 11 | 3 | 6 | 13 |
| tutkulu | 1 | 1 | 3 | 7 | 2 | 3 | 4 | 9 | 3 | 6 | 11 |
| bot çiftliği | 1 | 1 | 3 | 7 | 2 | 2 | 4 | 8 | 3 | 6 | 11 |

### 7.3 Sonuçlar: tam (6 bölge, 8 kademe), 60 gün

| Profil | K5 (55) | K6 (70) | K7 (82) | K8 (92) | Bölge 6 patronu | 60. gün Madencilik / İşleme |
|---|---|---|---|---|---|---|
| gündelik | **38** | — | — | — | **43** | 68 / 68 |
| aktif | **17** | **28** | **40** | **53** | **14** | 96 / 92 |
| tutkulu | **16** | **25** | **36** | **48** | **6** | 99 / 97 |
| bot çiftliği | **16** | **25** | **36** | **48** | **1** | 99 / 99 |

(p50 gün; İşleme K8 eşiği aktif gün 60, tutkulu 49.)

### 7.4 Okuma ve kararlar
1. **Bot ile tutkulu insan Ustalıkta aynı** (Tablo A, E): günlük tavan bağlayıcı, harita bölge sırası da bağlayıcı. Bot haritayı ilk gün bitirse de (Tablo C) Ustalığı insanı geçemez: öğrenme bandı ve tavan "zaman kapısı" görevi görüyor.
2. **Azalan getiri gerekli** (Tablo E): kaldırılınca bot cevherde 1,29–1,40 kat; ledger #18'in iki basamaklı çerçevesi kazıda da tutuluyor.
3. **İlk sürüm içeriği aktif oyuncuda ≈ 13 gün** (Tablo F, cila-4 gün 13). Bu ilk sürüm için yeterli; R4 "artan cevher" riski sezon 2'ye kadar kabul (99 S-6).
4. **Gündelik oyuncu Bölge 3'e 14 günde ulaşamıyor** (%7): kabul; harita bitirmek zorunlu değil. Sahip daha hızlı isterse ilk değiştirilecek kaldıraç düşman zorluğu (H-H4), Ustalık değil.
5. **İşleme Madencilikten 1–2 gün önde** (Tablo B): eritme tecrübesi bol. Sorun değil: eritme cevher ister, cevher Madencilik ister; İşleme kendi başına koşamaz.

### 7.5 Tablo G: craft ile Market (12 § 7)

Kilit 8. günde açılır, birikimler sıfırlanır; Market tarafı o günden sonraki bütün Altını biriktirir (iyimser). p50 gün, 300 koşu, 60 gün ufku. Ham: [`sim-cikti-craft.md`](sim-cikti-craft.md).

| Profil | Standart Çekirdek (2 500) | Nadir Gövde (12 000) | Hizip Gövde (32 000) | Karanlık Uç (48 000) |
|---|---|---|---|---|
| gündelik | 2 / 4 (×2) | 2 / 17 (×8,5) | 12 / > 53 | 48 / > 53 |
| aktif | 1 / 3 (×3) | 2 / 13 (×6,5) | 3 / 33 (×11) | 20 / 49 (×2,5) |
| tutkulu | 1 / 2 (×2) | 1 / 8 (×8) | 2 / 19 (×9,5) | 16 / 29 (×1,8) |

**Okuma:** Nadir ve Hizip'te craft hedef bandında (×5–×11). Standart'ta iki yol da kısa (≤ 4 gün): fark önemsiz. Karanlık'ta craft, K4 (Kor) ve İşleme 60 eşiğine bağlı olduğundan ilerleme sınırlı (ilk sürümde Karanlık zaten K-10'a bağlı kapalı). Gündelik oyuncu için Hizip Market'i ≈ 64 gün (≤ 75 gün tavanı, 11 § 3). **Sınama (H-H8):** sim'de Nadir/Hizip için `T_market / T_craft ≥ 5` (aktif, tutkulu); hiçbir ilk sürüm parçasında aktif `T_market > 75 gün` olmaz.

**Bölge rozetleri (13 § 3.3):** bronz 300 / gümüş 500 / altın 800 Altın; ilk sürüm 3 bölge = 4 800 Altın tek seferlik kaynak (kozmetik + parça işçiliği ve pahalı Market kısayolu bunu emer). USTA DAMAR (+1 kapasite) günlük 60 tavanının altında kalır; Tablo E değişmez.

### 7.6 Ek hipotez
| # | Hipotez | Kabul | Durum |
|---|---|---|---|
| **H-H8** | Craft ana yol, Market dürüst kısayol | Tablo G oranları; ilk craft ≤ 15 dk (e2e) | sim kısmı **geçti**; e2e açık (H7) |
| **H-H9** | Prestij yeterli itki (araştırma § 9 riski) | 2. haftada aktif oyuncuların ≥ %30'u en az bir parça üretir (telemetri) | açık (insan) |

### 7.6 H8 yeniden ölçüm (2026-11-06, `veri/`'den)
Sim artık `veri/{madenler,ustalik,tarifler,harita,market-fiyat}.json` okur (otorite `veri/`). `v1`, 60 gün, 500 koşu: [`sim-cikti-veri.md`](sim-cikti-veri.md). Önceki çıktıyla ([`sim-cikti-craft.md`](sim-cikti-craft.md), 300 koşu) fark yalnız koşu sayısından: bütün hücreler **≤ %10** içinde (örn. gündelik K4 p90 24 → 23 gün, aktif K4 p50 7 → 6 gün; Tablo E bot ÷ tutkulu 1,07; Tablo G aynı). Tablolarda güncelleme gerekmedi.

## 8. G-0 sınaması (bu belge)
Ekonomide hiçbir akış maç gücüne çıkmaz. Altın'ın yeni kaynağı (harita, başarım) yeni gideriyle (dövme işçiliği) dengeli; Market parça fiyatları değişmez; Market kilitleri maden ürünüyle açılmaz.
