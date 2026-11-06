# HARITA-H7 · Ekranlar 2: Maden, Ocak, Atölye biçim yığını, Market craft, Profil KARAKTER + vitrin, malzeme rozetleri

**Tarih:** 2026-11-06 · **Dal:** `devran-kod`

## Ne yapıldı
- **Maden ekranı** (`Maden.ts`, `?ekran=maden&dugum=`): damar (kademe rengi + rakam) + Kuşak halkası (1,4 sn, bronz isabet yayı %22, ışıklı uç; "hareketi azalt" → 8 basamak), KAZ (≥ 64 px, alt; boş alana dokunma / Boşluk / Enter; sol 60 px Android jesti hariç; 700 ms kilit), uçuşan sonuç ("+3 ◆1", "İSABET", "NADİR", "ISKA +5", "MADENCİLİK n", "AÇILDI: …"), Madencilik paneli (seviye, çubuk, bant, başarı %), damar kalan ●●●●○○, nadir damar satırı ("USTALIĞIN YETMİYOR · 25"), USTA DAMAR, BU SEANS listesi, karakterin küçük kopyası, DİNÇ sayacı + 41+ "BUNDAN SONRA YARIM VERİM" bandı; kapasite bitince ana düğme HARİTA; ◄ seansı bitirip haritaya döner. İsabet zamanı istemci saati + son 3 RTT ortancası (`gecikmeMs`, H3). Ayar `devran.isabetHalkasi=0` → halka gizli, isabet gönderilmez. Tükenmiş damarda istek atmadan bilgi (gereksiz 409 yok).
- **Ocak ekranı** (`Ocak.ts`, Atölye › OCAK): Ustalık bandı (⛏/⚒ + koleksiyon değeri), cevher·külçe listesi (K1–K4, kilitli "İŞL n"), seçili kademe paneli: ERİT (−/+ 44 px, ok tuşları, önizleme, başarı/oran/bant), TARİF (✓ EŞİK / İŞL. n / ✓ SAHİP / USTA İŞİ / EKSİK soluk), PARÇA (kilidi açık ve kademede üretilebilen), sonuç kartı (malzemeli ad · YAPAN · NO. · tarih · USTA İŞİ parıltısı), YENİDEN DÖV · %n, ≥ 1 000 Altın onayı, ana düğme ERİT/DÖV/ÜRET, ATÖLYE'DE TAK.
- **Atölye:** alt şeritte **Ocak** (İlk Kazı sonrası); envanter kartında üretilmiş biçimin kademe rozeti (K1✦…, yapımcı + No. ipucu) ve "×N" biçim sayısı; aynı karta tekrar dokunuş sıradaki biçimi takar (en kıymetli önce, Market sonda). `/api/atolye` parçalara malzeme/seri/yapımcı/usta ekler.
- **Market:** ücretsiz parça "ÜCRETSİZ"; ayrıntıda craft satırı ("CRAFT: 3 DEMİR KÜLÇESİ · ~1 GÜN (TAHMİN)", "İŞLEME n GEREKİR", "HAZIR · OCAK'A GİT").
- **Profil:** KARAKTER (4 gövde, profil renginde), ⛏/⚒ Ustalık satırı, Çerçeve seçimi (sahip olunan `cerceve-*`), Vitrin (3 yuva, değer puanına göre üretilmiş parçalar); Kaydet → `PATCH /api/profil` + `PATCH /api/vitrin`.
- **Malzeme rozetleri:** Lobi takım seçiminde Sen/Rakip panellerinde üye başına 4 küçük kare (oda şeması `malzeme`; Market biçimi boş).
- Geliştirme ucu `POST /api/gelistirme/cevher` (yalnız yerel, üretimde yok; `h:akis` hazırlığı).

## Doğrulama (`H_DILIM=H7 npm run h:akis`)
- Akış: kayıt → İlk Devir → Harita → maç (b1-01, otomatik) → b1-02'ye yürü → KAZ → 6 vuruş (biri **İSABET +4**, ilk vuruşta "AÇILDI: İlk Kazı", seviye 1→2 uçuşu; damar 0/6 → HARİTA) → Atölye'de **Ocak** düğmesi → ERİT ("3 KÜLÇE · 4 CÜRUF · AÇILDI: İlk Külçe") → PARÇA Düz Uç → "DEMİR DÜZ UÇ · YAPAN: … · NO. 0002" → ATÖLYE'DE TAK → Uç sekmesinde K1 rozeti → Market "ÜCRETSİZ" → Profil karakter 2 + vitrin `p25` kaydedildi.
- **İlk üretilmiş parça: 122 sn** (hesap açılışından, 2 dk'lık maç dahil; hedef ≤ 15 dk, 11 § 10 #3). Not: Demir cevheri geliştirme ucuyla tamamlandı (kazı zarına bağlı kalmasın); gerçek oyunda sandık + bir damar ≈ 18–24 cevher.
- **Konsol hatası 0**. Telefon 844×390: Harita, Maden, Ocak'ta yatay kayma yok; < 44 px yalnız ortak lento ◄ ve Altın yuvası (MOBIL-1 `::after` payı).
- Ekranlar `ekran/HARITA-H7-*.png` (harita-maden-kaz, maden-ilk, maden-vurus, maden-bitti, atolye-ocak-dugmesi, ocak-ilk, ocak-erit, ocak-parca-uretildi, atolye-bicim, market-ucretsiz, profil-karakter-vitrin, telefon-harita/ocak/maden).
- 626 test, lint/typecheck/build yeşil; sim dokunulmadı.

## Varsaydım
- İsabet halkası 60 fps ölçümü: halka `requestAnimationFrame` + SVG öznitelik (DOM boyama; orta telefon emülasyonu ayrı ölçülmedi — H8 notu).
- Profil arması hâlâ 6 element simgesi; dövülen arma görünümleri (`arma-cevher-*`) sahip olunur, profilde gösterimi sanat hattıyla (10) gelir. Çerçeve seçilir ve saklanır.
- Seyirci (OBS) kartında malzeme rozetleri bu dilimde yok (izle odası şeması ayrı; risk düşük, sonraki iş).
- Ayarlar ekranına "İsabet halkası" düğmesi eklenmedi; anahtar `devran.isabetHalkasi` hazır (H8'de Ayarlar satırı).
