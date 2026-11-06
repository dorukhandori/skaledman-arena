# HARITA-H2 · Harita maçı (sunucu + oda)

**Tarih:** 2026-11-06 · **Dal:** `devran-kod`

## Ne yapıldı
- **Protokol 7** (`src/ag/protokol.ts`): `MOD` + `"harita"`, `KatilmaSema.dugum` (harita modunda zorunlu, `superRefine`), `BilgiMesaji.odul.harita` eki (`HaritaOdulBilgisi`). Eski istemci 4101 "surum" ile reddedilir.
- **Oda şeması:** üye başına kozmetik `malzeme` (12 hane, [Çekirdek, Gövde, Disk, Uç] × 3; 0 = Market) ve oda `dugum`. Sim, takım kodu, hash değişmez (test).
- **MacYonetimi:** `botKipleri` (sim dışı kip eşlemesi; düğümün `botKip`'i).
- **MacOdasi `mod:"harita"`:** bilet zorunlu (misafir 4103); `dovusGirisi` düğüm açık DÜŞMAN/PATRON değilse **4110 `dugum`**, karakter düğümde değilse **4111 `uzak`**; tek oyunculu, düğüm botu hemen (takım `harita.json`, üye seviyesi `botSeviye`), `mac.bot = 1`, `mac.dugum_id`, `mac.yildiz`.
- **Maç sonu** (`macSonuKaydet` → `haritaMacSonu`, tek işlem, `mac.id` idempotent): maç Altını yerine düğüm ödülü; yıldız maskesi (`yildizlar`), aşama (TEMİZLE/USTALAŞ), yıldız Altını bit başına bir kez (`yildiz:<o>:<d>:<bit>`), kalan `harita:<maç>:<o>`; cevher/külçe; USTALAŞ eki (düşman +1 külçe, patron `arma-<bölge>`); komşu AÇIK + patron → sonraki bölge 01; bölge rozeti (`rozet:<o>:<bölge>:<n>`, GÜMÜŞ'te `cerceve-<bölge>`); günde 10 sayılan maç (XP de yalnız onlarda); teslim/hükmen/iptal/< 20 sn geçersiz.
- **REST** (`src/sunucu/api/harita.ts`): `GET /api/harita` (bölgeler, düğüm aşamaları, yıldız şartları, damar kalanı, ilerleme %, rozet, konum, sayaçlar; ilk çağrıda b1-01 AÇIK), `POST /api/harita/git` (BFS yol, KEŞFET, maden/sandık komşu açma; 409 `kilitli`/`yolYok`, 10 istek/sn), `POST /api/harita/sandik` (409 `uzak`/`acilmis`/`kilitli`, 400 `tur`), `PATCH /api/profil` (`karakter` 0–3, `cerceve` yalnız sahip olunan). `/api/ben` + `harita{acik, konum}`, `karakter`, `cerceve`.
- **Başarım kapısı:** `macKapisi` harita dalı (`haritaZorlukMin` + `dugumZorluk` + `haritaSayilan`); `BasarimSema.haritaZorlukMin` (veri H5'te).
- İstemci `Baglanti.harita(dugum)` (ekran H6'da).

## Testler
- 567 → **579** (`harita-api` 12: açılış/yürüme/yolYok/sandık, maç sonu galibiyet/tekrar/mağlubiyet/11. maç/teslim/kısa/patron/rozet, G-0 hash (Ustalık 0 vs 100 + malzeme farkı → aynı hash), HTTP uçları, oda 4110/4111/4103/4101/4105 + bot seçim → maç). `ag.test`/`api.test` protokol 7'ye güncellendi.
- lint, typecheck, build yeşil; `git diff -- src/paylasilan/sim` boş.
- **`npm run ag:matris -- N0 N1`:** N0 wire 61/61, oynatma son eşit; N1 wire 54/54, son eşit; hata 0 → **hash sapma 0** (`raporlar/HARITA-H2-ag-matris.json`).

## Varsaydım
- İlk galibiyette tekrar ödülü yok (H1 notu); USTALAŞ düşman külçesi kademe = bölge no.
- Bölge değişince karakter bölgenin girişinden yürür (bölge başına son konum tutulmaz; tek `harita_konum`).
- Harita maçında `sayilmadi` alanı `haritaTavani` (11.+ maç) ya da geçersizlik nedeni taşır.
- Bot takımı adı: patron için `harita.json` `ad`, düşman için "Düşman".
- H-H4 bot turnuvası (düğüm zorlukları) bu dilimde koşulmadı: kabul eşiği değil; H8'de raporlanır.

## Sonraki
- H3 kazı uçları `asamaYaz` ile maden TEMİZLE/USTALAŞ yazacak; `basarimHaritaOlaylari` H5'te gerçek olaylarla doldurulacak.
