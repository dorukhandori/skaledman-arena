# HARITA-H4 · Ocak (sunucu) + parça üretimi + pahalı Market

**Tarih:** 2026-11-06 · **Dal:** `devran-kod`

## Ne yapıldı
- `src/sunucu/oyuncu/ocak.ts` + `src/sunucu/api/ocak.ts`:
  - `GET /api/ocak` (cevher/külçe, kademe başına eritme oranı/başarı/bant, kozmetik tarifler + durum + Usta işi şansı + yeniden döv bedeli, 27 parça × K1–K4 üretim maliyeti/eşik/hazır, görünümler, üretilenler + değer, vitrin, koleksiyon değeri).
  - `POST /api/ocak/erit` (4:1, fark ≥ 20 → 3:1, başarısızlıkta 1 cüruf; 1–20 parti; 409 `ustalik·yetersiz·kademe`, 403 `kapali`).
  - `POST /api/ocak/dov` (kozmetik arma/çerçeve, tek seferlik; 402 `altin`, 409 `ustalik·eksik·sahip·sahipDegil·bayrak`, 404 `yok`; Usta işi zarı; `yeniden:true` yarı külçe + yarı Altın, tecrübe yok).
  - `POST /api/ocak/parca` (kilidi açık katalog parçası; 403 `kilitli` = Market kilidi (G-6), 409 `kademe·ustalik·eksik`, 402 `altin`; malzeme, yapımcı adı, **sunucu geneli seri** `(tanım, malzeme)`, Usta işi; Çekirdek Lv.1 XP 0).
  - `POST /api/ocak/parca-erit` (%50 aynı kademe, aşağı yuvarla; 409 `marketBicimi·takimda`; vitrinden düşer).
  - `PATCH /api/vitrin` (yalnız oyuncunun ürettiği örnekler, ≤ 3; 403 `sahipDegil`).
  - Tüm yazımlar tek işlem + `ref` (UUID) idempotent: aynı `ref` önceki sonucu döndürür (`tekrar:true`, başarım olayı yok).
- **Market SAPMA** (`kurallar/market.ts` `marketFiyati`, `veri/market-fiyat.json`): kilitsiz 15 parça 0, kilitli Standart 2 500 · Nadir 12 000 · Hizip 32 000 · Karanlık 48 000. `parcalar.json` değişmedi (KATALOG_OZETI aynı; Yapay yenileme tabanı eski fiyat).
- **Market craft satırı** (`craftBilgisi`): "CRAFT: 25 DON KÜLÇESİ · ~3 GÜN", "CRAFT: HAZIR · OCAK'A GİT", "CRAFT: İŞLEME 40 GEREKİR"; N = eksik külçe / son 7 günün eritme külçesi; veri yoksa 6 külçe/gün ile "(TAHMİN)". Geri sayım/son fırsat yok.
- `Depo.cevherEkle` UPDATE-önce (eksi değer CHECK'e takılmasın).

## Testler
- 589 → **597** (`ocak-api` 8): eritme 4:1/3:1/cüruf/toplu/ref, dövme kodları + tek seferlik + yeniden döv, parça üretimi (kilit, kademe, Ustalık, eksik, seri, yapımcı, değer, Çekirdek), **100 üretim seri çakışmaz** (11 § 10 #13), **G-0** (üretilmiş Kor Kalkan Gövde takıldığında takım kodu ve sim profilleri bit bit aynı; 11 § 10 #12), parça eritme + vitrin, Market fiyat + craft metni (11 § 10 #1, #2). d7 Market testleri SAPMA fiyatlarına güncellendi.
- lint, typecheck, build yeşil; sim dokunulmadı.

## Varsaydım
- **Günün parçası adayları:** kilitsiz parçalar artık 0 Altın olduğundan %30 indirim anlamsızdı → adaylar fiyatlı (kilitli, gizli olmayan) 10 parça.
- Eritme başarı eğimi ustalik.json'dan (0,018; H1 notu).
- "Ocak görünür" (İlk Kazı öncesi H5'e kadar): Ustalık tecrübesi ya da elde cevher/külçe. H5'te "İlk Kazı" başarımı birincil koşul olur.
- Tahmini craft hızı 6 külçe/gün (aktif profilin sim p50 civarı; 06 Tablo G gözden geçirilecek).
- Dökümhane eritmesi kodda hiç yok ("ERİTME YOK", nile § 0): "Dökümhane üretilmiş parçayı kabul etmez" kuralı kendiliğinden sağlanır.

## Sonraki
- H5: 29 başarım + olay sözlüğü (`eritme`, `ustaIsi`, `parcaUret`, `vitrinDolu`, `malzemeTopac`, `tanimKademeCesidi`, `koleksiyonDegeri`, `ustalikSeviye`).
