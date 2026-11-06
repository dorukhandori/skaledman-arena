# HARITA-H5 · Başarımlar

**Tarih:** 2026-11-06 · **Dal:** `devran-kod`

## Ne yapıldı
- `veri/basarimlar.json`: 46 → **75** (taslaktaki 29: 22 ilk sürüm + 7 sezon 2; sekmeler mevcut `yol`, `gosteri`, `gizli`). Mevcut 32 başarıma `haritaZorlukMin` (05 § 3 tablosu; Kararma 3'ü ilk sürümde pasif → fiilen 29).
- `kurallar/basarim.ts`: `BasarimGirdisi.harita` (artış: `dugumTamam`, `bolgeTamam`, `cevherKazildi`, `nadirDamar`, `isabetSerisi`, `eritme`, `ustaIsi`, `parcaUret`; durum: `yildizToplam`, `enYuksekRozet`, `ustalik`, `vitrinDolu`, `malzemeTopac`, `tanimKademeCesidi`, `koleksiyonDegeri`); 16 yeni olay sözlükte, maç kapısından bağımsız; `cevherCesidi` küme (`basarim_kume`, anahtar = kademe); şart metinleri ("sen" dili). `macKapisi` harita dalı H2'de.
- `sunucu/oyuncu/haritaBasarim.ts`: kalıcı durumdan değerler (`haritaDurumu`) + uçların biriktirdiği olaylar → `basarimOlayiIsle` (aynı işlem); harita maçı sonunda `macSonuKaydet` aynı çağrıya `harita` girdisini ekler. Git, sandık, kazı, erit, döv, parça, vitrin uçları `yeniBasarimlar` (tamamlananlar) döndürür.
- **Açılan görünüm:** başarım tamamlanınca `acilanGorunum` → `gorunum_sahip` (arma-kazma, cerceve-krater, cerceve-yildiz, cerceve-koleksiyon); bildirim + `BasarimBilgisi.acilanGorunum` ("AÇILDI" kartı verisi).
- **Ocak görünürlüğü:** "İlk Kazı" (`atolye-ocak`) birincil koşul; eski hesapta kalan cevher/külçe ya da İşleme tecrübesi de açar.

## Testler
- 597 → **626** (`harita-basarim` 29: veri (75, 22 ilk sürüm, sekmeler, olay sözlüğü, şart metni, parça açmaz), 22 başarım × pozitif/negatif, sezon 2 pasif, **zorluk 1'de yalnız `takim-ultisi`**, zorluk 2/3 kapıları, PvP galibiyet sayıları ve `seri` haritada sayılmaz, 11.+ maç sayılmaz, sunucu akışı (İlk Adım → İlk Kazı → İlk Külçe → İlk Parça → Vitrin), idempotent ödül, görünüm verme, yıldız toplamı). `veri`/`d7`/`d7-api` sayımları 75'e (eski 46 tablo güdümlü testi aynen).
- lint/typecheck/build yeşil; sim dokunulmadı.

## Varsaydım
- Toplam 75 (taslak notu "46 + 29 = 75"; 09'daki "69" eski sayım → JSON kazanır).
- `tam-isabet` koşulu `{}` (taslaktaki `tekSeans:false` kod koşulu değil; seri gün içinde seanslar arası sürer).
- `bolge-altin` için olay `bolgeRozet` (`kosul.rozet: 3`); 05 § 2.2'deki `bolgeYildizTam` yerine 13 § 3.3 ALTIN rozet (13 kazanır).
- Mevcut başarımlar ekranı (sekme sayısı) değişmedi; yeni başarımlar var olan sekmelerde listelenir.
