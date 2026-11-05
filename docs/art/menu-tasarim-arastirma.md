# Menü dili v2: teşhis, araştırma, üç yön, öneri

**Tarih:** 2026-11-05 · **Şapka:** `@iris` (sanat yönetimi) + `@tide` (UX) · **Dal:** `devran-kod` · **Durum:** **karar (2026-11-05, sahip onayı): Yön B · Kuşak Taşı** (§ 9). § 8'deki varsayılanlar onaylandı. Oyun kodu (`src/`, `test/`, `veri/`, `public/`) değişmedi.
**Sahibin geri bildirimi:** "Yalnız oyuncu bulma vs. menülerinin stilini beğenmedim. Çok AI slop duruyor."
**Kapsam:** Oyna, Lobi (Hızlı maç / Oda kodu), Aranıyor, Rakip bulundu (VS), Takım seçimi, Oda açıldı, Sonuç. Komşu ekranlar (Atölye, Market, Başarımlar) aynı bileşenleri paylaşacağı için § 6'da var.
**Sınırlar (değişmez):** `docs/design/tasarim-sutunlari.md` S1–S4 (kolay öğrenilir zor ustalaşılır, sadelik > lore, referans görsellere yakınlık, Dereceli gizli) ve `docs/design/sadelik-ilkeleri.md` S-1…S-11 (ekran başına tek ana eylem, kısa metin, ana düğme sabit yerde).
**Maketler:** [`maketler/menu-v2/`](maketler/menu-v2/) (README orada). Hepsi yer tutucu sanattır, nihai değildir.

---

## 0. Özet

1. Sorun renk değil, **malzeme**. Bugünkü menülerin paleti referansa zaten yakın: lacivert panel, bej çerçeve, bronz vurgu. "Slop" etkisini veren şeyler başka. Bileşenler oyunun nesnelerinden (topaç, arena, taş, bronz) değil genel bir web kit'inden türemiş: sistem sans yazı, yuvarlatılmış kart, tam genişlik sarı düğme, radyal gradyan zemin, web gezinti çubuğu. Ayrıca üç ayrı stil kaynağı birbirinden habersiz çalışıyor (`arayuz.ts`, `referansStil.ts`, `Lobi.ts` içi `STIL`). Bekleme ve eşleşme anlarının da hiçbir kişiliği yok (§ 1).
2. Araştırmadan çıkan ortak ders: el yapımı hissini süs vermiyor. Onu veren üç şey var: **tek bir malzeme ve tek çözünürlük kuralı** (Balatro'nun kendine koyduğu kurallar), **ekranı oyunun dünyasından bir yere koymak** (Celeste/Fez yükleme ekranları, SF6'nın mekânlı VS'si) ve **anın kendisini olay yapmak** (Smash'in "Challenger approaching" ekranı, Fall Guys'ın vuruş vuruş sonuç akışı). 24 kaynak § 2'de.
3. Üç yön çizildi. **A · Tezgâh Planı** blueprint ve pirinçten kurulu. **B · Kuşak Taşı** arena taşı, bronz kakma ve ışıyan Kuşak halkasından kurulu. **C · Turnuva Tabelası** arcade dili: LED ışıklar, çapraz bantlar.
4. **Öneri: B · Kuşak Taşı.** Referans 02 (taş tapınak, kaide), 07/08 (çatlak taş arena, ışıyan halka) ve 04/06'daki (bronz plaka, kırmızı ◄) dille aynı aileden. Mevcut tokenları (§ 2.5) atmıyor, malzeme ekliyor. DOM ve CSS ile kurulabilir. Gereken sprite'lar küçük, çoğu yordamsal üretilebilir. "Arama = halkanın dolması", "bulundu = taşın çatlaması" gibi imza anları oyunun kendi fiziğinden geliyor.
5. Bu çalışmada yazı tipleri ölçülerek elendi (§ 4.2). Canvas ve CSS tarafında **Silkscreen** (İ/ı/Ş/Ğ yok), **Press Start 2P** (büyük İ ve Ğ küçük harf gibi çiziliyor), **Pixelify Sans** (yerel boyutu dışında 5→S, 2→8, B→G) ve **VT323** (M→N) Türkçe UI için uygun değil. Kalanlar: başlıklar için **Jersey 10** (OFL, yalnız 20/30/40 px) ve etiketler için **m5x7** (Daniel Linssen, CC0, 16/32 px). İkisinde de Türkçe glifler tam.

---

## 1. Teşhis: bugünkü menüler neden "AI slop" okunuyor

**Bakılan ekranlar:** `docs/production/raporlar/ekran/` altında `D7-lobi-hizli`, `D7-lobi-dereceli-acik`, `D7-hizli-araniyor`, `D7-hizli-bot-teklif`, `D7-hizli-bulunamadi`, `D7-hizli-bulundu`, `D7-sonuc-zafer`, `D5-lobi`, `D5-takim-secimi`, `D4-lobi`, `D4-oda-kodu`, `D4-rakip-bulundu-A`.
**Okunan kod (yalnız okuma):** `src/istemci/ekranlar/arayuz.ts`, `referansStil.ts`, `Lobi.ts`.
**İşaretli görseller:** [`teshis-1-lobi.png`](maketler/menu-v2/teshis-1-lobi.png) · [`teshis-2-bulundu.png`](maketler/menu-v2/teshis-2-bulundu.png) · [`teshis-3-sonuc.png`](maketler/menu-v2/teshis-3-sonuc.png)

| # | Belirti (gözlem) | Kanıt | Neden "slop" okunuyor | Oyunun kimliğiyle ilişkisi |
|---|---|---|---|---|
| T-1 | **Web uygulaması kabuğu:** üstte "DEVRAN · D7 · Atölye Market Başarımlar Oyna Ayarlar · 100 Altın · Ayla znu4 · Çıkış" | tüm D4–D7 ekranları; `arayuz.ts:49` `body > header` | SaaS yönetim paneli düzeni. Oyunda "sayfa" yok, yerler var | Referanslarda gezinti çubuğu yok. Alt ekranda yalnız sol üstte ◄ var (04, 06) |
| T-2 | **Sistem sans yazı:** `system-ui`, "Trebuchet MS", Nunito; cümle düzeni karma harf | `arayuz.ts:22,24,43`, `referansStil.ts` `.rf` font | En bilinen "AI işi" göstergesi: her yüzeyde aynı nötr sans (925 Studios, § 2 #17) | Referansın 9 ekranının tamamı pixel yazı ve BÜYÜK HARF etiket kullanıyor (tasarim-dili § 3.1) |
| T-3 | **Yuvarlatılmış kart + tek tip gölge:** 14 px yarıçaplı petrol yeşili kart, 8 px yarıçaplı düğme, her yerde aynı `box-shadow` | `arayuz.ts:12,24,41`; `D5-takim-secimi` | Bootstrap/Tailwind kart kalıbı. İçerikten bağımsız aynı kutu | Referansta köşe pixel basamaklı. Takım kartında topaç yerine metin var |
| T-4 | **Radyal gradyan zemin:** `radial-gradient(#10222a → #070a1c)` | `arayuz.ts:11`, `referansStil.ts .rf` | Hiçbir yer anlatmayan "karanlık mod arka planı" | Referansta her ekranın bir yeri var: tapınak (02), blueprint (03), pazar (04), arena (07) |
| T-5 | **Tam genişlik sarı CTA + beyaz yuvarlak odak halkası** ("Rakip ara", "Hazır", "Kodu kopyala") | `D7-lobi-hizli`, `D4-oda-kodu` | Form gönderme düğmesi. Sarı hap, bronz dille çelişiyor | Ana eylem kuralı bronz-turuncu dolgu + altın çerçeve (K-2, tasarim-dili § 4.3). Lobi bunu kısmen uyguluyor, Takım seç uygulamıyor |
| T-6 | **Panel içinde boş panel, ortalanmış yüzen kutu**, ekranın 1/3'ü boş | `D7-lobi-hizli`, `D7-hizli-araniyor` (koca kutuda tek satır) | Yerleşim içerikten değil şablondan geliyor. Simetri hazır kalıbı ele veriyor | Referans 06 üç sütunla ekranı dolduruyor. Boşluk bilinçli değil |
| T-7 | **Durumların kişiliği yok:** arama = "Rakip aranıyor… 0:06" + İptal; bulundu = sarı tek satır; bekleme = cümle | `D7-hizli-araniyor`, `D7-hizli-bulundu`, `D4-rakip-bulundu-A` | Maçın en gergin iki anı (bekleme, eşleşme) metin satırına indirgenmiş. Ses, hareket, olay yok | Türün geleneği belli: VS/"challenger" anı, iki taraf rengi, ad plakası (§ 2 #5–#7). Topaç oyununda "dönme", "kaide", "çarpışma" hazır metaforlar |
| T-8 | **Tutarsız ikon seti:** 16 px düz renkli SVG element silüetleri, SVG sikke/kilit; referansın çok tonlu pixel sprite'ları yok | `referansStil.ts` `COIN_SVG`, `parcaIkonu`; `elementSvg` | Vektör "emoji" ölçeği pixel dünyasıyla çatışıyor. Ağırlık ve ızgara tutarsız | Referansta tüm parça, sikke ve rozetler pixel sprite (tasarim-dili § 4.3) |
| T-9 | **Üç ayrı stil kaynağı:** `arayuz.ts` (petrol yeşili kart), `REF_STIL` (lacivert pah), `Lobi.ts STIL` | kod | Ekrandan ekrana yazı, düğme ve kart değişiyor (Takım seç petrol, Lobi lacivert, Sonuç bronz). Kopya-yapıştır bileşen | Tek tasarım dili yok. GU-01'in "temel" maddesi hâlâ uygulanmamış |
| T-10 | **Her yerde aynı vurgu tekniği:** `linear-gradient` düğme, gradyan XP çubuğu, `text-shadow` | `referansStil.ts .dg.bir`, `.cubukc i`, `.tabela` | Yumuşak gradyan pixel dilinde "dijital parlaklık" etkisi yaratıyor | Referansta düz tonlar ve dither var, gradyan yok |
| T-11 | **Cümleyle anlatılan sayaçlar:** "Süre 20 sn · süre dolunca son seçtiğin takım", "Oda 60 sn açık kalır." | `D5-takim-secimi`, `D4-oda-kodu` | Bilgi doğru ama arayüz sesi yok. S-8 "sayı yerine çubuk, cümle yerine simge" kuralının tersi | Referans 06'da "20" büyük kutuda duruyor |

**Ölçü:** Sonuç ekranı (D7) en az "slop" duran ekran. ZAFER plakası referans 09'a yaklaşmış. Orada eksik olanlar malzeme, pixel yazı ve öncelik (iki eş düğme, gelir dökümü tablosu). Teşhisin tek cümlelik özeti: **renkler doğru, ama hiçbir şey bir şeyden yapılmamış.**

---

## 2. Araştırma: kaynaklar

**Yöntem:** Web araması yapıldı ve sayfalar bu oturumda yüklenerek okundu (2026-11-04/05). Hepsi **yalnız ilham** olarak kullanılıyor. Hiçbir görsel kopyalanmadı. Canon, marka ya da benzer tasarım kullanılmadı. Ekran görüntülerinin telifi oyun sahiplerindedir.
**Ağ engeli (uydurma yok):** `gameuidatabase.com` (HTTP 403, WebFetch ve curl), `tvtropes.org` (403), `toucharcade.com` (403; Hearthstone dokunsal UI röportajı doğrulanamadı), `medium.com` (403), `fallguysultimateknockout.fandom.com` (402), `fonts.google.com` belirtke sayfası (JS ile çiziliyor, içerik gelmedi; yerine `google/fonts` GitHub METADATA okundu), `learn.unity.com` 9-slice dersi (kaldırılmış; yerine docs.unity.com).
**Bulunamayan:** Hades, Brotato, Vampire Survivors, Dead Cells, Brawlhalla ve Pokémon Unite için doğrudan UI tasarım yazısı bulunamadı. Çıkan sonuçlar ikincil ya da düşük kaliteliydi, listeye alınmadı.

| # | Kaynak (URL) | Ne öğretiyor | Devran'a uyarlama | Lisans / telif |
|---|---|---|---|---|
| 1 | Interface In Game · Lobby, https://interfaceingame.com/screenshots/?elements=lobby | 217 lobi ekranı (Brawl Stars, Fall Guys, Smash Ultimate, Unrailed, Under Night…). Çoğunda karakter sahnede, düğmeler köşelere asimetrik yerleşmiş | Oyna ekranında takım **kaidede, sahnede** duruyor, kart içinde değil (`b-oyna`) | Yalnız referans |
| 2 | Interface In Game · Loading, https://interfaceingame.com/screenshots/?elements=loading | Flinthook, Celeste (kartpostal), Fez, Rogue Legacy, VA-11 Hall-A: bekleme ekranı oyunun dünyasından bir sahne ya da nesne | "Aranıyor" ekranı spinner değil, arena çanağında ısınan topaç (`b-ara*`) | Yalnız referans |
| 3 | Interface In Game · Fall Guys, https://interfaceingame.com/games/fall-guys-ultimate-knockout/ | Eşleşme ekranının adı "Looking for more players". Sonuç akışı "Round over → Qualified/Eliminated → Show summary" olarak ayrı vuruşlara bölünmüş | Sonuç ekranında ödüller sırayla düşer (ux § 3.5 dizisi). Bekleme ekranında "kim bekleniyor" görünür (boş rakip kaidesi) | Yalnız referans |
| 4 | Interface In Game · Brawl Stars, https://interfaceingame.com/games/brawl-stars/ | "Friendly game" (oda) ekranı: iki slot ve büyük, kalın kod/oyuncu alanı. İkonlar oyuna özgü | Oda ekranında **8 taş karo** kod ve rakibin geleceği boş kaide (`b-oda`) | Yalnız referans |
| 5 | Interface In Game · Smash Ultimate, https://interfaceingame.com/games/super-smash-bros-ultimate/ | "Challenger approaching" ve "joins the battle": rakibin gelişi tam ekran bir olay | Rakip bulunduğunda 1,5 sn'lik tam ekran VS anı (`b-vs`) | Yalnız referans |
| 6 | SmashWiki · Versus splash screen, https://www.ssbwiki.com/Versus_splash_screen | VS ekranı yükleme ekranı işini de görüyor. Dövüşçü render'ı, üstte ad ve seri sembolü; her yarının arka planı oyuncu renginde (CPU gri). Yükleme uzarsa ipucu çıkıyor | Sol/sağ yarı element/takım tonunda, ad plakası + 3 element rozeti. Bağlantı beklenirse altta ipucu | Wiki metni CC BY-NC-SA; yalnız bilgi |
| 7 | Phenixx Gaming · Fighting Games, Presentation, and Personality, https://web.phenixxgaming.com/2022/06/13/fighting-games-presentation-and-personality/ | SF6'nın "garaj kapısı" seçim ekranı ve mekânlı VS ekranı kimliğin parçası. Maç öncesi emote/replik sırf eğlence için var | VS'de isteğe bağlı 1 sn "gösteri": topacına tıkla, yerinde hızlanıp kıvılcım atsın. Arka plan somut bir mekân (arena taşı) | Yalnız referans |
| 8 | Game Developer · Into the Breach dev on UI design, https://www.gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time- | "Havalı fikirleri netlik uğruna her seferinde feda ederiz." Bir efekti metinle anlatmak yerine kısa animasyonla göstermek | Süsleme okunurluğu bozuyorsa süsleme kesilir (B'de taş dokusu yalnız çerçevede, metin her zaman düz lacivert zemin üstünde). Takım kartında 1 sn hareket önizlemesi (US-1.3) | Yalnız referans |
| 9 | GDC Vault · Into the Breach Design Postmortem, https://gdcvault.com/play/1025772/-Into-the-Breach-Design | Kesilen içerik, iterasyon, başka oyunlardan ödünç alırken özgün kalmak | Kapsamı küçük tut. Yeni dil önce ortak bileşenlerde, sonra ekranlarda | Video; yalnız referans |
| 10 | GDC Vault · Hearthstone: How to Create an Immersive User Interface, https://www.gdcvault.com/play/1022036/ | "Immersive" arayüzün vizyonu, organizasyonu, süreci | #11 ile birlikte: menü fiziksel bir nesne gibi davranır | Yalnız referans |
| 11 | Game Developer · Hearthstone UI video özeti, https://www.gamedeveloper.com/design/video-designing-an-immersive-user-interface-for-i-hearthstone-i- | "Our game is UI." UI'ı erken ele almak sonradan büyük fayda sağlıyor. Arayüz birkaç kez atılıp yeniden yapılmış | Düğme basılınca 2 px aşağı iniyor, gölge kayboluyor (`basili` hâli). Taş, bronz ve kaide "elle tutulur" | Yalnız referans |
| 12 | Supergiant · UI Illustrator for Hades II ilanı, https://www.supergiantgames.com/blog/job-opportunity-ui-illustrator-for-hades-ii | Menü ekranları, düğmeler ve arka planlar tek tek illüstre ediliyor. "Yüzlerce ikonu stilistik olarak tutarlı" üretmek bekleniyor; katmanlı, hareket grafiğine hazır | Çerçeve, plaka ve ikonlar tek paletten, tek ızgarada; animasyona uygun katmanlara ayrılıyor (taş çerçeve, iç, kakma, halka) | Yalnız referans |
| 13 | Indie Klem #20 · A look at 100%-interface games, https://indieklem.substack.com/p/20-a-look-at-100-interface-games | Balatro'da her animasyonun kendi sesi var ve ses değere göre değişiyor. Papers, Please'te damga "onayla" düğmesinin yerini alıyor. Az renk, tek stil, bilinçli boşluk | Geri sayımın son 5 tıkı giderek tizleşiyor. HAZIR'a basınca bronz "klak" sesi. Arama halkasının her dilimi bir taş "tık"ı | Yalnız referans |
| 14 | Playday · LocalThunk (Balatro) röportajı, https://playday.one/2024/03/09/there-is-a-lot-more-design-to-explore-within-balatro | Tutarlılık için konan kurallar: "renk paleti, sanat çözünürlüğü, UI standardizasyonu, katı kart setleri" | **Tek mantıksal çözünürlük** (480×270, tam sayı ölçek), sabit palet (§ 5.2), tek panel/düğme ailesi | Yalnız referans |
| 15 | Game Developer · Cult of the Lamb cuteness röportajı, https://www.gamedeveloper.com/design/interview-corralling-the-inherent-cuteness-of-cult-of-the-lamb | Sevimli stil karanlık içeriği "fazla korkunç" göstermeden sunuyor; kimliği sanatçının doğal çizgisi belirliyor (UI'a doğrudan değinmiyor) | Ton kontrastı: sıcak, yuvarlak topaçlar ile sert arena taşı (çatlak, kıymık) | Yalnız referans |
| 16 | Classmethod · Game UI vs Web UI, https://dev.classmethod.jp/en/articles/game-ui-vs-web-ui/ | Web UI'da öncelik standartlaşma (Material, Bootstrap). Oyun UI'ında öncelik özgünlük ve immersion; oyun menüleri animasyon ve ses kullanır | T-1/T-3/T-5'in kökü bu: web kalıbı. Her ekran için bir hareket ve bir ses tanımlanır (§ 5.6, § 5.7) | Yalnız referans |
| 17 | 925 Studios · AI Slop Fonts and Gradients: The Tells, https://www.925studios.co/blog/ai-slop-design-tells | "AI işi" belirtileri: her yerde Inter, indigo-mor gradyan, gölgeli eş aralıklı 3 yuvarlatılmış kart, jenerik ince ikonlar, içi boş metin. Çözüm: font, palet, yerleşim ilkesi ve tonu bir kez karara bağlayıp her yüzeyde uygulamak; asimetri | T-2, T-3, T-6, T-10'un doğrudan karşılığı. § 5'teki kurallar bu "bir kez karar ver" ilkesi | Yalnız referans |
| 18 | Coherent Labs · Advanced UI shapes (9-slice), https://guide.coherent-labs.com/layout-assets-and-styling/graphics--shapes/advanced-ui-shapes/ | CSS `border-image-slice` (raster'da kaynak px; `fill` merkezi de çizer), `border-image-width`, `outset`, `repeat`. Çoğu panelde `stretch`, perçin ya da zincir gibi tekrar eden kenarlarda `round` | Taş çerçeve `border-image` + `image-rendering: pixelated`. Slice değeri mantıksal px'in tam katı (§ 6) | Teknik referans |
| 19 | Unity Manual · 9-slicing, https://docs.unity.com/en-us/engine/current/manual/unity2d/sprite/9-slice | 4 köşe + 4 kenar + 1 merkez. Köşeler sabit kalıyor, kenar ve merkez uzuyor | Tek 24×24 taş çerçeve sprite'ından tüm paneller. Doku dolgusu döşenir | Teknik referans |
| 20 | Kenney · UI Pack 2.0, https://kenney.nl/assets/ui-pack | 430 dosya (düğme, panel, kaydırıcı), CC0 | **Kullanılmıyor.** CC0 ama olduğu gibi kullanmak yine jenerik görünür. En fazla iskelet ya da prototip | CC0 |
| 21 | Kenney · Support, https://kenney.nl/support | Varlık sayfalarındaki tüm oyun varlıkları CC0. Atıf gerekmiyor ama memnuniyetle karşılanıyor. Kenney logosu kullanılmamalı | Ses tarafında (efekt-kaynaklari.md § 0 madde 4: Impact/Interface Sounds) krediye "Kenney" yazılır | CC0 |
| 22 | m5x7 · Daniel Linssen, https://managore.itch.io/m5x7 | 5×7 pixel font, CC0 ("attribution appreciated"); 16/32/48 katlarında kullanılması öneriliyor | **Etiket yazı tipi.** Glif denetimi bu oturumda: İ ı Ş ş Ğ ğ Ö ö Ü ü Ç ç tam (crates.io `m5x7` 1.0.0 TTF, fontTools ile kontrol edildi; itch'teki güncel dosya indirilince yeniden sınanmalı) | CC0; krediye yazılır |
| 23 | m6x11 · Daniel Linssen, https://managore.itch.io/m6x11 | "Free to use with attribution"; m6x11plus daha çok karakter içeriyor. Türkçe desteği sayfada yazmıyor | Elendi: lisans metni net değil, glif doğrulanamadı | Atıf; kesin metin yok |
| 24 | google/fonts METADATA (pixelifysans, silkscreen, pressstart2p, vt323, jersey10), https://github.com/google/fonts/tree/main/ofl | Hepsi OFL. Tasarımcılar: Pixelify Sans (Stefie Justprince), Silkscreen (Jason Kottke), Press Start 2P (CodeMan38), VT323 (Peter Hull), Jersey 10 (Sarah Cadigan-Fried) | Glif ve çizim testi § 4.2. Yalnız **Jersey 10** başlıkta kalıyor | OFL: gömme ve ticari kullanım serbest, font tek başına satılamaz |

### 2.1 "Rakip bulundu" anı: VS geleneği (kaynak #5, #6, #7, #13'ten derlendi)
- **Karşı karşıya iki taraf.** Sol oyuncu sağa, sağ rakip sola bakar. Topaçlarda "bakış" yok; bunun yerine dönme izleri birbirine doğru kıvrılır.
- **Ad plakası ve kimlik.** Ad, altında taraf işareti (▲ sen / ◆ rakip, ux § 6.1) ve kimlik rozetleri. Smash'teki seri sembolünün karşılığı burada 3 element rozeti.
- **Taraf rengi.** Her yarı kendi tonunda (sol sıcak, sağ soğuk). Bot rakipte yarı gri kalır (Smash'te CPU gri). Parlama yok: düz ton, dither ve 1 px koyu çizgi.
- **Bölme çizgisi.** Çapraz ve pixel basamaklı. B'de bu çizgi **taş çatlağı**: arena dilinden geliyor, jenerik "slash" değil.
- **Tempo.** Plakalar 150–250 ms'de kayarak girer. Damga 1–2 kare flaş ve 2 px sarsıntıyla "çarpar". Toplam en çok 1,5–2 sn, sonra Takım seçimi. Geri sayım tıklarında perde yükselir (#13).
- **Stinger.** Tek metalik vuruş ya da iki topacın çarpışma sesi (efekt-kaynakları: Kenney Impact Sounds, CC0).
- **Yükleme işi.** Ağ bekleniyorsa altta ipucu satırı (Smash). Kısa "gösteri" isteğe bağlı (SF6).
(Çapraz bölme ve stinger sesi için doğrudan bir kaynak bulunmadı; tür geleneği olarak yazıldı.)

---

## 3. Üç yön

Her yön için maket: Lobi (Oyna) ve VS. Yan yana kıyas: [`yonler-lobi.png`](maketler/menu-v2/yonler-lobi.png), [`yonler-vs.png`](maketler/menu-v2/yonler-vs.png).

### 3.A · Tezgâh Planı (atölye, blueprint, pirinç) · `a-lobi.png`, `a-vs.png`
- **İlke:** Her menü bir teknik çizim paftası. Topaç ölçülerle, kesit çizgileriyle "tasarlanıyor". Referans 03'ün (Atölye blueprint'i) bütün menülere yayılması.
- **Palet:** pafta laciverti `#0F2240`, ızgara `#1A3560` / ana çizgi `#28508A`, tebeşir `#DFE9F7`, maskeleme bandı `#C9B98E` / `#E3D6AD` / `#F0E6C4`, çelik `#2C323E` → `#3D4553`, pirinç perçin `#C08E52` / `#E8C27A`, kırmızı mürekkep `#C83A2A`.
- **Yazı:** etiket m5x7 (CC0), düğme ve başlık Jersey 10 (OFL).
- **Panel/çerçeve:** perçinli çelik levha (köşede 2×2 pirinç perçin), maskeleme bandı etiketleri (basamaklı eğik), ölçü çizgisi süsleri (|←→|, "Ø 32").
- **İkon dili:** 1 px tebeşir çizgi (line-art) + içi element renginde dolgu.
- **Animasyon:** Pafta kayarak girer (kâğıt hissi, 3 kare). Arama sırasında çizgiler kendini "çizer": topacın kesiti tamamlanır. Bulunduğunda kırmızı mürekkep damgası "VS" basılır, mürekkep dokusu dither'la verilir.
- **Ses:** kalem cızırtısı, damga "tak", kâğıt hışırtısı.
- **Asimetri/ritim:** paftalar üst üste ve kaymış, bant etiketler eğri.
- **İmza detay:** ölçü çizgisi ("ÇARPIŞMA" ölçüsü iki topaç arasında).
- **Güçlü:** Atölye (03) ile birebir aynı aile. "Parça/kombinasyon derinliği" fikrini menüye taşıyor. Üretmesi ucuz (çizgi + düz renk).
- **Zayıf:** Soğuk ve teknik; maç heyecanını (VS, bekleme) zayıf taşıyor. Lacivert ızgara bugünkü lacivert zeminden ilk bakışta ayrışmıyor; sahibe "yine lacivert" gibi okunabilir. Market (04, sıcak ahşap pazar) ile uyumsuz.
- **Slop riski:** orta. "Blueprint UI" sık kullanılan bir şablon. Izgara her ekranda aynı kalırsa duvar kâğıdına döner.

### 3.B · Kuşak Taşı (arena taşı, bronz kakma, ışıyan halka) · ÖNERİLEN · `b-*.png`
- **İlke:** Menüler arena kompleksinin içindeki yerler. Lobi bir **giriş kapısı**, arama **ısınma çanağı**, VS **çatlayan taş**, sonuç **tören plakası**. Malzeme üç şey: kaba arena taşı (çerçeve ve duvar), bronz (plakalar, ana eylem, seçim çentikleri) ve Kuşak'ın ışıyan halkası (ilerleme, zaman ve seçim). İçerik zemini referansın laciverti kalıyor (okunurluk).
- **Palet (mevcut tokenlara ek):** duvar taşı `#121016` / `#18161D` / `#1E1B24` / `#25222B`, harç `#0C0B10`; çerçeve taşı `#3A3640` / `#4A4550` / `#5A5460` / `#6E6A66`, kenar ışığı `#8F877C`; panel içi `#171C29` / `#1B2131` / `#1F2638` (= `--panel`); bronz `#2A1A0E` / `#6B4A2A` / `#8F6538` / `#C08E52` / `#E8C27A`; halka `#FBBE88`, hale `#DCA97C`, sönük halka `#3D3638`; ana eylem `#A8572A` / `#7C3D1C` + altın `#FCD35A` (K-2); mürekkep `#FBF2C3`, soluk `#A49C8C`; geri `#9A3D38`. Arena 07 zemin rampası (`#4A4446` → `#7F746C`) arama çanağında.
- **Yazı:** başlık, düğme ve rakam **Jersey 10** (OFL; yalnız 20/30/40 px; ızgara hizası için 0,5 px kaydırma, harf arası +1 mantıksal px). Etiket ve açıklama **m5x7** (CC0; 16 px). İkisi de Türkçe glifte tam (§ 4.2).
- **Panel/çerçeve:** 5 px taş çerçeve (dış 1 px harç, üst-sol 1 px kenar ışığı, alt-sağ 1 px gölge), köşede 1 px kesik; kenarda **tohumlu rastgele 2–3 çentik** (her panelde farklı; el işçiliği). İç alan düz lacivert, hafif 3 tonlu dither. Başlık **bronz plakada**, uçlarında 2×2 perçin.
- **İkon dili:** 11×11 ızgara, 4 tonlu rampa (koyu dış çizgi, orta, açık, vurgu), tek ağırlık. 2× ölçekte rozet. Element renkleri `renkler.ts` rampaları.
- **Animasyon:** § 5.6.
- **Ses:** § 5.7.
- **Asimetri/ritim:** başlık plakası sola yaslı (◄ yanında), Altın yuvası sağda. Mod sütunu solda, sahne sağda. Ana düğme sağ altta (S-3). Halka yayı sahnenin arkasında asimetrik kesilir. Çentikler rastgele.
- **İmza detay:** **Kuşak halkası.** Seçimde, ilerlemede ve zamanda aynı ışıyan yay kullanılır: Oyna'da takımın arkasında, Aranıyor'da 12 dilim, Takım seçimi'nde 20 çentik, Oda'da 20 dilim, Sonuç'ta Çekirdek halkası. İkinci imza **bronz köşe çentiği**: seçili öğenin dört köşesinde L biçimli çentik.
- **Güçlü:** Referans 02 (taş kaide), 06 (bronz düğme, kırmızı ◄), 07/08 (çatlak taş, ışıyan halka) ve 09 (bronz plaka) ile aynı malzeme. Mevcut tokenları koruyor (§ 2.5), yeniden boyamıyor. Bekleme ve eşleşme anları arenanın fiziğinden doğuyor (dönme, çatlama). Market'in ahşabı ve Atölye'nin blueprint'i "başka yerler" olarak yanında durabiliyor.
- **Zayıf:** Doku yoğunluğu kontrol edilmezse ekran ağırlaşır ve okunurluk düşer. Bu yüzden kural: metin asla taş üstünde durmaz (§ 5.1). Duvar dokusu için ek varlık ya da yordamsal üretim gerekir. "Taş + bronz" fantastik RPG klişesine kayabilir: rün, alev ve meşale eklenmez.
- **Slop riski:** düşük-orta. Risk, dokunun her yüzeyde aynı tekrarlanması ("duvar kâğıdı taş"). Önlem: tohumlu varyasyon, her panelde farklı çentik ve çatlak, duvarda büyük blok ritmi.

### 3.C · Turnuva Tabelası (arcade, LED, çapraz bant) · `c-lobi.png`, `c-vs.png`
- **İlke:** Menüler bir mahalle turnuvasının tabelası ve skorbordu: sert renk blokları, çapraz bantlar, LED nokta vuruşlu rakamlar, kayan bilgi bandı.
- **Palet:** siyah `#07070B`, sarı `#FFD23A`, kırmızı `#E8322A`, mavi `#2A5BD7`, beyaz; halftone mor `#1D1530`.
- **Yazı:** rakam Press Start 2P (yalnız Türkçe harfsiz rakam ve "VS", § 4.2) + LED maskesi; ad Jersey 10 40 px; bant m5x7.
- **Panel/çerçeve:** çerçeve yok. Eğik sekmeler (paralelkenar), üstte 1 px vurgu çizgisi. Arka planda halftone nokta.
- **İkon dili:** düz renkli, siyah kontursuz.
- **Animasyon:** sekmeler yandan çarparak girer. Bulunduğunda ekran ikiye "slash" ile yarılır, VS sarsılır. LED sayaç tıklar.
- **Ses:** spiker "VS!" damgası, arcade bip.
- **Asimetri/ritim:** güçlü diyagonal.
- **İmza detay:** LED sayaçlar ve kayan bant.
- **Güçlü:** En enerjik VS. Kick yayını ve seyirci ekranı için çok okunur. Ucuz (düz bloklar).
- **Zayıf:** Referanslardan en uzak yön (09 ekranın hiçbiri bu dilde değil; S3 sütununa aykırı). Lacivert/bronz tokenları atıyor. Press Start 2P Türkçe harfte kullanılamıyor.
- **Slop riski:** **yüksek.** "Esports VS ekranı" şablonu en çok kopyalanan oyun UI kalıbı. Kırmızı/mavi slash ilk bakışta "hazır şablon" okunuyor.

### 3.1 Öneri: B · Kuşak Taşı
| Ölçüt | A Tezgâh | **B Kuşak Taşı** | C Turnuva |
|---|---|---|---|
| S3 referansa yakınlık (9 ekran) | 03 ile çok, diğerleriyle orta | **02, 04 (plaka), 06, 07, 08, 09 ile yüksek** | düşük |
| S2 sadelik (metin zemini temiz mi) | yüksek (düz çizgi) | yüksek (metin her zaman lacivert iç alanda) | orta (halftone gürültü) |
| S1 kolay öğrenme (ana eylem net mi) | orta (pirinç düğme bant ve çizgilerle yarışıyor) | **yüksek (tek turuncu-bronz blok)** | yüksek |
| Bekleme/eşleşme kişiliği | orta | **yüksek (dönme, halka, çatlak = oyun fiziği)** | yüksek ama jenerik |
| Mevcut tokenlarla uyum (§ 2.5) | orta | **tam (ekleme, değiştirme yok)** | düşük |
| Slop riski | orta | **düşük-orta** | yüksek |
| DOM/CSS maliyeti | düşük | orta (9-slice + doku döşemesi) | düşük |
| Ek sprite | ölçü çizgisi süsleri | taş çerçeve 9-slice, plaka, düğme 3 hâl, kaide, çentik, duvar dokusu (çoğu yordamsal üretilebilir, § 6.3) | yok |

**Gerekçe:** Sahip "referanstaki gibi olsun her şey" dedi (S3) ve "AI slop" dedi. B ikisini birlikte çözen tek yön. Referansın renklerini koruyor ve eksik olan malzemeyi ekliyor; renk değiştirmiyor. Metin daima düz lacivert zeminde kaldığı için sadelik bozulmuyor. İmza anları (halkanın dolması, taşın çatlaması) oyunun kendi mekaniğinden geldiği için hazır bir şablona benzemiyor. A'nın blueprint'i Atölye'de kalır (referans 03). C'nin enerjisinden yalnız tempo kuralları (§ 2.1) alınır.

---

## 4. Maketler (yön B tam akış + A/C tek ekran)

Yer: [`maketler/menu-v2/`](maketler/menu-v2/), dosya listesi README'de. Yöntem: oyun kodu import edilmeden HTML + Canvas, 480×270 mantıksal piksel, ×4 tam sayı ölçek (1920×1080, DPR 1). Bayer 4×4 dither, tohumlu değer gürültüsü, 3–5 tonlu düz rampalar. **Gradyan, bulanık gölge ve parlama yok.** Metin eşiklenmiş pixel glif olarak çizildi; yumuşatma yok. Topaç, ikon, kaide ve rozetler yordamsal yer tutucu; sanat hattının yerine geçmez.

| Ekran | Dosya | Bugünkü karşılığı | Kıyas |
|---|---|---|---|
| Oyna (Hızlı maç seçili) | `b-oyna.png` | `D7-lobi-hizli` | `onceki-sonra-oyna.png` |
| Lobi (Oda kodu seçili, kodla katıl) | `b-lobi.png` | `D5-lobi` | `onceki-sonra-lobi.png` |
| Aranıyor, 3 kare (0:04 · 0:12 · 0:21 + Antrenman önerisi) | `b-ara0.png`, `b-ara1.png`, `b-ara2.png` | `D7-hizli-araniyor` | `onceki-sonra-araniyor.png` |
| Rakip bulundu / VS | `b-vs.png` | `D7-hizli-bulundu` (metin satırı) | `onceki-sonra-bulundu.png` |
| Takım seçimi (20 sn) | `b-takim.png` | `D5-takim-secimi` | `onceki-sonra-takim.png` |
| Oda açıldı (kod paylaş) | `b-oda.png` | `D4-oda-kodu` | `onceki-sonra-oda.png` |
| Sonuç (Zafer) | `b-sonuc.png` | `D7-sonuc-zafer` | `onceki-sonra-sonuc.png` |
| Yön A · Lobi, VS | `a-lobi.png`, `a-vs.png` | | `yonler-lobi.png`, `yonler-vs.png` |
| Yön C · Lobi, VS | `c-lobi.png`, `c-vs.png` | | aynı |
| Teşhis (işaretli) | `teshis-1-lobi.png`, `teshis-2-bulundu.png`, `teshis-3-sonuc.png` | | |

**Maketlerdeki akış kararları (ux § 3.3 ile uyumlu):** Takım, Oyna ekranında sahnede görünür (sadelik § 2.5 "takımın 3 topacı büyük kartlarda"). Arama 60 sn'de "bulunamadı"ya düşer; halka 12 dilim × 5 sn olduğu için tam dolduğunda süre de biter. 20. sn'de "BEKLERKEN · ANTRENMAN" belirir (ux § 3.3). Takım seçiminde rakibin parçaları gizlidir, yalnız element simgeleri görünür. Ödünç topaç gri kesikli çerçevelidir. Oda kodu ABCD-EFGH biçiminde, tire kendiliğinden gelir.

### 4.1 Maketlerde kasıtlı olarak çizilmeyenler
Dereceli düğmesi yok (S4: yeni oyuncuya gizli). Geliştirici rozetleri yok (S-10). Gelir dökümü (Galibiyet +100, Günün ilk galibiyeti…) ana sonuç ekranından ikinci kata alındı (Altın kartına odaklanınca açılır; § 8 KM-6).

### 4.2 Yazı tipi denetimi (bu oturumda ölçüldü)
Test: her yazı tipi Chromium canvas'ında "İĞÜŞÖÇ ığüşöç TEKRAR ZAFER RAKİP MAKET DURMA KASIRGA 0123456789" ile, 8–40 px aralığında, eşiklenerek çizildi. Ayrıca TTF cmap fontTools ile denetlendi.

| Yazı tipi | Lisans | Türkçe cmap | Çizim sonucu | Karar |
|---|---|---|---|---|
| **Jersey 10** | OFL (Sarah Cadigan-Fried) | tam | 20/30/40 px'te temiz. 10 ve 16 px'te R→A, harf birleşmesi. 0,5 px kaydırma ve +1 px harf arası gerekiyor | **başlık / düğme / rakam** |
| **m5x7** | CC0 (Daniel Linssen) | tam | 16 ve 32 px'te kusursuz; M, R, 5, 2 doğru; küçük harf de var | **etiket / açıklama** |
| Pixelify Sans | OFL (Stefie Justprince) | tam | 8–15 px'in hepsinde 5→S, 2→8, B→G; değişken font, gerçek pixel ızgarası yok. Eski `m3-lobi.png`'deki "LOGİ" hatası bundan | elendi |
| Press Start 2P | OFL (CodeMan38) | tam | 8 px ızgarası temiz ama **büyük İ ve Ğ küçük harf gibi çiziliyor** ("iLK", "BAğLI") | yalnız rakam ve Türkçe harfsiz kısa damga (C yönü) |
| VT323 | OFL (Peter Hull) | tam | M→N (orta çapraz kayboluyor) | elendi |
| Silkscreen | OFL (Jason Kottke) | **İ ı Ş ş Ğ ğ yok** | yedek yazı tipine düşüyor | elendi |
| m6x11 | atıflı, metin net değil | doğrulanamadı | | elendi |
| Bytesized, Workbench, Tiny5, Micro 5, Handjet, Jersey 15… | OFL | görsel tarama | Bytesized küçük harf bozuk, Workbench tarama çizgili; diğerleri incelenmedi | aday değil |

**Uygulama uyarısı:** Google Fonts CSS'i latin-ext dilimini `unicode-range` ile ayrı yükler. Canvas metni bu dilimi **tetiklemez**: İ, Ğ ve Ş yedek yazı tipine düşer (bu oturumda yaşandı). Yazı tipleri ya yerel TTF ile bağlanmalı ya da `document.fonts.load(font, "İĞŞığş")` ile önceden yüklenmeli. DOM metninde de en güvenli yol yerel `@font-face` (lisans dosyası yanında).

---

## 5. Menü dili v2 kuralları (yön B)

### 5.1 Malzeme kuralları
1. **Metin asla taş üstünde durmaz.** Etiket ve açıklama yalnız lacivert iç alanda, bronz plakada ya da düğmede durur.
2. **Gradyan yok.** Ton geçişi Bayer 4×4 dither ile ya da 1 px'lik bant olarak verilir. Gölge 1–2 px düz `#05050A`.
3. **Parlama yok.** Işık yalnız Kuşak halkasında: 1 px çekirdek `#FFF0D8` + 1 px halka `#FBBE88` + 1 px hale `#DCA97C` + dither `#8A5A34`.
4. **Tek ölçek.** 480×270 mantıksal ızgara, tam sayı ölçek (×2/×3/×4). Bütün kenarlar ve kalınlıklar mantıksal px'in tam katı.
5. **Bir ekran, bir yer.** Oyna/Lobi/Aranıyor/Takım/Oda = arena kapısı ve çanak (taş). Atölye = blueprint (03). Market = pazar ahşabı (04). Sonuç = gece + tören plakası (09). Ortak "kabuk" (◄, başlık plakası, Altın yuvası, düğme ailesi) her yerde aynı.

### 5.2 Renk jetonları (CSS değişkeni önerisi; § 2.5'e ek)
`--tas-0:#121016 --tas-1:#18161D --tas-2:#1E1B24 --tas-3:#25222B --harc:#0C0B10` · `--cerceve-0:#3A3640 --cerceve-1:#4A4550 --cerceve-2:#5A5460 --cerceve-3:#6E6A66 --cerceve-isik:#8F877C` · `--panel-0:#171C29 --panel:#1B2131 --panel-2:#1F2638` · `--bronz-0:#2A1A0E --bronz-1:#6B4A2A --bronz-2:#8F6538 --bronz:#C08E52 --bronz-isik:#E8C27A` · `--halka:#FBBE88 --hale:#DCA97C --halka-sonuk:#3D3638` · `--ana:#A8572A --ana-alt:#7C3D1C --gold:#FCD35A --ink:#FBF2C3 --soluk:#A49C8C --back:#9A3D38`.

**Kontrast (WCAG oranı, bu oturumda hesaplandı):** mürekkep/panel 14,2 · soluk/panel 5,9 · altın/panel 11,2 · ana düğme yazısı `#FFF7E0`/`#A8572A` 4,8 · bronz plaka yazısı/`#8F6538` 4,8 · normal düğme 12,2 · SEN `#2FB8E8`/panel 7,0 · **RAKİP `#E83A8C`/panel 4,1 (4,5 altında)** → metin için açık ton `--rakip-yazi` (ör. `#F472B0`, GU-01'de ölçülür); çember/simge rengi değişmez · kapalı düğme yazısı 3,3 (devre dışı öğe; WCAG istisnası, ama kilit simgesi zorunlu).

### 5.3 Yazı ölçeği
Jersey 10: 20 (düğme, plaka, ad) · 30 (ana düğme, büyük rakam, ZAFER) · 40 (VS, büyük geri sayım). m5x7: 16 (etiket, açıklama, ipucu) · 32 (seyirci/büyük etiket). Mantıksal px; ×4 ölçekte etiket 28 px gerçek yükseklikte okunur. Etiketler BÜYÜK HARF; açıklama cümle düzeninde (tasarim-dili § 3.3).

### 5.4 Yerleşim ızgarası
Kenar boşluğu 8. Üst lento 0–26 (◄ 20×20 @5,3; plaka @30,3; Altın yuvası 80×20 sağda). Sol sütun 8–154. Sahne 166–472. Ana düğme 140×36 sağ alt (332,218); tam ekran seçimlerde alt orta. Alt rozet bandı y 236–262.

### 5.5 Hâller
Düğme: **ana** (turuncu dolgu + altın 1 px + 2 px alt gölge) · **normal** (lacivert doku + bronz 1 px) · **seçili** (kahve dolgu + altın 1 px + bronz köşe çentiği) · **basılı** (2 px aşağı, gölge yok) · **kapalı** (koyu taş dokusu, gri yazı + kilit) · **odak** (2 px `#FFFFFF` + 1 px `#05050A` dış halka, basamaklı köşe; çentikten bağımsız, klavyede her zaman görünür). Kart: seçili altın çerçeve + çentik; ödünç gri kesikli; kilitli asma kilit + "LV.3".

### 5.6 Animasyon (giriş/çıkış, bekleme, eşleşme)
Tüm zamanlamalar `steps()` ile (kare atlamalı, yumuşak ease yok); 12 fps ritim.
- **Ekran girişi:** taş paneller 4 mantıksal px aşağıdan 3 karede oturur. Plaka 1 kare sonra "tak" diye iner. Çıkışta tersi, 2 kare.
- **Arama (Aranıyor):** Topaç çanakta 8 karelik dönüş döngüsüyle (12 fps) küçük bir elips çizer. Her 5 sn'de halkanın bir dilimi yanar (12 dilim = 60 sn = zaman aşımı). Rakip kaidesindeki "?" 1 Hz'de soluklaşıp belirir (≤ 2 Hz nabız kuralı).
- **Bulundu (VS):** t=0 beyaz 1 kare (azaltılmış harekette yok) → 0–120 ms çatlak yukarıdan aşağıya 6 adımda yürür → 120–300 ms iki yarı tonlanır, plakalar yandan 4 adımda kayar → 300 ms VS damgası 2 kare büyükten normale, 2 px sarsıntı → 300–1500 ms kıvılcım yıldızı 4 kare, dönme izleri → Takım seçimi.
- **Takım seçimi:** halkada 20 çentik saniyede bir söner. Son 5 sn çentikler kırmızıya (`#C82625`) döner. Seçili kartta topaç yerinde döner (8 kare).
- **Sonuç:** ödül kartları sırayla düşer (ux § 3.5, ≤ 6 sn, Space/Enter atlar). Altın sayısı tıklayarak sayılır. Taş kıymıkları 1 kez saçılır, döngü yok.
- **Azaltılmış hareket (`prefers-reduced-motion` ve Ayarlar):** sarsıntı ve flaş kapalı, çatlak tek karede görünür, geçişler 150 ms tek adım. Bilgi (süre, halka dolumu) aynen kalır.

### 5.7 Ses ipuçları
Arama: alçak dönme uğultusu döngüsü + her dilimde taş "tık". Bulundu: tek metalik çınlama (çarpışma sesi ailesinden). Geri sayımın son 5 tıkında perde yükselir. HAZIR: bronz "klak". Oda kodu kopyalandı: kısa çift tık. Kaynak: mevcut 16 sentez ses + efekt-kaynaklari.md § 0 madde 4'teki CC0 adaylar (Kenney Interface/Impact Sounds). Yeni lisanslı ses gerekmiyor. Her sesin görsel karşılığı var (S1 "öğretmeyen kural eklenmez").

---

## 6. Bileşen envanteri ve uygulama planı

### 6.1 Bileşenler
| Bileşen | Boyut / ızgara (mantıksal px) | Jetonlar | CSS ile kurulum | Gereken varlık |
|---|---|---|---|---|
| Duvar zemini | ekran | `--tas-*`, `--harc` | `background: url(duvar.png)` 128×128 döşeme, `image-rendering:pixelated`, ölçek `--ui-olcek` | `duvar.png` (yordamsal, 2–3 varyasyon) |
| Taş panel (slab) | çerçeve 5, köşe kesik 1 | `--cerceve-*`, `--panel*` | `border: calc(5px*var(--o)) solid; border-image: url(tas-cerceve.png) 5 fill round` (#18); iç doku `background` | `tas-cerceve.png` 24×24 9-slice × 3 tohum varyasyonu (çentikler farklı) |
| Üst lento | 480×26 | `--cerceve-*` | aynı 9-slice, yatay `round` | aynı |
| Başlık plakası | yükseklik 20, uçta 2×2 perçin | `--bronz-*` | `border-image: url(plaka.png) 6 fill stretch` | `plaka.png` 16×20 |
| Geri ◄ | 20×20 | `--back` | `button.geri` sprite ya da CSS çizgi; `aria-label="Geri"` | `geri.png` 20×20 (2 hâl) |
| Altın yuvası | 80×20 | `--bronz-0`, `--gold` | flex; sikke sprite 8×8 | `sikke.png` 8×8 |
| Düğme (ana/normal/seçili/basılı/kapalı) | yükseklik 20/28/36; yatay dolgu 10 | `--ana*`, `--gold`, `--bronz` | `border-image` 4-slice; `:active { transform: translateY(calc(2px*var(--o))) }`; `[aria-disabled]` | `dugme-*.png` 5 hâl × 12×12 9-slice |
| Seçim çentiği | 6×6 L × 4 köşe | `--gold`, `--harc` | `::before/::after` + `outline` yok; 4 köşe için `background` çoklu konum | `centik.png` 6×6 |
| Sekme (Market/Başarımlar) | yükseklik 20 | `--panel-2`, `--bronz` | düğme ailesinden; seçili sekme alt kenarsız | aynı |
| İlerleme çubuğu (halka dilimi / segment) | segment 5×6, boşluk 2 | `--halka`, `--halka-sonuk` | `display:grid; grid-auto-flow:column`; her dilim `<i>` | yok (CSS) |
| Halka (dairesel sayaç) | 20/12 çentik elips | `--halka` | SVG `<rect>` dizisi (pixel konumlu, `shape-rendering:crispEdges`) ya da canvas | yok |
| VS ad plakası | 170×30, 3 px'te 1 basamak eğim | `--bronz-*` | `clip-path: polygon(...)` basamaklı; ya da sprite | `vs-plaka.png` (sol/sağ) |
| Element rozeti | 11×11 (rozet 15×15, 2× 26×26) | `renkler.ts` rampaları | sprite sheet `background-position` | `element.png` 6 × 11×11 (yeni pixel set; bugünkü SVG'nin yerine, C-10 belge seti) |
| Kalkan rozeti (Sıralama / Stil) | 20×20 | bronz/element | sprite | `rozet.png` |
| Kaide | 48×14 | `--cerceve-*` | sprite | `kaide.png` 48×14 |
| Kilit / boş durum | 11×11 kilit; boş kaide + kesikli "?" | `--soluk` | sprite + CSS `border: dashed` yerine pixel kesikli sprite | `kilit.png`, `bos-kaide.png` |
| Kod karosu | 28×34 | `--panel`, `--bronz` | `input` 8 ayrı `span` görünümü, tek gizli `input` (yapıştır/okuyucu uyumu) | yok |
| Pixel yazı | Jersey 20/30/40, m5x7 16/32 | `--ink`, `--soluk` | `@font-face` yerel TTF; `font-size: calc(16px*var(--o))`; `text-rendering: optimizeSpeed`; `-webkit-font-smoothing:none` (yalnız macOS) | `jersey10.ttf` (OFL), `m5x7.ttf` (CC0) + lisans dosyaları |

**Ölçek kuralı:** `--o` = tam sayı UI ölçeği (`floor(min(innerWidth/480, innerHeight/270))`, en az 2). Tüm px değerleri `calc(Npx*var(--o))`. Kesirli ölçekte pixel font bulanıklaşır; bu yüzden tam sayı zorunlu.

### 6.5 Kesin ölçüler (mantıksal px; ekranda × `--o`, varsayılan 4 @1080p)
| Öğe | Ölçü | Ayrıntı |
|---|---|---|
| Ekran | 480×270 | kenar boşluğu 8, sütun arası 8 (sıkı ekranlarda 6) |
| Üst lento | 480×26 + 1 px harç + 1 px koyu + 3 px dither gölge | derz her 61 px; üst 1 px `#7F7A74` |
| Geri ◄ | 20×20 @ (5,3) | 1 px harç, üst 1 px `#C8665E`, alt/sağ 1 px `#5E1F1B`, üçgen 9 satır |
| Başlık plakası | yükseklik 20, genişlik = metin + 20; @ (30,3) | 1 px `--bronz-0` dış, üst 1 px `--bronz-isik`, alt 1 px `--bronz-1`, uçlarda 2×2 perçin (iç 3 px) |
| Altın yuvası | 80×20 @ (W−86,3) | sikke 8×8 @ +6,+4; rakam Jersey 20 sağa yaslı (−6) |
| Taş panel | çerçeve 5 (dış 1 harç + 4 taş), iç alan 1 px koyu üst + 1 px `#9A9184` alt | köşe 1 px kesik; kenarda 2–3 çentik (2–4 px), tohumlu |
| Ana düğme | 140×36 (Oyna/Lobi/Oda), 116×30 (tam ekran seçim), 112×30 (Sonuç) | 1 px `#1A0E08` + 1 px `--gold` + dolgu `--ana`, alt 4 px `--ana-alt` + 2 px dither; alt gölge 2 px; yazı Jersey 30 (uzun metinde 20) |
| Normal / seçili düğme | 126×36 (mod), 104–132×20–28 (ikincil) | 1 px harç + 1 px `--bronz` (seçili: `--gold`, dolgu `#6B4226`); üst iç 1 px açık; yazı Jersey 20 ya da m5x7 16 (küçük) |
| Basılı | +2 px aşağı, alt gölge yok | |
| Kapalı | aynı ölçü; koyu taş dokusu + 1 px `#3A3640`; yazı `#6A6474` | kilit simgesi zorunlu |
| Odak halkası | 2 px `#FFFFFF` + 1 px `#05050A`, öğenin 1 px dışında | basamaklı köşe |
| Seçim çentiği | 4 köşede 6×1 + 1×6 L, `--gold`, iç tarafta 1 px harç | öğenin 2 px dışında |
| Sekme | 74×22 (6'lı), 29×24 (ikonlu 4'lü) | seçili: altın çerçeve, alt kenar iç renkte (açık ağız) |
| Izgara hücresi | 26–27 kare (Atölye), 40×30 (Market) + 11 px fiyat rozeti | 1 px harç + `#20263A` + üst 1 px `#2E3550` |
| Fiyat / durum rozeti | yükseklik 11; fiyat: sikke + m5x7 16 altın, `#3B2C0C` / `#C9A33B`; kilit: `#20232F` / `#59607A`; gizli `#0C0D14` | |
| Segment çubuk (stat) | genişlik 80–132 × 6 (iç 4); segment 3 + boşluk 1 | `#E8762F`, son 2 segment `#F2622F` |
| Segment çubuk (başarım) | 90×7; segment 3 + 1 | devam `#E8762F`, tamam `--gold` |
| Köken segmenti (İlk Çekirdek) | 5 × (5×6), boşluk 1 | köken rengi (`#D5B787` / `#C0793A` / `#6B8792`) |
| Süre halkası (Takım) | 20 çentik, elips rx 28 · ry 21, çentik 3×3 (yanık: `--halka` + 1 px `#FFF0D8`) | iç elips 22×16 `#14111A`; rakam Jersey 30 |
| Arama halkası | 12 dilim, elips rx 124 · ry 52, dilim aralığı 0,08 rad | 3 px (hale + halka + çekirdek) |
| Oda sayacı | 20 × (5×6), boşluk 2 | |
| Kod karosu | 28×34 (katıl) / 29×40 (paylaş); tire 6–7×3 | harf Jersey 30; katılda boş karo koyu, imleç 3×18 altın |
| VS ad plakası | 170×30, her 3 satırda 1 px eğim | üst 2 satır `--bronz-isik`, alt 3 `--bronz-1`, 1 px `--bronz-0` kenar; ad Jersey 20; element rozeti 15×15 |
| VS bölme | x = 240 − (y − 135)·0,35, ±2 px titreşim | 1 px harç + 1 px `#FFF0D8` + 1 px dither `--halka` |
| Kaide | genişlik 48–86, üst 4 (açık taş) + gövde 10 | üst 1 px `#B3A796` |
| Element rozeti | 11×11 (×2 = 22) + 2 px koyu çerçeve | 4 ton rampa, tek ağırlık |
| Kalkan rozeti | 20×20 (başarım 24×22) | |
| Topaç ikon (yer tutucu) | r 9 (mini), 17–18 (kart), 32 (VS) | sanat hattı gelene kadar |
| Yazı | Jersey 10: 20 / 30 / 40 (+1 / +2 / +2 px harf arası); m5x7: 16 / 32 | etiket BÜYÜK HARF; açıklama ≤ 40 karakter |

### 6.2 Erişilebilirlik
- **Kontrast ≥ 4,5:1:** § 5.2 ölçümleri. Rakip pembesi metinde açık tona alınır.
- **Odak halkası:** 2 px beyaz + 1 px koyu, her bileşende görünür, çentikle karışmaz. `:focus-visible`.
- **Klavye:** ux § 3.3 kısayolları (1/2/3 takım, Enter ana eylem, Esc geri/iptal). Kod alanı tek gizli `input`: yapıştır ve ekran okuyucu çalışır. Taş karolar `aria-hidden`.
- **Metin ölçeği %100/125/150:** m5x7 16 → 16/20/24 değil, ızgarayı korumak için **16/32 arasında tam kat**. %125 ve %150'de etiketler m5x7 32'ye, başlıklar Jersey 30/40'a çıkar, yerleşim tek sütuna kırılır. Alternatif: Ayarlar'da "Düz yazı tipi (okunurluk)" ile sistem sans'a dönüş (İ-erişim, "Düz görünüm" ile aynı mantık).
- **Renk tek kanal değil:** ▲/◆ şekil, ödünç kesikli çizgi, kilit simgesi, halka dilimi sayısı + "0:12" metni.
- **Azaltılmış hareket:** § 5.6.
- **ARIA:** halka `role="progressbar" aria-valuenow`, VS anı `aria-live="assertive"` ("Rakip bulundu: Berk"), sonuç kartları sırayla `aria-live="polite"`.

### 6.3 Varlık kaynakları
- **Yordamsal (önerilen):** taş çerçeve, duvar, plaka, düğme hâlleri ve kaide, maketteki gibi bir derleme aracında (`araclar/menu-dokulari.ts`, tohumlu) PNG'ye pişirilir ve `public/arayuz/` altına konur. Lisans sorunu yok, varyasyon ucuz. Sanatçı sonra elle rötuşlayabilir.
- **Elle pixel (sanat kolu):** element ikon seti (6 × 11×11, C-10), kalkan rozetleri, sikke, kilit, VS kıvılcım yıldızı (4 kare). Tahmini 1 sanat günü.
- **Dış kaynak:** Kenney UI Pack (CC0, #20) **kullanılmıyor** (jenerik görünüm riski). Efekt oturumunun CC0 kaynakları (`efekt-kaynaklari.md`) yalnız VS kıvılcımı ve sonuç kıymığı için isteğe bağlı (Aim Studios patlama 32×32, CC0; pixelfx `hit-spark`, MIT, krediye yazılır).
- **Yazı:** Jersey 10 (OFL) + m5x7 (CC0). `krediler.md`'ye eklenir (GU-01).

### 6.4 "Görsel Uyum Geçişi" (tasarim-dili § 8.3) etkisi
| Madde | Değişiklik | Eski tahmin | Yeni tahmin (ajan günü, tahmin) |
|---|---|---|---|
| GU-01 Temel | Yazı tipi kararı (Jersey 10 + m5x7), yeni jetonlar (§ 5.2), **tek stil kaynağı** (`arayuz.ts` + `REF_STIL` + `Lobi STIL` → tek `arayuz-v2.css`), 9-slice bileşenleri, `--o` ölçek kuralı, doku pişirme aracı | 1,5 | **2,5** |
| GU-08 Lobi | Oyna + Lobi + Aranıyor sahnesi + Takım seçimi + Oda; web gezinti çubuğunun kalkması (KS-2 ile birlikte) | 1 | **2** |
| **GU-14 (yeni) Eşleşme anı** | VS ekranı, arama animasyonu, ses ipuçları, azaltılmış hareket hâli | — | **1** |
| GU-06 Sonuç | taş kıymığı, plaka sprite'ı, gelir dökümü ikinci kata (KM-6) | 1 | 1,25 |
| GU-11 / GU-12 Market, Başarımlar | ortak kabuk ve düğme ailesine geçiş (ahşap raf ve kalkan kart kalır) | D7 içinde +0,5 | +0,75 |
| GU-07 / GU-09 / GU-10 | ortak kabuğu kullanır; içerik değişmez | | +0,25 toplam |
| GU-13 Sadelik | değişmez | 1 | 1 |
| **Toplam fark** | | ~13 | **~16 ajan günü** (+3) + sanat kolu ~1 gün (ikon seti) |

Sıra önerisi: GU-01 (temel, tek stil kaynağı) → GU-08 + GU-14 (sahibin şikâyet ettiği ekranlar, en görünür kazanç) → GU-06 → GU-11/12. Sim, kurallar ve altın hash'ler değişmez; yalnız sunum katmanı.

---

## 7. Riskler
- **Doku yoğunluğu:** Taş her yüzeye yayılırsa ekran ağırlaşır. Kural 5.1/1 korunmalı; hedef: taşın ekran alanının yaklaşık üçte birini geçmemesi (maketlerde ölçülmedi, göz kararı). `@pebble` 0,5 sn bakış testi (S-6) yapılmalı.
- **Fantastik klişe:** Rün, meşale ve alev çerçeve **eklenmez**. Taş arenanın kendi taşıdır (07), tapınak süslemesi değildir.
- **Pixel font ve DOM:** Kesirli ölçek ve tarayıcı yumuşatması glifleri bozar. `--o` tam sayı zorunlu, canvas'ta önceden yükleme şart (§ 4.2).
- **Tutarlılık:** Market (ahşap) ve Atölye (blueprint) "başka yer" olarak kalır. Ortak kabuk değişmezse aile bozulmaz.

---

## 8. Sahip kararları (2026-11-05: varsayılanların tamamı onaylandı, § 9)
| # | Soru | Karar |
|---|---|---|
| KM-1 | Menü dili yönü: A Tezgâh / **B Kuşak Taşı** / C Turnuva / karma | **B** |
| KM-2 | Yazı tipi çifti: Jersey 10 (OFL) başlık + m5x7 (CC0) etiket; Pixelify Sans bırakılır | evet |
| KM-3 | VS damgası metni: "VS" mi, Türkçe bir karşılık mı ("KARŞI")? | "VS" (genel oyun terimi, S1; sözlüğe eklenir) |
| KM-4 | Üst web gezinti çubuğu menülerden kalkar mı (sadelik KS-2 ile bağlı) | kalkar; Atölye alt şeridi + ◄ |
| KM-5 | Arama halkası 12 dilim = 60 sn zaman aşımı ile birebir eşlensin mi | evet |
| KM-6 | Sonuç ekranında gelir dökümü ikinci kata (Altın kartına odak) alınsın mı | evet |
| KM-7 | Sonuç konfetisi yerine taş kıymığı + kıvılcım | evet |
| KM-8 | Kick seyirci ekranı için C'nin VS temposu (daha büyük ad, bant) ayrı bir "seyirci VS" olarak alınsın mı | hayır (ilk sürümde tek VS) |

---

## 9. Karar kaydı (2026-11-05)
- **Sahip onayı:** "Önerilenler güzel" (koordinatör oturumu üzerinden iletildi); bu oturumda sahip maketlere "Güzel" dedi. **Yön B · Kuşak Taşı** menü dili v2 olarak kabul edildi. KM-1…KM-8 § 8'deki karar sütunu gibi.
- **Bağlayıcı olanlar:** § 5 kuralları (malzeme, jetonlar, yazı ölçeği, ızgara, hâller, animasyon, ses), § 6.1 bileşen envanteri ve § 6.5 kesin ölçüler, § 4.2 yazı tipi kararı (Jersey 10 OFL + m5x7 CC0; Pixelify Sans, Press Start 2P (Türkçe metinde), VT323 ve Silkscreen kullanılmaz).
- **Uygulama:** kod tarafı ana oturumun alt ajanlarında (menüler; maç HUD/arena ayrı). Bu belge ve `maketler/menu-v2/b-*.png` uygulamanın görsel otoritesidir; çelişkide sadelik ilkeleri ve tasarım sütunları kazanır.
- **Maket kapsamı:** önerilen akış + komşu menüler: Oyna, Lobi, Aranıyor (3 kare), VS, Takım seçimi, Oda, Sonuç, **Atölye, Market, Başarımlar, İlk Çekirdek, Giriş/Profil** (`b-atolye.png`, `b-market.png`, `b-basarimlar.png`, `b-ilk-cekirdek.png`, `b-giris.png`).

### 9.1 Komşu menüler için dil notları (maketlerden)
- **Uygulama notu (2026-11-05, GU-A ikinci tur, sahip kararı):** `b-atolye.png` takımın 3 topacını alt şeride koyuyor; onaylı **referans 03 Takım panelini sağ sütunda** gösteriyor. Çelişkide **referans 03 esas**: kodda Takım paneli sağda kalır, alt şeritte yalnız MARKET · BAŞARIMLAR (ikincil) ve OYNA (ana). Ayrıca UI ölçeği 640×360 mantıksal hedefe çekildi (`--o = floor(min(W/640, H/360))`: 1280×720 ×2, 1920×1080 ×3); § 6.5'teki ölçüler mantıksal px olarak geçerli, yalnız 1080p varsayılanı ×4 yerine ×3 (yoğun ekranlarda sayfa kayması ve kesilen metin olmasın diye).
- **Atölye (03):** kabuk taş (lento, paneller), orta sütun **blueprint yeri** (referans 03): patlatılmış dikey parça görünümü + ölçü çizgisi, parça adları solda. Sağda 6 çubuk (C-1 kasıtlı fark korunur; turuncu segment, değer Jersey 20 turuncu). Sol: 4 parça sekmesi + 4×3 ızgara (seçili altın + çentik, kilit, ??? silüet). Alt şerit: takımın 3 topacı (seçili altın), MARKET · BAŞARIMLAR ikincil, **OYNA** ana sağ alt. Ana ekran olduğu için ◄ yok.
- **Market (04):** yer **pazar ahşabı** (flama, tahta tezgâh; yer tutucu), kabuk aynı. 2×2 raf, asılı ahşap tabela, raf başına 4 hücre: fiyat rozeti (sikke + rakam), kilit + "3/10", ??? siyah silüet. "GÜNÜN PARÇASI -%30" bronz plaka. **SATIN AL** ana sağ alt, seçili parça adı + fiyat solda tek satır.
- **Başarımlar (05):** 6 sekme (seçili altın çerçeve, alt kenarsız), 4×2 kart: kalkan rozet + ad + "6/10" + segment çubuk; tamamlanan altın çubuk + "TAMAM" + çentik; kilitli gri taş + kilit. **MARKETE GİT** ana sağ alt.
- **İlk Çekirdek (02):** yer **taş tapınak nişleri**; üstte topaç ikon çerçevesi, kaide üstünde köken renkli küre, köken plakası, 2 satır segment çubuk (köken renginde). Seçili: altın çerçeve + çentik. **SEÇ** alt orta; tek satır "SEÇMEDİĞİN İKİSİ MARKETTE".
- **Giriş/Profil (01):** sol panel parlayan Çekirdek illüstrasyonu (yer tutucu halkalar), sağ "PROFİL OLUŞTUR": ad alanı, 6 element arması, 14 renk şeridi (seçili beyaz çerçeve), **GİRİŞ** ana: referanstaki yeşil değil bronz-turuncu (K-2, tek ana eylem rengi).
