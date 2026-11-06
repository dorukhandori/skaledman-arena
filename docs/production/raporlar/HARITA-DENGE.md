# HARITA-DENGE · H-H4 düğüm zorluğu ve H-H5 dövme parçalar

`[@ledger · Balance Designer]` · 2026-11-06 · dal `devran-kod` · kaynak: `docs/design/harita/06-ekonomi-ve-denge.md` § 5 (H-H4, H-H5), 01 § 3.1, 03 § 4.3, 00 G-0/G-3/R5.

## 0. Özet

- **H-H4 (düğüm zorluğu): ayarlandı, kapı bölge düzeyinde geçiyor.** Eski eşlemede `dayaniklilik` kipi (zorluk 4-5) vekil oyuncuyu ezdi: patronlarda oyuncu kazanımı %16-31, beş bölgenin üçünde düşman ortalaması bant dışı. Yalnız harita verisi değişti (`veri/harita.json`: zorluk → bot kipi/seviyesi eşlemesi + b4-11 takımında bir üye). Sonra: 6/6 bölgede düşman ortalaması %55-80 içinde; patronlar resmî koşuda (n=200, tohum 1) 4/6, bağımsız doğrulamada (n=600, tohum 11) **6/6** bant içinde. b2-11 (%38,0) ve b3-11 (%60,5) n=200'de bant kenarının ≤ 2 puan dışında (standart hata ≈ 3,5 puan); doğrulamada %42,2 ve %58,8. Gürültü kovalamamak için bu ikisine dokunulmadı (§ 2.4).
- **H-H5 (dövme parçalar): GEÇMEDİ, bayrak `dovmeParcalari` KAPALI kalır.** 12 dövme build'in 3'ü bandı geçti. Asıl neden iki tane: (1) referans alanın kendisi bandın dışında (K build tek tur düelloda %22,9, Ağır Diskli S/D/B %68-77). Bu yüzden mutlak %35-65 kapısı K'ya ya da ağır diske dayanan her build için ulaşılmaz. (2) **Köz Gövde gerçekten güçlü**: katalog eşi Ok Gövde'ye göre +6…+9 puan (S, D, B ev sahiplerinde). **Dağ Diski** Ağır Disk'in tam yan-grade'i (−0,4…−1,9 puan, RO ±1,2). **Kırağı Ucu** kazanımda yan-grade (−4,4…+5,7), ama Ring Out payını eşi Top Uç'a göre 3-14 puan düşürüyor.
- Kapılar: `npm test` 647/647, `npm run lint` temiz, `npm run typecheck` temiz.

## 1. Yöntem

### 1.1 H-H4: `npm run harita:zorluk` (`araclar/harita-zorluk-turnuvasi.ts`)
- **Maç:** sunucunun kendi `MacYonetimi`'si (`bot: [true, true]`), düşman tarafı harita odasıyla birebir: `haritaBotTakimi(dugum)` (üye seviyesi = `botSeviye`) + `botKipleri: [vekil, dugum.botKip]`. Oyuncu her zaman 0. yuvada (sunucudaki gibi). Sim değişmedi.
- **Vekil oyuncu (06 H-H4):** `kenar` kademe bot + başlangıç takımı. Kapı için `BASLANGIC_TAKIMLARI` (takim-1..3, oyuncu seviyesi Lv.3) maçlar arasında dönüşümlü. Bilgi olarak `--vekil=yeni`: yeni hesabın gerçek takımı (seçilen başlangıç seti Lv.2 + iki ödünç Lv.1, sunucu `oduncDoldur`).
- **n ve tohum:** düğüm başına 200 maç. Tohum = FNV(düğüm kimliği) · 1000 + taban + k, taban 1. Deterministik (birim testle sabit). Patron doğrulaması: taban 11, n=600.
- **Kapı (06 § 5):** "kazanım" = oyuncunun (vekilin) kazanma oranı. Bölge n'in düşman düğümleri **ortalaması** %55-80; patron %40-60. 01 § 3.1'deki zorluk başına insan hedefi yalnız bilgi olarak gösterilir (tabloda `01 hedefi`).
- **Süre:** 36 düğüm × 200 maç ≈ 30 s (`--is=6`, bölge başına alt süreç).

### 1.2 H-H5: `npx tsx araclar/dovme-parca-turnuvasi.ts` (npm satırı eklenmedi; tek satır sınırı H-H4'e verildi)
- **Parçalar:** `veri/parcalar-dovme.json` (yeni, 08 § 7'deki ayrı dosya). 03 § 4.3'teki sayılı üç parça: Dağ Diski (K2), Kırağı Ucu (K3), Köz Gövde (K4). Bayrak kapalıyken katalogda (`parcalar.json`) **değiller**. Betik profili `topacProfiliKurParcalarla` ile doğrudan kurar. Sezon 2 parçalarının (Savruk Uç, Çakım Diski, Çevren Gövde) sayısı yok, ölçülmedi.
- **Build'ler:** her dövme parça, yuvası uyan dört referans build'e (tuning § 13 S/K/D/B) takılır → 12 dövme build. Kıyas için 4 referans ve dövme parçanın katalog eşini taşıyan 9 "eş build" (Dağ Diski ↔ Ağır Disk, Kırağı Ucu ↔ Top Uç, Köz Gövde ↔ Ok Gövde; 03 § 4.3 "Kıyas" sütunu).
- **Maç:** tek tur düello (`test/denge/turnuva.ts` `duello`, tuning § 20 düello matrisiyle aynı). Bot kipi topacın tipinden, yarısında taraf değişir, 90 s sınır (berabere = 0,5).
- **n:** build başına 4 rakip × **1 000 düello × 3 tohum (1, 2, 3)** = 12 000 düello. Toplam 25 build = 300 000 düello, ≈ 260 s (`--is=5`). n küçültülmedi. Standart hata build başına ≈ ±0,45 puan.
- **Kapı:** kazanım (4 build'lik alana karşı ortalama) %35-65; Ring Out payı ev sahibi referansa göre ±3 puan. Tablo ayrıca eşe göre farkı da verir (G-3 "aynı parça bütçesinde" = yan-grade).

## 2. H-H4 sonuçları

### 2.1 Bölge kapısı (vekil: `kenar` + `BASLANGIC_TAKIMLARI`, n=200/düğüm, tohum 1)

| Bölge | İlk sürüm | Düşman ort. önce | Düşman ort. sonra (55-80) | Patron önce | Patron sonra n=200 (40-60) | Yeni hesap düşman / patron (önce → sonra) |
|---|---|---|---|---|---|---|
| 1 OCAK YAMACI | E | 76.0 | **76.9** ✔ | 18.5 | **56.0** ✔ | 61.2 / 3.0 → 61.4 / 31.0 |
| 2 AYAZ GEÇİDİ | E | 55.8 | **57.8** ✔ | 16.5 | **38.0** ✘ | 35.9 / 1.0 → 38.8 / 25.0 |
| 3 KOR KRATERLERİ | E | 54.9 | **66.3** ✔ | 29.5 | **60.5** ✘ | 35.3 / 7.5 → 53.4 / 38.5 |
| 4 YEL SIRTI | H | 42.5 | **74.1** ✔ | 24.0 | **42.0** ✔ | 17.5 / 3.0 → 39.7 / 17.0 |
| 5 ÇAKIM YAYLASI | H | 35.2 | **56.7** ✔ | 31.5 | **48.5** ✔ | 11.5 / 4.5 → 42.5 / 40.5 |
| 6 DİP MAĞARALARI | H | 30.5 | **55.4** ✔ | 28.5 | **55.5** ✔ | 5.7 / 3.5 → 36.5 / 37.0 |

Bağımsız patron doğrulaması (n=600, tohum 11; `HARITA-DENGE-patron-dogrulama.json`): b1-11 %50,8 · b2-11 %42,2 · b3-11 %58,8 · b4-11 %47,0 · b5-11 %53,8 · b6-11 %47,3. **6/6 bant içinde.** İki koşu birleştirilince (n=800) b2-11 %41,2, b3-11 %59,2.

### 2.2 Düğüm tablosu (önce → sonra)

| Düğüm | Tür | Z | Önce: kip / Lv | Önce % | Sonra: kip / Lv | Sonra % | 01 hedefi (z) | Durma / RO / Parç. (sonra) | Yeni hesap % (bilgi) |
|---|---|---|---|---|---|---|---|---|---|
| b1-01 | dusman | 1 | kukla / 1 | 95.0 | kukla / 1 | **95.0** | 85-100 | 65 / 32 / 2 | 92.5 |
| b1-03 | dusman | 1 | kukla / 1 | 97.5 | kukla / 1 | **97.5** | 85-100 | 67 / 30 / 2 | 93.0 |
| b1-06 | dusman | 2 | dolas / 2 | 64.5 | dolas / 2 | **64.5** | 70-80 | 50 / 43 / 1 | 39.0 |
| b1-07 | dusman | 2 | dolas / 2 | 68.0 | dolas / 2 | **68.0** | 70-80 | 49 / 44 / 1 | 54.0 |
| b1-09 | dusman | 3 | kenar / 2 | 55.0 | dolas / 3 | **59.5** | 60-70 | 52 / 41 / 1 | 28.5 |
| b1-11 | patron | 4 | dayaniklilik / 3 | 18.5 | kenar / 2 | **56.0** | 50-60 | 49 / 44 / 2 | 31.0 |
| b2-01 | dusman | 2 | dolas / 2 | 69.0 | dolas / 2 | **69.0** | 70-80 | 55 / 43 / 0 | 47.0 |
| b2-03 | dusman | 2 | dolas / 2 | 64.0 | dolas / 2 | **64.0** | 70-80 | 56 / 41 / 0 | 47.5 |
| b2-06 | dusman | 3 | kenar / 2 | 46.5 | dolas / 3 | **52.0** | 60-70 | 50 / 47 / 0 | 31.5 |
| b2-07 | dusman | 3 | kenar / 2 | 51.5 | dolas / 3 | **55.0** | 60-70 | 56 / 40 / 0 | 36.5 |
| b2-09 | dusman | 3 | kenar / 2 | 48.0 | dolas / 3 | **49.0** | 60-70 | 57 / 38 / 0 | 31.5 |
| b2-11 | patron | 5 | dayaniklilik / 3 | 16.5 | kenar / 3 | **38.0** | 40-55 | 51 / 45 / 0 | 25.0 |
| b3-01 | dusman | 2 | dolas / 2 | 71.5 | dolas / 2 | **71.5** | 70-80 | 46 / 45 / 3 | 59.0 |
| b3-03 | dusman | 3 | kenar / 2 | 66.5 | dolas / 3 | **66.0** | 60-70 | 46 / 47 / 2 | 51.0 |
| b3-06 | dusman | 3 | kenar / 2 | 68.0 | dolas / 3 | **62.0** | 60-70 | 46 / 46 / 2 | 48.0 |
| b3-07 | dusman | 4 | dayaniklilik / 3 | 34.0 | kenar / 2 | **66.5** | 50-60 | 43 / 50 / 2 | 54.5 |
| b3-09 | dusman | 4 | dayaniklilik / 3 | 34.5 | kenar / 2 | **65.5** | 50-60 | 47 / 44 / 2 | 54.5 |
| b3-11 | patron | 5 | dayaniklilik / 3 | 29.5 | kenar / 3 | **60.5** | 40-55 | 45 / 47 / 3 | 38.5 |
| b4-01 | dusman | 3 | kenar / 2 | 69.0 | dolas / 3 | **76.0** | 60-70 | 60 / 35 / 1 | 42.0 |
| b4-03 | dusman | 3 | kenar / 2 | 67.5 | dolas / 3 | **72.5** | 60-70 | 61 / 34 / 0 | 44.5 |
| b4-06 | dusman | 4 | dayaniklilik / 3 | 23.5 | kenar / 2 | **75.0** | 50-60 | 60 / 34 / 1 | 37.0 |
| b4-07 | dusman | 4 | dayaniklilik / 3 | 25.0 | kenar / 2 | **72.5** | 50-60 | 61 / 33 / 1 | 36.5 |
| b4-09 | dusman | 4 | dayaniklilik / 3 | 27.5 | kenar / 2 | **74.5** | 50-60 | 61 / 32 / 1 | 38.5 |
| b4-11 | patron | 5 | dayaniklilik / 3 | 24.0 | kenar / 3 | **42.0** | 40-55 | 52 / 44 / 0 | 17.0 |
| b5-01 | dusman | 3 | kenar / 2 | 60.0 | dolas / 3 | **58.0** | 60-70 | 50 / 43 / 2 | 41.0 |
| b5-03 | dusman | 4 | dayaniklilik / 3 | 26.5 | kenar / 2 | **57.0** | 50-60 | 47 / 45 / 2 | 46.0 |
| b5-06 | dusman | 4 | dayaniklilik / 3 | 27.5 | kenar / 2 | **62.0** | 50-60 | 48 / 45 / 2 | 47.5 |
| b5-07 | dusman | 4 | dayaniklilik / 3 | 33.0 | kenar / 2 | **60.0** | 50-60 | 49 / 43 / 2 | 43.0 |
| b5-09 | dusman | 5 | dayaniklilik / 3 | 29.0 | kenar / 3 | **46.5** | 40-55 | 47 / 47 / 1 | 35.0 |
| b5-11 | patron | 5 | dayaniklilik / 3 | 31.5 | kenar / 3 | **48.5** | 40-55 | 50 / 43 / 2 | 40.5 |
| b6-01 | dusman | 4 | dayaniklilik / 3 | 30.5 | kenar / 2 | **47.5** | 50-60 | 32 / 64 / 2 | 42.0 |
| b6-03 | dusman | 4 | dayaniklilik / 3 | 30.5 | kenar / 2 | **59.0** | 50-60 | 28 / 69 / 2 | 37.5 |
| b6-06 | dusman | 4 | dayaniklilik / 3 | 27.0 | kenar / 2 | **64.0** | 50-60 | 34 / 62 / 2 | 43.0 |
| b6-07 | dusman | 5 | dayaniklilik / 3 | 31.5 | kenar / 3 | **51.5** | 40-55 | 31 / 63 / 3 | 33.5 |
| b6-09 | dusman | 5 | dayaniklilik / 3 | 33.0 | kenar / 3 | **55.0** | 40-55 | 32 / 62 / 3 | 26.5 |
| b6-11 | patron | 5 | dayaniklilik / 3 | 28.5 | kenar / 3 | **55.5** | 40-55 | 33 / 61 / 3 | 37.0 |

`Yeni hesap %` sütunu bilgi amaçlı (yuva 0 Lv.2 + iki ödünç Lv.1). Yeni hesap 1. bölgenin düşmanlarında %61 ile bant içinde. 1. bölge patronunda %31, ilerideki bölgelerde %17-53. Bu beklenen durum: oyuncu 2. bölgeye gelene kadar Çekirdeklerini Lv.3'e ve 3 sahip olunan yuvaya taşır. Kapı bu yüzden hazır takımla ölçüldü (varsaydım 1).

### 2.3 Ne değişti (yalnız `veri/harita.json`)
1. **Zorluk → bot eşlemesi (tüm 36 dövüş düğümü):**

| Zorluk | Önce (01 § 3.1) | Sonra | Kanıt (6 bölge takımı, n=200, tohum 7 taraması: oyuncu % ortalaması) |
|---|---|---|---|
| 1 | kukla Lv.1 | kukla Lv.1 | %95-97 |
| 2 | dolas Lv.2 | dolas Lv.2 | %70,0 |
| 3 | kenar Lv.2 | **dolas Lv.3** | %60,8 (kenar Lv.2: %58,2) |
| 4 | dayaniklilik Lv.3 | **kenar Lv.2** | %58,2 (dayaniklilik Lv.3: %23,0) |
| 5 | dayaniklilik Lv.3 | **kenar Lv.3** | %50,7 |

   Taramada `dayaniklilik` kipi Lv.1'de bile oyuncuyu %20-42'de tuttu. Kip, seviyeden baskın. Ara basamak olmadığı için harita eşlemesinden çıkarıldı (kip hızlı maç ve antrenmanda aynen duruyor). Eşleme tekdüze ve monoton: seviye ve kip birlikte artıyor, her basamakta yetenek var (Lv.1 yalnız kuklada).
2. **b4-11 (Yel Sırtı patronu, ilk sürümde değil):** 3. üye `kaya-maden+kalkan-govde+agir-disk+igne-uc` → `kaya-maden+kalkan-govde+alcak-disk+dengeli-uc`. kenar Lv.3 ile bu patron %61-63 (n=200 / n=600) çıkıyordu, yani fazla kolaydı. Daha zor tek kip `dayaniklilik` (%19-33), arada basamak yok. Üye varyantları (n=600, tohum 11): `agir+top` %34,5 · `savrulan+agir+top` %41,5 · `alcak+dengeli` **%47,0** · `simsek` seti %60,5. Bandın ortasına en yakın olan seçildi.
3. Zorluk değerleri, yıldızlar, ödüller ve diğer takımlar değişmedi. Başarım kapısı (`dugumZorluk`) etkilenmez.

### 2.4 Bilinen kalıntılar (dokunulmadı)
- b2-11 %38,0 ve b3-11 %60,5 (n=200, tohum 1): ikisi de bant kenarına 1 SE'den yakın, bağımsız n=600'de bant içinde. Bunları ayarlamak gürültüyü kovalamak olur.
- Bazı düğümler 01'deki **zorluk başına** insan hedefinin dışında (ör. 4. bölgenin z3-z4'ü %72-76; 6. bölgede b6-01 %47,5, b6-06 %64). Bölge kapısı geçtiği için ayarlanmadı. Bunlar takım farkından geliyor (Yel Sırtı takımı zayıf). İnsan testinden sonra düğüm başına ince ayar için ilk kaldıraç takım üyesi (b4-11'deki gibi).
- Vekil bir insan değil. `kenar` vekili bota karşı ölçüyor, insanın `dolas`/`kenar`'ı okuma becerisini ölçmüyor. H-H7 test gecesi gözlemiyle doğrulanmalı.

### 2.5 Tasarıma öneri (docs/design değiştirilmedi)
- **01 § 3.1 tablosu:** "Bot kipi / Bot seviyesi" sütunları § 2.3'teki eşlemeyle güncellenmeli (z3 dolas Lv.3, z4 kenar Lv.2, z5 kenar Lv.3). b4-11'deki tek üye istisnası da tabloya not düşülmeli ("her bölgenin tek takımı" kuralından sapma).
- **06 § 5 H-H4 durumu:** "geçti (bot turnuvası, HARITA-DENGE.md); insan doğrulaması H-H7".

## 3. H-H5 sonuçları (1 000 düello × 3 tohum × 4 rakip = 12 000 / build)

### 3.1 Referans alan (ev sahipleri)

| Build | Tip | Kazanım | Ring Out payı | S | K | D | B |
|---|---|---|---|---|---|---|---|
| S | saldırgan | 53,0 | 27,4 | 50,4 | 75,0 | 49,3 | 37,3 |
| K | kale | **22,9** | 4,0 | 26,3 | 50,8 | 0,0 | 14,6 |
| D | dayanıklı | 62,7 | 14,0 | 51,1 | 99,9 | 49,9 | 50,1 |
| B | denge | 60,8 | 39,5 | 61,2 | 84,2 | 48,6 | 49,4 |

K referansı tek tur düelloda alanın dışında: D'ye karşı 3 000 düelloda yalnız 1 galibiyet. Bu bir parça sorunu değil, alanın sorunu (D > K stamina yarışı, tuning § 13 üçgeni). Ama mutlak %35-65 kapısını K'ya dayanan her build için imkânsız kılıyor.

### 3.2 Dövme build'ler

| Dövme build | Tip | Kazanım | Ev sahibi | Eş build | Eş kazanım | Δ eş | RO payı | Δ RO (ev) | Δ RO (eş) | Kapı |
|---|---|---|---|---|---|---|---|---|---|---|
| dag-diski@S | saldırgan | 68,1 | 53,0 | agir-disk@S | 68,5 | −0,4 | 25,4 | −2,0 | −0,4 | KALDI (kazanım) |
| dag-diski@K | kale | 21,1 | 22,9 | K | 22,9 | −1,9 | 4,2 | +0,1 | +0,1 | KALDI (kazanım) |
| dag-diski@D | denge | 75,5 | 62,7 | agir-disk@D | 76,5 | −1,0 | 34,6 | +20,6 | −1,2 | KALDI (kazanım, RO) |
| dag-diski@B | denge | 70,1 | 60,8 | agir-disk@B | 71,7 | −1,6 | 39,0 | −0,5 | +0,3 | KALDI (kazanım) |
| kiragi-ucu@S | saldırgan | 58,4 | 53,0 | top-uc@S | 57,3 | +1,1 | 17,1 | −10,3 | −14,1 | KALDI (RO) |
| kiragi-ucu@K | kale | 62,6 | 22,9 | top-uc@K | 67,0 | −4,4 | 28,0 | +24,0 | −7,4 | KALDI (RO) |
| kiragi-ucu@D | dayanıklı | 58,8 | 62,7 | D (top-uc) | 62,7 | −3,9 | 11,0 | −3,0 | −3,0 | **GEÇTİ** |
| kiragi-ucu@B | denge | 71,6 | 60,8 | top-uc@B | 65,9 | +5,7 | 36,6 | −2,9 | −11,9 | KALDI (kazanım) |
| koz-govde@S | saldırgan | 62,3 | 53,0 | S (ok-govde) | 53,0 | **+9,3** | 26,4 | −1,0 | −1,0 | **GEÇTİ** |
| koz-govde@K | denge | 40,4 | 22,9 | ok-govde@K | 40,2 | +0,2 | 4,0 | −0,1 | +0,8 | **GEÇTİ** |
| koz-govde@D | denge | 77,8 | 62,7 | ok-govde@D | 69,2 | **+8,6** | 27,5 | +13,5 | −2,5 | KALDI (kazanım, RO) |
| koz-govde@B | saldırgan | 56,2 | 60,8 | ok-govde@B | 49,9 | **+6,3** | 30,0 | −9,5 | −1,8 | KALDI (RO) |

"Kale payı genişler" (06 H-H5): Dağ Diski K dışındaki üç ev sahibinde tip etiketini değiştirmedi. 384 kombinasyonda tip dağılımı saldırgan 145 / kale 58 / denge 181; katalog 1 920'de kale %12,4, Dağ Diski ile %15,1. Kırağı Ucu 320'de kale 37 (%11,6) + dayanıklı 61 (%19,1); katalogda dayanıklı %14,0. Kale payı Dağ Diski ile hafifçe, dayanıklı payı Kırağı ile genişliyor.

### 3.3 Karar: bayrak `dovmeParcalari` kapalı kalır
Kapı (G-3, 06 H-H5) 12 build'in 3'ünde geçti. Geçmeyen parçalar ve miktarları:
- **Köz Gövde:** S/D/B'de Ok Gövde'den +6,3…+9,3 puan güçlü (n=12 000; SE ±0,45). Yan-grade değil, **yükseltme**. koz-govde@D %77,8 (bandın 12,8 puan üstünde).
- **Dağ Diski:** Ağır Disk'in yan-grade'i (Δ eş −0,4…−1,9; RO Δ eş ≤ ±1,2). Mutlak bandı yalnız ev sahibi + ağır disk zaten bant dışında olduğu için geçemiyor (agir-disk@D %76,5, K %22,9). Parçanın kendi sorunu değil. **Bütçe:** savunma katkısı 8 ile 384 kombinasyonda savunma 32-**78**'e çıkıyor (katalog aralığı 24-76, tuning § 13), 2 puan dışarıda.
- **Kırağı Ucu:** kazanımda yan-grade, ama Ring Out payını Top Uç'a göre −7…−14 puan, ev sahibi Düz Uç'a göre −10 puan düşürüyor (S, B ev sahipleri). Tasarım niyeti ("İğne kadar ağır değil, Top kadar kaçmaz") RO'yu İğne ile Top arasına koyuyor. ±3 puan ölçütüne hangi tabanın (ev sahibi mi, eş mi) esas olacağı kararı gerekiyor.

### 3.4 Önerilen değerler (tuning.md ve 03 § 4.3 DEĞİŞTİRİLMEDİ; keşif koşusu 500 düello × 3 tohum, betik dışı)

| Parça | Öneri | Ölçülen (S / D / B kazanım; eş) | Not |
|---|---|---|---|
| koz-govde | kutle **17**, savunma **30**, staminaHavuzu **50** (saldırı 56, kanat 4) | 54,8 / 71,9 / 51,2 (eş 53,0 / 69,2 / 49,9) → Δ +1,3…+2,7 | Yan-grade'e iner. Toplam katkı 153 (Ok 159) |
| dag-diski | savunma **6**, staminaHavuzu **17** | 67,0 / 75,5 / 70,0 (değişmedi) | Yalnız bütçe uyumu: savunma tavanı 76 |
| kiragi-ucu | sayı önerisi yok | esneklik 0,7 / kCakilma 1,0 / sürtünme 0,9 denemeleri RO açığını 2-6 puan kapattı, kapatmadı | Önce RO tabanı kararı (@helix) |

Ayrıca kapının kendisi için öneri: G-3'ün niyeti "aynı parça bütçesinde yan-grade". Alan dengesizken mutlak %35-65 parçayı değil ev sahibini ölçüyor. H-H5 kapısı "katalog eşine göre kazanım Δ ≤ ±3 puan ve RO Δ ≤ ±3 puan; mutlak bant bilgi" olarak yeniden yazılabilir. Bu ölçütle bugün: Dağ Diski **geçer**, Köz Gövde **kalır** (önerilen sayılarla geçer), Kırağı Ucu RO'da **kalır**. Karar sahibin ve @helix'in. Ayrıca K referansının düelloda %22,9 olması tuning § 20 H5 için ayrı bir denge bulgusu (`denge:turnuva` ile bakılmalı).

## 4. Varsaydım
1. **"Başlangıç takımı" = `BASLANGIC_TAKIMLARI`** (kodda bu adla duran hazır takımlar, `MacYonetimi` varsayılan oyuncu seviyesi Lv.3). Yeni hesabın Lv.2 + iki ödünç takımı haritanın 2. bölgesinden sonrasını temsil etmez. Bilgi olarak ayrıca koşuldu (`--vekil=yeni`).
2. **"Bölge n düşman kazanım %55-80"** = bölgenin patron dışı dövüş düğümlerinin ortalaması, oyuncu (vekil) kazanımı. Düğüm başına ölçüt alınsaydı zorluk 1 düğümleri (01'de %85+ hedefli) tasarım gereği bandın üstünde kalırdı.
3. Ayar tek tek düğüm yerine **tekdüze zorluk eşlemesiyle** yapıldı (veri ayarı, sim/bot koduna dokunulmadı). Tek düğüm istisnası b4-11 takımı. `dayaniklilik` kipi haritadan çıktı.
4. Patron kapısında n=200'deki ≤ 2 puanlık kaçaklar (b2-11, b3-11) bağımsız n=600 koşusuyla değerlendirildi ve ayarlanmadı.
5. H-H5'te "maç" = **tek tur düello** (build × build). 3'lü takım maçı değil, çünkü bir build'i yalıtmanın yolu bu (tuning § 20 düello matrisiyle aynı yöntem). Dövme parça yuvası uyan dört referansın hepsine takıldı. Kazanım kapısı alana karşı ortalama, RO ±3 puan ev sahibine göre.
6. `veri/parcalar-dovme.json`: 03 § 4.3'teki katkılar aynen. Belgede olmayan alanlar: Köz Gövde `erime` 0,0 (Ok Gövde gibi), `tipEgilimi` (Dağ: kale, Kırağı: dayanıklı, Köz: saldırgan), Kırağı `element: null`, `gorunum: "acik"`. Katman `"dovme"` ve `fiyat: null` şemada (`KatmanSema`) yok. Dosya katalog şemasından değil betikteki genişletilmiş şemadan doğrulanıyor; bayrak açılırken `KatmanSema`'ya `"dovme"` eklenmeli (08 § 7).
7. Bayrak kapalı kaldığından tarif/katalog verisine dokunulmadı (`tarifler.json` `bayrak` aynen).

## 5. Dosyalar
- `araclar/harita-zorluk-turnuvasi.ts` (yeni) + `package.json` `harita:zorluk`
- `araclar/dovme-parca-turnuvasi.ts` (yeni)
- `veri/harita.json` (36 dövüş düğümünün `botKip`/`botSeviye`'si + b4-11 takımı)
- `veri/parcalar-dovme.json` (yeni, katalog dışı)
- `test/denge/harita-denge.test.ts` (yeni, 5 test: zorluk eşlemesi sabit, vekil takımlar, düğüm turnuvası deterministik, dövme parçalar katalog dışı, düello duman testi)
- Sonuç JSON'ları: `HARITA-DENGE-zorluk.json` (sonra, resmî), `HARITA-DENGE-zorluk-once.json` (önce), `HARITA-DENGE-patron-dogrulama.json`, `HARITA-DENGE-dovme.json`

## 6. Kapılar
- `npm test`: **647/647** (37 dosya)
- `npm run lint`: temiz
- `npm run typecheck`: temiz
- Yeniden üretmek için: `npm run harita:zorluk -- --is=6 --json=docs/production/raporlar/HARITA-DENGE-zorluk.json` (≈ 30 s), `npx tsx araclar/dovme-parca-turnuvasi.ts --is=6 --json=docs/production/raporlar/HARITA-DENGE-dovme.json` (≈ 4 dk)
