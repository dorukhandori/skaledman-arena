# PokeRivals incelemesi ve benzer projeler

İnceleme tarihi: 2026-11-01. Kaynak: [pokerivals.xyz](https://pokerivals.xyz/) (t.co bağlantısının hedefi), sitenin derlenmiş JS paketleri, [legal notice sayfası](https://pokerivals.xyz/legal-notice.html) ve GitHub aramaları. Kaynak kodu açık değil; aşağıdakiler yayınlanmış istemci paketinden okunan gerçeklerdir.

## 1. PokeRivals nedir

Tarayıcıda çalışan, **gerçek zamanlı** (sıra tabanlı değil) 2D Pokémon arena dövüş oyunu. Sloganı "REAL-TIME BATTLES". Klavye ile hareket, fare ile nişan; hamlelerin bekleme süresi (cooldown), menzili, mermi hızı, alan yarıçapı var. Brawl Stars / MOBA hissi, Pokémon kabuğu. Kâr amacı gütmeyen hayran projesi, reklam ve satın alma yok; Arjantinli tek bir geliştirici yapıyor (Cafecito ve Ko-fi bağış bağlantıları; iletişim e-postası legal notice sayfasında). Legal notice son güncelleme 19 Ekim 2026, yani proje çok taze.

### İçerik
- **151 Gen 1 Pokémon** + shiny varyantları (shiny "sonsuza dek parlar", hesaba kaydediliyor).
- **31 antrenör** (Brock, Misty, Lt. Surge, Erika, Koga, Sabrina, Blaine, Giovanni, Elite Four: Lorelei, Bruno, Agatha, Lance; rakipler Rojo/Azul/Violeta; sıradan sınıflar: camper, hiker, swimmer, rocket grunt…).
- **Hamle sistemi:** her hamlenin `familia` (proyectil, embestida, vuelo, excavar, terremoto, rayo, puño, cola, chorro…), `aviso` (kısa/uzun hazırlık animasyonu), `cooldown`, `ppArena`, `velocidad`, `alcance`, `radio`, durum ihtimalleri (quemar, congelar, paralizar) gibi kuralları var. Her Pokémon'a 4 hamle sabit atanmış (ör. Dragonite: outrage, extreme-speed, fly, earthquake).
- **Arenalar:** agua, cementerio (sisli), dojo, electrica, fuego (lava kenarlı) gibi sahneler; engeller `muro`, `cerco`, `lava`, `hoyo`, `charco`, `caja`, `baldosa` şekilleriyle (daire, kapsül, dikdörtgen) tanımlı. Sahne, yükseklik/derinlik (x, z) ile 2.5D.
- **Modlar:** hikâye (gym'ler, lig, şampiyon, madalyalar), günlük rakip ("changes every day"), dojo/banco (hamle deneme kuklası), kod ile oda kurma (`ABCD-EFGH` formatı), serbest oda ve rekabetçi oda, arkadaş listesi, bot rakipler. Takım: 3 Pokémon (oyuncu başına), 6'lık kadro.
- **İlerleme:** seviye, XP, hamle açılması seviyeye bağlı, evrim seviyeyle.
- İki dil: İspanyolca ve İngilizce (`poketournament.idioma` anahtarı, iç isim "poketournament").

## 2. Nasıl yapılmış (teknoloji yığını)

| Katman | Ne | Kanıt |
|---|---|---|
| Paketleyici | **Vite** (Rollup chunk'ları, `__vite__mapDeps`) | `assets/*-hash.js`, lazy `motor` chunk'ı |
| Dil | **TypeScript** | hata metinlerinde `src/juego/idioma/idioma.ts` yolu |
| Render | **PixiJS v8** (WebGPU/WebGL) | `CanvasPool`, `RenderTargetSystem`, `getTextureBatchBindGroup`, `GraphicsContext` chunk'ları; menüler ise düz DOM + CSS |
| Doğrulama | **Zod** | `_zod` iç yapısı; manifest ve antrenör JSON'ları şema ile doğrulanıyor |
| Ağ | **Ham WebSocket** istemci sınıfı, oda tabanlı lobby | `new WebSocket(e)`, `pedidoDeSala`, mesaj tipleri `entrar/crear/empezar/fase/fin/desconectado` |
| Oyun sunucusu | **Fly.io** üzerinde `pokemon-arena-servidor` | paket içindeki URL; kök yol 404, yani yalnız WS/API |
| Simülasyon | Sabit tick (`tick`, `hz` 100+ geçiş), istemci tarafı tahmin (`prediccion`), `seed` ile deterministik rastgelelik, `snapshot` | string sayımı |
| Hesap | **Supabase Auth** (Google ve Discord OAuth), koleksiyon/arkadaş/shiny hesapta | `signInWithOAuth`, Supabase proje URL'si |
| Barındırma | **Vercel** (fra1) | yanıt başlıkları |
| Varlık sürümleme | `versionPublica` modülü: her dosya adı → 8 haneli hash haritası, `?v=` ile cache kırma | `versionPublica-*.js` |
| Sprite'lar | **SpriteCollab** (PMDCollab, CC BY-NC 4.0) animasyonlu PMD sprite'ları, Python betiğiyle web'e dışa aktarılıyor | hata metni: `Correr tools/juego/exportar_sprites_web.py gen1`; 153 sprite klasörü |
| Antrenör sprite'ları | Pokémon Showdown'ın sunduğu resmi oyun sprite'ları | legal notice |
| Oyun verisi | **PokéAPI** (tipler, statlar, hamleler, etkinlik tablosu) → `manifest.json` | manifest ayrıştırıcı `efectividad`, `movimientos`, `dex` anahtarlarını bekliyor |
| Ses | 151 "grito" (çığlık) + **kendi yazdığı Game Boy APU benzeri sentezleyici** (44100 Hz, 4 duty döngüsü, zarf, sweep) | `motor-*.js` içeriği |
| Fontlar | Press Start 2P (PokeRivals Start adıyla değiştirilmiş), Oxanium, Atkinson Hyperlegible Next | `fonts/` |
| Hamle rehberi | `catalogo.json`, kaynağı `docs/HABILIDADES.md`; her hamle için "ne yapar / ne zaman kullanılır" metni | catalogo.json başlığı |

**Çıkarılan mimari:** tek kişilik bir ekip için makul bir "ince istemci + yetkili sunucu" düzeni. İstemci PixiJS ile çizer, DOM ile menü yapar; sunucu Fly.io'da WebSocket ile odaları yönetir ve sabit tick'te simülasyonu yürütür (muhtemelen aynı TypeScript kural tablosu `roles` paylaşılarak). Hesap ve kalıcı veri Supabase'de. Statik site Vercel'de. Hiçbir ticari motor yok; Phaser bile yok.

Dikkat çeken tasarım kararları:
- Tüm kod ve kimlikler İspanyolca; dosya adları `entrenadores`, `rutaDeArena`, `resumenDeFin`, `etapasDeHud`. Yorumlar bile korunmuş (`arranque.js`).
- Hamle kuralları veri odaklı: kod değil tablo. Yeni hamle = yeni satır.
- Hamle açıklama metinleri (İngilizce) sayısal: "A 190 jump and a 34-radius knee strike. If it hits nobody, you lose 1/4 of your HP." Oyuncuya kuralı saklamıyor.
- Yükleme ekranı dil seçimini ana paket inmeden yapıyor (`arranque.js` ayrı, küçük).

## 3. Benzer projeler (GitHub yıldızına göre sıralı)

Yıldızlar 2026-11-01 tarihli `gh search repos` ve `gh repo view` sonuçları.

### 3a. Doğrudan benzerler: Pokémon temalı, tarayıcı/çok oyunculu

| Yıldız | Depo | Dil | Ne | PokeRivals'a yakınlığı |
|---:|---|---|---|---|
| 6 010 | [smogon/pokemon-showdown](https://github.com/smogon/pokemon-showdown) | TS | Sıra tabanlı savaş simülatörü, sunucu | Sıra tabanlı; ama veri/sprite kaynağı ve ölçek referansı |
| 5 909 | [pagefaultgames/pokerogue](https://github.com/pagefaultgames/pokerogue) | TS | Tarayıcı roguelite Pokémon hayran oyunu (Phaser) | En yakın "açık kaynak büyük hayran oyunu" örneği; sunucu Go: [rogueserver](https://github.com/pagefaultgames/rogueserver) (270) |
| 1 834 | [keldaanCommunity/pokemonAutoChess](https://github.com/keldaanCommunity/pokemonAutoChess) | TS | Çok oyunculu Pokémon auto chess; **Colyseus + PMD SpriteCollab sprite'ları** | Aynı sprite kaynağı, aynı "non-profit fan" duruşu, gerçek zamanlı sunucu. Mimari olarak en öğretici |
| 766 | [maierfelix/PokeMMO](https://github.com/maierfelix/PokeMMO) | JS | Pokémon MMO motoru + gerçek zamanlı editör (2018'de durmuş) | Eski ama okunabilir |
| 719 | [smogon/pokemon-showdown-client](https://github.com/smogon/pokemon-showdown-client) | TS | Showdown istemcisi | UI referansı |
| 338 | [aaron5670/PokeMMO-Online-Realtime-Multiplayer-Game](https://github.com/aaron5670/PokeMMO-Online-Realtime-Multiplayer-Game) | JS | Phaser 3 + Colyseus gerçek zamanlı Pokémon MMO | Küçük, başlangıç şablonu olarak iyi |
| 302 | [po-devs/pokemon-online](https://github.com/po-devs/pokemon-online) | C++ | Masaüstü çevrimiçi savaş simülatörü | Sıra tabanlı |
| 59 | [varkor/pokengine](https://github.com/varkor/pokengine) | JS | Web için çevrimiçi savaş sistemi | Sıra tabanlı |
| 22 | [xjoje6/PokeBrawl](https://github.com/xjoje6/PokeBrawl) | GDScript | **Gerçek zamanlı 3D Pokémon dövüşü**, Godot, Cobblemon modelleri, AI veya 1v1 online | Fikir olarak en yakın (gerçek zamanlı aksiyon), 2026-10-27'de açılmış |
| 10 | [hecmocer-pro/pokemonBrawl](https://github.com/hecmocer-pro/pokemonBrawl) | HTML/JS | Takım kur, izle | Otomatik savaş |
| 0 | [Blynch17/poke-arena](https://github.com/Blynch17/poke-arena) | TS | "Arena 2D en tiempo real con Pokémon (Phaser + TypeScript)", 2026-10-21 | PokeRivals ile aynı fikir, aynı hafta, muhtemelen ondan ilham; tek kişilik deneme |
| 0 | [frankilito/pokemon-moba-arena](https://github.com/frankilito/pokemon-moba-arena) | JS | Three.js 3D Pokémon MOBA, WebRTC 2 oyuncu | Deneysel |

Not: "pokemon real-time" ve "pokemon multiplayer browser" gibi sorgular neredeyse boş döndü. **Gerçek zamanlı aksiyon + Pokémon + tarayıcı** kesişimi GitHub'da boş; PokeRivals bu boşluğa oynuyor.

### 3b. Mekanik benzerler: gerçek zamanlı top-down arena, tarayıcı, açık kaynak

| Yıldız | Depo | Ne | Neden bak |
|---:|---|---|---|
| 2 860 | [openfrontio/OpenFrontIO](https://github.com/openfrontio/OpenFrontIO) | Tarayıcı RTS (.io) | Büyük ölçekli TS oyun sunucusu |
| 1 314 | [kevinshen56714/SkyOffice](https://github.com/kevinshen56714/SkyOffice) | Phaser + Colyseus sanal ofis | Oda/lobby kalıbı |
| 589 | [damian-pastorini/reldens](https://github.com/damian-pastorini/reldens) | Açık kaynak MMORPG platformu (Colyseus) | Hesap + oda + kalıcılık bir arada |
| 513 | [HasangerGames/suroi](https://github.com/HasangerGames/suroi) | 2D battle royale, surviv.io benzeri, **PixiJS + ham WebSocket** | PokeRivals'ın yığınına en yakın gerçek zamanlı örnek |
| 454 | [vzhou842/example-.io-game](https://github.com/vzhou842/example-.io-game) | Örnek .io oyunu | Netcode'un en küçük, okunabilir hâli (tick, snapshot, interpolasyon) |
| 448 | [halftheopposite/TOSIOS](https://github.com/halftheopposite/TOSIOS) | Açık kaynak IO shooter, **Colyseus + PixiJS** | Yığın PokeRivals'a çok yakın |
| 160 / 72 | [codergautam/swordbattle.io-v1](https://github.com/codergautam/swordbattle.io-v1) / [swordbattle.io](https://github.com/codergautam/swordbattle.io) | Çok oyunculu kılıç dövüşü IO | Yakın dövüş menzil/vuruş hissi |

### 3c. Altyapı (PokeRivals'ın kullandığı veya kullanabileceği)

| Yıldız | Depo | Rol |
|---:|---|---|
| 48 610 | [pixijs/pixijs](https://github.com/pixijs/pixijs) | PokeRivals'ın render motoru (v8) |
| 40 622 | [phaserjs/phaser](https://github.com/phaserjs/phaser) | Alternatif; PokéRogue ve PokeMMO örnekleri bunu kullanıyor |
| 7 499 | [colyseus/colyseus](https://github.com/colyseus/colyseus) | Node.js çok oyunculu çerçeve; oda/durum senkronu hazır. PokeRivals kendi WS katmanını yazmış |
| 5 443 | [PokeAPI/pokeapi](https://github.com/PokeAPI/pokeapi) | PokeRivals'ın veri kaynağı |
| 1 787 | [PokeAPI/sprites](https://github.com/PokeAPI/sprites) | Statik sprite'lar |
| 323 | [PMDCollab/SpriteCollab](https://github.com/PMDCollab/SpriteCollab) | PokeRivals'ın animasyonlu sprite kaynağı (CC BY-NC 4.0; ticari kullanım yasak) |

### 3d. GitHub'da olmayan doğrudan rakipler (kapalı kaynak, tarayıcı, gerçek zamanlı)

- [Pokémon Arena 2D](https://poke2darena.com/): gerçek zamanlı 2D, 1000+ Pokémon, gym bossları, çevrimiçi 1v1.
- [Pokémon Apex Arena](https://pokemonapexarena.com/): gerçek zamanlı 6v6, ranked.
- [Poké Arena 2D (alpha)](https://www.pokearena2d.com/): gerçek zamanlı piksel savaşları, ranked.

Yani fikir yalnız değil; 2026 içinde en az dört benzer tarayıcı projesi ortaya çıkmış. PokeRivals'ı ayıran şey nişan alma ve hamle fiziği (mermi, alan, cooldown) ile hikâye/gym ilerlemesinin birleşimi.

## 4. Kendi projemiz için çıkarımlar

1. **Yığın kanıtlanmış:** Vite + TypeScript + PixiJS v8 istemci, Node/TS WebSocket sunucu (Fly.io), Supabase auth, Vercel statik. Tek kişi götürebiliyor.
2. **Netcode'u sıfırdan yazmak zorunlu değil:** Colyseus (7.5k yıldız) oda, durum senkronu ve yeniden bağlanmayı verir; TOSIOS ve pokemonAutoChess hazır örnek. PokeRivals ham WS seçmiş, bu daha çok iş.
3. **Veri odaklı hamle tablosu** en önemli tasarım kararı: hamle = kural satırı; istemci ve sunucu aynı tabloyu paylaşır.
4. **Hukuki sınır:** SpriteCollab CC BY-NC; Pokémon markası Nintendo'nun. Gelir modeli (reklam, satın alma) hukuken kapalı; PokeRivals'ın bağış dışında bir şey almamasının nedeni bu. Ticari bir şey hedefleniyorsa IP'nin kendi olması gerekir, teknik şablon aynen kalır.
5. **Boşluk:** GitHub'da açık kaynak "gerçek zamanlı Pokémon arena" yok; en yakın şey 0 yıldızlı iki haftalık denemeler. Açık kaynak yapılırsa ilgi görür.

## Ek: incelenen dosyalar

İndirilen paketler ve ham çıktılar oturumun geçici klasöründe: `/private/tmp/claude-501/-Users-dorukhanersoyleyen-Library-Application-Support-Claude-scratch-workspaces-98bbb0e0-6c8d-40db-9a48-8956c263715a-de17f93d-d42e-499f-bc60-56f2d17429ec-scratch-2026-11-01-b7faad/4d8a9038-ae72-4df6-9d13-4efc3a79b7ef/scratchpad/pokerivals/`. İstemci paketi ~530 KB (ana), + ~130 KB antrenör verisi, ~100 KB hamle kataloğu, ~57 KB hamle kuralları.

Devamı (2026-11-01, oynanış gözlemi ve veri dökümü): [pokerivals-oynanis-gozlemi.md](pokerivals-oynanis-gozlemi.md); paket içi netcode/simülasyon analizi: [pokerivals-paket-analizi.md](pokerivals-paket-analizi.md).
