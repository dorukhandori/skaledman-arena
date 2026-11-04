# Devran: kontrol, HUD, ekran akışı, onboarding, seyirci, erişilebilirlik, mikro-kopya

**Tarih:** 2026-11-04 · **Yazar:** [@tide · UX Designer] · **Durum:** karar taslağı; kodlamaya başlanabilir, sahip itirazı yoksa kalıcıdır. Bulunan boşlukların tablosu: `docs/production/boslukler/tide-ux.md`.
**Kaynaklar:** `docs/design/beyblade/01` (kontrol), `03` (yolculuk), `04` (sözlük), `05` § 3 (olay reçeteleri), `docs/art/topac-pixel-plani.md` § 1, § 2.3, § 5, onaylı 9 ekran `docs/research/beyblade/gorunum/01..09-*.jpg`.
**Otorite:** oynanış ve sayılar `docs/design/` kazanır; bu belge yalnız bunların **oyuncuya nasıl sunulduğunu** karar verir. Görsel stil `@iris`'in. Uygulama `@glyph` (HUD/menü) ve `@byte` (girdi).
**Hedef kitle:** Kick sohbetinden bir bağlantıyla gelen, dizüstü kullanan, fare ile nişan almamış izleyici. Masaüstü (klavye + fare). Mobil ve gamepad ilk sürümde yok.

---

## 1. Kontrol haritası (varsayılan)

Tek ilke: **bir elle sür, öbür elle tek tuş.** Sol el WASD + Shift/Space; sağ el yalnız fare. Fareyi hiç kullanmayan oyuncu da oynayabilir (§ 1.3).

| Tuş / girdi | Eylem (arayüz adı) | `Girdi` alanı | Not |
|---|---|---|---|
| W A S D · ok tuşları | Sür | `yonX, yonZ` | İkisi de varsayılan, aynı anda çalışır |
| Fare imleci | Yetenek yönü (topaçtan imlece) | `nisanX, nisanZ` | Sürüşü **etkilemez**. İmleç topaca 20 px'ten yakınsa son yön korunur; imleç pencere dışına çıkarsa son yön korunur |
| 1 · 2 · 3 · 4 | Yetenek · Özel Yetenek · Ulti · Parça Tekniği | `secilenYuva`, `atesle` | **Basılı tut = nişan çizgisi görünür, bırak = at.** Kısa basış = anında at (bırakma anı sayılır) |
| Sol fare tuşu | Yetenek (1 ile aynı) | `secilenYuva=1`, `atesle` | Aynı basılı tut / bırak kuralı |
| Sağ fare tuşu | Özel Yetenek (2 ile aynı) | `secilenYuva=2`, `atesle` | Tarayıcı bağlam menüsü arena üzerinde kapalı |
| Yetenek iptali | Basılıyken **Esc**, ya da imleci alt şeride (y > 492) götürüp bırak | `atesle=0` | Tanıdık kalıp: "bırakırsan HUD üstünde iptal" |
| Shift | Dash | `dash` | Şarjsız (01 § 1.1). Stamina harcar |
| Space | Sekme | `zipla` | Yer alanı telegraflarından kaçış; 0,3 s |
| Z (basılı) | Sıkı Dönüş | `dinlen` | Durur, stamina erimesi düşer, itilmeye açık |
| Tab | Geri çek (takım değiştir) | `degistir` | Yalnız stamina < %25 iken; değilse yuva soluk kalır ve ipucu çıkar (§ 7). Menülerde Tab = odak ilerletme |
| Enter · sol tık | Yeni topacı bırak (takım değişimi sırasında) | `dusus` | Düşüş noktası = imleç (kendi yarı alanında sınırlı) |
| Esc | Menü (Devam · Ayarlar · Teslim ol) | n/a | Maçı **durdurmaz** |
| M | Sesi kapat/aç | n/a | Ekranda her zaman görünen ses düğmesiyle (H16) aynı işi yapar |
| F | Tam ekran | n/a | |
| Q · E | **Boş**. Yeniden atamada kullanılabilir | n/a | 01 § 1.1'deki eski takım tuşları kalktı (K-6) |

### 1.1 Kararlar ve gerekçeleri
- **Fare = yetenek yönü, sürüş yönü değil.** Sürüşü fareye vermek, fareyi hiç kullanmamış izleyici için iki işi tek ele yükler; ayrıca R05 § 1c: doğrudan WASD sürüşü bu kitlenin tanıdığı model.
- **Sol/sağ tık ayrı yetenek.** Yalnız fareyi seven oyuncu 1 ve 2'ye ulaşmadan iki yeteneği kullanır. Sağ tıkın eski "basılı tut = nişan" anlamı (01) 1-4 tuşlarıyla birleştirildi: tek kural, her yerde aynı.
- **Ateşleme bırakma anında.** Girdi gecikmesi pencerede ~80 ms artar, bunun karşılığında yanlış basışlar iptal edilebilir. Telegraf süreleri (0,2-0,9 s) bunu kaldırır; `@relay` onayı gerekir.
- **Gamepad yok** (ilk sürüm). Gamepad API ve ikinci düzen F3 sonrası değerlendirilir; `Girdi` şeması buna hazırdır. **Mobil dokunmatik yok** (sahip onayına kadar kapsam dışı).
- Q/E boş: iki ek tuşu ileride "Yetenek 4 alternatifi" gibi kullanmak serbest; şimdi icat edilmiyor.

### 1.2 Yeniden atama (Ayarlar › Kontroller)
- Her eylem için **iki yuva** (birincil + ikincil). Varsayılanlar: sür = WASD + oklar; geri kalan tek yuva.
- Tuşlar `KeyboardEvent.code` ile saklanır (fiziksel konum): Türkçe Q, AZERTY, Dvorak'ta aynı konumlar çalışır; etiket `navigator.keyboard.getLayoutMap()` varsa oradan gösterilir.
- Çakışma: "**D** zaten *Sağa* için kullanılıyor. Yer değiştir · İptal". Sessiz üzerine yazma yok.
- Yeniden **atanamaz**: Esc (menü), F5/F11/F12, Ctrl-kombinasyonları. Fare tuşları Yetenek 1/2 için atanabilir.
- "Varsayılana dön" her zaman görünür. Saklama: `localStorage` + oturum açıksa sunucu profili.
- Ön ayarlar: *WASD (varsayılan)*, *Oklar + sol el* (yetenek 1-4 yerine Z X C V), *Yalnız fare* (Sür = yok; yetenek yönü ve sürüş fareye bağlanır, bkz. § 1.3).

### 1.3 Fare kullanamayan ya da kullanmak istemeyen oyuncu
Ayarlar › Kontroller › **Nişan: Fare / Hareket yönü**. "Hareket yönü": yetenek en son sürüş yönüne gider; nişan çizgisi çizilmez. Bu mod bir kolaylık, hile değildir (aynı `Girdi` alanları). Menülerin tamamı klavyeyle gezilir (§ 6.4).

### 1.4 Tarayıcı tuzakları (`@glyph` + `@byte`)
- Maç ekranında Space, ok tuşları, Tab, F, sağ tık için `preventDefault`; form alanları (oda kodu, ad) odaktayken engelleme yok.
- Pencere odağı kaybolunca (`blur`, `visibilitychange`) tüm basılı tuşlar **sıfırlanır** (takılı tuş yok). Sekme gizliyken maç sürer; dönünce 1 sn "Oyuna dönüldü" şeridi.
- Girdi 10 sn gelmezse ve sekme gizliyse uyarı; 30 sn sonra terk sayılır (`@relay` ile eşik teyidi).
- Minimum pencere 1280×720; altında "Pencereyi büyüt" yazısı. Ölçek: tam sayı + letterbox (pixel planı § 1.2).

---

## 2. HUD spesifikasyonu (960×540 mantıksal)

HUD **DOM katmanı** olarak yapılır (mevcut `Hud.ts` kalıbı): metin ölçeği ve yüksek kontrast ayarı CSS ile yönetilir (§ 6.3). Arena çanağı ~440 px çap, merkez (480, 270): y 50-490. Üst köşe panelleri ve alt şerit çanağın dışında kalır (hesaplandı: sol panel x ≤ 296'da çanak yalnız x ≥ 384'te başlar). Üst şerit 8-72, alt şerit 492-540.

Yazı boyutları (mantıksal px): ad 10 · sayı 10 · tuş rozeti 10 · bekleme sayısı 12 (kalın) · süre 14 · skor 20 · olay bandı 16. Alt sınır 10; 8 yalnız süs etiketlerinde. 1080p'de ×2, yayın sıkıştırmasında bile 14-20 px okunur.

| # | Eleman | Konum x, y, w×h | Ne zaman | Ne söyler ve neden |
|---|---|---|---|---|
| H1 | **Oyuncu paneli** | 8, 8 · 288×64 | Maç boyunca | Satır 1 (y12): element simgesi 14×14 + ad (≤16 karakter) + Lv.; satır 2 (y30): **Stamina çubuğu** 272×14; satır 3 (y50): **Enerji** 3 dilim + Çatlak simgesi |
| H1a | Stamina çubuğu | 16, 30 · 272×14 | Maç boyunca | Dolgu **dış kenara** sabit, merkeze doğru erir (onaylı görsel 07). Kendi çubuğunda sağ içte yüzde sayısı (10 px). Ayraçlar %60 ve %25'te (görsel kademelerle aynı: pixel planı § 3.4). Renk: krem `#F2E8B0` (>%60) → amber (%25-60) → kırmızı + **çapraz tarama** + sol uçta "!" (<%25); %25 altı 1,2 sn nabız. Renk tek kanal değil: ayraç + tarama + simge |
| H1b | Enerji | 16, 50 · 3×(40×12), aralık 4 | Maç boyunca | Dolu dilim: düz dolgu + parlama; dolmakta olan: soldan dolan çubuk; boş: yalnız çerçeve. Dilim dolunca 120 ms parıltı (05 § 3). Üç dilim dolu ve Ulti açıksa dilimlerin yanında "ULTİ"; ilk sürümde (K-7) "DOLU" |
| H1c | **Çatlak** (parçalanma) | 264, 44 · 24×24 | Maç boyunca; tik < 0,5 iken soluk | Disk simgesi, 4 hâl: temiz · 1 çizgi (≥0,5) · 2 çizgi (≥0,75) · ağır çatlak + titreme (≥0,9). Eşikler 05 § 3.3 ile aynı. Ses ipucu `@glyph` + ses sorumlusu |
| H2 | **Rakip paneli** | 664, 8 · 288×64 | Maç boyunca | H1'in aynası. **Sayı yok**, çubuk yüzde sayısız (PokeRivals dersi: kendi sayı, rakip oran). Rakibin 3 element simgesi 14×14 ad satırının dış ucunda; elenmiş olan karartılmış + çarpı. Rakip Enerji ve Çatlak görünür (kritik karar bilgisi) |
| H3 | Skor | 400, 6 · 160×34 | Maç boyunca | "1 – 2", 20 px; "İlk 3 puan" 8 px süs etiketi yalnız ilk 3 maçta |
| H4 | Süre | 432, 42 · 96×22 | Maç boyunca | 1:30'dan geriye. Son 10 sn: kırmızı + **altı çizili** + saniyede tek tık sesi (nabız ≤ 1 Hz). 0:00'da "ANİ ÖLÜM" (H5) ve çanak kenarı daralır |
| H5 | **Olay bandı** | 240, 84 · 480×36 | 1,2-2 sn, sonra kaybolur | Puan: "RING OUT +2" + bitiş simgesi; "Ani ölüm"; "Rakip: Ulti hazırlıyor" + element simgesi. Aynı anda tek band; yeni olay eskinin üstüne biner. `aria-live="polite"` |
| H6 | **Yetenek yuvaları** | 8, 494 · 4×(44×44), aralık 6 | Maç boyunca | Yuva 1-4 soldan sağa. Sol üstte tuş rozeti (10 px: 1, 2, 3, 4). Hâller: **hazır** (parlak 3 px çerçeve, hazır olduğu an 150 ms parlama), **bekleme** (saat yönünde karartma + kalan sn; ≥10 sn tam sayı, <10 sn tek ondalık, 12 px), **Enerji yetersiz** (çerçeve kesikli + gereken dilim sayısı kadar nokta), **kilitli** (asma kilit + "Lv.4"; ilk sürümde Ulti yuvası böyle durur), **basılı/nişanlanıyor** (çerçeve kalın + yuva 4 px yukarı). Yuva tipi şekille ayrılır: Yetenek kare, Özel Yetenek köşeli (pah), Ulti elmas, Parça Tekniği yuvarlak |
| H7 | Dash ve Sekme | 428, 494 · 44×44 ve 488, 494 · 44×44 | Maç boyunca | Etiket "Shift" / "Space". H6 ile aynı bekleme gösterimi. Stamina yetmezse çerçeve kesikli |
| H8 | **Takım yuvaları** | 796, 494 · 3×(44×44), aralık 6 | Maç boyunca | Kendi 3 topacın: element simgesi + altında 4 px stamina şeridi; aktif olan 3 px çerçeve + "▲"; elenen karartılmış + çarpı; Tab'a hazırsa (stamina < %25) aktifin altında "Tab" rozeti yanar |
| H9 | Nişan göstergesi | Dünya | Yetenek tuşu basılıyken | Topaçtan imlece **kesikli** çizgi + uçta hedef halkası; Alan yeteneğinde zeminde alanın şekli (kesikli). Kesikli = senin önizlemen (tehlike değil) |
| H10 | Bağlantı rozeti | 456, 68 · 48×14 | Yalnız gecikme > 150 ms ya da paket kaybı | Sinyal simgesi + "ms". Normalde görünmez; sürekli ping gürültü yaratır |
| H11 | **Kenar uyarısı** | Dünya (çanak kenarı) | Kendi topacın kenara yakınken | Seviye 1 (d > 0,7R): kenarda topacın yanında 60° yay **soluk amber**. Seviye 2 (d > 0,85R **ve** dışa hız > %70 `vRO`): yay kırmızı, kalın, 2 Hz nabız + topaç üstünde "!" simgesi + kısa tık sesi. Rakip kenarda: ince **kesikli** yay + hedef halkası ("fırsat"). Desen farkı: dolu kalın = tehlike, kesikli ince = fırsat |
| H12 | **Çatlak uyarısı** (dünya) | Topaç üstü | tik ≥ 0,75 | Disk üzerinde çatlak çizgileri (`@iris`) + H1c titremesi. Sayı yok |
| H13 | **Telegraf** | Dünya | Rakip yetenek hazırlarken (süre 0,2-0,9 s) | § 2.2 |
| H14 | **Takım değişimi seçimi** | 240, 380 · 480×96 | Puan sonrası, kaybeden için 4 sn | 3 kart (1/2/3 ya da tıkla); süre çubuğu; 4 sn dolunca sıradaki otomatik. Kazanan için: "Rakip topaç değiştiriyor" bandı |
| H15 | Antrenman ipucu şeridi | 160, 444 · 640×40 | Yalnız Antrenman | § 4 |
| H16 | **Ses düğmesi** | 572, 10 · 28×28 (maç dışı ekranlarda sağ üst köşe) | **Her zaman** (menü, lobi, maç, sonuç, Esc menüsü) | Sahip kararı (2026-11-04): ses her ekrandan tek tıkla açılıp kapatılabilmeli. Tık: tüm sesi kapat/aç (M ile aynı). Hoparlör simgesi; kapalıyken üstü çizili, yalnız renge dayanmaz. Üzerine gelince/basılı tutunca **iki kaydırıcı**: Müzik ve Efekt (0-100). Durum tarayıcıda saklanır (`localStorage`, hata olursa varsayılan açık). Müzik varsayılanı düşük (%40). Klavyeyle odaklanabilir, `aria-label` "Sesi kapat" / "Sesi aç" |

### 2.1 Stamina, yalpalama ve çubuk ilişkisi (tek tablo)
| Stamina | Topaç (pixel planı § 3.4, 05 § 2.6) | HUD çubuğu |
|---|---|---|
| > %60 | Yüksek kademe: bulanık disk, yalpa yok | Krem, ayraçtan sağda |
| %40-60 | Orta kademe; **yalpa başlar** (çok küçük, 0-2 px) | Amber |
| %25-40 | Orta/Düşük sınırı; yalpa belirgin (≈4 px) | Amber, soluk nabız yok |
| < %25 | Düşük kademe: keskin kanat, yalpa 6 px+, knockback büyür | Kırmızı + tarama + "!" + 1,2 sn nabız; Tab "hazır" |
Oyuncu HUD'a bakmadan yalpadan, bakınca çubuktan okur; ikisi aynı eşikleri kullanır (%25, %60) ve `@iris` ile `@byte` yalpa başlangıcını %40'ta sabitler.

### 2.2 Ulti ve Özel Yetenek telegrafı: kim, nereden, ne iniyor, ne zaman
Beş soru, beş cevap (renk hiçbirinin tek taşıyıcısı değil):
1. **Kim:** kaynak topaçtan alana ince **bağ çizgisi** + kaynağın takım çemberi nabız atar (oyuncu: düz çember + ▲; rakip: kesikli çember + ◆; pixel planı § 2.2 katman 1).
2. **Nereden / nereye:** bağ çizgisinin yönü; alan zeminde çizilir.
3. **Ne iniyor:** alan şekli (daire = alan, koni = yönlü, şerit = mermi/dash) + merkezde **element simgesi** (altı farklı siluet). Tehlike = **kırmızı + çapraz tarama + dolu kenar**; kendi önizlemen = kesikli, taramasız (H9).
4. **Ne zaman:** halka içinde dolan dolgu (süre = telegraf süresi); son 0,1 sn beyaza döner.
5. **Ne yapmalı:** ilk 3 maçta halka kenarında "Sekme: Space" ipucu; sonra gizlenir.
Ulti için ek: ekran kenarı turuncu parlama (görsel 08) **yumuşak, tek yönlü sönme 0,3 sn**; yalnız "Flaş: Normal" ayarında. Ruh siluetinin kendisi `@iris`'in; HUD ona alan ayırmaz (oyun alanını kapatmaz, pixel planı § 4.1).

---

## 3. Ekran akışı

### 3.1 Metin diyagramı
```
[Bağlantı: oyuncu #oda=ABCD-EFGH ya da #izle=... ile gelir]
        |
   KARŞILAMA ── "Kick ile giriş" ──▶ (Kick OAuth) ──▶ hata: "Giriş tamamlanmadı"
        |  (3 cümlelik açıklama + "Antrenmanı dene" [bkz. gaps O-1])
        ▼ ilk giriş                                ▼ sonraki girişler
   PROFİL (ad, arma, renk) ──▶ İLK ÇEKİRDEK (3 kart) ─────────────────┐
        ▼                                                              |
   ANTRENMAN EĞİTİMİ (60 sn) ──▶ "İlk Devir" ──▶ Market açılır        |
        ▼                                                              ▼
   ┌──────────────────────── ATÖLYE (ana ekran) ◀────────────────────┐
   │  üst gezinti: Atölye · Market · Başarımlar · Oyna · Ayarlar      │
   │  Market ◀──▶ Başarımlar ("Market'e git" bağlantısı)              │
   │  "Dene" (30 sn Antrenman, sayılmaz)                              │
   └─ OYNA ──▶ LOBİ ──▶ [Hızlı maç | Oda kodu | Dereceli]            │
                 │  eşleşti ▼                                        │
                 └─▶ TAKIM SEÇİMİ (20 sn) ─▶ HAZIR/GERİ SAYIM 3-2-1 ─▶ MAÇ
                                                                 │ (puan sonrası: H14 değişim seçimi)
                                                                 ▼
                        SONUÇ ── Tekrar (yeni eşleşme / oda: Rövanş) ──▶ LOBİ
                           └──── Atölye ─────────────────────────────────┘
Seyirci: #izle= ──▶ SEYİRCİ GÖRÜNÜMÜ (giriş yok, kontrol yok) 
```

### 3.2 Gezinti kuralları (görsellerdeki tutarsızlığı çözer)
- **Atölye = ana ekran.** Geri oku yok. Sağ üstte çıkış "X" yok. Üst gezinti her ekranda aynı konumda.
- Market, Başarımlar, Lobi, Ayarlar, Profil: sol üstte **geri oku** (◄) → Atölye. Klavye: **Esc** ya da **Backspace**. "X" yalnız **modal/açılır pencere** kapatır.
- Maç içinde Esc = Menü (maçı durdurmaz); "Teslim ol" iki adım ("Teslim olmak istediğine emin misin? Evet · Hayır").
- Ana eylem düğmesi her ekranda **Enter**; varsayılan odak ana eylemde.
- Atölye'de takım eksikse **Oyna** soluk ve nedeni yazılı (§ 7). Atölye'de sağ altta büyük **OYNA**; (referans görselde yok, eklendi).

### 3.3 Lobi ve takım seçimi (görsel 06)
- Sol: **Hızlı maç · Oda kodu · Dereceli**. Orta: eşleşme olunca geri sayım 20 + 3 takım kartı (kayıtlı takımlar sekme olarak, 1/2/3 ile seç). Sağ: **Rakip**'in 3 element simgesi (parça gizli).
- Alt şerit: sol iki rozet = kendi Galibiyet Sıralaması ve Stil Puanı; sağ iki rozet = rakibinki; sağ uç bağlantı çubuğu + ms. Her rozetin odakta açıklaması var.
- Aranırken: "Rakip aranıyor… 0:12" + **İptal**. 20 sn'den sonra: "Beklerken Antrenman yap" önerisi (arama sürer). 60 sn: bulunamadı hâli (§ 7).
- **Oda kodu:** kod biçimi **ABCD-EFGH** (8 harf, 0/O/1/I yok, büyük-küçük farkı yok, tire isteğe bağlı). Oda açan: kod + **Kodu kopyala** + **Bağlantıyı kopyala** (`#oda=ABCDEFGH`) + QR. Katılan: tek alan "Oda kodu" (yapıştır çalışır; bağlantı açılışında alan zaten doludur, yazı gerekmez). **Maç ekranında yazı alanı yok.**
- Eşleşince 3 sn tonla bildirim: "Rakip bulundu: <ad>".

### 3.4 Maç akışı
1. **Hazır** (2 sn) → geri sayım **3-2-1-BAŞLA** (ortada 48 px; son kare 200 ms).
2. Maç: süreklidir (01 § 2.3). Her puan: olay bandı (H5) + 1,5 sn serbest akış kesintisi; **kaybeden** H14 ile 4 sn içinde topaç seçer (otomatik: sıradaki). Kazanan topacıyla devam eder (stamina kısmen geri; sayı `@ledger`).
3. 90 sn dolunca Ani ölüm (kenar daralır; çanak çerçevesi **kesikli + titreyen** değil, **kalınlaşan çizgi** + "ANİ ÖLÜM" bandı).
4. 3. puanda: bitiş olayı (hitstop, 05 § 3.2) → 1,5 sn → Sonuç. Sunucu otoriter; istemci yalnız gösterir.

### 3.5 Sonuç ekranı (görsel 09)
- Başlık **ZAFER** / **YENİLGİ** / **BERABERE** (simge + metin; renk tek kanal değil). Altında skor "3 – 1" ve rakip adı.
- Sıra: bitiş tablosu (başlıklar **Bitiş / Puan**) → **Altın** (+ sayma animasyonu) → Çekirdek kartı (Lv. + tecrübe çubuğu; seviye atlarsa halkalar yanar, yeni yetenek adı) → **Başarım** ilerlemesi (+1; tamamlanırsa "Market'te açıldı: <parça>" + **Markete git**).
- Animasyon dizisi ≤ 6 sn, **Space/Enter ile atlanır**; ekran **kendiliğinden kapanmaz** (01'in "8 sn" ifadesi bu şekilde yorumlanır). Düğmeler: **Tekrar** (yeni eşleşme, aynı mod) · **Atölye**. Oda maçında **Rövanş** (iki taraf onaylar) · Odadan çık.
- Yenilgi: aynı yerleşim, "Bu sefer olmadı" başlık altı; Altın yine yazılır (03 § 3.4: yenilgi de öder). Hiçbir ekranda kırmızı suçlayıcı dil yok.

---

## 4. Onboarding

### 4.1 İlk kez giren izleyici için üç cümle (Karşılama ekranı, giriş düğmesinin üstünde)
> **Devran, iki topacın arenada çarpışıp birbirini devirdiği hızlı bir düellodur.**
> **Topacını WASD ile sür; rakibi çarparak, yeteneklerle ya da kenardan iterek yen, ilk 3 puanı alan kazanır.**
> **Kick ile giriş yap, 60 saniyelik antrenmanla başla.**

### 4.2 Antrenman eğitimi (60 sn hedef, adım adım)
Bot: **Antrenman Kuklası** (hareketsiz → yavaş). Eğitimde stamina erimez; bot kazanamaz. Bir adım, eylem **yapılınca** biter (süreye bağlı değil); 12 sn ilerleme yoksa ilgili tuş **nabız atar**, 25 sn'de adım kendiliğinden geçer. Tüm HUD görünür; öğretilmeyen elemanlar %40 saydam. Şerit (H15): sol tuş çizimi + metin. **Atla** düğmesi sağ altta (Esc menüsünde de ilk madde).

| # | Süre | Öğretilen | Metin (şerit) | Tamamlanma | Vurgulanan HUD |
|---|---|---|---|---|---|
| 1 | 0-8 sn | Sürüş | "**W A S D** ile topacını sür." | ~1,5 sn toplam hareket | Topaç çevresinde 4 ok |
| 2 | 8-18 | Çarpma | "Rakibe çarp. Hızlı çarparsan daha sert vurursun." | 1 çarpma | H1a Stamina: "Çarpınca ikiniz de stamina kaybedersiniz." |
| 3 | 18-28 | Dash | "**Shift** ile hızlan, sonra çarp." | 1 dash sonrası çarpma | H7 Dash |
| 4 | 28-38 | Yetenek, nişan | "Fareyi rakibe tut, **1**'e bas ve bırak: Yetenek." | Yetenek isabet | H6 yuva 1; nişan çizgisi |
| 5 | 38-48 | Telegraf, Sekme | "Kırmızı taralı alana girme. **Space** ile sekip kaç." | Sekme ile kaçış ya da isabet (ikisi de geçer) | H13 telegraf (bot yavaş yetenek atar) |
| 6 | 48-60 | Ring Out | "Rakibi çanağın kenarından dışarı it." | 1 Ring Out | H11 kenar uyarısı |
Kapanış (3 sn): "Üç bitiş var: **Durma** (1 puan), **Ring Out** (2), **Parçalanma** (2). İlk 3 puanı alan kazanır." → "**İlk Devir** başarımı: Market açıldı." → **Atölye**. Bitmeyen oyuncu için aynı eğitim Atölye'den **Dene** ile (30 sn, ödül yok).
- Maç içi ilk 3 maçta tek seferlik ipuçları: ilk Tab uyarısı, ilk kenar uyarısı, ilk rakip telegrafı (her biri bir kez, kapatılabilir: Ayarlar › İpuçları).

---

## 5. Seyirci / OBS görünümü (F2, K-11)

Bağlantı `#izle=ABCDEFGH`; giriş yok, kontrol yok, imleç gizli. Sabit 960×540, tam sayı ölçek; `&seffaf=1` ile arka plan şeffaf (OBS'te tribün/çerçeve kapanır).
Minimum gereksinim:
- **Her iki taraf aynı HUD** (H1 ve H2 simetrik); iki tarafta da stamina **yüzdesi** yazılı. Yetenek yuvaları, takım yuvaları, Tab, ipuçları **yok**.
- **Ad 14 px**, skor 28 px, süre 18 px, olay bandı 20 px. Çizgi kalınlığı ≥ 2 px, kontrast ≥ 4,5:1; yayın sıkıştırmasında silinen 1 px ince çizgi yok.
- İki taraf için **parça kartı** (alt şerit, y 484-532): Gövde / Disk / Uç adları + Çekirdek Lv. + element simgesi; 3 topacın hangisi aktif. Üst panel altında rakibin Enerji/Çatlak da görünür.
- Telegraf, Ulti, bitiş olayları oyuncu görünümüyle **birebir aynı** (HUD'a ek bilgi yok); "Ulti" bandı seyirci için de yazılır (kim, hangi element).
- **Oda kodu maç başlayınca gizlenir** (sohbette sızmasın); bekleme ekranında kod + bağlantı + QR görünür. Maç arası/bekleme: "Sıradaki maç bekleniyor" + bu iki oyuncunun son skoru.
- Seyirci sohbet komutları F2 sonrası (K-11).

---

## 6. Erişilebilirlik

### 6.1 Renk körlüğü: altı element, iki takım
Renk hiçbir bilgiyi tek başına taşımaz. Element = **silüet** (onaylı görsel 01 simgeleri): Kor **alev**, Kasırga **bulut/hortum**, Şimşek **yıldırım**, Girdap **sarmal**, Kaya **kaya kümesi**, Don **kristal**. Aynı silüt topaç üstünde sürekli küçük (8×8) rozet olarak (Ayarlar › Görünüm › *Element rozetini göster*, varsayılan **açık**).
Takım: oyuncu = **düz çember + ▲**, rakip = **kesikli çember + ◆** (§ 2.2). Ayrıca "Takım renkleri: Varsayılan (camgöbeği/eflatun) · **Mavi-turuncu**" (protanopi/deuteranopi güvenli çift: `#2F7FE8` / `#F2A33A`). Bilinen yakın çiftler (pixel planı § 2.3): Girdap/camgöbeği takım, Yapay/Don; **simülasyonlu test** `@pebble` (gri ton + 3 CVD) maçtan önce yapılır.
Tehlike = **taramalı doldurulmuş** kırmızı; kendi önizleme = kesikli, taramasız; fırsat = ince kesikli. Stamina = ayraç + tarama + simge.

### 6.2 Efekt azaltma (05 § 3 açık soru 9'un cevabı)
Ayarlar › Erişilebilirlik (ilk açılışta `prefers-reduced-motion` açıksa varsayılan "Azaltılmış"):
| Ayar | Seçenekler | Normal davranış / sınır |
|---|---|---|
| Ekran sarsıntısı | Normal · %50 · Kapalı | 05 § 3.2 tepe değerleri; Kapalı = hiç ötelenme |
| Flaş ve parlama | Normal · Azaltılmış · Kapalı | **Tam ekran flaş en fazla %25 alfa**, ≥ 50 ms, aynı saniyede ≤ 3 (05 § 3.2'deki Parçalanma %40 ve Ring Out %25 bu üst sınıra çekilir). Azaltılmış: ≤ %10, ekran kenarı parlaması kapalı. Kapalı: yalnız topaç tint'i |
| Vuruş duraklaması | Tam · Yarı · Kapalı | Varsayılan ≤ 100 ms (kritik), bitişte ≤ 166 ms; Kapalı = 0 |
| Yavaş çekim ve zoom | Açık · Kapalı | Parçalanma 0,3× ve zoom darbeleri |
| Parçacık yoğunluğu | Tam · Az | Az = ×0,4 (pixel planı § 8 düşük cihaz moduyla ortak) |
Nabızlar ≤ 2 Hz'dir (Kenar uyarısı 2 Hz, Stamina kritik 0,83 Hz).

### 6.3 Metin ve kontrast
HUD metin ölçeği **%100 / %125 / %150** (panel yeniden dizilir, çubuklar sabit); **Yüksek kontrast HUD** (opak panel, 2 px beyaz çerçeve). Alt sınır 10 px (mantıksal). Menü gövdesi 12-14 px. Hareket halindeki metin (olay bandı, bekleme sayıları) kısa dönüşlerde kayma yok, yalnız solma.

### 6.4 Klavye yolu ve ekran okuyucu
Tüm menüler klavyeyle: ok tuşları (ızgara), Tab/Shift+Tab (grup), Enter (onay), Esc/Backspace (geri). Odak halkası 3 px, tema renginden bağımsız (beyaz + siyah dış). Market/Atölye parça ızgaralarında odakta ad + fiyat + kilit koşulu **metin** olarak okunur (tooltip fareye bağımlı değil). DOM menüler ARIA etiketli; H5 `aria-live="polite"`. Canvas'ın kendisi ekran okuyucuya kapalıdır (oyun hızlı); sonuç ekranı okunur.

**Kontrol listesi (bu belge için):** klavye yolu var ✔ · kontroller yeniden atanabilir ✔ · metin varsayılanda okunur (≥ 10 px, 1080p'de 20) ✔ · durum tek renkle verilmez ✔ · sarsıntı/flaş kapatılabilir ✔.

---

## 7. Mikro-kopya ve ton

**Ton:** kısa, "sen" diliyle, düz. Oyun terimi sözlükteki sağ sütun (04): Stamina, Enerji, Ulti, Ring Out, Parçalanma, Durma, Altın. Ünlem nadir (yalnız zafer). Hata mesajı = **ne oldu + ne yapabilirsin**; "hata", "başarısız" gibi suçlayıcı sözcük yok. Rakam + birim ayrı yazılır: "150 Altın", "0:47". Terimler lore adı değil (Hami, Yankı, Kıvılcım vb. yasak).

| Yer | Metin |
|---|---|
| Karşılama düğmesi | **Kick ile giriş** |
| Profil | "Oyuncu adı" (Kick adı dolu gelir) · "3-16 karakter" · düğme **Başla** (referans görseldeki "Giriş" yanıltıcı) |
| İlk Çekirdek | Düğme **Bunu seç** (Enter); Yapay kartında: "Ömrü sınırlı: 30 maç sonra yenilenmesi gerekir." |
| Genel düğmeler | Devam et · Geri · Tamam · İptal · Atla · Kaydet · Tekrar dene |
| Lobi | Hızlı maç · Oda kodu · Dereceli · Oda aç · Odaya katıl · Kodu kopyala · Bağlantıyı kopyala · "Kopyalandı" |
| Oda bekleme | "Rakip bekleniyor. Kodu ya da bağlantıyı gönder." |
| Maç | "Hazır" · "3 · 2 · 1 · BAŞLA" · "RING OUT +2" · "PARÇALANMA +2" · "DURMA +1" · "Ani ölüm" · "Rakip: Ulti hazırlıyor" · "Rakip topaç değiştiriyor" |
| Tab uyarısı | "Geri çekmek için stamina %25'in altında olmalı." |
| Sonuç | **ZAFER** · **YENİLGİ** · "Bu sefer olmadı." · Tekrar · Atölye · Rövanş |
| Market | "150 Altın" · "90 Altın eksik" · "Kilitli: Kor Ustası 3/10" · "Market'te açıldı: <parça>" |
| Atölye boş sekme | "Burada henüz parça yok. Market'ten alabilir ya da başarımla açabilirsin." |
| Takım eksik (Oyna soluk) | "Takımda 3 farklı Çekirdek olmalı. 1 yuva boş." |
| Başarımlar boş | "Henüz başarım yok. İlk maçını oyna." |
| Eşleşme bulunamadı (60 sn) | "Şu an rakip bulamadık. Tekrar deneyebilir ya da Antrenman yapabilirsin." · Tekrar dene · Antrenman |
| Bağlantı koptu | "Bağlantı koptu. Yeniden bağlanıyoruz… 12" (15 sn geri sayım). Olmazsa: "Bağlanamadık. Sorun sunucudaysa bu maç sayılmaz." · Tekrar dene · Atölye |
| Rakip terk etti | "Rakip maçtan ayrıldı. Galibiyet sende." (ödül kuralı: gaps G-17) |
| Sunucu bakımda | "Devran kısa bir bakımda. Birkaç dakika sonra tekrar dene." · 30 sn'de bir otomatik deneme |
| Bakım duyurusu (maç içi) | "5 dk sonra bakım var. Bu maç bitene kadar sürer." |
| Kick girişi iptal | "Giriş tamamlanmadı. Tekrar deneyebilirsin." |
| Oda kodu | Geçersiz: "Bu kod bulunamadı. Kod 8 harftir, örnek: ABCD-EFGH." · Dolu: "Oda dolu. İzleyici olarak katılabilirsin." · Süresi doldu: "Bu odanın süresi doldu. Yeni oda aç." |
| Ad | "Bu ad uygun değil." · "Bu ad alınmış." · "Adı 30 günde bir değiştirebilirsin." |
| Odak kaybı | "Oyuna dönüldü." |
| Yükleme | "Yükleniyor %45" + tek ipucu satırı |

---

## 8. Dokuz görselin belgelerle çelişen ayrıntıları ve kazanan

Ayrıntı ve gerekçe: `docs/production/boslukler/tide-ux.md` § 2. Özet: stat adları (görsel 03/02) → `01` § 3.3 parametreleri ve **Saldırı, Savunma, Ağırlık, Stamina, Hız, Sağlamlık** altı çubuğu kazanır; İngilizce metinler (03, 06, 09) Türkçeleşir; 07/08 HUD'dan **08 köşe panelleri + 07 alt yuvaları** birleşir; eğik arena kamerası (07/08) ile pixel planı C (tam üstten zemin) arasında **gameplay yüzeyi için pixel planı** kazanır, `@iris` teyidi bekler; kanatlı kuş avatarı (08) IP hijyeni nedeniyle `@iris`'e geri döner.
