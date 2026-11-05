# Skaledman Arena: fusion kartlarıyla gerçek zamanlı dövüş (tasarım önerisi)

> **TARİHÇE (2026-11-04'ten beri geçerli değil):** Bu belge Skaledman/Pokémon füzyon arenası çağına (2026-11-01) aittir. Sahip 2026-11-04'te projeyi Skaledman ve Pokémon'dan ayırdı ("skaledman'dan bağımsız bir proje olacak"); proje artık özgün topaç dövüşü **Devran**. Gövde değiştirilmeden tarihçe olarak tutulur. **Geçerli belge:** `docs/design/beyblade/00-lore-cercevesi.md`, `docs/design/beyblade/01-arena-eslemesi.md`, sayılar `docs/design/tuning.md`.

Tarih: 2026-11-01. Hedef: [skaledman.com](https://skaledman.com)'daki fusion kartlarını gerçek zamanlı bir arenada dövüştürmek. Yalnız dövüş katmanı; albüm, kart açma ve Kick kanal puanı akışı Skaledman'da kalır.

## 1. Skaledman'da elimizde ne var

Site, Kick yayıncısı swaggybark'ın ("Dayı") izleyicilerinin kanal puanıyla açtığı Pokémon Infinite Fusion kartlarının albümü. Kod Mac'te ve VPS'te yok; üçüncü taraf bir site, kimin yazdığı sayfada geçmiyor. Gizli olmayan, oturum istemeyen bir JSON API'si var:

| Uç | İçerik | Boyut |
|---|---|---|
| `/api/kartlar` | 226 kart: `stats {hp, atk, def, spa, spd, spe}`, `category`, `ability`, `attacks[2] {name, type, power}` | 64 KB |
| `/api/history` | Her açılış: `fusionId` ("baş.gövde"), `name`, `head`, `body`, `sprite`, `artists`, `types`, `shiny`, `hue`, `user`, `userId` (Kick kimliği), `at` | 116 KB |
| `/api/detay?id=` | Tam Pokédex: iki yetenek + gizli yetenek (açıklamalı), tüm hamle listesi (`key`, `lv`, `type`, `cat`, `power`, `acc`, `pp`, Türkçe açıklama) | 8 KB/kart |
| `/api/kanal` | kanal adı ve Kick bağlantısı | |

Sayılar: 112 koleksiyoncu, en çok 27 kart (YSQ3). 18 tip. Saldırı gücü 40–160, HP statı 7–193 (dengeleme şart). Sprite'lar [sprites.infinite-fusion.net](https://sprites.infinite-fusion.net) üzerinde **288×288 tek poz PNG**; yürüme, saldırı, hasar animasyonu yok. Bu, animasyonlu PMD sprite'larıyla en büyük fark ve tasarımı belirleyen kısıt.

## 1b. Ürün çerçevesi (sahip, 2026-11-01)

Skaledman'da kart sahibi kullanıcıya iki seçenek sunulacak: **otomatik savaş** (Skaledman'ın kendi işi, bizi ilgilendirmiyor) ve **arenada savaş**. Sahip: *"biz arenada savaş seçeneğini seçtiğinde kullanıcı olan kısmı kodluyoruz."* Yani bizim ürünümüz "arenada savaş" düğmesine basıldığı andan sonrası: devir sözleşmesi (hangi kullanıcı, hangi kartları), arena, sonuç. Dövüşen yaratıklar Skaledman'ın ürettiği fusion'lardır (baş + gövde birleşimi ve ondan doğan kart); biz kart üretmeyiz.

**Devir sözleşmesi (K-13 ile birlikte tasarlanacak, depo görülünce):** Skaledman → arena geçişi en az şu bilgiyi taşımalı: Kick `userId`, seçilen kart `id`'leri (ULID) ya da `fusionId`'ler, oda/meydan okuma bağlamı. Aday yollar: (a) Skaledman imzalı kısa ömürlü bir token ile `arena/?devir=<token>` açar, arena token'ı doğrular; (b) arena kendi Kick OAuth girişini yapar ve kartları `userId` ile Skaledman verisinden çeker (F2 planı). (a) tek tıkla geçiş sağlar ve Skaledman'ın oturumunu yeniden kullanır; (b) Skaledman'a dokunmadan çalışır. F0/F1'de arena bağımsız açılır (URL ile kart seçimi); devir F2'de.

## 2. Oyun: bir cümle

"Kartın senin dövüşçün": izleyici Kick hesabıyla girer, albümdeki kendi fusion'larından 3'lük takım kurar, 60–90 saniyelik 1v1 arenada klavye-fare ile dövüşür; kartın 2 saldırısı 2 yetenek tuşu, tipi temel vuruş, yeteneği pasif.

## 3. Kart → dövüşçü eşlemesi (veri odaklı)

Hamleler kod değil tablo olur; ama kartın verisinden otomatik türeterek; 226 karta el ile kural yazılmaz.

**Statlar**
- HP: `120 + hp × 1.2`, 130–350 arası kırpılır (7 HP'li fusion oynanabilir kalsın).
- Hareket hızı: `spe` ile 180–320 birim/sn arası doğrusal.
- Hasar: fiziksel hamle `atk`, özel hamle `spa`; savunma `def`/`spd` ile ölçekli, kritik yok (gerçek zamanlıda kritik okunmaz).
- Tip etkinlik tablosu Pokémon'unki (18×18, PokéAPI). STAB ×1.25.

**Kontroller (K-7)**
| Tuş | Ne |
|---|---|
| WASD / oklar | hareket |
| 1–4 veya fare tekerleği | hamle seçer (kartın 2 saldırısı + tipe göre temel vuruş + seviyeyle açılan 4. yuva; yuva sayısı `game-designer` kararı) |
| Sağ tuş basılı | nişan (zeminde hedef halkası / ok); bırakınca atış; HUD üstünde bırakınca iptal |
| Shift | dash: 60 birim / 0,15 s / 10 s bekleme / 0,12 s dokunulmazlık |
| Space | zıplama: 0,5 s, yer hamleleri değmez, enerji harcar |
| Tab / Q / E | takım paneli ve geçiş (Tab basılıyken düşüş noktası nişanı) |
| Z | dinlenme (şarj dolumu) |

**Saldırı → kural: iki katman**
1. **Hamle anahtarına göre el yapımı kural** (`CLOSECOMBAT`, `EARTHQUAKE`, `HYDROPUMP`, `SKYATTACK`…). Albümdeki 226 kartta kaç farklı hamle olduğu sayılır; tahminen 120 civarı. En sık 40 tanesine `aile / telegraf / bekleme / menzil / yarıçap / hız / durum` yazılır.
2. **Geri dönüş: (tip, güç bandı) → aile**. Elle kural yazılmamış her hamle buradan gelir:

| Güç | Aile | His |
|---|---|---|
| ≤ 60 | hızlı poke / kısa mermi, 1.5 sn cd | spam vuruşu |
| 65–95 | mermi veya küçük alan, 3 sn cd | ana hasar aracı |
| 100–120 | uzun hazırlık, büyük alan veya embestida, 5 sn cd | "aviso largo", kaçılabilir |
| ≥ 130 | 6+ sn cd, kendine bedel (geri tepme, 1 sn sersemlik, sonraki tur yok) | Hyper Beam mantığı |

Tip, aile içindeki şekli belirler: Ateş → koni/alev jeti ve yanma %10; Su → dalga/itme; Elektrik → anında ışın ve felç; Toprak → yere vurma alanı (Uçan'a geçmez); Hayalet → duvardan geçen mermi; Dövüş → embestida/kombo; Psişik → kilitlenen yavaş mermi; Buz → yavaşlatma; Zehir → su birikintisi; Çimen → tohum/drain; Kaya/Çelik → ağır, iten; Uçan → sıçrayıp inme; Ejderha → menzilli embestida; Peri/Normal/Böcek/Karanlık → poke varyantları.

**Yetenek → pasif.** Albümde geçen yeteneklerin en sık 30'u elle (Zehir Dikeni: temas edene zehir ihtimali; Dayanıklılık: tek vuruşta ölmez; Hızlı Yüzme: su zemininde hız; Doğal İyileşme: karta geçince durum temizlenir; Alev Bedeni: temas edene yanma). Geri kalanı tipine göre genel bir pasif alır. `/api/detay` zaten Türkçe açıklama veriyor; UI'da aynı metin.

**Shiny:** yalnızca görsel (parlama + farklı HP çubuğu rengi). Avantaj verilirse albüm ekonomisi bozulur.

## 4. Sunum: tek pozlu sprite ile canlı his

- Sahne 2.5D üstten eğik (x yatay, z derinlik), sprite billboard.
- **Prosedürel animasyon:** yürürken salınım (bob) + hafif eğilme, nişan yönüne yatay çevirme, saldırıda ileri hamle tween'i ve squash-stretch, hasarda beyaz flaş + geri itme, ölümde düşüp solma, gölge elipsi hızla ölçeklenir. Brawl Stars'ın yaptığı budur; sprite'ın tek poz olması sorun değil.
- Hamle efektleri **kodla çizilir** (Pixi Graphics + birkaç parçacık): koni, ışın, mermi, alan halkası, hazırlık uyarısı (telegraf) yerde kırmızı halka olarak.
- 288 px sprite ekranda 96–128 px gösterilir; keskin kalır.
- Sprite'lar başlangıçta hotlink değil, izinle aynaya alınır (bkz. riskler); `artists` alanı oyun içi kredi ekranına girer.

## 5. Teknik yığın

Tarayıcı aksiyon oyunlarının bilinen yığını, netcode'u Colyseus'tan hazır alınmış hâliyle.

| Katman | Seçim | Neden |
|---|---|---|
| İstemci | Vite + TypeScript + **PixiJS v8**; menüler DOM | suroi gibi tarayıcı aksiyon oyunlarıyla aynı; Phaser'ın sahne yükü gereksiz |
| Sunucu | Node 22 + TypeScript + **Colyseus** odaları, yetkili simülasyon 30 Hz | Oda, durum senkronu, yeniden bağlanma hazır; pokemonAutoChess ve TOSIOS kanıtı |
| Netcode | Kendi hareketinde istemci tahmini, rakipte 100 ms interpolasyon, hasar yalnız sunucuda | Aksiyon oyunu standardı |
| Ortak paket | `kurallar/`: hamle tablosu, tip tablosu, stat formülleri; istemci ve sunucu aynı paketi import eder | Tek doğruluk kaynağı |
| Kimlik | **Kick OAuth** (2025'ten beri açık) → `userId` → Skaledman `history` ile eşleşir, kendi kartların gelir | Google/Discord yerine yayın kimliği |
| Veri | Skaledman API'si saatte bir çekilir, Postgres/SQLite'a yazılır; oyun asla Skaledman'ı canlı çağırmaz | Siteyi yormamak, kesintiye dayanmak |
| Barındırma | Oyun sunucusu **mevcut VPS** (Netcup, Almanya; ayrı systemd birimi + kullanıcı + CPUQuota; Cloudflare Tunnel, WS destekler). İstemci Cloudflare Pages | Türkiye'den ~50 ms; Fly.io'ya gerek yok |
| Gözlem | Colyseus monitor + basit maç günlüğü | |

Kod dili: Türkçe tanımlayıcılar, kamu API'leri İngilizce.

## 6. Yayın odaklı özellikler (bizi farklı kılan)

1. **İzleyici bağlantısı:** her odanın `?izle=KOD` görünümü; Dayı OBS'te tarayıcı kaynağı olarak açar.
2. **Meydan okuma akışı:** sohbette `!dövüş @kullanıcı` veya kanal puanı ödülü "Düello" → Kick webhook'u (kicklive zaten Kick webhook'u alıyor) → oda kurulur, iki tarafa bağlantı düşer.
3. **Dayı'nın takımı:** yayıncının kartlarıyla bot rakip; herkes ona karşı oynayabilir.
4. **Günlük turnuva:** 8 kişilik braket, kazanan albümde rozet (Skaledman sahibiyle konuşularak).
5. **Sıralama:** basit Elo, haftalık sıfırlama.

## 7. Aşamalar

| Aşama | Süre | Çıktı | Bitti sayılır |
|---|---|---|---|
| **F0 prototip (çevrimdışı)** | 1 hafta | Tek arena, JSON'dan 2 kart, WASD + fare, 4 tuş, tip etkinlik, HP çubukları, bot rakip | "Eli tutuyor mu?" sorusuna evet; 3 kişi 10 dk oynayıp bırakmak istemiyor |
| **F1 çevrimiçi 1v1** | 1–2 hafta | Colyseus sunucu VPS'te, kodla oda, tahmin + interpolasyon, yeniden bağlanma, 30 Hz | Türkiye'den iki kişi 60 sn maç oynuyor, hile için istemci yeterli değil |
| **F2 kimlik ve takım** | 1–2 hafta | Kick girişi, kendi kartların, 3'lü takım ve geçiş, 30 el yapımı hamle + geri dönüş tablosu, 30 yetenek, dojo kuklası | 112 koleksiyoncunun hepsi kendi kartıyla girebiliyor |
| **F3 yayın** | 1 hafta | İzleyici görünümü, `!dövüş` akışı, Dayı botu, Elo | Yayında bir akşam kesintisiz dönüyor |
| F4 | sonra | Turnuva, 2v2, arena çeşitleri, ses | |

Benzer bir dövüş çekirdeği tek kişiyle 3–5 bin satır TypeScript'e sığıyor. F0–F2 toplam 4–5 hafta gerçekçi.

## 8. Riskler ve önce konuşulacaklar

- **Skaledman sahibinin onayı.** API açık ama bizim değil. Önce sahibiyle konuşulur: kullanım izni, hızı, ileride webhook/rozet entegrasyonu. Onay yoksa oyun yine çalışır (kartlar dışa aktarılır) ama "platformun dövüş kısmı" olmaz, yan proje olur.
- **Sprite hakları.** Infinite Fusion sprite'ları topluluk sanatçılarının; resmî lisans yok, sanatçılar 2024'te izinsiz kullanıma sert tepki verdi. Kâr amaçsız kalınır, her sprite'ın `artists` kredisi gösterilir, aynalama için Infinite Fusion Discord'una sorulur. Pokémon markası Nintendo'nun: reklam ve satış yok, hayran projelerinin alışılmış yasal uyarısı şablon alınır.
- **Denge.** HP 7–193 ve güç 40–160 çok geniş; formüller kırpılmazsa düşük kartlar işe yaramaz, albümün yarısı oynanmaz. F0'da 20 rastgele kartla otomatik bot-bot simülasyonu çalıştırılıp kazanma oranı %35–65 bandına çekilir.
- **Hile.** Hasar ve konum sunucuda; istemci yalnız girdi yollar. Colyseus bunu kolaylaştırır ama hareket doğrulaması (hız sınırı) yazılmalı.
- **Gecikme.** Oyuncular Türkiye'de, sunucu Almanya'da; 40–60 ms kabul edilebilir. 100 ms üstünde "aviso" süreleri uzatılır.

## 9. Referanstan birebir alınacaklar / değişecekler

Alınacak: veri odaklı hamle kuralları ve isimlendirme (`familia`, `aviso`, `cooldown`, `alcance`, `radio`); hamle açıklamalarının sayısal olması; 3'lü takım ve geçiş; oda kodu `ABCD-EFGH`; dojo kuklası; hash'li varlık manifesti; dil seçimini ana paket inmeden yapan küçük başlangıç betiği; kredi sayfası yapısı.

Değişecek: ham WebSocket yerine Colyseus; Google/Discord yerine Kick; 151 sabit Pokémon yerine izleyicinin kendi kartları; animasyonlu sprite yerine prosedürel animasyon; Fly.io yerine kendi VPS'imiz; yayın entegrasyonu baştan.

## 10. Hemen yapılabilecek ilk adım

F0 için yeni bir repo (ör. `~/dev/skaledman-arena`): Vite + TS + Pixi iskeleti, `kurallar/` paketi, `/api/kartlar` + `/api/history` anlık görüntüsü `veri/` altına, tek arena, iki kart, bot. İlk hedef "hareket + sol tık + Q/E + dash, tip etkinlikli hasar" ve bir hafta sonunda oynanabilir bağlantı.

## 11. Referans değerler (aday; karar `game-designer` + `economy-designer`, onay sahibin)

Kaynak: referans oyunun paket analizi ve oynanış gözlemi (2026-11-01, yerel araştırma notları). Sahip "aynı ilk örnekteki gibi" dediği için § 3'teki uydurma formüller yerine bunlar başlangıç noktası olmalı; § 3 bu bölüme göre güncellenene kadar çelişkide bu bölüm kazanır.

| Konu | Referans değer | Bizim için not |
|---|---|---|
| Stat → sayı | Ana seri formülü, Lv50, IV 31, EV 0: HP = ⌊(2·Base+31)·L/100⌋+L+10, diğerleri +5 | Skaledman kartlarının 6 statı doğrudan girer; HP 7 olan fusion Lv50'de ~82 HP olur, § 3'teki kırpmaya gerek kalmayabilir; bot turnuvasıyla doğrulanır |
| Hasar | Ana seri temel hasar; STAB 1,5; **süper etkili 1,5× (2× değil)**, az etkili ⅔, bağışık 0; varyans ve genel kritik yok; yanık fiziksel ½ | Aynen almayı öneriyorum; gerçek zamanlıda okunaklı |
| Stat kademeleri | Ana seri çarpanının karekökü, 8 s sonra düşer, tavan +6 | Aynen |
| Hız | 150·(0,7+0,6·Spe/130) birim/s (105–195) | Aynen; § 3'teki 180–320 iptal |
| Saha | 760×480 birim, gövde yarıçapı 14, 960×540 sanal çözünürlük, 2× piksel | Aynen; arena spesifikasyonları bu birimde |
| Dash | 60 birim / 0,15 s / **10 s bekleme** / 0,12 s dokunulmazlık | Aynen; § 3'teki 2,5 s iptal |
| Zıplama | 0,5 s, 22 yükseklik, enerji 1/3 (0,4/s dolar); havadayken yer hamleleri değmez | Eklenmeli (bizde yoktu) |
| Telegraf (`aviso`) | 0,08 / 0,2 / 0,45 s | Aynen; 30 Hz'de 0,08 s = 2,4 tick (bkz. mimari § 3b) |
| Durumlar | yanık 6 s (1/16 her 1,5 s), donma 1,8 s, felç 5 s (hız ½, %25 takılma), zehir 4 s (1/12 /s), uyku 2,5 s, konfüzyon 3 s; aynı aile 4 s içinde tekrar → ×0,6, ×0,3 | Aynen; azalan getiri önemli |
| Hamle ekonomisi | PP kapalı; cooldown 0,45–20 s; bazı temel hamleler 2–3 şarjlı (6 s dolum) | Aynen; HUD'da saniye rozeti |
| Takım değiştirme | ~1,15 s animasyon, 2 s bekleme, KO sonrası 5 s seçim, Tab basılıyken düşüş noktası nişanı | Aynen |
| Kontroller | WASD; **1–4 veya tekerlek hamle seçer; sağ tuş basılı nişan, bırakınca atış**; Shift dash; Space zıplama; Tab/Q/E takım; Z dinlenme | § 2'deki "Q/E saldırı, sol tık temel" şeması **açık karar**: referans şemayı birebir almak oyuncu geçişini kolaylaştırır. `ux-designer` iki şemayı karşılaştırır |
| Rakip HP | İstemciye yalnız 0..1 oranı gider; kendi HP sayı | Aynen (bilgi sızıntısı ve HUD) |
| Kopma | Geri sayım, dönüş, ya da bot devralır | Aynen |
| Botlar | 3 profil × ~15 parametre (tepki, nişan hatası, kaçma, kadans, hareket tarzı) | Bot turnuvası ve "yerine bot" için şablon |
| Onboarding | Hesap → güçlü hazır kadroyla pratik maçı (6 adım, atlanabilir) → ilk 3 seçimi → kolay rota | Bizde: Kick girişi → pratik maçı (hazır 3 fusion) → kendi kartlarından 3 seç → bot maçı |
| Ödül | Kazanan 40 altın + 2 bilet, kaybeden 15 + 1; günlük tavan | Kaybeden boş çıkmasın ilkesi; para birimi Skaledman sahibiyle konuşulur |
| Aile sayısı | ≈95 aile, her biri ayrı kod parçası | Bizim iki katmanlı veri tablosu kararı kalır; ama 10 katalog kategorisi aile listemizin iskeleti olur |

## 12. Skaledman sayfasından gelen tasarım girdileri (aday)

Kaynak: [skaledman-sayfa-analizi.md](../research/skaledman-sayfa-analizi.md) § 2.4, § 4.3, § 5.

- **Kart HP ≠ arena HP.** Skaledman kartındaki HP `clamp(30, 340, round((hp·0,8 + BST·0,15)/10)·10)` ile türetilmiş bir kart değeri (albümde 40–230). Arena, § 11'deki ana seri formülünü **base statlardan** hesaplar; kartta yazan HP ile arenadaki HP farklı olacak. HUD'da oyuncuyu şaşırtmamak için seçim ekranında "arena HP" ayrıca gösterilir ya da kart HP'si arena HP'sine ölçeklenir; `game-designer` + `ux-designer` kararı.
- **Nadirlik** (BST ≥ 580 ★★, ≥ 500 ★, ≥ 400 ◆, altı ●) ve **shiny** (aynı sprite + `hue`) oyun kuralını etkilemez; HUD rozeti ve kredi ekranında aynen gösterilir.
- **Yetenek eşlemesi** `Detay.abilities[].key` üzerinden (`NATURALCURE` gibi Essentials anahtarları); Türkçe ad yalnız gösterim.
- **Takım kuralı için veri:** 112 koleksiyoncunun yalnız 14'ünde ≥ 3 kart var, 70'inde tek kart. 3'lü takım şartı çoğunluğu dışarıda bırakır. Seçenekler: (a) eksik yuvalar ödünç kartla dolar (yayıncının havuzu), (b) 1v1 tek kartla da oynanır, takım isteğe bağlı, (c) 3 karta ulaşana kadar bot maçları. `game-designer` önerir, sahip seçer.
- **Hazır tablolar:** sitenin `EFF` (18×18), `TYPE_TR`, tip renkleri ve 18 SVG tip glifi `src/paylasilan/kurallar/tipler.ts` ve HUD için doğrudan alınır; iki ürün aynı dili konuşur.
- **İki saldırının seçim kuralı bilinmiyor** ("en güçlü iki" değil); arenada kartın `attacks[2]`'si olduğu gibi kullanılır, 3. ve 4. yuva § 11'deki referans kuralla (seviye/açılış) tasarlanır.
