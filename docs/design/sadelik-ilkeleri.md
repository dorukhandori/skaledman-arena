# Menü sadeliği: ilkeler, ekran bazlı sadeleştirme, lore feragat önerileri

**Tarih:** 2026-11-04 · **Şapka:** `@tide` (UX) + `@iris` (sanat yönetimi) · **Dal:** `devran-kod` · **Durum:** öneri; aşağıdaki "karar bekleyen" maddeler dışında sahip itiraz etmezse bağlayıcı.
**Sahibin isteği (2026-11-04):** "UI atölye görsellerini gördüm. **Menüler olabildiğince sade ve anlaşılır olsun. Gerekirse bu uğurda lore derinliğinden biraz olsun feragat edebiliriz.**" Ayrıca: "Referanstaki gibi olsun her şey istiyorum" (kamera kararı K-1 = Hibrit, `docs/art/tasarim-dili.md` § 9.1).

**Kapsam.** Bu belge yalnız **arayüzü** (ne gösterilir, nerede, kaç sözcükle) düzenler. Mekanik silmez: bir öğe arayüzden kalkınca sim, sunucu, veri ve kayıt aynen çalışmaya devam eder. Hiçbir öneri altın hash'leri, kuralları ya da veritabanı şemasını değiştirmez.
**Otorite.** Görünüş `docs/art/tasarim-dili.md`, sunum ve akış `docs/ux/kontrol-ve-hud.md`, terimler `docs/design/beyblade/04-sozluk.md`. Bu belge "sadelik > lore" ilkesini bu üçüne ekler; çelişen yerler § 5'te sahip kararı bekleyen madde olarak durur.
**Maketler:** `docs/art/maketler/` (sade menü ailesi `m3-*.png`, önce/sonra `karsilastirma-*.png`). Maketler bu belgedeki "kalsın" sütununu çizer.

---

## 1. İlkeler

| # | İlke | Ölçüt (kabul) |
|---|---|---|
| S-1 | **Sadelik lore'un önünde** | Bir öğe yalnız lore taşıyorsa (oynanış kararına etkisi yoksa) ana ekranda durmaz; ipucu, ikinci kat ya da "Dünya" sayfasına gider |
| S-2 | **Ekran başına en çok 1 ana eylem** | Bronz-turuncu dolgulu tek düğme (tasarim-dili § 4.3); Enter ona basar; varsayılan odak ondadır |
| S-3 | **Ana düğme sabit konumda** | Menülerde **sağ alt** (Atölye OYNA, Oyna MAÇ BUL, Market SATIN AL, Başarımlar MARKETE GİT); tam ekran seçimlerde (İlk Çekirdek SEÇ, Lobi HAZIR, Sonuç TEKRAR) **alt orta** |
| S-4 | **5–7 öğe grubu** | Bir ekranda göz ilk bakışta en çok 7 kümeyi sayar (panel, sekme sırası, ızgara, düğme şeridi…). Bir küme içinde en çok 12 hücre görünür, fazlası kaydırma |
| S-5 | **Tek tıkla geri** | Alt ekranlarda sol üstte kırmızı kare ◄ (Esc/Backspace aynı); "X" yalnız modal kapatır (ux § 3.2, G-15) |
| S-6 | **İlk bakışta "ne yapacağım?"** | Ekran başlığı + ana düğme metni birlikte cevabı verir (ör. "MARKET" + "SATIN AL"); 0,5 sn bakış testinde ilk iki öğe başlık ve ana düğme |
| S-7 | **Kısa metin, genel terim** | Etiket 1–2 sözcük, BÜYÜK HARF; açıklama tek satır (≤ 40 karakter), cümle düzeni; terimler yalnız `04-sozluk.md` sağ sütunu; uydurma sözcük yok |
| S-8 | **Sayı yerine çubuk, cümle yerine simge** | Karşılaştırma çubukla (segment ya da dolgu), durum simgeyle (kilit, ✓, ???); sayı yalnız seçili öğede |
| S-9 | **Ayrıntı ikinci katta** | Uzun bilgi seçili öğenin alt şeridinde ya da fare üstü/odak ipucunda; ana ızgarada yok |
| S-10 | **Geliştirici araçları oyuncuya görünmez** | Topaç Lab, "Parça ver", "+100 XP", D-dilim rozeti yalnız `?gelistir=1` ile |
| S-11 | **Erişilebilirlik bozulmaz** | Kaldırılan görsel bilgi ARIA etiketinde ve klavye odağında durur; renk tek kanal değil (İ-3) |

**Ölçüm.** Her ekran için: (1) küme sayımı ≤ 7, (2) ana düğme sayısı = 1, (3) görünür metin satırı sayımı (önce/sonra), (4) üç kişiye 0,5 sn gösterip "ne yaparsın?" sorusu, ≥ 2 doğru. Sonuç `docs/production/raporlar/GU.md`'ye (tasarim-dili § 8.3, GU-13).

---

## 2. Ekran bazlı sadeleştirme

Etiketler: **kalsın** (ana ekranda) · **sakla** (ikinci kat: seçili öğe şeridi, ipucu, ayrıntı paneli) · **kaldır** (arayüzden çıkar; mekanik sürer) · **ertele** (özellik ilk sürümde yok ya da sonraki dilim). "Şimdi" sütunu D5/D6 ekran görüntülerinden (`docs/production/raporlar/ekran/`) okundu.

### 2.1 Atölye (03) · ana ekran · maket `m3-atolye.png`, kıyas `karsilastirma-atolye.png`
| Şimdi var (D6) | Öneri | Not |
|---|---|---|
| Üst gezinti (Atölye · Market · Başarımlar · Oyna · Ayarlar) + "D6" rozeti | **sakla** → Atölye'de alt şerit: MARKET · BAŞARIMLAR · PROFİL · AYARLAR; Oyna = sağ alttaki OYNA | Alt ekranlarda gezinti yok, yalnız ◄ (referans 04/06). Karar bekliyor: § 5 KS-2 |
| Başlık satırı "Ayla raxz · 2 Çekirdek · 7 parça" | **kaldır** | Sayılar envanterde görünüyor |
| Çekirdek Günlüğü / Profil / Topaç Lab düğmeleri | Günlük **sakla** (Çekirdek'e tık → Çekirdek ayrıntısı), Profil alt şeride, Topaç Lab **kaldır** (S-10) | |
| Envanter: 4 metin sekme | **kalsın**, ikonlu sekme (referans 03) | |
| 4 filtre açılır listesi (Element, Köken, Tip, sahiplik) | **sakla** → tek "Filtre" düğmesi (ızgara 12'yi aşınca görünür) | İlk sürümde parça sayısı küçük (B-14) |
| Metin kartı (ad, "Sende", tip, "1. topaçta") | **kalsın** ama ikon + kısa ad; durum küçük yeşil kare (takımda), kilit + "3/10", "???" | |
| Kart altında tip eğilimi ("Saldırgan", "Kale") | **sakla** (seçili öğe şeridi) | |
| Geliştirme alanı (Parça ver, +100 XP) | **kaldır** (S-10) | |
| Orta: "1. topaç · Kaya Maden" + önizleme + 4 parça listesi | **kalsın**: ad + element simgesi; patlatılmış dikey parça görünümü (referans 03), parça adları etiketin altında | |
| 6 çubuk + sayı | **kalsın** (C-1), turuncu çerçeveli | Kasıtlı fark korunur |
| "Uç: Yerinde köklenir", "Yön: Sağa döner" etiketleri | **sakla** (Uç ve Çekirdek parçasına fare üstü) | G-32 "etiket" der; ikinci katta da etikettir |
| "Tip: Kale · sonra Dayanıklı'ya yakın" | Tip **kalsın** tek sözcük (SALDIRGAN); "yakın tip" **kaldır** | Tip üçgeni oynanış bilgisidir; ikinci tip lore değil ama gürültü |
| Uyum kutusu (iki satır cümle) | **kalsın** tek satır: "✓ UYUM: ENERJİ +%10"; uyumsuzsa sarı "! UYUMSUZ: ENERJİ YAVAŞ" | |
| Rakip seçimi açılır listesi + "Dene: 30 sn Antrenman" + açıklama | "DENE · 30 SN" **kalsın** (ikincil düğme); rakip seçimi **sakla** (varsayılan Kukla; Ayarlar'da) ; açıklama **kaldır** | US-2.3 |
| 4 yuva düğmesi (Çekirdek, Gövde, Disk, Uç) + "Uç çıkar" | **kalsın** patlatılmış görünüm parçaları tıklanır; "çıkar" **sakla** (sağ tık / seçili şerit) | |
| Takım: ad alanı + "Adı kaydet" | **sakla** (takım adına tık → yeniden adlandır) | |
| 3 yuva kartı, ▲▼ sıralama | **kalsın** (topaç sprite'ı + ad + Lv. + 3 mini çubuk); sıralama sürükle, ▲▼ **sakla** (odakta) | |
| Element çarkı (Takım Ultisi diyagramı) | **kaldır** → takım başlığında yalnız oluşunca "TAKIM ULTİSİ" rozeti | Mekanik (Yay/Üçgen) sürer; US-2.1 çarkı ister: § 5 KS-4 |
| Kayıtlı takımlar listesi + Kaydet / Aktif takım / Yeni takım | **sakla** → "TAKIM 1 ▾" açılır; kayıt otomatik | |
| Yapay yön seçimi (D6 `yapay-yon`) | **sakla** (Yapay Çekirdek ayrıntısında, varsayılan sağ) | 03 US-1.3; mekanik sürer |
| Ödünç topaç gri kesikli çerçeve | **kalsın** | D5 kuralı, oynanış bilgisi |
| OYNA + engel cümlesi | **kalsın**, sağ alt; engel cümlesi tek satır OYNA'nın üstünde | ux § 3.2 |
| Ruh kartı (Günlük'te: ad, kişilik, yetenek açıklaması) | Kişilik **lore sayfasına taşı**; ad + yetenek adı Çekirdek ayrıntısında **sakla** | § 3 L-2 |
| Kararma sayacı (Günlük'te kutu) | **kaldır** (yalnız Karanlık Çekirdek sahibine Çekirdek ayrıntısında simge + sayı) | § 3 L-4 |
**Küme sayımı:** önce ~11 (üst bant, başlık + 3 düğme, sekmeler, filtreler, kart listesi, geliştirme, önizleme, çubuklar, etiketler, uyum, dene satırı, takım, çark, kayıtlılar, OYNA) → sonra 6 (başlık bandı, envanter, topaç + çubuklar, takım, OYNA, alt şerit).

### 2.2 İlk Çekirdek (02) · maket `m3-ilk-cekirdek.png`
| Şimdi var (D5) | Öneri | Not |
|---|---|---|
| Başlık + iki satırlık açıklama ("Çekirdek topacının kalbidir…") | Başlık **kalsın** plakada; açıklama **kaldır**, yerine alt satırda "SEÇMEDİĞİN İKİSİ MARKETTE" | |
| Kart başlığı + "Göktaşı · Kor · Saldırgan · Lv.2" | Ad plakası **kalsın** (KOR GÖKTAŞI); tip ve Lv. **sakla** (odak) | Lv.2 hepsinde aynı |
| Önizleme kutusu (iki nokta) | **kalsın** ama topaç ikonu çerçevesi + kaide üstünde köken renkli küre (referans 02); 5 sn hareket önizlemesi odakta | US-1.3 |
| 4 çubuk (Saldırı · Savunma · Hız · Stamina) | **kalsın**, 5 segment, köken renginde (C-2 aynı 4 çubuk) | |
| Pasif cümle (2 satır) | **kalsın** tek satır, büyük harf etiket dilinde değil açıklama dilinde | |
| "Yetenek: … · Lv.3'te Özel Yetenek: …" | **sakla** (odak/ipucu) | Yetenek adı lore değil ama ilk karar için gerekmez |
| Yapay uyarı kutusu ("Ömrü sınırlı: 30 maç…") | **kalsın** kısa: "30 MAÇ ÖMÜR" | US-1.3 "açıkça yazılır" |
| 3 × "Bunu seç" | **tek SEÇ** alt ortada; kart tıkla/ok tuşu ile seçilir | S-2 |

### 2.3 Market (04) · maket `m3-market.png` (bugün ekran yok, D7 yazılıyor)
| Belgede var (03 § 3) | Öneri | Not |
|---|---|---|
| 4 raf (Çekirdekler / Gövdeler / Diskler / Uçlar) | **kalsın**, 2×2 ahşap tabelalı raf (referans 04) | |
| Hizip tezgâh adı rafın alt başlığı (Kraterci, Ocak, Dökümhane, Meydan) | **kaldır** → Market'in "?" bilgi ipucu ya da Dünya sayfası | 04-sozluk "alt başlık (flavor)" der ve D7 şu an yazıyor: § 5 KS-1 |
| Ürün kartı: ad, element/köken, parametre çubuğu, fiyat, kilit | Hücre: **ikon + fiyat rozeti** ya da **kilit + 3/10** ya da **???**; ad, çubuk etkisi, başarım adı **sakla** (alt şerit seçili ürün) | C-13 (ad tooltip/odakta) ile uyumlu |
| Günün parçası (%30) | **kalsın** tek bant | |
| Ligin Parçası (haftalık yarı eşik) | **ertele** | 03 § 6 zaten "sonraki" |
| Dökümhane'ye eritme (3→1) | **ertele**; gelince ad "ERİT" | 03 § 7 açık soru 2 |
| Yapay yenileme hizmeti | **sakla** (Yapay Çekirdek ayrıntısında "YENİLE · 50 ALTIN") | Market'te ayrı tezgâh gerekmez |
| Karanlık Pazarı (gizli tezgâh) | **ertele** | K-10/B-9 zaten ilk sürümde yok |
| Satın alma | Tek ana düğme **SATIN AL** sağ alt; onay modalı yalnız ≥ 100 Altın | S-2 |

### 2.4 Başarımlar (05) · maket `m3-basarimlar.png`
| Belgede var (03 § 4) | Öneri | Not |
|---|---|---|
| 6 kategori sekmesi (Yol · Bitiş · Element · Risk · Gösteri · Sosyal) | **kalsın** (referansla birebir) | |
| "Kararma" gizli kategorisi, "Yapay" kategorisi | Kararma **ertele** (Mor Çatlak / Aydınlanma ilk sürümde yok); Yapay başarımı **Yol** sekmesine taşı | Sekme sayısı 6'da kalır |
| Kart: rozet, ad, ilerleme, ödül (Altın + Market kilidi) | **kalsın**: kalkan rozet, ad, ilerleme çubuğu + "4/10", tek satır "▸ AÇTIĞI PARÇA"; Altın ödülü **sakla** (odak) | |
| Gizli başarım | **kalsın** "???" kart, ad yok | |
| "Market'te açıldı" popup | **taşı** sonuç ekranına (C-14); burada tek ana düğme **MARKETE GİT** | |

### 2.5 Oyna (06, mod seçimi) · maket `m3-oyna.png`
| Şimdi var (D5) | Öneri | Not |
|---|---|---|
| "Oyna" başlığı + "1v1 · ilk 3 puan · 90 sn · Oyuncu: … Takımını eşleşince seçersin." | Başlık bantta; kurallar tek satır "1V1 · İLK 3 PUAN · 90 SN"; geri kalan **kaldır** | |
| İki kart (Oda kodu / Diğer) + açıklamalar | **3 büyük mod düğmesi**: HIZLI MAÇ · ODA KODU · ANTRENMAN; açıklamalar **kaldır** | ODA KODU seçilince kod alanı + "ODA AÇ" aynı panelde |
| "Hızlı maç · kuyruk D7" soluk | **kalsın** (D7 gelince etkin) | |
| Dereceli (referansta var) | **ertele** (düğme yok; "yakında" bile yok) | Sade: var olmayan özellik görünmez |
| ◄ Atölye sağ üstte | **taşı** sol üste, kırmızı kare (Ç-8) | |
| — | Takımın 3 topacı büyük kartlarda + "TAKIMI DEĞİŞTİR" ikincil | Oyuncu neyle gireceğini görür |
| — | Ana düğme **MAÇ BUL** sağ alt | |

### 2.6 Lobi / takım seçimi (06, eşleşme sonrası) · maket `m3-lobi.png`
| Şimdi var (D5) | Öneri | Not |
|---|---|---|
| "Rakip bulundu: …" + "Takım seç" + rakip simgeleri + takım kartı metni + "Hazır" + süre cümlesi | Üç sütun: **SEN** (ad + 3 element) · **GERİ SAYIM 20** + "İLK TOPACINI SEÇ" 3 kart (1/2/3) · **RAKİP** (ad + 3 element); tek ana düğme **HAZIR** alt orta | Süre cümlesi kaldırılır, sayı kutusu kalır |
| Ödünç topaç notu "2 ödünç topaç" | **kalsın** kartta gri kesikli çerçeve | |
| Alt rozet bandı (referans) | **kalsın**: Galibiyet Sıralaması + Stil Puanı rozetleri, ping yalnız kötüyse (H10) | |

### 2.7 Maç HUD (07/08) · maketler `m1-mac-hibrit.png`, `m2-ulti-hibrit.png`
| Şimdi var | Öneri | Not |
|---|---|---|
| Ad satırı "Ayşe 14jr (oto) · Kaya Maden Lv.2" + 4 element simgesi | **kalsın** küçük tek satır (ux § 2 H1, kasıtlı); rakibin 3 simgesi takım yuvalarında zaten var → ad satırından **kaldır** | |
| Stamina yüzde sayısı | **kalsın** yalnız kendi çubuğunda (H1a) | |
| Yuva adları (Kaya Soğuğu, Yontu Siperi…) yuvaların üstünde | **sakla** (ilk 3 maçta görünür, sonra fare üstü) | Yetenek adı lore değildir ama HUD'u kalabalıklaştırır |
| Shift / Space rozetleri | **kalsın** ilk 3 maç; sonra küçük | ux § 2 H7 |
| Ulti bandı "ULTİ · Ata Közü" | **kalsın** (H5) ama alt-orta, dar plaka | Referans 08'de üstte bant yok |
| Bağlantı rozeti | **kalsın** yalnız sorunlu bağlantıda | H10 |

### 2.8 Sonuç (09) · maket `m3-sonuc.png`
| Şimdi var (D5) | Öneri | Not |
|---|---|---|
| Başlık + "Bu sefer olmadı." + skor + "Rakip · ilk 3 puan · 66 sn" | ZAFER/YENİLGİ plakası + tek satır "3 - 1 · RAKİP: BORA"; süre **sakla** | |
| Bitiş / Puan tablosu | **kalsın**, satırda bitiş ikonu | |
| Altın · Çekirdek kartı (XP çubuğu) · Başarım | **kalsın**, üç görsel kart (referans 09) | |
| "Yetenek kullanımı: Yetenek 0 · Özel 0 · Ulti 0" | **kaldır** (Çekirdek ayrıntısındaki istatistiğe) | |
| "Kararma sayacı +25 · Çekirdek sönmesi D7" | **kaldır** (yalnız eşik aşılınca tek uyarı satırı) | § 3 L-4 |
| "Space / Enter: atla · Enter: Tekrar" | **sakla** (ilk 3 maç) | |
| Rövanş/Tekrar + Atölye | **kalsın**: TEKRAR (ana) + ATÖLYE | |

### 2.9 Giriş / profil (01) · maket yok (kapsam dışı), kurallar
| Şimdi var (D5) | Öneri |
|---|---|
| Karşılama 3 cümle + 3 düğme | 3 cümle **kalsın** (ux § 4.1 onboarding) ama tek ana düğme GİRİŞ YAP; "Antrenmanı dene" ikincil; "Kayıt ol" metin bağlantısı |
| Profil: ad, 6 arma, 6 renk (adları yazılı), destek kanalı, önizleme | Ad + arma + renk şeridi **kalsın** (referans 01); renk adları **sakla** (ARIA); destek kanalı **sakla** (Profil > ikinci adım; Kick dilimi) |

---

## 3. Lore feragat önerileri (arayüzden)

Öneri türleri: **UI'dan çıkar** · **ipucu olarak sakla** (odak/fare üstü, ilk kez görünce bir kez) · **lore sayfasına taşı** (yeni "DÜNYA" sayfası: Profil > Dünya; kronik, hizipler, ruhlar) · **koru**.

| # | Lore öğesi | Bugün nerede | Öneri | Neden | Mekanik karşılığı | Risk |
|---|---|---|---|---|---|---|
| L-1 | Hizip ve tezgâh adları (Devran Birliği, Meydan Ligi, Dökümhane, Köklüler; Kraterci, Ocak, Meydan Tezgâhı) | 03 US-3.2; 04-sozluk "raf alt başlığı"; D7 Market | **Lore sayfasına taşı**; Market'te raf adı yalnız ÇEKİRDEKLER/GÖVDELER/DİSKLER/UÇLAR | İkinci isim katmanı öğrenme yükü; raf adı zaten içeriği söylüyor | Yok (tezgâh = veri gruplaması; `market.json` alanı kalabilir, gösterilmez) | **Bağlayıcı kararla çelişir** (04-sozluk, US-3.2) ve D7 bu alt başlıkları yazıyor → § 5 KS-1 |
| L-2 | Ruh kişilik cümleleri, ruh kartı | 03 US-2.2; D6 `Gunluk.ts` | **Lore sayfasına taşı**; Çekirdek ayrıntısında yalnız ruh adı + silüet | Atölye kararına etkisi yok | Yok | Düşük; US-2.2 metni değişir → KS-3 |
| L-3 | Ruh adları (Közkaracal, Közkartal…) | 00 § 3.5; Ulti anı | **Koru** yalnız Lv.3/Ulti anında ve Çekirdek ayrıntısında | Kimlik ve Kick izleyici hikâyesi | Ulti siluetinin seçimi | Düşük |
| L-4 | Kararma sayacı | D6 Günlük kutusu; Sonuç satırı | **UI'dan çıkar**; Karanlık Çekirdek sahibine Çekirdek ayrıntısında mor çatlak simgesi + sayı; eşikte tek uyarı | Karanlık ilk sürümde dar (K-10, B-9); çoğu oyuncu hiç görmez | **Sim/sunucuda kalır** (`d.kararma`, `cekirdek.kararma`, hash alanı) | Düşük; Karanlık oyuncu bedeli görmeli → simge kalır |
| L-5 | Aydınlanma | 00 § 6.3; 03 US-4.1 | **Ertele** (UI yok) | İlk sürümde yok (nile K-10) | Yok (henüz kod yok) | Yok |
| L-6 | Karanlık Pazarı | 03 US-3.2 | **Ertele** | İlk sürümde yok | Yok | Yok |
| L-7 | Çekirdek Günlüğü defter ayrıntıları (krizden galibiyet, en uzun dönüş, Yapay kalan ömür, Kararma) | 03 US-2.2; D6 `Gunluk.ts` | Lv. + XP + maç/galibiyet **koru**; kriz/en uzun dönüş **ipucu olarak sakla** ("İSTATİSTİK" açılır); Yapay ömür **koru** (oynanış bedeli) | "Günlük" ayrı ekran gerekmez; Çekirdek ayrıntı paneli yeter | **Sunucuda kalır** (`cekirdek` tablosu, `defter`) | Düşük; "Çekirdek Günlüğü" adı sözlükte kalır, ekran adı "ÇEKİRDEK" olur → KS-3 |
| L-8 | Uzun açıklamalar (İlk Çekirdek alt yazısı, Oyna alt yazısı, Dene açıklaması, Antrenman açıklaması) | D5/D6 ekranları | **UI'dan çıkar**; gerekirse tek satır ipucu | S-7 | Yok | Yok; ux § 7 mikro-kopya kısaltılır |
| L-9 | Mühürcüler, görevler, Lv.4 anlatısı | 03 US-4.3 | **Ertele** | İkinci sezon | Yok | Yok |
| L-10 | Köken adları (Göktaşı / Maden / Yapay / Karanlık) | her yerde | **Koru** (tek sözcük, ad plakasında) | Pasif ve Yapay ömrü gibi mekanik taşır | Pasif, ömür, yön | — |
| L-11 | "Ata" Ulti adları (Ata Közü) | H5 bandı | **Koru** kısa bantta; açıklaması ipucu | Ulti anının sahnesi | Yetenek tanımı | Düşük |
| L-12 | Element çarkı ve "Yay/Üçgen" Takım Ultisi diyagramı | D6 Atölye | **UI'dan çıkar**; yalnız oluşunca rozet; çark Dünya/Yardım sayfasında | Diyagram okuması öğrenme gerektirir | **Sim'de kalır** (Takım Ultisi koşulu) | Orta: oyuncu Takım Ultisi'ni keşfetmeyebilir → rozet "TAKIM ULTİSİ: 1 ELEMENT EKSİK" ipucu verir; KS-4 |
| L-13 | "Yakın tip" ("sonra Dayanıklı'ya yakın") | D6 Atölye | **UI'dan çıkar** | İkinci tip bilgisi kararı değiştirmez | Sim tipi tek | Düşük |
| L-14 | Yetenek adları HUD yuva etiketleri | D3–D5 HUD | **İpucu olarak sakla** (ilk 3 maç görünür) | HUD alt sol kalabalığı | Yok | Düşük |
| L-15 | Destek kanalı alanı (profil) | D5 Profil | **İpucu olarak sakla** (ikinci adım, Kick dilimine kadar) | Kick girişi gelmeden anlamı zayıf | Sunucu alanı kalır | Düşük |
| L-16 | Hizip temalı başarım ödül metinleri ("Ocak tezgâhında…") | 03 US-4.1 tablosu | **UI'dan çıkar**: "▸ PARLAK DİSK" yeter | L-1 ile aynı | Kilit eşlemesi kalır | L-1'e bağlı |

**Ne korunuyor (lore çekirdeği):** oyunun adı, altı element ve simgeleri, dört köken adı, ruh silüetleri ve adları (Ulti/Lv.3 anında), Ulti adları, tapınak/pazar/blueprint sahne arka planları (referans 02/03/04: lore'u metin yerine **görsel** taşır). Yeni **DÜNYA** sayfası (Profil altında) hizipleri, ruh kişiliklerini ve kroniği tek yerde toplar; menülerde bağlantı yoktur.

---

## 4. Metin kuralları (kısa)
- Etiket ve başlık BÜYÜK HARF, Türkçe İ/Ş/Ğ glifiyle (pixel font, tasarim-dili § 3); açıklama cümle düzeni, en çok 1 satır.
- Düğme metni fiil ya da yer: OYNA, SEÇ, SATIN AL, HAZIR, TEKRAR, ATÖLYE, MAÇ BUL, DENE.
- Sayı ile birim ayrı ve sabit sırada: "150 ALTIN", "3/10", "LV.2", "30 SN".
- Aynı kavram her ekranda aynı sözcük (sözlük sağ sütunu); "Ödünç", "Takımda", "Kilitli", "???" durum sözcükleri sabit.

---

## 5. Bağlayıcı belgelerle çelişen öneriler (sahip kararı bekleyen)

| # | Öneri | Çelişen bağlayıcı kaynak | Etki | Önerimiz |
|---|---|---|---|---|
| **KS-1** | Market raflarından hizip/tezgâh alt başlıklarını kaldır (L-1) | `04-sozluk.md` (sahip kararı 2026-11-04: "hizip adı rafın alt başlığı (flavor)"); `03-oyuncu-yolculugu.md` US-3.2; **D7 ajanı Market tezgâh alt başlıklarını şu an yazıyor** | D7 kodunda alt başlık metni ya kalır ya gizlenir (yalnız sunum; `market.json` tezgâh alanı kalabilir) | Kaldır; D7'ye "alt başlık alanı veri olarak kalsın, ekranda gösterilmesin" notu. Sahip "kalsın" derse: 12 px soluk alt başlık, tabelada değil raf altında |
| KS-2 | Üst gezinti yalnız Atölye'de (alt şerit), alt ekranlarda yalnız ◄ + başlık + Altın | `docs/ux/kontrol-ve-hud.md` § 3.2 "Üst gezinti her ekranda aynı konumda" | `ekranlar/arayuz.ts` üst bandı | Referans 04/06 ile uyum ve ekran başına tek yön; ◄ her zaman Atölye'ye döner |
| KS-3 | Çekirdek Günlüğü ayrı ekranı yerine Çekirdek ayrıntı paneli; ruh kişiliği Dünya sayfasında | `03` US-2.2 | D6 `Gunluk.ts` sunumu | Panel; veri ve uç noktası aynen kalır |
| KS-4 | Element çarkı yerine yalnız "TAKIM ULTİSİ" rozeti | `03` US-2.1 ("takımın element dizilimi çarkta gösterilir") | D6 Atölye | Rozet + Yardım/Dünya'da çark |
| KS-5 | Dereceli düğmesi hiç gösterilmez | Referans 06 (DERECELİ düğmesi); `tasarim-dili.md` GU-08 ("soluk, yakında") | GU-08 | Gösterme; sezonla gelir |
| KS-6 | Yuva adları ve Shift/Space rozetleri ilk 3 maçtan sonra gizlenir | `kontrol-ve-hud.md` § 2 H6–H7 (sürekli) | `MacHud.ts` | Ayarlar > "HUD ipuçları: Her zaman / İlk 3 maç" (varsayılan İlk 3 maç) |

Bu maddeler kararlanana kadar uygulayıcılar bağlayıcı belgeyi izler; sadelik geçişi (GU-13) yalnız çelişmeyen satırları uygular.
