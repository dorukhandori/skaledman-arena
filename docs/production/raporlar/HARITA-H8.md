# HARITA-H8 · Ses yer tutucuları, mobil denetim, ekonomi yeniden ölçüm, gizlilik

**Tarih:** 2026-11-06 · **Dal:** `devran-kod`

## Ne yapıldı
- **Ses yer tutucuları** (`araclar/ses-uret.ts` sentez, CC0): `kazi-tik`, `isabet`, `eritme`, `dovme` (public/ses/*.wav; `Ses.ts` adları). Maden: vuruşta tık / isabette çınlama; Ocak: eritme cızırtısı, dövme ve parça üretiminde çekiç. Sentez toplamı 256 KB, kayıt katmanıyla genel 457 KB (bütçe 500 KB). Üretici artık `veri/manifest-ses.json`'daki elle yazılmış `kayitAdaylari` bloğunu **korur** (önceden baştan yazıyordu; dosyadaki uyarı giderildi).
- **Ayarlar:** "Kazı: isabet halkası Açık/Kapalı" (07 § 9; kapalıyken halka gizli, isabet gönderilmez, ceza yok).
- **Ekonomi sim'i `veri/`'den:** `araclar/harita-ekonomi-simulasyonu.ts` artık `veri/` okur (+ `market-fiyat.json`); 60 gün × 500 koşu çıktısı `docs/design/harita/sim-cikti-veri.md`; 06 § 7.6 notu: önceki tablolarla fark **≤ %10** (yalnız koşu sayısı), güncelleme gerekmedi.
- **Gizlilik** (`docs/gizlilik.md`, `/gizlilik` sayfası): harita/kazı/işleme kayıtları ve 30 gün kazı telemetrisi satırı.
- **Mobil denetim** (`araclar/mobil-denetim.cjs` + `harita` adımı: İlk Devir, b1-01'e yürü, Harita / Ocak / Maden / Oyna).

## Ölçümler
- `mobil-denetim` iPhone 14 (844×390) ve küçük (667×375), isMobile + hasTouch, DPR 2: Harita, Ocak, Maden, Lobi'de **sayfa kayması 0, ekran dışı metin 0, kırpık 0, < 44 px hedef 0, küçük yazı 0, konsol hatası 0** (Atölye/Market/Başarımlar/Lobi/Profil/Ayarlar/Günlük de aynı koşuda temiz). Haritada "binen" 4 satır: SVG grup kutularının (yıldız metni, karakter düğümün yanında) kesişimi; dokunma daireleri (r 27) çakışmaz — en yakın iki düğüm 59 mantıksal birim. Raporlar `raporlar/HARITA-H8-mobil-{iphone14,kucuk}.json`, ekranlar `ekran/HARITA-H8-mobil-*.png`.
- 626 test, lint/typecheck/build yeşil; `test:tarayici` Node = Chromium; sim dokunulmadı.

## Varsaydım / açık
- H-H4 (düğüm zorluklarının insan kazanım oranı) bot turnuvası koşulmadı: kabul eşiği değil, insan testi gecesiyle ölçülür.
- İsabet halkası 60 fps ölçümü ayrı yapılmadı (rAF + SVG; h:akis'te takılma gözlenmedi).
