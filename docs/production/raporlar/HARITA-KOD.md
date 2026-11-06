# HARITA-KOD · Harita / Maden / İşleme kodlaması (H1–H8) özeti

**Tarih:** 2026-11-06 · **Dal:** `devran-kod` · **Brief:** `docs/production/harita-kod-brief.md` · Tasarım: `docs/design/harita/` (13 > 12 > diğerleri; sayılar `veri/`)

## Dilim tablosu

| Dilim | Kapsam | Testler (toplam) | Rapor |
|---|---|---|---|
| H1 | `veri/` (harita, madenler, ustalik, tarifler, market-fiyat), zod şemaları, saf kurallar (ustalik, maden, ocak, harita: aşama, kilit, BFS yol, ilerleme, rozet, yıldız, ödül), göç 5, `hesapSil`, sim lint kapısı, takımda aynı tanım tek | 523 → 567 | [HARITA-H1](HARITA-H1.md) |
| H2 | `PROTOKOL_SURUMU` 7, `mod:"harita"` oda (4110/4111), bot kipi/takımı, maç sonu (yıldız, aşama, ödül, kilit, sonraki bölge, rozet, 10 sayılan maç), `GET /api/harita`, `POST git/sandik`, `PATCH /api/profil`, kozmetik `malzeme` şema alanı | 579 | [HARITA-H2](HARITA-H2.md) |
| H3 | Kazı uçları (basla/kaz/bitir), DİNÇ 40 + yarım 20 + 61+ verimsiz, 700 ms, nadir yuva, şanssızlık koruması, isabet doğrulama (+ RTT), USTA DAMAR, telemetri 30 gün | 589 | [HARITA-H3](HARITA-H3.md) |
| H4 | Ocak (erit, kozmetik döv, yeniden döv), parça üretimi (malzeme, yapımcı, seri, Usta işi), parça eritme, vitrin, Market SAPMA fiyatları + craft satırı | 597 | [HARITA-H4](HARITA-H4.md) |
| H5 | 29 başarım (75 kayıt), olay sözlüğü, `haritaZorlukMin` kapısı, görünüm açma | 626 | [HARITA-H5](HARITA-H5.md) |
| H6 | Oyna'da HARİTA, Harita ekranı (karakter, yürüme, halka çentikleri, şerit, mini profil), Sonuç eki, `npm run h:akis` | 626 | [HARITA-H6](HARITA-H6.md) |
| H7 | Maden, Ocak ekranları, Atölye biçim yığını + Ocak düğmesi, Market ÜCRETSİZ/craft, Profil KARAKTER/çerçeve/vitrin, lobi malzeme rozetleri | 626 | [HARITA-H7](HARITA-H7.md) |
| H8 | Ses yer tutucuları, Ayarlar isabet halkası, ekonomi sim'i `veri/`'den, gizlilik, mobil denetim | 626 | [HARITA-H8](HARITA-H8.md) |

## Ölçümler
- **Değişmezler:** `src/paylasilan/sim/**` hiç değişmedi; `npm run test:tarayici` Node = Chromium (altın hash'ler AYNI); KATALOG_OZETI değişmedi (harita verisi ve Market fiyatı özete girmez). G-0 testleri: Ustalık 0 vs 100 ve farklı malzeme → aynı takım kodu, aynı sim profili, aynı maç hash'i.
- **Ağ:** `ag:matris N0 N1` hash sapma 0 (H2).
- **İsabet adaleti (H-H6):** N3 benzetiminde gerçek isabet kabulü ≥ %95, sahte ±400 ms %0; tolerans ±150 ms kaldı.
- **Bot çiftliği (Tablo E):** bot ÷ tutkulu cevher 1,07–1,08 (hedef ≤ 1,25); `veri/`'den yeniden koşu önceki tablolarla ≤ %10.
- **Uçtan uca (`h:akis`):** kayıt → harita maçı (otomatik) → kazı (isabet +1) → erit → ilk parça **122 sn** (hedef ≤ 15 dk) → Atölye'de tak → profil; konsol hatası 0; telefon 844×390 ve 667×375'te kayma 0, < 44 px hedef 0.

## Sahip için kısa "varsaydım" listesi (ayrıntı dilim raporlarında)
- Eritme başarı eğimi 0,018 (JSON); kazı ile aynı formül.
- İlk galibiyette tekrar ödülü yok; rozetler birikimli; bölge değişince karakter girişten yürür.
- 08'deki "60 vuruşta 409" yerine 61+ verimsiz (kilit yok).
- İsabet için istemci RTT'si (`gecikmeMs`) eklendi.
- Günün parçası adayları artık fiyatlı (kilitli) parçalar.
- Toplam başarım 75; `bolge-altin` ALTIN rozetle.
- Harita/karakter yer tutucusu SVG (Pixi tuvali açılmadan).
- Sezon 2 takımlarında yinelenen Çekirdek düzeltildi; dövme parça tariflerinin alaşım kademesi formüle göre düzeltildi.

## Ek: küçük işler (sahip seçimi "Kalan küçük işler")
- **Seyirci (OBS) malzeme rozetleri:** `IzleOyuncu.malzeme` (12 hane, oyuncu şemasıyla aynı) seyirci odasına yansır; `SeyirciHud` parça kartında 4 kare [Ç, G, D, U]. Tümü Market olan kartta rozet yok. Tarayıcıda doğrulandı (HUD modülü, kod `1200…` → yalnız ilk kartta 4 kare; sayfa hatası 0).
- **Pergel ipuçları veriye taşındı:** `veri/ipuclari.json` +8 (`harita-ilk`, `harita-dal`, `yildiz-sart`, `maden-ilk`, `maden-ustalik`, `maden-ogretmez`, `ocak-ilk`, `ocak-alasim`; metinler 07 § 4/§ 10). `IpucuSema.kosul` genişledi. Ekranlar kendi ipucu satırında her birini **bir kez** gösterir (`bilgic/haritaIpucu.ts`; görülenler Pergel kaydına yazılır, Pergel "kapalı" ise hiç). Atölye balonu bunları seçmez (test). Eski `devran.haritaIpucu.v1` / `devran.ocakIpucu.v1` anahtarları kalktı (varsaydım: önceden görenler ipucunu bir kez daha görür, zararsız).
- **A7 telemetri raporu:** `npm run maden:rapor` (yalnız okur, son 30 gün): bir günde ≥ 20 vuruş, isabet ≥ %98 ve vuruş aralığı sapması < 20 ms olan oyuncu-günleri. Otomatik ceza yok; insan incelemesi. Test: sabit ritimli bot raporlanır, insan benzeri ritim raporlanmaz.
- Not: `h:akis` bu oturumda üç kez çalıştı; otomatik bot b1-01 maçını üçünde de kaybetti (değişiklikler geri alınmışken de), bu yüzden maden adımı koşmadı. Harita ve Ocak ipucu ekranları görüldü (`HARITA-KUCUK-harita-ilk.png`, `HARITA-KUCUK-ocak-ilk.png`), konsol hatası 0.

## Kalan işler
- **Sanat hattı (10):** ikonlar, harita zeminleri, karakter atlası (BEKLE/YÜRÜ/KAZ/DÖVÜŞE GİR/KUTLA), damar/külçe, malzeme paletleri, arma/çerçeve görselleri; profilde dövülen arma gösterimi.
- **Sanat hattı (Mac):** kod ile çizilen yer tutucular (`npm run harita:asset`) Gemini/Tripo/Blender çıktılarıyla değişecek.
- Maç HUD ad satırı odak metni.
- H-H4 bot turnuvası (düğüm zorlukları) ve H-H5 (dövme parça bayrağı) ayrı dilimler; sezon 2 bölgeleri 4–6, K5–K8.
- İnsan play pass (H-H7: ilk 5 dk, isabetin fark edilmesi).
