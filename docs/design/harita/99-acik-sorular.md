# 99 · Açık sorular (sahibe)

**Bloklayıcı soru yok.** Her satırın varsayılanıyla bütün belgeler kendi içinde tutarlıdır ("varsaydım"). Sahip bir varsayılanı değiştirirse "Etki" sütunundaki belgeler güncellenir.

| # | Soru | Varsayılan (varsaydım) | Etkisi (değişirse) |
|---|---|---|---|
| S-1 | Videodaki harita gerçekten "sabit kamera, yol çizgili düğümler" mi? (Video başlığı doğrulandı: *While the Iron's Hot: Buried Treasure! Ep. 9*; görüntü alınamadı) | Evet: sabit kamera, düğüm başına tek tek ilerleme, tamamlanan komşuyu açar | 01 § 1–2, 07 § 2 (yerleşim); mekanik aynı |
| S-2 | "Yolcu / dinlenme / tüccar" düğümü olsun mu? | Hayır (taşınan durum yok; Market'in kopyası olur). SANDIK yeter | 01 § 3 yeni tür, 07 § 3 |
| S-3 | Üçüncü Ustalık (Keşif) olsun mu? | Hayır; iki Ustalık (Madencilik, İşleme) | 04 § 2, 07, 08 şema `tur` |
| S-4 | Başarımlar ekranında yedinci "HARİTA" sekmesi? | Hayır; 6 sekme kalır, yeni başarımlar YOL/GÖSTERİ/gizli'ye dağılır (referans 05) | 05 § 1, 07 |
| S-5 | Ustalık ölçeği 0–100 mi, 1–N seviye mi? | 0–100 (UO hissi, eşikler akılda kalır) | 04 § 3; tüm eşik tabloları |
| S-6 | İlk sürüm içeriği bitince artan cevher ne olsun? | Hiçbir şeye dönüşmez (arbitraj yok); sezon 2 + "yeniden döv" (Usta işi) gideri yeter | 03 § 5–6, 06 R4 |
| S-7 | Dövme parçalar (yan-grade) ilk sürümde açık mı? | **Kapalı** (bayrak); H-H5 bot turnuvası geçince açılır | 03 § 4.3, 06 H-H5, 08 § 7 |
| S-8 | PvP harita / asenkron "gölge rakip" (başka oyuncunun takımı bot olarak)? | Hayır (ilk sürüm); sezon sonrası fikir | 01, 08 |
| S-9 | İsabet toleransı | ±150 ms sabit; H-H6'ya göre en çok 250 ms | 02 § 7, 08 § 6 |
| S-10 | Harita ne zaman açılır? | İlk Devir (Antrenman eğitimi) sonrası, Oyna'da 4. mod | 01 § 7, 07 § 1 |
| S-11 | Ocak nerede? | Atölye alt şeridinde 5. öğe (İlk Kazı sonrası); alternatif: Atölye içinde sekme | 03 § 1, 07 § 5 |
| S-12 | Günde 10 sayılan harita maçı ve 40/60 vuruş sayıları | Tablo E'ye göre yeterli (bot ÷ tutkulu 1,08) | 02 § 6, 06 |
| S-13 | Harita maçı Çekirdek XP versin mi? | Evet, hızlı maç tablosu, günlük 10 sayılan maçla sınırlı | 01 § 5, 00 G-5 |
| S-14 | Kademe/element sırası (Kaya → Don → Kor → Kasırga → Şimşek → Girdap → Devir) | Maden lore'u + çark sırası | 02 § 2, 01 § 1, harita.json |
| S-15 | (kalktı: cila yerine malzeme biçimi, 12 § 3) Malzeme biçimi maç sprite'ında da görünsün mü? | Evet, yalnız metal paleti; köken ışığı/kıvılcım aynı | 12 § 3, 10 § 3.4 |
| S-16 | Roadmap konumu | Kick'ten önce, ilk test gecesinden sonra (ekranlar); sunucu dilimleri test gecesi hazırlığıyla paralel | 09 § 4, roadmap |
| S-17 | Bölge adları ve patron adları (OCAK USTASI…) | Taslak adlar; sahip onayı | harita.json |
| S-18 | Cevher lore adları (Dağ Bakırı, Kırağı Gümüşü, Köz Demiri, Savruk Kuvars, Çakmak Taşı, Çevren İncisi, Devir Taşı) | Taslak; yalnız Dünya sayfası | madenler.json, 02 § 2 |
| S-19 | Malzeme kademesi küçük yan-grade versin mi (ör. bir eksende ±%2)? | **Hayır**: güç eşit; kıymet = görünüm, ad, rozet, yapımcı imzası, seri no, vitrin, ses (12 § 1.1) | 12, 06 (bant testi gerekir), 08 (takım kodu) |
| S-20 | Market fiyat çarpanı | Kilitsiz 15 parça 0; Standart ×5, Nadir ×6, Hizip ×8, Karanlık ×8 (araştırma aralığı ×4–×12, `T_market ≤ 75 gün`) | 12 § 5, 06 Tablo G, `market-fiyat.json` |
| S-21 | Oyuncular arası takas / pazar | **Kapalı** (bot/RMT riski; değer tek oyunculu prestij) | 12 § 4, 08 |
| S-22 | "Market'te hiç parça satma, yalnız craft" | **Hayır**: pahalı kısayol kalsın (gündelik oyuncunun Ustalığı yetmeyen parça için tek yolu) | 12 § 5.3 |
| S-23 | Craft süresi / günlük sınır | Gerçek zamanlı bekleme yok; sınır yalnız günlük 40 dinç + 20 yarım vuruş; 61+ kilit değil, verimsiz | 02 § 6, 11 § 5.1 |
| S-24 | Kullanılmayan dinç vuruş ertesi güne taşınsın mı (en çok 80)? | **Hayır** (S2 sadelik); araştırma "seyrek oyuncuyu korur" diyor | 02 § 6, 11 § 5.1 |
| S-25 | Usta damgası çerçevesi Ustalık 82+, "USTA" mührü 100 (araştırma önerisi) | Evet, yalnız görünüm | 12 § 3, 10 |
