# PokeRivals: oynanış gözlemi ve veri dökümü

Tarih: 2026-11-01. Sahip Chrome'da [pokerivals.xyz](https://pokerivals.xyz/) oynarken aynı sekme ekran görüntüleriyle izlendi; istemcinin yayınladığı 433 dosya (JS chunk'ları, `catalogo.json`, `sprites/manifest.json`, `entrenador/*.json`, `arena/capas.json`) indirilip okundu. Önceki inceleme: [pokerivals-inceleme.md](pokerivals-inceleme.md) (yığın ve benzer projeler). Paket içindeki netcode/simülasyon kuralları: [pokerivals-paket-analizi.md](pokerivals-paket-analizi.md). Ekran görüntüleri: [pokerivals-ekranlar/](pokerivals-ekranlar/).

Bu dosya gözlem ve veridir; hiçbir şeye tek başına karar vermez (bkz. `CLAUDE.md` § Layout).

## 1. Oyuncu akışı (yeni hesap, ilk 10 dakika)

1. **Giriş** ([01](pokerivals-ekranlar/01-giris-kullanici-adi.jpg)): Google/Discord ile Supabase oturumu açıldıktan sonra "Choose your username" (3-16 karakter, harf/rakam/tire/alt çizgi; "Your rivals and friends can see it"). Alt bilgi: `v0.0.0`, "Non-profit fan project · Sprites: SpriteCollab (CC BY-NC 4.0)", sağ altta "KEYBOARD & MOUSE" (giriş cihazı göstergesi). Dil bayrakları (Arjantin / ABD) sağ üstte.
2. **Pratik maçı** (`#prueba`): hesap açılır açılmaz hazır kadroyla (Dragonite / Mewtwo / Charizard vs. Moltres) 4 adımlı öğretici. Gördüğümüz adım "3/4 · THE WHEEL": "The mouse wheel also switches moves. Spin it to pick another." Diğer HUD metinleri: "RELEASE HERE TO CANCEL" (hedefli hamleyi iptal etme bölgesi), "DODGE / JUMP", "ROTATE YOUR PHONE — Play in landscape. The match is paused." (mobil), "Make the window bigger: the game is 960×540.", "Skip the practice match and choose your starters" düğmesi.
3. **Starter seçimi** ([02](pokerivals-ekranlar/02-starter-secimi.jpg)): "PICK YOUR FIRST 3 — Different types. They start at level 5 and level up with candies; the rest you get by playing." 12 aday: Bulbasaur, Charmander, Squirtle, Pikachu, Pidgey, Nidoran♀, Machop, Abra, Geodude, Gastly, Sandshrew, Eevee. Sağ panel: dex numarası, animasyonlu sprite, tipler, **arketip rozeti** ("CONTROL") ve tek cümle rol açıklaması ("Slows, puts to sleep and punishes from afar"), evrim çizgisi ("LV 25", "TRADE"), "STARTS WITH · LV 5" iki hamle (Lick, Smog) ve "OPENS AT LV 10 / LV 16" boş yuvalar. Yani **başlangıçta 2 hamle, seviye 10 ve 16'da 3. ve 4. hamle**.
4. **Rota savaşı** (hikâye): rastgele sınıf antrenörü (Mankey'li Super Nerd, Pikachu/Rhyhorn/Nidoran♀/Omanyte'li Lass) Lv4 takımla. Sahne "ARENA · STADIUM".
5. **Sonuç ekranı** ([06](pokerivals-ekranlar/06-rota-zaferi-odul.jpg)): "ROUTE BATTLE — YOU BEAT LASS!", "Win or lose, routes pay: gold buys candies at the MARKET and tickets pull at the SAFARI." Ödül **+40 gold, +2 ticket**. İlerleme çubuğu: "YOUR TEAM 5 ── READY 12 ── 14 BROCK" (ilk salon için takım seviyesi 14, 12'den itibaren "hazır" sayılıyor). Düğmeler "ANOTHER ROUTE (Enter)", "HOME (Esc)", Ko-fi bağlantısı. Altta "YOUR TEAM / STARTERS / EDIT (E)": her Pokémon kartında LV, **ITEM** ve **BERRY** yuvaları, 4 hamle yuvası (2 dolu, 2 "—").

Çıkarım: hikâye modu bir **grind döngüsü**: rota → gold/ticket → market (candy = seviye) ve safari (ticket = yeni Pokémon çekilişi) → salon. Ana ekrandaki yardım balonuna göre kazanınca 40 gold + 2 bilet, **kaybedince 15 gold + 1 bilet**; yani kaybetmek de öder, yeni oyuncu düşmeden öğreniyor.

### 1b. Ana ekran ([07](pokerivals-ekranlar/07-ana-ekran.jpg))

Üst şerit: rozet sayacı `0/8`, gold `80`, ticket `4`, kullanıcı adı + sağlayıcı (`· google`), `SETTINGS`, Ko-fi. Sol büyük panel: "NEXT · GYM 1 OF 8 · ROCK — BROCK", `VIEW GYM (G)`, oyuncu vs. Brock sprite'ları, `FIGHT · BROCK (Enter)` ve `ROUTE BATTLE (R)`. Rota satırı: "ROUTE +40 gold +2 ticket EARNING · PLAYED 2 · PLAY ~4 MORE · TODAY 2/60 REWARDED" (**günde 60 ödüllü rota tavanı**, salon için ~4 rota daha öneriliyor). "YOU HAVE GOLD FOR 8 CANDIES · MARKET" (80 gold / 8 = **10 gold per candy**).

Sağ sütun:
- **FIRST STEPS 2/6** görev listesi: choose your starters ✓, play a route battle ✓, buy candies at the market, level up a Pokémon with ▲, roll at the safari, beat Brock.
- `ONLINE BATTLE (A)`, `TRAINING — COMING SOON`, `POKÉDEX 3 of 151`, `SAFARI 4 rolls`, `MARKET 80`, `MISSIONS 2 to claim`, `ACHIEVEMENTS 0 of 10`, `FRIENDS 0 online`.
- Alt: `YOUR TEAM / STARTERS / EDIT (E)`, `HOW TO PLAY (H)`, `v0.0.0`.

Rota yardım balonu (DOM'dan): "A random rival. Winning pays 40 gold and 2 tickets; losing, 15 and 1. The first 60 battles of each day pay (the day changes at 21:00 Argentina time); gym milestones always pay. Spend the gold on candies in the MARKET." Ayrıca üst şeritte ses/müzik kaydırıcıları, `M` ile tümünü sustur, Español/English düğmeleri; takım kartlarındaki ITEM/BERRY yuvaları "No item: equip" düğmeleri (eşya sistemi var, içerik görülmedi).

Yani meta katman: Pokédex koleksiyonu (safari çekilişleriyle büyür), görevler, başarımlar, arkadaşlar; her şeyin klavye kısayolu var (Enter/R/G/A/E/H), fare şart değil.

### 1c. Safari ([08](pokerivals-ekranlar/08-safari.jpg))

`#safari`, "SAFARI ZONE · ZONES UNLOCKED". Bilet gacha'sı: `THROW 1 · 1 TICKET` / `THROW 10 · 10 TICKETS`. Sağda **"TODAY'S POOL · MISSING 10 OF 12"**: günlük 12 Pokémon'luk havuz, siluetlerle gösterilir, çekilen açılır. Alt not "LV 7 · INTERMEDIATES AT 2 BADGES": çekilenler Lv7 gelir, 2 rozetten sonra ara evrimler havuza girer (havuz katmanı rozete bağlı). **"ALL DUPLICATES: +20 GOLD"**, yeni tür "NEW! · 1 NEW POKÉMON IN YOUR COLLECTION!". Gözlenen: 4 bilet → Pikachu (kopya, +20 gold), Caterpie (yeni). Çekiliş animasyonu: Safari topu, ışık huzmeleri, kart açılışı.

Ekonomi özeti: rota zaferi = 40 gold + 2 bilet, yenilgi = 15 + 1; candy 10 gold; kopya 20 gold. Günde en çok 60 ödüllü rota → en fazla 2400 gold + 120 bilet.

## 2. Maç içi HUD ve kontroller (gözlenen)

Ekran: [03](pokerivals-ekranlar/03-mac-hud-pikachu-mankey.jpg), [04](pokerivals-ekranlar/04-mac-nisan-oku.jpg), [05](pokerivals-ekranlar/05-ko-sonrasi-secim.jpg).

| Öğe | Nerede | Ne gösteriyor |
|---|---|---|
| Kendi paneli | sol üst, mavi | portre, ad, `LV 5`, **parçalı HP çubuğu + sayı** (`17/20`), tip çipleri, durum çipi (`PAR`) |
| Rakip paneli | sağ üst, pembe | ad, `LV 4`, **HP yüzde olarak** (`89%`), tip çipleri, durum çipi (`⚡PAR`) |
| Takım şeridi | her panelin altında | 3 portre, bayılan karartılı |
| Üst orta | | `EXIT`, `FULLSCREEN`, sahne adı `ARENA · STADIUM` |
| Hamle yuvaları | sol alt | `1` / `2` tuş rozeti, hamle adı, tip; aktif yuva büyük ve açık; **bekleme süresi kırmızı rozetle saniye** (`2.4 s`); yuva kenarında mini PP çentikleri |
| Dodge | alt orta | `SHIFT · DODGE · READY` |
| Takım değiştirme | sağ alt | `SWITCH TO Gastly`, `Q`/`E` ok tuşları, `TAB · READY` |
| KO sonrası | sol üst köşe | `PICK ANOTHER · AUTO IN 3.6 S` ve 1/2/3 numaralı küçük kartlar |
| Oyun içi | sprite üstü | küçük HP çubuğu + seviye rakamı; uçan metinler `resisted!`, `immune`, hasar sayıları |
| Nişan | | fareden Pokémon'a **kesikli ok**, uçta hedef halkası; hedefli hamlelerde zeminde daire |

Kontrol özeti: WASD hareket, fare nişan, **sol tık = seçili hamle**, 1/2/3/4 veya **fare tekerleği hamle seçer**, SHIFT dodge, (öğreticide) JUMP, Q/E/TAB takım değiştirme, Enter/Esc menü. Pratik maçında "RELEASE HERE TO CANCEL" var: hedefli hamle basılı tutulup HUD'un üstünde bırakılırsa iptal.

Sahne: 960×540 sanal çözünürlük, pencereye ölçekleniyor. Stadyum: tribün (Gemini ile üretilmiş katman görselleri, `arena/capas.json`: `luces`, `gradas-altas`, `gradas-bajas`, `muro`, `primer-plano`, `piso-arena`), perspektifli kum zemin, ortada Pokéball çizimi, sağda platformda **rakip antrenör sprite'ı** (Showdown'dan Gen3 sınıf sprite'ı; `entrenador/*.json` 31 antrenörün pozlarını tanımlar, çoğunda `faltan: tira/levanta/festeja/lamenta`, yani yalnız `quieto` pozu var; Rojo/Azul/Violeta/Giovanni 11 kareli tam set).

## 3. Sayılar (ekrandan doğrulanan)

- **HP formülü oyunlardaki gibi** (IV 31, EV 0): Pikachu Lv5 (base 35) → 20 HP; Gastly Lv5 (base 30) → 19 HP. `floor((2·base+31)·L/100)+L+10`.
- Rakip rota antrenörleri Lv4, oyuncu Lv5. Thunder Shock bekleme ≈2.4-2.6 s, Quick Attack ≈0.1-0.3 s, Lick ≈0.7-1.4 s (rozetlerden okunan kalan süreler).
- Pratikteki Dragonite Lv? 166 HP, Fly bekleme "3.2 s".
- KO sonrası otomatik değiştirme 3.6 s sayaçla.

## 4. Veri dökümü: `sprites/manifest.json`

Anahtarlar: `fuente` ("PMD SpriteCollab (CC BY-NC 4.0)"), **`ticksPorSegundo: 60`**, `efectividad` (18×18 tip tablosu, standart Gen6+ değerleri), `movimientos` (192), `pokemon` (151).

Hamle kaydı (PokéAPI'den): `nombreEs`, `tipo`, `clase` (fisico 85 / especial 66 / estado 41), `poder`, `precision`, `pp`. **Arena kuralları burada değil**, kod chunk'larında (her hamlenin kendi dosyası: `assets/earthquake-*.js`, `assets/thunderbolt-*.js` …).

Pokémon kaydı: `dex`, `nombre`, `tipos`, `stats` (ps/ataque/defensa/ataqueEspecial/defensaEspecial/velocidad), **`arquetipo`**, `alturaM` (0.2-8.8 m; sprite ölçeği için), `movimientosArena` (ort. 25, en çok 90: üst seviye havuz), `movimientosBasicos` (en çok 40: hikâye/düşük seviye havuzu, "Solo en la historia" hamleleri).

Arketip dağılımı (151): **melee 55, controlador 27, bruiser 27, speedster 17, rango 16, tanque 9.** Örnek: Pikachu rango, Mewtwo rango, Dragonite bruiser, Mankey melee, Gastly controlador, Snorlax tanque.

## 5. Veri dökümü: `catalogo.json` (hamle rehberi, 192 hamle, 10 kategori)

Kaynak `docs/HABILIDADES.md`; her hamlede `que` (ne yapar) ve `cuando` (ne zaman kullanılır). Mesafeler oyun birimi (arena ~960 genişlik). "Solo en la historia" = yalnız hikâye havuzunda (düşük seviye hamleler).

| # | Kategori | Adet | Tanım ve örnek kurallar |
|---|---|---:|---|
| 1 | `cerca` yakın dövüş | 42 | kısa zancada (40-80 birim), düşük bekleme; punch'lar menzil 58, %10 durum; `mach-punch` 0,08 s aviso; `sucker-punch` rakip saldırıyorsa ×1,5 değilse ×0,6; `power-whip` 153° yelpaze radius 98; `dragon-tail` 180 birim fırlatma, Protect'i deler |
| 2 | `embestidas` gap closer | 22 | kesilebilir aviso, sonra durdurulamaz, isabet verince impuls; `double-edge` 210 birim + 1/3 geri tepme; `extreme-speed` 200 birim 0,1 s; `high-jump-kick` 190 + radius 34, ıskalarsa 1/4 HP; `aerial-ace` konideki rakibi kilitler, dodge kurtarmaz zıplama kurtarır; `outrage` 180 + 3 vuruş, sonra 1 s confuse |
| 3 | `movilidad` giriş/çıkış | 10 | `u-turn`/`flip-turn` vur ve 100 geri; `dig`/`dive` yer altı (yalnız Earthquake vurur) radius ~33; `fly` havada (yer hamleleri değmez) radius 42; `teleport` 0,12 s, 320 birime kadar; `agility` Speed +2 (×1,41) 8 s |
| 4 | `rayos` ışın/jet | 16 | yerinde şarj (aviso) sonra anında çizgi; şarjda kaçılır sonra kaçılmaz; `flamethrower` 190, 0,75 s boyunca fareyle yönlendirilir; `ice-beam` 250, aviso 0,45 s; `solar-beam` 1 s şarj + 280 ışın 0,7 s; `hyper-beam` sonrası 1,5 s kilit |
| 5 | `proyectiles` mermi | 39 | hız birimi/s: `shadow-ball` 760 hız, 300 menzil, 2,5 s bekleme ("era 1,6; a calibrar, 2026-10-21"); `ice-shard` 900 (en hızlı); `focus-blast` 520 (en yavaş) radius 55; `aura-sphere` hafif güdümlü (yürüyerek kaçılmaz, dodge ile kaçılır); `gust` 0,84 s havaya kaldırır; `rock-throw` yay, 190 menzil radius 24 |
| 6 | `apuntadas` hedefli alan | 8 | zeminde uyarı dairesi, gecikmeli vuruş: `thunderbolt` 230 menzil, radius 64, 0,4 s; `thunder` radius 85, 0,86 s; `rock-slide` radius 84, 0,55 s, uçanı vurur; `earth-power` zıplayan/uçana değmez; `psychic` radius 30'da yakalar, 1 s kaldırır, fırlatır |
| 7 | `alrededor` çevre/yelpaze | 11 | `earthquake` radius 110, yer altına ×2, uçana 0; `dazzling-gleam` 144° r96; `bug-buzz` 90° r118; `icy-wind` 69° r125 ×0,6 yavaşlatma 2 s; `blizzard` arenayı boydan boya geçen sütun, 10 s bekleme |
| 8 | `controles` hasarsız | 25 | `thunder-wave` yerden dalga paralize (Electric/Ground bağışık); `toxic` artan zehir (~%44 / 6 s); `sleep-powder` 2,5 s uyku (ilk vuruşta uyanır); `roar`/`whirlwind` 108° koni 160 birim itme; `haze` tüm stat değişimlerini siler; `disable` son hamleyi 12 s kilitler |
| 9 | `defensa` | 10 | `protect` 0,5 s, blokta 1 s bekleme iadesi, tutuşlar deler; `counter` 0,6 s duruş, ilk fiziksel vuruşu ×2 koniyle iade; `substitute` %10 HP → 8 s kukla + 2 s görünmezlik; `reflect`/`light-screen` zeminde sabit kubbe 8 s yarı hasar; `roost`/`recover` %40 iyileşme 0,9 s hareketsiz; `stealth-rock` radius 110, 8 s |
| 10 | `subidas` güçlendirme | 8 | yerinde dans, vurulursa iptal; 8 s; +2 = ×1,41, tavan +6 = ×2; `focus-energy` sonraki vuruş kritik ×1,5 (12 s içinde) |

Kritik: 1/8 ihtimal, ×1,5. Aturdir (sersemletme) 0,3-0,75 s; amedrentar (ürkütme) daha uzun sersemletme. Yavaşlatmalar ×0,5-×0,8, 1,5-3 s. Hamle "cargas" (şarj) sistemi: bazı temel hamleler 2-3 şarjlı (`tackle` 2 şarj, sonra 3,5 s'de bir; `water-gun` 3 şarj, 6 s).

## 6. Hesap, gizlilik, sunucu (privacy sayfasından, 18 Ekim 2026)

- Hesapsız oynanabilir: bota karşı ve kodlu odalarda; takma ad oda ömrünce yaşar.
- Hesap (Google/Discord, Supabase): yalnız iç kimlik, kullanıcı adı, rastgele **arkadaş kodu**, seçilen antrenör, kayıt/giriş tarihleri, arkadaşlıklar (istek/kabul/engel). Arkadaş panelinden "Delete account" anında siler.
- **Anonim telemetri**: maç bitince `POST https://pokemon-arena-servidor.fly.dev/telemetria` (gözlendi, 204): süre, format, sonuç, yaklaşık gecikme, FPS; 60 gün saklanır; **Do Not Track açıksa gönderilmez**.
- localStorage: Supabase oturumu (`sb-…-auth-token`), `arena.equipos.ultimaCuenta` (takım/hesap), `poketournament.proveedor` (OAuth sağlayıcı), `poketournament.idioma`.
- Sunucular: Vercel (sayfa), **Fly.io São Paulo** (maç sunucusu), Supabase aynı bölge. CSP sıkı: `connect-src` yalnız kendi origin + fly.dev (https/wss) + supabase; `script-src 'self'`.
- Legal notice (19 Ekim 2026): tür bazında sprite sanatçı kredisi listesi (SpriteCollab'ın yayınladığı gibi), salon antrenör sprite'ları Showdown'dan, stadyum arka planları ve oyuncu/rakip siluetleri projeye özel, hamle efektleri kodla çizilmiş. İletişim e-postası sayfada; Cafecito/Ko-fi bağış.

## 6b. Görsel dil (CSS `:root` token'ları, `assets/index-*.css`)

- Renkler: zemin `#07080c`, panel `#11131b` (%90 opak), çizgi `#2b3040`, açık `#f2f4f8`, gri `#8a93a6`; vurgu **cyan `#19e6ff`** (kendi taraf, başarı, "oro" bile cyan), **magenta `#ff2d95`** (rakip, hata), HP orta `#ffd23f` sarı, HP düşük `#ff3b30`. Her tipin Showdown paletinden rengi (`--t-fire #f08030`, `--t-water #6890f0` …); bileşenler `--acento`'yu `color-mix(in srgb, var(--tipo) 55%, var(--fondo))` ile tipten türetiyor (kart/yuva arka planı tip rengine boyanıyor).
- Fontlar: `--px` "PokeRivals Start" (Press Start 2P, başlık/logo, 16/24/32 px), `--dato` Oxanium (HUD sayı ve etiketlerin %95'i), `--sans` Atkinson Hyperlegible (gövde). Tip ölçeği: etiket 8, veri 8, gövde 11, alt başlık 14, başlık 20, display 36 px. Grid 8 px, minimum dokunma 16 px.
- Gölge: `drop-shadow(4px 4px 0 #000)` sert piksel gölge; eğik kesilmiş (clip-path) panel ve düğme köşeleri; tek `@media (prefers-reduced-motion)` kuralı, responsive breakpoint yok (960×540 ölçekleme).

## 7. Skaledman Arena için notlar (karar değil, gözlem)

- **Onboarding sırası iyi çalışıyor:** hesap → pratik maçı (güçlü hazır kadroyla, 6 adım: hareket → saldırı → tekerlek → sakinleş → değiştir → hazır; "skip" var) → starter seçimi → ilk kolay rota. Bizde kart albümü zaten var; pratik maçı + "kartını seç" akışı birebir uyarlanabilir.
- **Kayıp da öder (15/1 vs 40/2)**, günlük tavan, salon kilometre taşları her zaman öder: yayın izleyicisi için doğru ton. Kick'te chat ile tetiklenen maçlarda da kaybeden boş çıkmamalı.
- **HUD'da HP kendi tarafında sayı, rakipte yüzde**: protokolde de böyle (snapshot'ta rakip HP yalnız 0..1 oranı). İzleyici görünümünde (OBS) iki taraf da yüzde olabilir.
- **Bekleme süresi saniye rozetiyle**: cooldown ring yerine sayı; 960×540'ta okunaklı. PP kapalı (`pp:false`), yalnız cooldown + şarj.
- **Arketip rozeti + tek cümle rol açıklaması** seçim ekranında: kart→dövüşçü eşlemesinde biz de kartın "tipi + 2 saldırısı"ndan bir rol cümlesi üretmeliyiz (`docs/design/oyun-konsepti.md` § 3'e aday).
- **Hamle kuralları sayısal ve oyuncuya açık** (`catalogo.json`), ama kodda aile = ayrı chunk (~95 aile, her hamle kendi dosyası). Bizim "veri odaklı aile tablosu" kararı PokeRivals'tan daha az iş vaat ediyor; 10 katalog kategorisi bizim aile listesiyle örtüşüyor (yakın / gap-closer / mobilite / ışın / mermi / hedefli alan / çevre / kontrol / savunma / buff).
- **Sayısal başlangıç değerleri** (`docs/design/tuning.md` için): saha 760×480, gövde yarıçapı 14, hız 150·(0,7+0,6·Spe/130) ≈ 105-240 birim/s, dash 60 birim / 0,15 s / 10 s bekleme / 0,12 s i-frame, zıplama 0,5 s, telegraf 0,08 / 0,2 / 0,45 s, mermi 300-1000 birim/s, menzil 58-320, radius 18-130, buff 8 s.
- **Hasar formülü ana seri ama budanmış**: Lv50 varsayılan, IV31/EV0, STAB 1,5, **süper etkili 1,5× (2× değil)**, az etkili 2/3, varyans ve genel kritik yok (kritik yalnız belirli hamlelerde 1/8), stat kademeleri ana seri çarpanının karekökü. Gerçek zamanlı oyunda 4× yerine 2,25× tavanı okunaklılık için akıllıca; bizim `economy-designer` için referans.
- **Netcode**: 60 Hz tick, her tick 1 girdi mesajı (JSON + zod), yalnız kendi pozisyonu tahmin ediliyor, uzak oyuncu 2-4 tick uyarlamalı gecikmeyle enterpolasyon, vuruş kararı tamamen sunucuda (istemci HP'yi olaylardan öne alır). Bizim 30 Hz + Colyseus `Predict` kararı daha ucuz; 0,08 s telegrafların 30 Hz'de 2-3 tick'e sığıp sığmadığı F0'da ölçülmeli (K-numarası adayı).
- **Bot profilleri** üç satır parametre (tepki süresi, nişan hatası, esquiva ihtimali, kadans, hareket tarzı; hikâye eğitmenleri 1..6 beceri harmanı): bizim bot turnuvası ve "kopan oyuncunun yerine bot" (`aviso:"bot"`) için hazır şablon.
- **Telemetri**: maç sonunda tek beacon (≤8 KB) ile ping medyan/p95, jitter, kayıp snapshot, düzeltme sayıları, kare histogramı; DNT/GPC'ye uyuyor. "Test under bad networks" kuralımız için aynı ölçümleri ilk günden toplamalıyız.
- **Antrenör sprite'ının sahnede durması** (rakip köşede platformda): Kick yayıncısı/izleyici avatarı için aynı yer kullanılabilir.
- **Maç sonu**: tek maç, round yok, `ko|abandono|tiempo`; 2v2 koltuk var; XP/Elo yok. Bizim modlar listesinde Elo var; PokeRivals henüz matchmaking kuyruğu bile yazmamış (odalar kodla).
