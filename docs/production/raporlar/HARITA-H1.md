# HARITA-H1 · Veri, şema, saf kurallar

**Tarih:** 2026-11-06 · **Dal:** `devran-kod` · **Brief:** `docs/production/harita-kod-brief.md`

## Ne yapıldı
- **Veri `veri/`'ye taşındı** (otorite artık burası): `harita.json`, `madenler.json`, `ustalik.json`, `tarifler.json` (Market fiyatı ayrıldı), yeni `market-fiyat.json` (SAPMA fiyatları, KATALOG_OZETI'ne girmez). tuning.md § 22 özet + § 16 SAPMA satırı.
- **Zod şemaları ve yükleme:** `src/paylasilan/veri/harita.ts` (düğüm ayrımlı birleşimi, bölge, kademe, Ustalık, tarif, Market fiyatı; REST istek şemaları `GitSema`, `KazSema`, `EritSema`, `DovSema`, `ParcaUretSema`, `ParcaEritSema`, `VitrinSema`).
- **Saf kurallar** (`src/paylasilan/kurallar/`): `ustalik.ts` (seviye, ilerleme, bant, başarı), `maden.ts` (günlük çarpan, isabet penceresi/doğrulama, nadir sıra, vuruş sonucu + şanssızlık koruması, USTA DAMAR), `ocak.ts` (eritme partisi/toplu, Usta işi, tarif durumu, parça üretim maliyeti, değer puanı, parça eritme, malzemeli ad), `harita.ts` (`DURUM` 0–4, `asamaHesapla`, `acilacaklar`, `enKisaYol` BFS yönsüz, `bolgeIlerlemesi` 34 puan, `rozetHesapla`, `yildizlar`, `macOdulu`).
- **Göç 5** (`src/sunucu/db/sema.ts`): 08 § 3 + 12 § 10 + 13 § 4.1 tek göçte (harita_dugum 0–4 + basarili_vurus, maden_gunluk + `iska`, maden_seans + `kapasite`/`nadir_sira`, maden_vurus, cevher, ustalik, isleme_defteri, gorunum_sahip, parca/cekirdek malzeme alanları, seri_sayac, oyuncu vitrin/cerceve/karakter/harita_konum, mac dugum_id/yildiz, bolge_rozet). `Depo` okuma/yazma yardımcıları; `hesapSil` yeni tabloları boşaltır (seri_sayac kalır).
- **Lint kapısı:** `src/paylasilan/sim/**` → `kurallar/{harita,maden,ustalik,ocak}`, `veri/harita` yasak (eslint bloğu, negatif test).
- **Takımda aynı tanım tek** (`takimDegerlendir` → `tanimTekrar`).

## Testler
- 523 → **567** (yeni: `harita-veri` 9, `harita-kurallar` 20, `harita-db` 15). `npm run lint`, `typecheck`, `build` yeşil; `npm run test:tarayici` Node = Chromium (AYNI); `git diff --stat -- src/paylasilan/sim` boş.

## Varsaydım
- **Eritme başarı eğimi:** 03 § 3 "0,025" diyor, `ustalik.json` tek eğim 0,018 veriyor → JSON kazanır, kazı ve eritme aynı formül (03 kendi metninde "kazı ile aynı formül" diyor).
- **Dövme parça tarifleri** (bayraklı, ilk sürümde kapalı) taslakta alaşım kademesi 7 yazıyordu; 03 § 4.3 formülüne (15×K + 10×(K−1)) göre düzeltildi.
- **Sezon 2 takımları** (Bölge 4–5) iki üyede aynı Çekirdeği kullanıyordu (veri testi "3 farklı Çekirdek"): b4 ikinci üye `girdap-maden`, b5 ikinci üye `kor-kalbi` (sezon 2 DENGE turunda gözden geçirilir).
- **Rozetler birikimli:** GÜMÜŞ = BRONZ koşulu + patron USTALAŞ; ALTIN = 34/34.
- İlk galibiyette tekrar ödülü (50 Altın + 2 cevher) **verilmez**; yalnız yıldız ödülleri (01 § 4 toplamı 1 850 ile tutarlı). Tekrar ödülü düğüm zaten TEMİZLE iken sayılan galibiyette.
- `parcalar-dovme.json` bu planın dışında (09 "Sonra": bayrak dilimi).

## Riskler / sonraki dilim
- H2: oda `mod:"harita"`, `PROTOKOL_SURUMU` 7, `POST /api/harita/git`; `macOdulu` + `asamaHesapla` sunucuda tek işlemde.
