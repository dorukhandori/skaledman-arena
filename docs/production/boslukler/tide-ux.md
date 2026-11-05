# UX boşluk taraması (Devran)

**Tarih:** 2026-11-04 · **Yazar:** [@tide · UX Designer] · **Çıktı belgesi:** `docs/ux/kontrol-ve-hud.md` (kalıcı; kararlar orada).
**Tarama kapsamı:** `01-arena-eslemesi`, `03-oyuncu-yolculugu`, `04-sozluk`, `05-carpisma-hissi` § 3, `topac-pixel-plani` § 1/2/5, R05 § 1-3, PokeRivals gözlemi § 2, 9 onaylı görsel.
**Önem:** K = kritik (kodlayan ajan soracaktı), Y = yüksek, O = orta, D = düşük. **Blok:** E = bu karar olmadan ilgili ekran kodlanamaz; H = karar yazıldı, kodlama başlayabilir (sonradan değişebilir).

---

## 1. Boşluklar tablosu

| # | Boşluk | Kanıt | Önem | Karar (özet; ayrıntı `kontrol-ve-hud.md`) | Blok |
|---|---|---|---|---|---|
| G-1 | Fare yetenek yönü mü sürüş yönü mü; sağ tık ne | `01` § 1.1 "fare = yetenek yönü" ama sağ tık "basılı tut/bırak" ve "sol tık kalkar" belirsiz | K | Fare = yalnız yetenek yönü. Sol tık = Yetenek, sağ tık = Özel Yetenek. 1-4 tuşları da aynı: basılı tut nişan, bırak at; iptal Esc/alt şerit. § 1 | H |
| G-2 | Yetenek ateşleme anı (basma/bırakma) | `Girdi.atesle` tek bayrak; `01` § 4.2 "bırakma anında" yalnız Ulti için | K | Her yetenek **bırakma anında** atar; kısa basış = anında. `@relay` onayı (~80 ms) | H |
| G-3 | Takım tuşları Q/E ve Tab semantiği | `01` § 1.1 Tab/Q/E "kural değişir"; K-6 geri çek | Y | Tab = Geri çek (stamina < %25). Q/E boş. Yetersizse ipucu | H |
| G-4 | Takım değişimi: bekleme ve dokunulmazlık | Görev tanımı; `01` § 2.3 "2 s savunmasız" | Y | UX varsayımı: dokunulmazlık **yok**, bekleme **yok** (kapı stamina %25). Geri çekilirken 2 sn halka. `@helix` teyidi | H |
| G-5 | Puan sonrası topaç değişimi UI'ı yok | `01` § 2.3 "kaybeden zorunlu değiştirir"; belirtilmiş arayüz yok | K | H14: 3 kart, 4 sn, 1/2/3 ya da tık, süre dolunca otomatik; düşüş noktası = imleç | H |
| G-6 | Gamepad / mobil | Görev, `CLAUDE.md` | O | İlk sürümde ikisi de **yok**; `Girdi` şeması hazır | H |
| G-7 | Tuş yeniden atama kuralları | Görev (remappable), hiçbir belgede yok | Y | İki yuva, `KeyboardEvent.code`, çakışma uyarısı, Esc/F-tuşları sabit, ön ayarlar | H |
| G-8 | Fare kullanamayan oyuncu | Erişilebilirlik kontrol listesi | Y | Nişan modu "Hareket yönü" | H |
| G-9 | HUD elemanlarının konum/boyut/zamanlaması | `01` § 5 madde 8 "HUD: `@glyph`", görsellerde piksel değeri yok | K | H1-H15 tablosu, 960×540, DOM katmanı. § 2 | H |
| G-10 | Stamina eşikleri çelişkisi: yalpa %40 (05 § 2.6) vs Düşük kademe %25 (pixel § 3.4) | iki belge | O | Tek tablo: kademe %60/%25, yalpa %40'ta başlar, belirgin %25; HUD ayraçları %25 ve %60 | H |
| G-11 | Ulti ilk sürümde yok (K-7) ama 08'de Ulti etiketi var; Enerji ilk sürümde neye harcanıyor | `02` K-7; `01` § 1.1 yuva 3 "kilitli"; `00` § 4.3 | K | HUD: yuva 3 kilitli ("Lv.4"), Enerji "DOLU" etiketi. **`@helix`: Özel Yetenek 1 dilim mi?** UX buna göre `Enerji yetersiz` noktalarını çizer | H (sayı bekliyor) |
| G-12 | Rakibin ne kadarı görünür (sayı/yüzde, Enerji, Çatlak, yuvalar) | PokeRivals: kendi sayı, rakip oran | O | Rakipte sayı yok; Enerji + Çatlak + takım simgeleri görünür; yuvalar gizli | H |
| G-13 | Kenar yakınlığı uyarısı tanımı | `01` § 5 / `04` "bitiş uyarısı" var, kural yok | Y | İki seviye: d > 0,7R soluk, d > 0,85R + hız > %70 `vRO` kırmızı kalın 2 Hz + "!". Rakip: kesikli ince yay | H |
| G-14 | Telegrafta "renk tek kanal" riski | `01` § 4.3 "kırmızı = tehlike"; Görev | Y | Tehlike = kırmızı + çapraz tarama + dolu kenar; önizleme = kesikli; element simgesi merkezde | H |
| G-15 | Ekran akışı: Atölye ana ekran mı, gezinti | `03` § 0 diyagramı; görsellerde geri oku/X karışık | K | Atölye = ana ekran; üst gezinti; ◄ yalnız alt ekranlarda; X yalnız modalda | H |
| G-16 | Lobi: arama süresi, bulunamadı, iptal | `03` § 5.1 yalnız mod listesi | Y | 20 sn öneri Antrenman, 60 sn bulunamadı, iptal her zaman | H |
| G-17 | Rakip terk / bağlantı kopması: sonuç ve ödül | `03` § 4.2 "terk eden sayılmaz", kalan oyuncu yazılmamış | Y | UI: "Galibiyet sende". **Öneri** `@ledger`/`@vault`: kalan oyuncu galibiyet + yarım Altın, başarım yok; 15 sn yeniden bağlanma | H (kural bekliyor) |
| G-18 | Sunucu bakımı, Kick girişi iptali, oda kodu hataları | Hiçbir belgede | O | Mikro-kopya § 7 | H |
| G-19 | Oda kodu biçimi: 4-6 karakter (`03` § 5.1) vs ABCD-EFGH (UX brifi) | iki kaynak | O | **ABCD-EFGH**, 8 harf, 0/O/1/I yok, tire isteğe bağlı, `#oda=` bağlantısı. `03` güncellenir | H |
| G-20 | Sonuç ekranı süresi: "8 sn, atlanabilir" otomatik kapanıyor mu | `03` § 5.3 | O | Otomatik kapanmaz; animasyon ≤ 6 sn, Space/Enter atlar | H |
| G-21 | Yenilgi ve beraberlik sonucu, "Tekrar" anlamı | Görsel 09 yalnız ZAFER; "TEKRAR" belirsiz | Y | ZAFER/YENİLGİ/BERABERE; Tekrar = yeni eşleşme; oda maçında Rövanş | H |
| G-22 | Antrenman eğitimi içeriği, tuş sırası | `03` US-1.3 tek satır | K | 6 adım, eylemle tamamlanır, kapanış metni. § 4.2 | H |
| G-23 | İlk 30 sn: bağlantıdan gelen izleyici Kick OAuth bekler, giriş şart | `03` US-1.1 "misafir yok"; brif "1 dk içinde dövüşte" | K | Varsayılan `03` kuralı (giriş zorunlu); **öneri O-1** (aşağıda) sahibe | H (iki yol da aynı ekranlar) |
| G-24 | İlk kez giren izleyici için açıklama | Görev | Y | 3 cümle, Karşılama ekranı. § 4.1 | H |
| G-25 | Seyirci/OBS minimum | `03` US-5.4 tek paragraf | Y | § 5: simetrik HUD, 14 px ad, parça kartları, `&seffaf=1`, kod maçta gizli | H (F2) |
| G-26 | Renk körlüğü: 6 element + 2 takım | pixel § 2.3 uyarısı (Girdap/takım, Yapay/Don) | Y | Silüet + rozet; düz/kesikli takım çemberi; Mavi-turuncu ön ayar; `@pebble` CVD testi | H |
| G-27 | Efekt/flaş sınırı: 05 § 3.2 flaş %25-40, hitstop uzunluğu; 05 § 8 #9 `@tide`'a sorulmuş | `05` § 8, § 5 | Y | Tam ekran flaş ≤ %25 alfa, ≥ 50 ms, ≤ 3/sn; hitstop ≤ 100 ms (bitiş ≤ 166); 4 ayar anahtarı | H |
| G-28 | Metin boyutu ve minimum | PokeRivals 8 px yazı; bizde yayın bitrate'i | O | Min 10 px (mantıksal), ölçek %100/125/150, yüksek kontrast | H |
| G-29 | Tarayıcı tuzakları: Space kaydırma, Tab odak, bağlam menüsü, odak kaybı, gizli sekme | Hiçbir belgede | Y | § 1.4: `preventDefault`, blur'da tuş sıfırlama, 10/30 sn pasiflik (`@relay` teyit) | H |
| G-30 | Ses: otomatik oynatma kilidi, M tuşu, ayar | Efekt tablosunda ses var, kontrol yok | O | M ile kapat/aç; ses ilk tıkla açılır (Karşılama tıklaması yeter); kaydırıcılar Ayarlar'da | H |
| G-31 | Pencere boyutu / ölçekleme | pixel § 1.2 yalnız ölçek | D | Min 1280×720, tam sayı ölçek + letterbox, F tam ekran | H |
| G-32 | Atölye stat adları ve sayısı (görsel 03) | Bkz. § 2 | Y | Altı çubuk: Saldırı, Savunma, Ağırlık, Stamina, Hız, Sağlamlık; Uç deseni ve dönüş yönü etiket | H |
| G-33 | İlk Çekirdek kartlarındaki stat çiftleri (görsel 02) | Her kartta farklı iki stat | O | Her kartta aynı dört çubuk: Saldırı, Savunma, Hız, Stamina (karşılaştırma için) + element + pasif + yetenek + 5 sn önizleme + Yapay aşınma notu | H |
| G-34 | Ekran okuyucu / klavye menü gezinmesi | Kontrol listesi | O | DOM menü + ARIA; ızgara ok tuşları; odak halkası 3 px; tooltip fareye bağımlı değil | H |
| G-35 | Rakip adı kötüye kullanım / raporlama | Kick adı doğrudan görünür | D | F2 sonrası (Raporla düğmesi sonuç ekranında) | H |

---

## 2. Dokuz görselin belgelerle çelişen ayrıntıları ve kazanan

| # | Görsel | Görselde | Belge | Kazanan ve gerekçe |
|---|---|---|---|---|
| C-1 | 03 Atölye | Stat adları: Hız, Güç, Defans, Stamina, Denge, Ağırlık, Çeviklik, Turbo (8 çubuk) | `01` § 3.3: 8 parametre (`kutle, saldiri, savunma, stamina, erime, desen, burstEsik, yon`) | **Belge.** Oyuncuya altı çubuk: Saldırı (`saldiri`), Savunma (`savunma`), Ağırlık (`kutle`), Stamina (havuz, `erime` içinde net dayanıklılık), Hız (Uç ivme/tavan), Sağlamlık (`burstEsik`). Uç `desen` ve `yon` etiket olarak. "Turbo" ve "Çeviklik/Denge" karşılığı yok, çıkar. `@helix` yalnız eşlemeyi teyit eder |
| C-2 | 02 İlk Çekirdek | Kart başına farklı stat çifti (Güç/Hız, Dayanıklılık/Kontrol, Çeviklik/Savunma) | `03` US-1.3 | **UX kararı:** hepsinde aynı dört çubuk (G-33) |
| C-3 | 03, 06, 09 | İngilizce: CORE-A, SPARK, GEAR, BLAZE STRIKER, STORM/IGNIS/FALCON, COUNTDOWN, TEAM SELECT, OPPONENT, CORE; bozuk metin FİNF/SCPR | `04` Türkçe terimler | **Sözlük.** Geri sayım, Takım seçimi, Rakip, Çekirdek, Bitiş/Puan; parça adları Türkçe |
| C-4 | 07 vs 08 | 07: tam genişlik çubuklar kırmızı-sarı; 08: köşe panelleri, bej çubuk, Enerji "ULTİ" | `05` / pixel planı HUD | **08 köşe paneli + 07 alt yuvaları** (çanak daha az örtülür); çubuk rengi eşik mantığıyla (G-10) |
| C-5 | 07/08 kamera | Eğik/eliptik arena, topaçlar yandan görünüşlü | pixel planı § 1.1 C: zemin ve topaç tam üstten | **Pixel planı** (çarpışma ve telegraf okunurluğu, daire normali). Sahip görselleri onayladı; `@iris` + sahip teyit etmeli. UX telegrafı iki durumda çalışır (daire / elips ölçeği); bloklamaz |
| C-6 | 08 | Kanatlı kuş (anka) ruh avatarı | `01` § 5 madde 9: kanatlı/ejderli üst tasarım yok | **Belge** (IP hijyeni); `@iris`'e not. UX etkilenmez |
| C-7 | 07 sol alt | Kırmızı çizgili daire simgesi | `01` § 1.1: yuva 3 kilitli | Kilit = asma kilit + "Lv.4"; çizgili daire kullanılmaz. Hazır olmama = kesikli çerçeve + nokta |
| C-8 | 07 sağ alt | Üç boş kare, anlamı belirsiz | `03` takım 3 yuva | Kendi takım yuvaları (H8) olarak kararlaştırıldı |
| C-9 | 03 / 04 / 05 | Atölye: ◄ ve X birlikte; Market ◄; Başarımlar X; Lobi ◄ | — | G-15 kuralı (Atölye ana ekran; ◄ alt ekran; X modal) |
| C-10 | 06 Lobi | Su damlası ve yeşil leke element simgeleri | `01` / `04`: altı element (alev, hortum, yıldırım, girdap, kaya, kristal; görsel 01'deki simgeler) | **Belge + görsel 01 simgeleri** |
| C-11 | 06 Lobi | Takım seçimi ile mod seçimi aynı ekranda; alt rozetlerin anlamı yok | `03` § 5.1: eşleşince 20 sn takım seçimi | Mod sol, eşleşince orta 20 sn geri sayım; rozetler = Galibiyet Sıralaması + Stil Puanı (kendi sol, rakip sağ), ping sağ uç (`kontrol-ve-hud.md` § 3.3) |
| C-12 | 01 Profil | Düğme "GİRİŞ"; Destek kanalı yok | `03` US-1.2: destek kanalı alanı | Düğme **Başla** (giriş Kick'te yapıldı); destek kanalı otomatik, Profil'de değiştirilir |
| C-13 | 04 Market | "3/10" ve kilit; başarım adı yok; parça adları yok | `03` US-3.1: "Kor Ustası 3/10" yazılı | **Belge:** odakta/üzerinde tooltip ve klavye odağıyla başarım adı + ilerleme + parça adı |
| C-14 | 05 Başarımlar | "Ateşin Gücü", "Savunma Ustası", "Kıvılcım Çarkı", üç kademe simgesi; yazı bozuk | `03` US-4.1: "Kor Ustası", tek eşik 10 | **Belge** adları ve tek eşik; "Kıvılcım" eski Altın adıdır, parça adında kaçınılır (örn. "Dikenli Disk"). Popup başarım ekranında değil **sonuç ekranında** çıkar |
| C-15 | 09 Sonuç | Yalnız ZAFER, Çekirdek tecrübe çubuğu yok, "Markete git" yok | `03` US-5.3 | Belge tam sıra; yenilgi varyantı eklendi (G-21) |
| C-16 | 07/08 | Skor yönü ve sol/sağ renk: kendi = sol, kırmızı çubuk | pixel planı § 2.3: kendi camgöbeği, rakip eflatun | **Pixel planı** takım renkleri; çubuk rengi artık takım değil eşik göstergesi |

---

## 3. Sahibe giden öneriler (karar sahibin)

| # | Konu | Seçenekler | Önerim |
|---|---|---|---|
| O-1 | İlk 30 sn: giriş şartı (`03` US-1.1 "misafir yok") ile "1 dk içinde dövüşte" çelişiyor | (a) Giriş zorunlu, Antrenman girişten sonra; (b) **Antrenman misafir oynanır** (kayıtsız, ilerleme saklanmaz), Antrenman sonunda "İlerlemeni kaydetmek için Kick ile giriş"; (c) Her şey misafir | **(b).** Kick OAuth'u bekletmeden ilk vuruş ≤ 30 sn; sıralama bütünlüğü bozulmaz (misafir Antrenman'dan çıkamaz). Şu an varsayılan (a); ekranlar aynı, yalnız sıra değişir |
| O-2 | Ateşleme anı bırakma (G-2) | Basma / bırakma | Bırakma; yanlış basış iptal edilebilir |
| O-3 | Oda kodu 8 harf (G-19) | 4-6 / 8 | 8 (ABCD-EFGH), tire isteğe bağlı |
| O-4 | Parça/Altın kuralları ile terk eden rakip (G-17) | Yarım / tam / sıfır | Yarım Altın, başarım yok |

---

## 4. Teslim notları (diğer ajanlar)

- **`@helix`:** G-4 (dokunulmazlık yok), G-11 (Enerji harcaması: Özel Yetenek 1 dilim), C-1 eşlemesi (altı çubuk), G-17.
- **`@ledger`:** G-17 terk ödülü; Altın yenilgi geliri (03 § 3.4 ile uyumlu).
- **`@relay`:** G-2 (bırakma anında ateşleme, ~80 ms), G-29 (pasiflik 10/30 sn), telegraf süreleri ≥ 2× RTT (zaten `01` § 4.3).
- **`@byte`:** G-1/G-2 `Girdi` eşlemesi (şema aynı: sol tık `secilenYuva=1`, sağ tık `=2`, `atesle` bırakmada); G-10 yalpa %40; `Hud.ts` HP → Stamina + Enerji + Çatlak.
- **`@glyph`:** `kontrol-ve-hud.md` § 2-3 uygulanır; HUD DOM + CSS ölçek; ekran akışı ve mikro-kopya.
- **`@iris`:** C-5 (kamera), C-6 (kanatlı avatar), C-14 (parça adı), Çatlak simgesi 4 hâl, element silüetleri, takım çemberi düz/kesikli ▲/◆.
- **`@pebble` / `@flint`:** renk körlüğü simülasyonu (gri + 3 CVD); eğitim süresi ölçümü (hedef ≤ 60 sn, ilk vuruş ≤ 20 sn); ilk bağlantıdan ilk vuruşa süre (hedef ≤ 60 sn).
- **Doküman düzeltmeleri (yapılmadı, yazarlar yapar):** `03` § 5.1 oda kodu biçimi, `01` § 1.1 Q/E ve sağ tık satırı, `05` § 3.2 flaş üst sınırı.
