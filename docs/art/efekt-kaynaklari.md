# Efekt ve ses kaynakları araştırması (Devran)

**Tarih:** 2026-11-04 · **Dal:** `devran-kod` · **Şapka:** `@iris` (sanat yönetimi / efekt araştırması) · **Durum:** 2. tur (§ 8): doğrulama denendi, 12 CC0 ses adayı ve pixelfx pişirme reçetesi depoda; PNG pişirilmedi, `src/` değişmedi.

Bağlam: `docs/design/beyblade/05-carpisma-hissi.md` § 3.2 (olay reçeteleri), `docs/art/topac-pixel-plani.md` § 1.3, § 2.3, § 5, § 7.3-7.5, `docs/production/boslukler/nile-kapsam.md` B-35, `veri/manifest-ses.json` (16 sentez WAV, 199,9 KB, CC0), `docs/production/raporlar/D3.md` § 8.

Sahibin isteği: "00gamedevs.com gibi sitelerden efektleri alabilirsin; böyle efekt araştırmaları yap."

---

## 0. Özet

1. **00gamedevs.com** bir **Three.js (3B, shader) VFX kütüphanesi**; pixel sprite sheet sitesi değil. 64 efekt, dışa aktarılan kod **MIT**. Doğrudan PixiJS 2B pixel sahnemize girmez; ama aynı 64 efektin **pixel art yeniden yorumu** olan `888wing/pixel-vfx-codex` (MIT) sprite sheet dışa aktarıyor. 00gamedevs'in kendisi bu oturumdan **açılamadı** (ağ politikası engeli, § 6.1); bilgi arama özetlerinden ve codex'in lisans dosyasından.
2. En güçlü bulgu **`patch-gg/pixelfx`** (MIT, 244 kodla çizilen pixel efekti, tohumlu, palet değiştirilebilir, CLI ile şeffaf PNG sheet + Aseprite JSON). Çarpışma kıvılcımı, kritik vuruş, zemin şoku, buz kırılması, şimşek, toz, kasırga, başarım parıltısı gibi ihtiyacımızın çoğunu karşılıyor. Öneri: **çalışma zamanında değil, derleme aracında** (`araclar/`) sheet'e pişirip `public/efekt/efekt.png` atlasına koymak.
3. Hafif efektler (parçacık, şok çemberi, iz, flaş) **kodla kalmalı** (pixel planı § 5 zaten öyle diyor); dış kaynak yalnız **bitiş anları, element patlamaları ve Ulti** için değer katar.
4. Ses: mevcut 16 sentez ses kalır (CC0, 200 KB). En çok kazanç **5-6 sesi gerçek kayıtla değiştirmekten** gelir: metal çınlama (Kenney Impact Sounds, CC0), bozuk para yatışı (BigSoundBank, CC0), cam/buz kırılma (OGA, CC0), UI tık (Kenney Interface Sounds, CC0). Müzik için 2 CC0 döngü adayı OGA'da var.
5. **Kullanma:** lisansı çelişkili ya da "yeniden dağıtma yasak" olan itch.io paketleri (§ 7); Pixabay (AI eğitimi/yeniden dağıtım kısıtları ve CC0 değil); jsfxr çıktısı (çıktı lisansı yazılı değil; yerine ChipTone/jfxr ya da kendi sentezimiz).

---

## 1. Kaynak tablosu: görsel efekt

Lisans sütunu: **CC0** = atıf gerekmez · **MIT** = kod/varlıkla birlikte telif + izin metni korunur (krediler sayfasına eklenir) · **CC-BY** = atıf şartı · **dikkat** = sınırlı/çelişkili · **kullanma**.
"Doğrulama" sütunu: **K** = lisans dosyasını/README'yi bu oturumda okudum (raw.githubusercontent.com); **A** = yalnız arama özeti, sayfa açılamadı (indirmeden önce sayfa okunmalı).

| # | Kaynak | URL | Ne sunuyor | Biçim | Lisans | Doğrulama | Kalite / Devran uyumu |
|---|---|---|---|---|---|---|---|
| G1 | **00GameDevs VFX Library** | https://00gamedevs.com/en/ | 64 Three.js efekti (mermi, ışın, alan, patlama, girdap, duman, kalkan, ekran), tarayıcıda önizleme, kod kopyalama; ayrıca 46 "game object" ve shader örnekleri; efekt başına hafif/standart/ağır performans kademesi | JS/GLSL kodu (3B), sprite sheet **yok** | Sitede (arama özetinden, aynen): "Exported assets are free to use commercially and modify." · "Original exported code is MIT licensed." · "Website branding, avatars and promotional artwork are excluded." · "Third-party code keeps its own notices." Codex'in LICENSE dosyası telifi "Copyright (c) 2026 00GameDevs (@00vchannel)" olarak aktarıyor | **K** (2026-11-04, sayfa + "Asset usage & license" penceresi; § 9.2) | Kalite yüksek ama 3B, yumuşak ışık, bloom: pixel dilimize **doğrudan uymaz**. Değeri: tasarım ve zamanlama referansı + codex üzerinden pixel sürümü. Ücretli/ücretsiz ayrımı: aramada ücretli içerik görülmedi; sitede doğrulanamadı |
| G2 | **pixel-vfx-codex** (888wing) | https://github.com/888wing/pixel-vfx-codex · demo https://888wing.github.io/pixel-vfx-codex/ | 00GameDevs'in 64 efektinin pixel art yorumu; 3 kamera (3B 240×150, **2.5D izometrik 240×150 20 fps**, 2B 160×100 12 fps); efekt başına ayar düğmeleri, hitstop/sarsıntı/flaş zamanlama katmanı; **PNG sprite sheet dışa aktarma** (arka plan/dekor olmadan seçeneği); motor için hazır prompt | Statik site, bağımlılık yok; `node tools/snap.mjs` başsız PNG | **MIT** (LICENSE okundu; 00GameDevs ve pixel-plays MIT bildirimleri dahil) | K | Bayer dither + renk rampası: dilimize yakın. Dikkat: dither'lı 2.5D görünüm bizim düz renkli, 1 px çizgili topaç diliyle çatışabilir; **2B kamera (düz bantlar, 1 px çizgi, dither yok)** daha uyumlu. Sheet'ler bir "diorama" sahnesi için kadrajlı: kare boyutu kamera çözünürlüğü (160×100 / 240×150) |
| G3 | **pixelfx** (patch-gg) | https://github.com/patch-gg/pixelfx · galeri https://patch-gg.github.io/pixelfx/ · katalog `docs/CATALOG.md` | 244 efekt, 21 kategori (impacts, explosions, ice, lightning, fire, water, nature, ui, pickups, spawn & death, status, weather…); her biri küçük JS dosyası; `palette` (koyu→açık hex rampası) ile yeniden boyama; tohumlu, kare-bağımsız `draw(p,t)`; `node tools/render.mjs <id> --sheet` → şeffaf PNG + Aseprite tarzı JSON (kare dikdörtgenleri, süreler, fps, pivot) | JS kodu + CLI sheet | **MIT** ("MIT, code and effects. Use them in anything, commercial included."); telif: Patch + Hugo Duprez; `act.js` Hollow Crown (MIT); `gallery/fonts` Patch Pixel fontu **MIT dışı, kullanma** | K | **En güçlü aday.** Kendi sürüm 0.3.0 (genç proje, API değişebilir). Kareler efekt başına sabit tuval (ör. hit-spark 136×80, crit-hit 216×136): tuval geniş, efektin dolu kısmı küçük; bizim 64 px topaç ölçeğinde **kırpma + gerekirse küçük palet ayarı** gerekir (§ 5.2) |
| G4 | Sprite Fusion pixel-art VFX (Hugo Duprez) | https://www.spritefusion.com/pixel-art-vfx | pixelfx'in temel aldığı açık kaynak efektler | kod | MIT (pixelfx NOTICE.md'de: "Copyright (c) 2026 Hugo Duprez, MIT License") | **K** (sayfa: "open source under the MIT license") | pixelfx onları zaten içeriyor; ayrıca almaya gerek yok |
| G5 | **Kenney Particle Pack** | https://kenney.nl/assets/particle-pack · OGA https://opengameart.org/node/85611 | 80 parçacık / ışık çerezi sprite'ı (kıvılcım, duman, ateş, büyü, elektrik) | ayrı PNG + tilesheet | **CC0** | **K** (OGA, yükleyen Kenney: "License(s): CC0"; kenney.nl otomatik istemciyi reddediyor) | Yüksek çözünürlüklü yumuşak dokular, **pixel değil**: yalnız linear karışımlı parlama/iz katmanı için (pixel planı § 1.3 "bulanık katmanlar linear" izni). İkincil |
| G6 | Kenney Smoke Particles | (OGA "smoke particle assets") | 77 duman, 5 stil | PNG | CC0 | A (OGA sayfası bu turda aranmadı) | Aynı not: pixel değil; Parçalanma toz bulutu için ancak küçültülüp eşiklenirse |
| G7 | **Foozle "Pixel Magic Effects"** | https://foozlecc.itch.io/pixel-magic-sprite-effects | 2 ateş, 2 su, 2 toprak, 2 rüzgâr büyüsü + portal + patlama | PNG sheet | **CC0** (arama özetinde: "free to use and modify for all projects, including commercial") | **K** (CC0 1.0; 32×32, 10 büyü + ikon; § 9.2) | Kor/Girdap/Kaya/Kasırga elementlerine 4/6 kapsama; buz ve şimşek yok. Animasyon kareleri **64×64** (sayfadaki 32×32 ikonlar); indirildi, § 9.5 |
| G8 | **Aim Studios "Explosions - Pixel Art"** | https://aim-studios.itch.io/explosions-pixel-art | 5 tür patlama, 9 sheet, 32×32 kareler (default, blue…) | PNG sheet | **CC0** (sayfa özetinde "LICENSE: CC0 License") | **K** (CC0; 9 sheet, 32×32 + 64×64; § 9.2) | 32 px: topacın yarısı; hafif/ağır çarpışma patlaması ve Parçalanma için ideal ölçek |
| G9 | Reactorcore "Explosion Spriteanim Sheet Minipack" | https://reactorcore.itch.io/explosion-spriteanim-sheet-minipack | 10 sheet, 16 kare (4×4), çoğu 32×32 | PNG | **dikkat**: CC0 yalnız bir yorumcunun iddiası, sayfada yazmıyor | **dikkat** (sayfada/meta veride lisans yok; yalnız yazarın yorumu "CC0") | Lisans sayfada görülene dek **kullanma** |
| G10 | OGA "Radial lightning effect" (13rice) | https://opengameart.org/content/radial-lightning-effect | ışınsal kıvılcım sheet'i + pikselleştirilmiş tilesheet | PNG | CC0, ama sayfa 13rice'a atıf **rica ediyor** | **K** (CC0; "Attribution appreciated to 13rice") | Şimşek çarpışması / karşıt element kıvılcımı. CC0 olsa da kredilere yazılır |
| G11 | OGA "M484 lightning weapon" | https://opengameart.org/content/m484-lightning-weapon | 40 şimşek parçası, 30×30, parça başına 2 kare | PNG | CC0 ("public domain, attribution not needed") | **K** (CC0) | Şimşek Ulti ağı / Şimşek Ağı dekali için modüler parça; ölçek uyumlu |
| G12 | OGA "Free VFX asset pack" (CodeManu, SpriteMancer ile) | https://opengameart.org/content/free-vfx-asset-pack | pixel efektler | PNG | CC0 | **K** (CC0; 22 efekt, 30/60 fps, zip 94,6 MB) | İçerik listesi doğrulanmadı; yedek havuz |
| G13 | OGA Sinestesia "hit animation" / "Blood, Hit and Both" | https://opengameart.org/content/hit-animation-frame-by-frame | 16 kare vuruş, 512-1024 px kareler | PNG | CC0 | **K** (CC0; 1024² kare, 16 kare) | Pixel değil, çok büyük: **uygun değil** |
| G14 | OGA "lightning" (Calinou, 2048×512 şeritler) | https://opengameart.org/content/lightning | dikişsiz şimşek şeritleri | PNG | CC0 | **K, çelişki**: yazar **wreaderror** (Calinou değil); 8 şerit (4 mor, 4 mavi) | Pixel değil; MeshRope dokusu olarak Şimşek izi için düşünülebilir, düşük öncelik |
| G15 | ParticleFX Studio | https://particlefx.studio/effects | 650-800+ ücretsiz 2B efekt (GIF + sheet); Godot eklentisi MIT | sheet | **dikkat**: eklenti kodu MIT; efekt görselleri için "ticari oyunda kullanılabilir" ifadesi var ama atıf ve yeniden dağıtım şartı açık değil; içe aktarma ücretsiz hesap + API anahtarı istiyor | A (efekt sayfası açıldı: "free to use in commercial projects"; şartlar sayfası okunmadı) | Şartlar sayfası okunmadan **kullanma** |
| G16 | Raphael Hatencia "Particle FX" | https://raphaelhatencia.artstation.com/store/bk322/particle-fx-pixel-art | pixel parçacık paketi | PNG | **CC-BY 4.0** (atıf şart) | **engelli** (artstation 403) | Kabul edilebilir yedek; atıf metni kredilere |
| G17 | ragnapixel "Particle FX" | https://ragnapixel.itch.io/particle-fx | pixel parçacık | PNG | **kullanma**: açıklama ile itch meta verisindeki lisans farklı (yorumcu uyarısı) | **K, çelişki giderildi**: açıklama ve itch meta ikisi de **CC-BY 4.0**, yazar Raphael Hatencia (= G16); tam paket ücretli (3,99 $), ücretsiz demo var | — |
| G18 | "Free Game FX" (ashishlko11) | https://opengameart.org/content/free-game-fx | 7 efekt × 20 kare | PSD/PNG | CC-BY 3.0 / GPL 3.0 | **K** (CC-BY 3.0 + GPL 3.0; 256×256 kare) | Pixel değil; atıf gerekir; düşük öncelik |
| G19 | BlackCreepyCat Flare/Target Effects | https://blackcreepycat.itch.io/spritesheet-flare-effects-vol-1 | parlama efektleri | PNG | **dikkat**: ticari/kişisel kullanım serbest ama "redistribute" yasak | A (itch 429 hız sınırı) | Depomuz herkese açık olabilir (B-37): yeniden dağıtım sayılır → **kullanma** |
| G20 | Frostwindz "Pixel Art Lightning" | https://frostwindz.itch.io/pixel-art-skill-animations-lightning | şimşek animasyonları | PNG | **dikkat**: yeniden dağıtma/satma yasak | **K** ("You are not allowed to redistribute or resell the assets." → kullanma) | Aynı neden → **kullanma** |
| G21 | Will's Magic Particle Effects, Fellor Elemental Bundle, Admurin buz/şimşek, InfectedTribe | itch.io | — | — | **ücretli** | A | Kâr amaçsız, ücretsiz kaynak kuralı → kapsam dışı |

### 1.1 00GameDevs → Devran: ilgili efektler (codex `data/meta.js` kataloğundan, MIT)

Ad ve açıklamalar 00GameDevs kataloğundan (codex üzerinden okundu). "Pixel sürüm" = codex'te dışa aktarılabilir sheet.

| 00GD no / id | Ad | Tür / okul | Devran olayı |
|---|---|---|---|
| 15 `shockwave` | Dust-Raising Shockwave ("A ring of dust rushes outward…") | burst | Ağır/kritik çarpışma şok çemberi + toz; Durma toz çemberi |
| 13 `fire-explosion` | White-Hot Fireburst | burst / fire | Kor element ağır çarpışma, Kor Ulti vuruşu |
| 14 `energy-burst` | Lightning Arc Burst | burst / storm | Şimşek çarpışma, Enerji doldu (renk değişimiyle) |
| 16 `ice-shatter` | Shattering Frostburst | burst / ice | Don çarpışma, Don Ulti |
| 17 `wind-vortex` | Leaf-Swept Vortex | vortex / wind | Kasırga Alanı |
| 18 `dust-devil` | Sand-Swept Vortex | vortex / sand | Kaya element telegrafı (toz) |
| 19 `fire-vortex` | Flame-Swept Vortex | vortex / fire | Kor Çukuru alt katmanı |
| 26 `frost-wheel` | Crystal-Toothed Ice Wheel | projectile / ice | Don topaç dash izi (referans) |
| 28 `thunder-strike` | Vortex Lightning Strike | burst / storm | Şimşek Ulti vuruşu |
| 33 `tidal-surge` | Breaking Tidal Surge | burst / water | Girdap Ulti vuruşu |
| 34 `quicksand-seal` | Sand-Gathering Sigil | area / sand | Girdap Çekimi / Kaya zemini (referans) |
| 36 `spiral-gale` | Spiraling Wind Spear | projectile / wind | Kasırga dash çarpması |
| 38 `magma-fissure` | Molten Vein Fissure | burst / fire | Kor Çukuru dekali, Parçalanma zemin çatlağı |
| 10 `burning-ground` / 11 `frost-field` | Flame-Etched Ground / Sixfold Frost Sigil | area | Alan Ulti zemin dekalleri (Kor, Don) |
| 57 `spell-indicator-circle` | Red Circle Spell Indicator ("fills as an attack approaches") | area | **Ulti telegrafı** (bizim kırmızı tehlike halkası ile birebir) |
| 60 `impact-frame` | Impact Frame | screen | Takım Ultisi / kritik ekran flaşı (referans; anime çizgileri) |
| 40 `prism-parry` | Prismatic Crystal Block | shield / light | Sekme / savunma çarpışması |
| 8 `arc-ray`, 63 `sustained-arc` | Forked Lightning Stream / Sustained Arc | beam / storm | Şimşek Ağı, karşıt element (Şimşek-Don) çıtırtısı |

### 1.2 pixelfx → Devran: ilgili efektler (`docs/CATALOG.md`, MIT)

| id | Süre · tuval | Devran olayı |
|---|---|---|
| `impacts/hit-spark` | 0,5 sn · 136×80 | **Hafif/ağır çarpışma kıvılcımı** (normal boyunca uzun ışın + koni kıvılcım: 05 § 3.2 ile aynı dil) |
| `impacts/crit-hit` | 0,9 sn · 216×136 | **Kritik çarpışma** (yıldız patlaması, kırılan halka, kıvılcım) |
| `impacts/parry` | 1,0 sn · 200×112 | Metal-metal çarpışma; Sekme |
| `impacts/ricochet` | 1,1 sn · 232×84 | **Duvar/kenar çarpması** (zeminde parlayan kayma izi) |
| `impacts/ground-slam` | 3,2 sn · 288×208 | Parçalanma zemin şoku, Kaya Ulti |
| `impacts/heavy-landing` | 1,6 sn · 176×80 | **Durma** (iki toz halkası), Ring Out kenar tozu |
| `impacts/impact-frame` | 0,3 sn · 320×180 | Takım Ultisi ekran vuruşu (referans) |
| `spawn/poof` | 1,6 sn · 112×92 | Parçalanma toz bulutu (yıldız/çizgi öğeleri çıkarılmalı) |
| `ice/ice-shatter`, `ice/snowflake-burst`, `ice/frost-nova` | 2,8-3,4 sn | Don çarpışma / Don Ulti / Don Kaygan |
| `lightning/zap-hit`, `lightning/thunderclap`, `lightning/charge-up` | 0,9-2,7 sn | Şimşek çarpışma, Şimşek Ulti, **Ulti telegrafı şarjı** |
| `explosions/plasma-explosion`, `explosions/implosion` | 1,7 sn | Girdap/karşıt element; Girdap Çekimi |
| `fire/fire-ring`, `fire/fireball` | 3,9 sn | Kor Ulti, Kor Çukuru |
| `nature/earth-spike`, `nature/boulder`, `nature/quake` | 2,3-3,4 sn | Kaya Ulti, Kaya Duvar |
| `nature/tornado`, `weather/blizzard` (çizgiler) | döngü | Kasırga Alanı |
| `water/whirlpool` (üstten), `water/splash` | döngü / 2,5 sn | **Girdap Çekimi** dekali (üstten bakış: bize en uygun), Ring Out su halkası |
| `status/haste` | döngü 1,2 sn | Dash hız çizgileri |
| `pickups/collect-burst`, `ui/level-up`, `ui/achievement`, `ui/confetti`, `ui/countdown` | 1,35-3,4 sn | Enerji doldu, Lv. yükselme, başarım, maç sonu, geri sayım |
| `pickups/coin-spin`, `ui/coin-collect` | döngü / 2,45 sn | Altın / Market (D7) |

---

## 2. Kaynak tablosu: ses ve müzik

| # | Kaynak | URL | İçerik | Lisans | Doğrulama | Not |
|---|---|---|---|---|---|---|
| S1 | **Kenney Impact Sounds** | https://kenney.nl/assets/impact-sounds | 130 OGG (26 grup × 5: metal light/medium/heavy, plate, tin, glass, bell, wood, punch, footstep…) | **CC0** | **K-ayna** (§ 8.1) | 12 dosya indirildi: `kaynak/efekt/kenney-impact-sounds/`. Dosya adları, biçim (Ogg Vorbis 44,1 kHz stereo), süreler doğrulandı; lisans aynadaki CC0 metni, kenney.nl sayfası hâlâ okunmadı |
| S2 | **Kenney Interface Sounds** | https://opengameart.org/content/interface-sounds | 100 ayrı OGG (tık, onay, hata, cam…) | **CC0** | **K** (OGA, Kenney; zip içinde Kenney `License.txt`) | UI tık, satın alma, başarım "ding" |
| S3 | Kenney RPG Audio / Sci-Fi Sounds / Digital Audio | https://opengameart.org/content/50-rpg-sound-effects · https://opengameart.org/content/sci-fi-sounds | 50 RPG (metal, bozuk para) · 70 sci-fi OGG | CC0 | **K** (iki sayfa CC0, Kenney) | Enerji doldu, telegraf (sci-fi şarj), bozuk para |
| S4 | **Juhani Junkala "The Essential Retro Video Game Sound Effects Collection [512 sounds]"** | https://opengameart.org (arama: 512 sound effects 8-bit) | 512 retro SFX | **CC0** (INFO dosyası: "released under CC0 creative commons license") | **K** (OGA, yazar SubspaceAudio; CC0) | Pixel estetiğe uygun; geri sayım, maç sonu, UI. Kayıt değil chiptune: metal ağırlığı için tek başına yetmez |
| S5 | OGA "metal impact sounds" | https://opengameart.org/content/metal-impact-sounds | küçük metal vuruş seti | CC0 | **K** (CC0; yazar BMacZero) | Hafif "tık" |
| S6 | OGA qubodup "Metal Interactions" / "Impact" | https://opengameart.org/content/metal-interactions · https://opengameart.org/content/impact | 166 KB / 131 KB .7z | CC0 | **K** (iki sayfa CC0) | Ağır "çın", duvar "tonk" |
| S7 | OGA "100 CC0 metal and wood SFX", "100 CC0 SFX 2", "75 CC0 breaking/falling/hit" (rubberduck) | https://opengameart.org/content/100-cc0-metal-and-wood-sfx · https://opengameart.org/content/100-cc0-sfx-2 · https://opengameart.org/node/142820 | geniş CC0 havuzu (cam dahil) | CC0 | **K, çelişki**: ilk iki sayfa CC0; `node/142820` bir **koleksiyon** (jlerossignol "SoundFX Library [CC0]"), "75 CC0 breaking/falling/hit" onun içinde | Parçalanma kırılma katmanı |
| S8 | **OGA "Glass Break" (Till Behrend)** | https://opengameart.org/content/glass-break | `glass_breaking.wav`, 230,9 KB | **CC0** | **K** (CC0; 1,31 sn stereo WAV) → indirildi | Parçalanma (kısaltılıp OGG'ye çevrilir) |
| S9 | OGA "Ice breaking/shattering" (IgnasD) | https://opengameart.org/content/ice-breakingshattering | buz kırılma | CC0 | **K** (CC0; 5 OGG) → 2 tanesi indirildi | Don element katmanı / Don Parçalanma |
| S10 | **BigSoundBank "Coin spinning on a table"** (#2698, #2700) | https://bigsoundbank.com/coin-spinning-on-a-table-4-s2700.html | 2 € bozuk para masada döner, yavaşlar, durur | **CC0** (sayfa "4"te yazılı; "2" sayfası doğrulanmadı) | **K** (#2700 sayfası: "License CC0 (public domain)"; 14,6 sn) → indirildi | **Durma** sesi için birebir (05 § 3.2: "bozuk para yatışı"). Topaç temasına en yakın gerçek kayıt |
| S11 | OGA "Dropping coin on table" | https://opengameart.org/node/28043 | düşen bozuk para | CC0 | **K, çelişki**: başlık "Coin Drop" (yazar Vinrax), CC0 | Durma son "tıkırtı" yedek |
| S12 | Freesound InspectorJ "Coin Flipping, A.wav" | freesound.org | yazı-tura atış | CC0 (ikinci el ayna) | A | Freesound açılamadı; doğrulamadan kullanma |
| S13 | Freesound genel | https://freesound.org | çok geniş | sese göre değişir (CC0 / CC-BY / CC-BY-NC) | **erişilemedi** | Ses başına lisans tek tek okunmalı; CC-BY-NC = **kullanma** (kâr amaçsız olsak da yayın/Kick bağlamı tartışmalı) |
| S14 | Pixabay ses | https://pixabay.com/sound-effects/ | geniş | **Pixabay Content License** (CC0 değil): ticari kullanım serbest; **AI eğitiminde kullanım ve ham dosyanın yeniden dağıtımı yasak**; müzikte Content ID iddiası olabilir | A | Depo herkese açılırsa ham dosya dağıtımı sayılabilir → **kullanma** (yalnız son çare, sahip kararı) |
| S15 | **ChipTone** (SFB Games) | https://sfbgames.itch.io/chiptone | tarayıcıda SFX üretici | Üretilen sesler **CC0**, atıf gerekmez (geliştirici beyanı) | A (itch 429 hız sınırı) | Sentezimizin yanında en temiz üretim aracı |
| S16 | jfxr (ttencate) | https://github.com/ttencate/jfxr | sfxr türevi üretici | README aynen: "The code itself is under a three-clause BSD license; see LICENSE for details." · "Any sound effects you make are entirely yours to do with as you please, without any restrictions whatsoever." | **K** | Uygun; ChipTone yerine birincil üretim aracı |
| S17 | jsfxr / sfxr.me | https://github.com/mneubrand/jsfxr | sfxr JS | kod Apache-2.0; **çıktı lisansı yazılı değil**; npm `license` alanı boş | A + npm | **Kullanma** (çıktı için ChipTone/jfxr/kendi sentezimiz) |
| S18 | Kendi sentezimiz `araclar/ses-uret.ts` | depo | 16 ses | CC0 (bizim) | K | Taban; korunur |
| M1 | **"Chiptune Battle Music" (pmiller)** | OGA (arama: chiptune battle music pmiller) | RPG savaş, ~7,5 sn'de kusursuz döngü | **CC0** | **K** (OGA `content/chiptune-battle-music`, CC0; 152 sn) | **Arena döngüsü** 1. aday: kısa döngü = küçük dosya |
| M2 | "Chipped Urgency" | https://opengameart.org/content/chipped-urgency | döngülü, yarı retro, savaş | CC0 | **K** (CC0; yazar Centurion_of_war) | Arena 2. aday |
| M3 | "Rin's Theme" | OGA | giriş + döngü OGG ayrı | CC0 | **K** (CC0; yazar request; intro + loop OGG) | Arena/menü |
| M4 | "Fast fight battle music" (Ville Nousiainen) | https://opengameart.org/content/fast-fight-battle-music | yüksek favori; döngü değil (yorumda döngülü sürüm linki) | CC0 | **K** (CC0; döngülü sürüm ayrıca okunmadı) | Döngülü sürümün lisansı ayrıca okunmalı |
| M5 | **"Menu Theme" (tamesu)** | https://opengameart.org/content/menu-theme | 8-bit menü, BeepBox kaynağı ekli (düzenlenebilir) | CC0 | **K** (CC0; MP3 + MIDI + BeepBox, OGG yok; 65,7 sn) | **Menü döngüsü** 1. aday (kaynak dosyası sayesinde tempoyu/uzunluğu kısaltabiliriz) |
| M6 | "Chiptune Title Screen" (tomcat, 2026-03) | https://opengameart.org/content/chiptune-title-screen | NES tarzı menü | CC0 | **K** (CC0) | Menü 2. aday |
| M7 | "Menu Chill Music" (etrock) | https://opengameart.org/content/menu-chill-music | sakin menü döngüsü (chiptune değil) | CC0 | **K** (CC0) | Yedek |
| M8 | "Boss Fight Bounce" | OGA | — | GPL 3.0 + CC0 çift | **K** (GPL 3.0 + CC0) | CC0 tarafı seçilebilir ama **dikkat**; ihtiyaç yok |
| M9 | "Their Spears Fell Like Rain", "Sunshine Skirmish" | OGA | — | **CC-BY 4.0** | **K** (iki parça da CC-BY 4.0) | Kabul edilebilir ama gereksiz; CC0 adaylar yeterli |

### 2.1 Kod kütüphaneleri

| # | Paket | Sürüm / lisans | Pixi 8 uyumu | Karar |
|---|---|---|---|---|
| L1 | `@pixi/particle-emitter` | 5.0.10, MIT (npm) | **Hayır**: peer `@pixi/core >=6.0.4 <8.0.0` | **Kullanma.** Pixi 8'in yerleşik `ParticleContainer` + `Particle` (deneysel ama kararlı API) ile kendi havuzumuz (pixel planı § 5.3 zaten bunu diyor) |
| L2 | `pixi.js` 8 `MeshRope` | MIT | yerleşik (v7 `SimpleRope` → v8 `MeshRope`, seçenek nesnesiyle kurulur; `textureScale: 0` gerer, `>0` tekrarlar) | İz için kullan (pixel planı § 5.2) |
| L3 | `pixi-filters` | 6.1.5, MIT, peer `pixi.js >=8` | evet | `ShockwaveFilter`/`GlowFilter` Ulti ve Takım Ultisi için **isteğe bağlı**; yeni bağımlılık = `@axiom` onayı; pixel görünümü bulandırabilir, spike'ta denenir |
| L4 | `pixelfx` (G3) | 0.3.0, MIT | çalışma zamanında Pixi'ye bağımlı değil (kendi `frame` tamponuna CPU'da çizer → `putImageData`) | **Çalışma zamanı bağımlılığı yapma** (CPU tam tuval kopyası 60 fps bütçesini zorlar); **yalnız derleme aracı** olarak (`devDependencies` ya da `araclar/` altında sabit commit'e kilitli) |

---

## 3. Eşleme tablosu (05 § 3.2 olayları)

Seçenek sırası: **(1)** önerilen, **(2)** yedek. "Kod" = `Efektler.ts` Graphics/parçacık havuzu (bugünkü yol), "pişir" = pixelfx/codex'ten derleme anında `efekt.png` atlasına alınan sheet, "kayıt" = CC0 ses dosyası, "sentez" = `araclar/ses-uret.ts`.

| Olay | Görsel (1) | Görsel (2) | Ses (1) | Ses (2) | Neden |
|---|---|---|---|---|---|
| **Hafif çarpışma** | Kod: 6-8 kare parçacık (2×2/3×3), element rengi | Pişir: `impacts/hit-spark` (yalnız ilk 4-5 kare, kırpılmış ~48×32) | Sentez `carpisma-hafif` (mevcut) | Kayıt: S1 Kenney metal/plaka hafif + perde ±%8 | En sık olay; sheet maliyeti ve tekrar yorgunluğu gereksiz. Kod zaten var |
| **Ağır çarpışma** | Kod parçacık + kod şok çemberi **+** pişir `hit-spark` tam (normal yönüne döndürülmüş) | Pişir: 00GD `shockwave` (codex 2B) | **Kayıt**: S1 metal ağır "çın" + sentez alt vuruş (iki katman) | S6 qubodup Impact | Ağır vuruşun "metal" kimliği gerçek kayıttan gelir; sentez çınlama ince kalıyor (D3'te dinlenmedi, § 6) |
| **Kritik çarpışma** | **Pişir: `impacts/crit-hit`** + kod çift şok çemberi + ekran flaşı | Pişir: 00GD `energy-burst` (element tint) | Kayıt S1 metal ağır + sentez bas "thud" | S7 metal havuzu | Okunurluk: kritik tek bakışta ayrılmalı (05 § 7 ölçütü); hazır yıldız patlaması el çizimiyle günler sürer |
| **Karşıt element** | Kod: iki renkli iç içe şok çemberi (pixel planı § 5.1) + pişir element ikilisi küçük katman (Kor-Girdap: `plasma-explosion` kırpık; Şimşek-Don: `zap-hit`; Kasırga-Kaya: `poof` toz) | Kod yalnız | Taban + "çıtırtı": sentez yüksek geçiren gürültü | S3 sci-fi kısa cızırtı | Bonus "hissettirilir, söylenmez": ince ek katman yeter |
| **Dash çarpması** | Kod: hız çizgileri + sonik çember | Pişir: `status/haste` çizgileri | Sentez `dash` → kayıt S1 ağır | ChipTone "whoosh" | Mevcut sentez swoosh yeterli; çarpma kısmı ağır çarpışma sesini paylaşır |
| **Duvar / kenar** | Kod: duvar boyunca çizgi parçacık + duvar parlaması | Pişir: `impacts/ricochet` kayma izi | Sentez `duvar` "tonk" | S6 qubodup "Metal Interactions" alçak | Tek yönlü, sık olay: kod |
| **Ring Out** | Kod: ölçek küçülme + gölge ayrılması + kenar toz (pixel planı § 5.2) | Pişir: `impacts/heavy-landing` toz halkası, su arenasında `water/splash` | Sentez `ring-out` (swoosh + düşen ıslık) | ChipTone düşen ıslık | Hareket kodla; toz/su küçük sheet. Ses sentezi tasarım isteğine birebir |
| **Parçalanma** | Kod: katman dilimleri fırlar (pixel planı § 5.2) **+ pişir `spawn/poof` (yıldızsız) ya da Aim Studios patlama 32×32** + `ground-slam` çatlağı | 00GD `ice-shatter` (Don), `magma-fissure` (Kor) | **Kayıt S8 Glass Break (kırpık) + S1 metal + sentez bas patlama** | S7 "75 breaking" | Maçı bitiren an; en çok "gerçek" ses ve hazır toz bulutu buraya |
| **Durma** | Kod: yalpa → yatma + 6 toz | Pişir: `impacts/heavy-landing` küçük halka | **Kayıt S10 BigSoundBank coin spinning (son 1-1,5 sn)** + sentez vızıltı perde düşüşü | S11 dropping coin | 05'in istediği "bozuk para yatışı" sesi gerçek kayıtla birebir var; en yüksek kazanç/maliyet oranı |
| **Ulti telegrafı** | Kod: kırmızı zemin halkası dolumu (00GD `spell-indicator-circle` aynı dil, referans) + pişir `lightning/charge-up` element tint | codex 2B `spell-indicator-circle` sheet | Sentez `telegraf` (yükselen ton, süre = aviso) | S3 sci-fi şarj | Süre ağdan geldiği için (0,2-0,45 sn) ses sentezle tam süreye uydurulur; kayıt sabit süreli |
| **Ulti vuruşu** | **Pişir: element başına 1 sheet** — Kor `fire/fire-ring`, Kasırga `nature/tornado` (kısa) ya da 00GD `spiral-gale`, Şimşek `lightning/thunderclap`, Girdap `water/whirlpool` + `implosion`, Kaya `nature/earth-spike`, Don `ice/frost-nova` | 00GD karşılıkları (codex) | Sentez `ulti` taban + element katmanı (Kor kayıt patlama, Don S9 buz, Kaya S7 taş) | ChipTone | Ulti "an"ı ve Kick izleyicisi için en görünür efekt; 6 hazır ve tutarlı aile = en büyük zaman kazancı |
| **Takım Ultisi** | Kod: vinyet + iki Ulti sheet'i üst üste + pişir `impacts/impact-frame` (çizgiler, 2-4 kare) | `pixi-filters` ShockwaveFilter (onaylanırsa) | Müzik vurgusu: arena döngüsünü 300 ms kıs + sentez "boom" | — | D8 kapsamı; iki mevcut sheet'in birleşimi yeterli |
| **Stamina kritik** | Kod: HUD nabzı, soluk parçacık, kısa iz | — | Sentez alçak kalp atışı (isteğe bağlı) | — | Durum göstergesi; dış kaynak gereksiz |
| **Enerji doldu** | Kod: element çemberi + 8 yukarı parçacık | Pişir: `pickups/collect-burst` (yarı boy) | Kayıt S2 Kenney Interface "confirmation" / S4 retro ding | Sentez `enerji-doldu` | Kısa, net "ding" gerçek kayıtta daha temiz |

Ek (B-35 listesinde olup 05 § 3.2'de olmayan): geri sayım (pişir `ui/countdown` referans, ses S4), maç sonu (`ui/confetti` kazanana, ses S4 jingle), UI tık (S2), satın alma (S2 + `ui/coin-collect`), başarım (`ui/achievement` dili, ses S2), Sekme (`impacts/parry` kırpık, sentez `sekme`).

### 3.1 Öneri sırası

1. **Durma sesi (S10)** ve **Parçalanma kırılma katmanı (S8)**: tasarımın açıkça istediği gerçek dünya sesleri; bir günden az iş.
2. **pixelfx `hit-spark` + `crit-hit` pişirme denemesi** (D1 Topaç Lab'da yan yana: kod parçacık vs pişmiş sheet). "Hafif/ağır/kritik ayırt edilir mi" ölçütünü doğrudan güçlendirir.
3. **Metal çarpışma katmanları (S1)**: ağır/kritik/duvar.
4. **6 element Ulti sheet ailesi** (pixelfx; eksikte 00GD/codex): D3 Ulti anı için.
5. **UI sesleri (S2)** ve **2 müzik döngüsü (M1, M5)**: D3/D8.
6. Alan Ulti zemin dekalleri (00GD `burning-ground`, `frost-field`, pixelfx `whirlpool`, M484 şimşek parçaları): pixel planı § 5.2'deki 6 dekalın el çizimi yerine taban.

---

## 4. Ses seti önerisi (16 efekt + 2 müzik)

Taban: mevcut `veri/manifest-ses.json` adları korunur (kanca `Efektler.olay` → `sesKanca` değişmez). Kayıtla değişenler **katman** olarak eklenir; sentez yedeği her zaman kalır. Dosya adları "indirildiğinde doğrulanır" (Kenney paket içi adlar bu oturumda görülemedi).

| # | Ad (mevcut) | Öneri | Kaynak / URL | Lisans | Tahmini OGG boyutu |
|---|---|---|---|---|---|
| 1 | `carpisma-hafif` | sentez kalır; perde ±%8 | `araclar/ses-uret.ts` | CC0 (bizim) | 3 KB (WAV kalabilir) |
| 2 | `carpisma-agir` | Kenney Impact "metal/plate heavy" 1 dosya + sentez alt vuruş karışımı | S1 https://kenney.nl/assets/impact-sounds | CC0 | 6 KB |
| 3 | `carpisma-kritik` | Kenney metal ağır (2. varyant) + sentez bas thud | S1 | CC0 | 8 KB |
| 4 | `duvar` | qubodup "Metal Interactions" alçak tonk; yoksa sentez | S6 https://opengameart.org/content/metal-interactions | CC0 | 5 KB |
| 5 | `dash` | sentez kalır (ChipTone alternatifi) | — / S15 | CC0 | 5 KB |
| 6 | `sekme` | sentez kalır | — | CC0 | 4 KB |
| 7 | `ring-out` | sentez kalır | — | CC0 | 10 KB |
| 8 | `parcalanma` | Glass Break (ilk 0,4 sn) + Kenney metal + sentez bas | S8 https://opengameart.org/content/glass-break | CC0 | 10 KB |
| 9 | `durma` | BigSoundBank coin spinning, son ~1,2 sn (yavaşlayıp yatış) | S10 https://bigsoundbank.com/coin-spinning-on-a-table-4-s2700.html | CC0 | 12 KB |
| 10 | `telegraf` | sentez kalır (süre aviso'ya bağlı) | — | CC0 | 6 KB |
| 11 | `ulti` | sentez taban; v2'de element katmanı (S9 buz, S7 taş) | — | CC0 | 10 KB |
| 12 | `geri-sayim` | Junkala 512'den kısa bip (3-2-1) ya da sentez | S4 | CC0 | 3 KB |
| 13 | `mac-sonu` | Junkala 512 kısa jingle | S4 | CC0 | 15 KB |
| 14 | `ui-tik` | Kenney Interface "click" | S2 https://opengameart.org/content/interface-sounds | CC0 | 3 KB |
| 15 | `enerji-doldu` | Kenney Interface "confirmation" | S2 | CC0 | 4 KB |
| 16 | `kenar-uyari` | sentez kalır | — | CC0 | 3 KB |
| (B-35) | satın alma, başarım | Kenney Interface "confirmation"/"glass" (D7) | S2 | CC0 | 2 × 4 KB |
| M-a | `muzik-arena` (döngü) | "Chiptune Battle Music" (pmiller), 7,5 sn döngü × 2-4 tekrar dışa aktarım ya da tek döngü | M1 (OGA) | CC0 | 30 sn @ 48 kbps mono ≈ **180 KB** (tek 7,5 sn döngü ≈ 45 KB) |
| M-b | `muzik-menu` (döngü) | "Menu Theme" (tamesu), BeepBox kaynağından 20-30 sn döngü | M5 https://opengameart.org/content/menu-theme | CC0 | ≈ **120-180 KB** |

**Toplam tahmin:** efektler ≈ 110-120 KB (OGG başlık yükü küçük dosyalarda baskın; çok kısa sentez sesler WAV kalırsa fark azdır) + müzik ≈ 165-360 KB = **≈ 280-480 KB ≤ 500 KB**. Bütçe sıkışırsa arena müziği tek kısa döngü olarak tutulur (~45 KB).

**Dönüştürme notu:** `ffmpeg -i girdi.wav -ac 1 -ar 22050 -c:a libvorbis -q:a 2 cikti.ogg` (efekt), müzik için `-ar 32000 -b:a 48k`. Döngü noktası örnek doğruluğunda kesilmeli (Vorbis başı/sonu sessizlik ekleyebilir; `@pixi/sound` `loop: true` ile spike'ta dinlenir). **Safari'de Ogg Vorbis desteği sürüme bağlı** (doğrulanmadı): `@pixi/sound` 6 ile her ses için `ogg` + `m4a`/`mp3` yedeği ya da efektleri WAV bırakıp yalnız müziği iki biçimde vermek; karar `@byte`/`@axiom`, test `@flint`. Yükleme: ses normalizasyonu (−16 LUFS civarı efekt tepe, müzik −20 LUFS) karışımda dinlenerek.

---

## 5. Entegrasyon notu

### 5.1 Boru hattı (öneri; kodu yazacak ajan için)
1. Kaynak kod/ses **depoya varlık olarak girmez**; `kaynak/efekt/` altına yalnız **pişirme reçetesi** (efekt id, kaynak commit SHA, palet, kırpma, kare aralığı) yazılır.
2. `araclar/efekt-pisir.ts` (ad öneri): pixelfx'i sabit commit'ten çalıştırır (`tools/render.mjs <id> --sheet --opts '{"palette":[...]}'` eşdeğeri), kareleri kırpar, `public/efekt/efekt.png` + `efekt.json` atlasına paketler (pixel planı § 7.3: "efektler tek `efekt.png`").
3. `AtlasYukleyici` deseni: `scaleMode = "nearest"`, kare dilimleri JSON'dan.
4. Sheet içindeki **ışık katmanı**: pixelfx renk + "light" tamponunu ayrı birleştiriyor (`composite`: önce renk, sonra ışık toplanır). Şeffaf PNG'de ışığın nasıl gömüldüğü pişirme denemesinde doğrulanmalı; gerekirse iki sheet (renk normal karışım, ışık `blendMode = "add"`).

### 5.2 Boyut ve piksel yoğunluğu
- **Atlas ≤ 2048×2048.** Kaba bütçe: kırpılmış çarpışma kareleri ~48×48, Ulti kareleri ~128×128. Ulti: 6 element × ~12 kare × 128² ≈ 72 kare → 2048² atlasın ~%28'i; çarpışma/toz/UI kalanına sığar. Sığmazsa Ulti ayrı `efekt-ulti.png` (maçta yalnız iki elementinki yüklenir).
- **1 px = 1 mantıksal px** (pixel planı § 1.3): pixelfx/codex kareleri kendi "oyun pikseli"nde çizilir; **ölçeklemeden** 960×540 tuvale konur. pixelfx tuvalleri efekt başına ~80-320 px: 64 px topaç ile oranlar makul (hit-spark'ın dolu kısmı ~40-60 px). **Ölçek büyütme gerekirse yalnız tam sayı** (×2), aksi halde efekt yeniden parametrelenir (pixelfx `size` düğmesi), asla ×1,5 değil.
- Kare hızı: pixelfx ~12-20 fps adımlı çizim kuralı; bizim 60 Hz döngüde kare başına 3-5 tik tutulur (hitstop sırasında efekt yaşı dondurulur, 05 § 3.3).
- codex 2.5D kamerası 30° izometrik: bizim üstten bakış ile perspektif çakışabilir; **2B kamera** ya da pixelfx üstten/yan görünüm efektleri (whirlpool, ripples, ground-slam halkaları) seçilmeli; dikey sütun efektleri (flame-pillar, lightning-strike) Ulti'de "yukarıdan iniş" olarak kabul edilebilir.

### 5.3 Palet uyumu
pixelfx `palette` = koyu→açık hex rampası. Element rampaları (pixel planı § 2.3, ton sayısı 4; pixelfx genelde 5-6 ton istiyor, en açık iki ton beyaza giden ara ve `#FFFFFF`):

| Element | Taban | Önerilen pişirme rampası (tahmin, spike'ta gri ton + renk körlüğü testiyle) |
|---|---|---|
| Kor | `#E8452C` | koyu → `#E8452C` → `#FF9A5C` → `#FFE0B0` → `#FFFFFF` |
| Kasırga | `#5BD1A5` | koyu → `#5BD1A5` → `#A8F0D4` → `#FFFFFF` |
| Şimşek | `#F7D83A` | koyu → `#F7D83A` → `#FFF3A0` → `#FFFFFF` |
| Girdap | `#2A5BD7` | koyu → `#2A5BD7` → `#7FA8FF` → `#D8E6FF` → `#FFFFFF` |
| Kaya | `#8A7458` | koyu → `#8A7458` → `#C2AC86` → `#EDE0C8` |
| Don | `#9FE3F5` | koyu → `#9FE3F5` → `#DDF7FF` → `#FFFFFF` |

Koyu uç: pixel planı "1 px koyu dış çizgi, rampanın en koyusu (saf siyah değil)" kuralıyla aynı ton. Takım renkleri (`#2FB8E8`, `#E83A8C`) efektte **kullanılmaz** (zemin çemberine ayrılmış); Girdap/takım camgöbeği yakınlığı uyarısı (pixel planı § 2.3) efektlerde de geçerli. Element tint'i yerine palet pişirme tercih: tint pixel rampasını düzleştirir.

### 5.4 Manifest satırı (`veri/manifest-gorsel.json`; dosya henüz yok)
`manifest-ses.json` ile aynı iskelet; görsel için öneri:

```json
{
  "surum": 1,
  "aciklama": "Devran görsel varlıkları: kaynak, araç, tarih, lisans, atıf",
  "dosyalar": [
    {
      "ad": "efekt.kritik-kivilcim",
      "dosya": "efekt/efekt.png#kritik-kivilcim",
      "olay": "kritik çarpışma",
      "kaynak": "pixelfx impacts/crit-hit",
      "kaynakUrl": "https://github.com/patch-gg/pixelfx",
      "kaynakSurum": "<commit SHA>",
      "arac": "araclar/efekt-pisir.ts (palet: kor, kırpma 64x64, kare 0-9)",
      "tarih": "2026-11-xx",
      "lisans": "MIT",
      "atif": "pixelfx © 2026 Patch, © 2026 Hugo Duprez, MIT License",
      "degistirildi": true
    }
  ]
}
```
CC0 kayıt sesleri için de `manifest-ses.json` satırına `kaynakUrl`, `yazar`, `lisans: "CC0-1.0"`, `atif` (isteğe bağlı ama yazılır: "Kenney (kenney.nl), CC0") eklenir. MIT kaynakların tam lisans metni `docs/art/krediler.md` (B-35/§ 4 madde 9) ve oyun içi krediler sayfasına girer; MIT "kopyalara bildirim ekle" şartı pişmiş PNG için de güvenli tarafta kalarak uygulanır.

### 5.5 Hukuki temizlik
- 00GameDevs **marka, site arayüzü, avatar ve tanıtım görselleri kapsam dışı**: yalnız efekt (codex yorumu) kullanılır, "00GameDevs" adı oyun içinde görünmez, yalnız kredilerde.
- pixelfx `gallery/fonts` (Patch Pixel) **MIT dışı**: kullanılmaz. Metin içeren efektler (`cartoon-pow` "POW!", `crit-number`, `combo-counter`, `level-up` yazıları) yazısız pişirilir ya da kullanılmaz; metin `@glyph`'in kendi fontuyla.
- Karakter/kukla içeren efektler (`act` gövdeleri, "dummy") `{ body: false, target: false }` ile yalnız efekt olarak pişirilir.
- Canon/marka benzerliği: seçilen efektlerin hiçbiri belirli bir topaç markasının imza efektini taklit etmez; "ruh canavarı" avatarları (pixel planı § 4) bu kaynaklardan **alınmaz** (B-36 anka/kanat yasağı ayrı denetim).
- Müzik: CC0 parçalar bile üçüncü kişilerce Content ID'ye kaydedilmiş olabilir; Kick/YouTube yayınında ihtar riski (B-35). Kaynak sayfa URL'si ve indirme tarihi manifestte kanıt olarak tutulur.

---

## 6. Riskler ve erişim

### 6.1 Erişilemeyenler (bu oturum)
Bu bulut oturumunun ağ politikası şu alanlara bağlantıyı reddetti: **00gamedevs.com, kenney.nl, opengameart.org, itch.io, freesound.org, pixabay.com** (DNS/CONNECT 403). Bu sitelerin sayfaları **açılamadı**; bilgiler web arama özetlerinden ("A") ya da GitHub ham dosyalarından ("K"). Sayfa okumak için sahibin ortam ayarlarında (oturum başlığındaki bulut ortamı menüsü → Edit → Network access) bu alanları izinli alanlara eklemesi gerekir. Uydurma yapılmadı: dosya adları, kare boyutları ve lisans ayrıntıları "A" olan her satır indirmeden önce sayfadan doğrulanmalıdır.

### 6.2 Lisans riskleri

| Risk | Kaynak | Durum |
|---|---|---|
| Lisans çelişkili / yalnız yorumcu beyanı | G9 Reactorcore, G17 ragnapixel | **kullanma** |
| "Yeniden dağıtma yasak" (açık depoda varlık = dağıtım) | G19 BlackCreepyCat, G20 Frostwindz | **kullanma** |
| Şartlar sayfası okunmadı, API anahtarı gerekiyor | G15 ParticleFX Studio | **kullanma** (şimdilik) |
| Çıktı lisansı yazılı değil | S17 jsfxr | **kullanma** |
| CC0 değil; AI eğitimi + yeniden dağıtım yasağı, Content ID | S14 Pixabay | **kullanma** (sahip kararı) |
| Ses başına lisans; NC sesler var | S13 Freesound | ses ses doğrulanmadan **kullanma**; NC = kullanma |
| İkinci el lisans beyanı | S12 InspectorJ (ayna), S4 Junkala (ayna INFO dosyası), S10 "2" sayfası | indirmeden önce asıl sayfa |
| CC0 ama atıf ricası | G10 13rice | kullanılabilir, kredilere yaz |
| Genç proje, API değişimi | G3 pixelfx 0.3.0 | commit SHA'ya kilitle, pişmiş çıktı depoda kalsın |
| MIT bildirim yükümlülüğü | G1-G4 | krediler sayfası + `docs/art/krediler.md` |
| Türev zinciri | G2 codex = 00GD + pixel-plays (müziği MIT dışı, kullanılmıyor) | yalnız efekt dosyaları |

### 6.3 Teknik riskler
- pixelfx/codex çıktısının **dither ve ışık dili** topaç sprite'larımızla tutarsız görünebilir → D1'de yan yana karşılaştırma, gerekirse dither kapalı (codex 2B kamera) ya da yalnız silüet + kendi rampamız.
- Sheet efektleri **yönsüz**: çarpışma normali her açıda; dönen sprite pixel ızgarasını bozar (pixel planı "rotation" yasağıyla aynı sorun) → 8 yön ön-pişirme (45° adım, atlas maliyeti ×8, yalnız hit-spark için) ya da yalnız simetrik efektler + kod kıvılcım konisi.
- Bellek/çizim: tek atlas, tek doku = toplu çizim; 400 parçacık sınırı (pixel planı § 5.3) değişmez.
- D3 raporu: sesler headless'ta yalnız sayıldı, **hiç dinlenmedi**; kayıt seçimi ve karışım gerçek kulakla yapılmalı.

---

## 7. Sahip kararı bekleyenler

1. **Ağ izni:** 00gamedevs.com, kenney.nl, opengameart.org, itch.io, freesound.org alanlarının oturum ağ ayarına eklenmesi (lisans sayfalarını aynen okumak ve indirmek için). Olmazsa varlıkları sahip elle indirip `kaynak/` dışında bir yere koyar, ajan okur.
2. **Kod üretimli efekt kütüphanesi (pixelfx) derleme aracı olarak kullanılsın mı?** Yeni geliştirme bağımlılığı (`@axiom` onayı), MIT bildirimi kredilerde.
3. **Görsel çıta:** dither'lı codex dili mi, düz bantlı (dither yok) dil mi? (D1 yan yana kareyle.)
4. **Kayıt ses katmanları** (Durma bozuk parası, Parçalanma camı, metal çınlama) sentez yerine/üstüne eklensin mi?
5. **Müzik:** arena ve menü için CC0 iki aday (M1 pmiller, M5 tamesu) dinlenip seçilsin; yayında Content ID riski kabul mü?
6. **Pixabay ve Freesound:** tamamen dışarıda mı kalsın (öneri: evet), yoksa ses başına CC0 doğrulamasıyla Freesound açılsın mı?
7. **Ses biçimi:** OGG + yedek (Safari) mi, WAV kalsın mı (bütçe 500 KB içinde ikisi de mümkün)?
8. **`pixi-filters`** (Ulti/Takım Ultisi şok dalgası filtresi) bağımlılığı denensin mi?

---

## Kaynakça (bu araştırmada açılan/aranan)

- 00GameDevs: https://00gamedevs.com/en/ · https://00gamedevs.com/en/objects/ · https://00gamedevs.com/en/shaders/core-basic/ (erişilemedi; arama özeti)
- pixel-vfx-codex: https://github.com/888wing/pixel-vfx-codex (README, LICENSE, `data/meta.js` okundu) · https://github.com/888wing/pixel-vfx-codex/releases/tag/v1.0.0
- pixelfx: https://github.com/patch-gg/pixelfx (README, LICENSE, NOTICE.md, package.json, docs/CATALOG.md okundu)
- Sprite Fusion VFX: https://www.spritefusion.com/pixel-art-vfx
- Kenney: https://kenney.nl/assets/particle-pack · https://opengameart.org/node/85611 · https://opengameart.org/content/interface-sounds · https://opengameart.org/content/sci-fi-sounds · https://opengameart.org/content/50-rpg-sound-effects
- itch.io: https://foozlecc.itch.io/pixel-magic-sprite-effects · https://aim-studios.itch.io/explosions-pixel-art · https://reactorcore.itch.io/explosion-spriteanim-sheet-minipack · https://ragnapixel.itch.io/particle-fx · https://frostwindz.itch.io/pixel-art-skill-animations-lightning · https://blackcreepycat.itch.io/spritesheet-flare-effects-vol-1 · https://sfbgames.itch.io/chiptone
- OpenGameArt: https://opengameart.org/content/radial-lightning-effect · https://opengameart.org/content/m484-lightning-weapon · https://opengameart.org/content/lightning · https://opengameart.org/content/free-vfx-asset-pack · https://opengameart.org/content/hit-animation-frame-by-frame · https://opengameart.org/content/free-game-fx · https://opengameart.org/content/metal-impact-sounds · https://opengameart.org/content/metal-interactions · https://opengameart.org/content/impact · https://opengameart.org/content/100-cc0-metal-and-wood-sfx · https://opengameart.org/content/100-cc0-sfx-2 · https://opengameart.org/node/142820 · https://opengameart.org/content/glass-break · https://opengameart.org/content/ice-breakingshattering · https://opengameart.org/node/28043 · https://opengameart.org/content/chipped-urgency · https://opengameart.org/content/fast-fight-battle-music · https://opengameart.org/content/menu-theme · https://opengameart.org/content/chiptune-title-screen · https://opengameart.org/content/menu-chill-music
- Diğer: https://bigsoundbank.com/coin-spinning-on-a-table-4-s2700.html · https://particlefx.studio/effects · https://raphaelhatencia.artstation.com/store/bk322/particle-fx-pixel-art · https://pixabay.com/service/faq/ · https://github.com/ttencate/jfxr · https://github.com/mneubrand/jsfxr
- PixiJS 8: https://pixijs.com/8.x/guides/components/scene-objects/particle-container · https://pixijs.com/blog/particlecontainer-v8 · https://pixijs.download/v8.8.0/docs/scene.html · npm `@pixi/particle-emitter` 5.0.10, `pixi-filters` 6.1.5

---

## 8. 2. tur (2026-11-04): doğrulama, indirme, sahip kararları

### 8.1 Doğrulama sonucu (alan adı başına)

Yöntem: konteynerden `curl` (ajan vekili) ve WebFetch aracı, URL başına bir deneme. "A" satırlarının hiçbiri asıl sayfadan okunamadı; **hiçbir A satırı K olmadı**, yalnız GitHub'dan okunabilenler güncellendi.

| Alan adı | curl (konteyner) | WebFetch | Etkilenen satırlar |
|---|---|---|---|
| 00gamedevs.com | CONNECT 403 | `getaddrinfo ENOTFOUND` | G1 (A kalır; lisans codex LICENSE üzerinden K) |
| kenney.nl | 403 | ENOTFOUND | G5, G6, S1-S3 (S1 → **K-ayna**: GitHub aynasından dosya düzeyinde doğrulandı) |
| opengameart.org | 403 | ENOTFOUND | G6, G10-G14, G18, S2-S9, S11, M1-M9 |
| itch.io ve alt alanlar (foozlecc, aim-studios, reactorcore, ragnapixel, frostwindz, blackcreepycat, sfbgames) | 403 | ENOTFOUND | G7-G9, G17, G19-G21, S15 |
| bigsoundbank.com | 403 | ENOTFOUND | S10 |
| freesound.org, pixabay.com | 403 | — | S12-S14 |
| www.spritefusion.com, particlefx.studio, raphaelhatencia.artstation.com | 403 | ENOTFOUND | G4, G15, G16 |
| \*.github.io (888wing, patch-gg galerileri) | 403 | — | G2, G3 demoları (depo okunabildi) |
| **github.com, raw.githubusercontent.com** | **açık** | — | G2, G3, S16 (**K**), S1 (K-ayna) |

**Sahibe tek adım:** oturum başlığındaki bulut ortamı menüsü → Edit → Network access → Allowed domains: `00gamedevs.com, kenney.nl, opengameart.org, itch.io, *.itch.io, bigsoundbank.com, freesound.org, spritefusion.com, particlefx.studio, *.github.io` ekle.

**K-ayna** = dosyalar ve lisans dosyası üçüncü kişi aynasından okundu; asıl sayfa okunmadı. Entegrasyondan önce asıl kaynakla karşılaştırılır.

### 8.2 Kaynak başına somut varlıklar (Devran olayına göre)

**pixelfx** (MIT, commit `a841596`, `src/fx/<id>.js`, tuval ve süre dosyanın `meta`sından aynen; hepsinde yazı yok, kontrol edildi):

| id | Tuval · süre | Olay | Palet |
|---|---|---|---|
| `impacts/hit-spark` | 136×80 · 0,5 sn | Ağır çarpışma (hafifte ilk 4-5 kare) | nötr |
| `impacts/crit-hit` | 216×136 · 0,9 sn | Kritik çarpışma | nötr |
| `impacts/ricochet` | 232×84 · 1,1 sn | Duvar/kenar (yedek) | nötr |
| `impacts/heavy-landing` | 176×80 · 1,6 sn | Durma, Ring Out kenar tozu | nötr |
| `impacts/ground-slam` | 288×208 · 3,2 sn | Parçalanma zemin şoku | Kaya |
| `spawn/poof` | 112×92 · 1,6 sn | Parçalanma toz bulutu | nötr |
| `lightning/zap-hit` | 144×112 · 0,9 sn | Karşıt element (Şimşek) | Şimşek |
| `lightning/charge-up` | 272×184 · 2,7 sn | Ulti telegrafı şarjı | element |
| `ice/ice-shatter` | 224×112 · 2,8 sn | Don çarpışma / Parçalanma | Don |
| `ice/frost-nova` | 288×192 · 3,4 sn | Don Ulti | Don |
| `fire/fire-ring` | 224×128 · 3,9 sn | Kor Ulti | Kor |
| `nature/earth-spike` | 272×150 · 3,4 sn | Kaya Ulti | Kaya |
| `nature/tornado` | 196×168 · 2 sn döngü | Kasırga Ulti / Alanı | Kasırga |
| `explosions/implosion` | 208×184 · 1,65 sn | Girdap Ulti | Girdap |
| `water/whirlpool` | 128×84 · 3 sn döngü | Girdap Çekimi dekali | Girdap |
| `pickups/collect-burst` | 112×108 · 1,35 sn | Enerji doldu | nötr |

Hepsi 30 fps; ham tam tuval toplamı 2048²'nin **8,1 katı**. Reçete (12 fps, efekt başına 6-14 kare, hedef kutuya kırpma) ≈ **%42**: `veri/manifest-gorsel.json` → `atlas`.

**pixel-vfx-codex** (MIT, commit `a7f829b`, 64 efekt `fx/<id>.js`): § 1.1'deki id'lerin 10'u varlığıyla kontrol edildi (`shockwave`, `spell-indicator-circle`, `energy-burst`, `ice-shatter`, `magma-fissure`, `burning-ground`, `frost-field`, `spiral-gale`, `thunder-strike`, `tidal-surge`). Kamera boyutları README'den aynen: 3D 240×150 30 fps · 2.5D 240×150 20 fps (Bayer dither) · **2D 160×100, "flat colour bands, no dither and 1 px outlines, stepped at 12 fps"** → bizim için 2D. Hazır sheet yok.

**00gamedevs.com:** site okunamadı. Somut liste yalnız codex `data/meta.js` üzerinden (§ 1.1); lisans, codex LICENSE'ındaki aktarım: "The MIT License / Copyright (c) 2026 00GameDevs (@00vchannel)" ve "The 00GameDevs website UI, branding, avatars and promotional images are not covered by that license and are not used here."

**Kenney Impact Sounds** (CC0, K-ayna): 26 grup × 5 dosya. Seçilen 12 dosya § 8.3'te.

**OpenGameArt, BigSoundBank, itch.io, ChipTone:** okunamadı; § 1-2'deki A satırları geçerli, yeni somut veri yok. **jfxr:** K (lisans § 2 S16).

### 8.3 İndirilenler

| Dosya | Kaynak | Lisans | Süre / boyut | Hedef olay |
|---|---|---|---|---|
| `impact_metal_light_000/002/004.ogg` | Kenney Impact Sounds (ayna) | CC0 | 0,35 / 0,24 / 0,21 sn · 21,1 KB | Hafif çarpışma (3 varyant, perde ±%8) |
| `impact_metal_medium_001/002.ogg` | 〃 | CC0 | 0,14 / 0,12 sn · 12,0 KB | Ağır çarpışma "çın" (sentez alt vuruşla) |
| `impact_metal_heavy_000/003.ogg` | 〃 | CC0 | 0,17 / 0,21 sn · 12,3 KB | Kritik / Dash çarpması |
| `impact_tin_medium_002.ogg`, `impact_plate_heavy_001.ogg` | 〃 | CC0 | 0,13 / 0,35 sn · 14,9 KB | Duvar "tonk" |
| `impact_glass_heavy_001/004.ogg` | 〃 | CC0 | 0,43 / 0,40 sn · 17,2 KB | Parçalanma kırılma katmanı |
| `impact_bell_heavy_004.ogg` | 〃 | CC0 | 0,30 sn · 6,5 KB | Enerji doldu (sentez ding ile kıyas) |
| `LICENSE`, `NOTICE.md`, `recete.json` | pixelfx | MIT | — | Pişirme reçetesi (PNG yok) |
| `LICENSE` | pixel-vfx-codex | MIT | — | Yedek kaynak |

Ses: yeni 84 101 bayt + mevcut sentez 204 716 = **288 817 bayt ≤ 500 KB**. Görsel: atlas üretilmedi (tahmin %42 / 2048²).

Kayıtlar: `veri/manifest-ses.json` → `kayitAdaylari` (oyun yüklemiyor), `veri/manifest-gorsel.json` (yeni), krediler `docs/art/krediler.md`.
**Dikkat:** `araclar/ses-uret.ts` `manifest-ses.json`'u baştan yazar; tekrar çalıştırılırsa `kayitAdaylari` bloğu silinir. Entegrasyon diliminde ayrı dosyaya taşınmalı ya da araç bloğu korumalı.

### 8.4 Yapılamayanlar

- **PNG pişirme:** pixelfx/codex depolarında hazır görsel yok; sheet `node tools/render.mjs` / `tools/snap.mjs` ile üretiliyor. Bu oturumda indirilen dış kodu çalıştırma izni verilmedi, PNG üretilmedi.
- BigSoundBank (Durma, bozuk para), OGA Glass Break, müzik adayları: alan adları engelli, indirilemedi.

### 8.5 Sahip kararı bekleyenler (§ 7'ye ek)

1. **Ağ izni** (§ 8.1 tek adım). Açılınca: A satırlarının doğrulanması, Kenney orijinal paketiyle karşılaştırma, S10 bozuk para + S8 cam + M1/M5 müzik indirmesi.
2. **pixelfx render aracının çalıştırılması:** reçetedeki 16 efekti pişirmek için `node tools/render.mjs` (sabit commit, ağ erişimi yok, yalnız PNG/JSON yazar) çalıştırma izni ya da sahibin yerelde çalıştırıp çıktıyı koyması.
3. Kenney sesleri ayna kökenliyken entegre edilsin mi, yoksa kenney.nl doğrulaması mı beklensin? (Öneri: bekle; CC0 olduğu için risk düşük, ama köken kaydı temiz olsun.)
4. Ogg Vorbis + Safari yedeği kararı (§ 7 madde 7) bu dosyalar için de geçerli.

### 8.6 3. tur (2026-11-04 akşam): hibrit kamera notu, yeniden ağ denemesi

**Ağ:** ana oturumdan "ağ erişimi açıldı" mesajı geldi; bu konteynerde 22:48 UTC'de yeniden denendi: 00gamedevs.com, kenney.nl, opengameart.org, foozlecc.itch.io, bigsoundbank.com, freesound.org, www.spritefusion.com hâlâ **CONNECT 403** (vekil durum kaydı). Ortam ayarı büyük olasılıkla yalnız **yeni oturum konteynerlerine** uygulanıyor; bu oturumda A satırları yine doğrulanamadı, yeni ses indirilmedi.

**Render:** pixelfx `tools/render.mjs` çalıştırılmadı. Onay ana oturumun mesajı olarak geldi; bu oturumun izin denetimi dış kodu çalıştırmayı reddetmişti ve başka oturumdan iletilen onay bu oturumda izin yerine geçmez. Sahip bu oturumda doğrudan onay verirse ya da yeni oturum açılırsa pişirme reçeteden yapılır.

**Hibrit kamera (fizik düz, sunum eğik elips çanak, topaçlar ~15-20° eğik; `tasarim-dili.md` K-1 C):**
- pixelfx **yan görünüş** (platform oyunu) kamerası varsayar: zemin elipsleri çok basık. Kaynaktan ölçülen ry/rx: `heavy-landing` 15×2,5 (0,17), `ground-slam` 30×4,5 (0,15), `fire-ring` 14×4 (0,29), `whirlpool` `SY = 0.6`. `frost-nova` halka cephesi yalnız sola/sağa (±x) yayılır. Bizim çanak k_y ≈ 0,85-0,90: pixelfx'in zemin öğeleri bizim zeminde **yandan bakılmış gibi** okunur.
- Bu yüzden reçetedeki her efekt `duzlem` alanı aldı (`veri/manifest-gorsel.json`, `kaynak/efekt/pixelfx/recete.json`):
  - **hava** (doğrudan kullan): `hit-spark`, `crit-hit`, `poof`, `zap-hit`, `ice-shatter`, `tornado`, `implosion`, `collect-burst`. Eğik topaçlarla uyumlu; referans 07'deki ışınsal yıldız patlamasına en yakın öğe `crit-hit` / `hit-spark`.
  - **zemin** (elips varyant gerekir): `ricochet`, `heavy-landing`, `ground-slam`, `frost-nova`, `fire-ring`, `whirlpool`.
  - **hava+zemin**: `charge-up`, `earth-spike` (havadaki parça sheet'ten, zemin parçası kodla).
- **Zemin dekalleri için elips varyant kuralı:** (1) Şok çemberi, toz halkası, Ulti telegraf halkası (dolan kırmızı halka, referans 08'deki eş merkezli iki halka), Alan Ulti dekalleri **kodla** `ellipse(rx, rx·k_y)` çizilir. Bugünkü kod yolu zaten Graphics; yalnız y ölçeği eklenir, entegrasyon dilimi. (2) Sheet'ten zemin öğesi istenirse efekt **yerel fork**'ta (MIT, değişiklik notuyla) zemin oranı k_y'ye göre yeniden parametrelenip pişirilir: `whirlpool` için `SY` 0,6 → k_y. (3) Pişmiş sheet tam sayı olmayan dikey ölçekle **basıklaştırılmaz**, çünkü pixel ızgarası bozulur (pixel planı § 1.3).
- Kıvılcım yönü: `hit-spark` `aim` seçeneği çarpışma normalinin **ekran** açısına göre verilir: `(nx, nz·k_y)`, 05 § 3.3 ile aynı çevrim. 8 yön ön pişirme önerisi (§ 6.3) geçerli.
- Atlas bütçesi değişmez (~%42): zemin öğeleri koddan geleceği için zemin sheet'leri kırpılıp küçülebilir.

### 8.7 Pişirme (2026-11-04, sahip onayı)

- **Komut:** `node tools/render.mjs <id> --sheet --no-actor --bg none --fps 12 [--opts '{"palette":[...]}']` (pixelfx `a841596`), sonra kare başına şeffaf kenar kırpma + raf paketleme (`kaynak/efekt/pixelfx/arac/`).
- **İlk deneme reddedildi:** reçetedeki kare sınırı uzun efektlerde 3-4 fps verdi; § 5.2'deki 12 fps kuralına dönüldü.
- **Bütçe:** 12 fps'te birleşik kutu kırpmayla tek atlas 2048²'nin 2,28 katı. § 5.2'deki öngörüyle bölündü:

| Atlas | Boyut | Kare | Bayt | Efektler |
|---|---|---|---|---|
| `efekt.png` (ortak) | 2048×1024 | 114 | 656 625 (§ 9.7 yeniden pişirme) | kivilcim, kritik, sekme-iz, toz-halka, zemin-sok, toz-bulut, enerji-doldu |
| `efekt-kor.png` | 1024² | 45 | 516 616 | ulti-kor |
| `efekt-don.png` | 1024² | 74 | 419 354 | don-kirilma, ulti-don |
| `efekt-kaya.png` | 1024² | 39 | 188 952 | ulti-kaya |
| `efekt-kasirga.png` | 1024×512 | 24 | 362 125 | ulti-kasirga |
| `efekt-girdap.png` | 1024² | 55 | 518 978 | ulti-girdap, girdap-dekal (SY 0,875 fork) |
| `efekt-simsek.png` | 1024×512 | 42 | 262 715 | simsek-carpma, telegraf-sarj |

Maçta en çok 3 atlas yüklenir: ortak + iki elementinki. Toplam PNG 2,93 MB; tek maçta ~1,7 MB.

**Önizlemede görülenler** (`kaynak/efekt/pixelfx/onizleme.png`, gözle bakıldı):
- **Doğru çıkanlar:**
  - Element paletleri tuttu: Don camgöbeği, Kor turuncu, Kasırga yeşil, Girdap mavi, Kaya bej, Şimşek sarı.
  - `crit-hit` ve `hit-spark` referans 07'deki sarı-beyaz ışınsal patlamaya yakın.
  - `tornado` dikey ve hibrit kamerada iyi okunuyor.
  - `whirlpool` fork'ta daha yuvarlak çıktı (k_y'ye uygun).
- **Sorunlu çıkanlar:**
  - `frost-nova`, `fire-ring`, `ground-slam` ve `charge-up` zemin halkaları, § 8.6'da beklendiği gibi **çok basık** (yan görünüş). `fire-ring` son karelerinde yassı koyu yanık lekesi de var. Bu halkalar kodla elipse çevrilmeli ya da yalnız hava öğeleri kullanılmalı.
  - `ground-slam`, `heavy-landing`, `poof` ve `collect-burst` pixelfx'in varsayılan **mor-gri / pembe** paletinde kaldı. `ground-slam`'da `stone: #4a3f69` seçeneği de mor; reçeteye yalnız `palette` verildi. Tasarım diline uymuyor: yeniden pişirmede nötr toz rampası (§ 5.3 Kaya rampası ya da gri-bej) ve `stone` seçeneği verilmeli.
- **Entegrasyon için (src/ dilimi):** atlaslar `public/efekt/`'e taşınır; Pixi `Spritesheet` JSON doğrudan yüklenir (`animations` → `AnimatedSprite`, kare süresi `meta.devran.<ad>.kareMs`). `scaleMode = "nearest"`.

## 9. 4. tur (2026-11-04, 23:06-23:30 UTC): ağ açıldı, doğrulama ve indirme

### 9.1 Alan adları

- **İlk deneme (23:06):** 5 alan adının hepsi vekilde `CONNECT 403` verdi (policy denial). Sahip ortamın Network access ayarını **Full** yaptı; ayar oturuma yaklaşık 1 dakikada geçti (yeni oturum gerekmedi).
- **Açılanlar (curl 200):** opengameart.org, 00gamedevs.com, bigsoundbank.com, foozlecc.itch.io, aim-studios.itch.io, reactorcore.itch.io, ragnapixel.itch.io, frostwindz.itch.io, kenney.itch.io, www.spritefusion.com, particlefx.studio, github.com.
- **Hâlâ engelli:**
  - **kenney.nl:** sitenin kendi sunucusu (nginx) otomatik istemciye `HTTP 403` veriyor; vekil engeli değil. Tarayıcı kimliğine bürünme denenmedi.
  - **raphaelhatencia.artstation.com:** 403.
  - **sfbgames.itch.io, blackcreepycat.itch.io:** itch `429` hız sınırı.
- **itch.io indirmeleri:** "Name your own price" indirme akışı (`/download_url` POST) Claude Code otomatik izin denetimince reddedildi. Lisans doğrulandı, dosyalar indirilmedi.

### 9.2 Doğrulama (lisans metni sayfadan aynen)

| # | Sayfadan aynen | Sonuç |
|---|---|---|
| G1 00GameDevs | Ana sayfa: "Exported assets are free to use commercially and modify." · "Original exported code is MIT licensed. Keep included copyright and license notices. Website branding, avatars and promotional artwork are excluded. Third-party code keeps its own notices." · Lisans penceresi: "You may modify, share, redistribute and sell the code." · "Attribution in the credits is optional." · "Keep the supplied copyright and license text when copying, sharing or shipping with your game." · "Formal license: MIT" | **K**: MIT, bildirim korunur. `/en/license` diye ayrı bir sayfa yok (404); metin sitenin JS penceresinde |
| G7 Foozle | "License: (Creative Commons Zero, CC0) http://creativecommons.org/publicdomain/zero/1.0/ This content is free to use and modify for all projects, including commercial projects. Attribution not required." · itch meta: "Asset license Creative Commons Zero v1.0 Universal" · "A set of 10 Pixel Magic Spell Effects with Icons in 32x32 format." · dosya `Foozle_2DE0001_Pixel_Magic_Effects.zip` 101 kB · "Commissioned from: lordfitoi" | **K** CC0, 32×32 |
| G8 Aim Studios | "LICENSE: CC0 License. You can use the assets, modified or as it is, in your commercial as well as non-commercial projects without credit or mention." · meta CC0 1.0 · 9 sheet: Blast/Explosion default+blue 32×32, Realistic Explosion default/green/fantasy… 64×64 | **K** CC0 |
| G9 Reactorcore | Sayfada lisans yok; yorum: "licence?" → yazar "CC0" · 10 sheet, 4×4 kare, 8× 32 px, 2× 64 px | **dikkat** (değişmedi) |
| G14 | Yazar: wreaderror; "eight 2048x512px PNGs … 4 Purpleish and 4 Blueish" | **K**, yazar adı düzeltilmeli (Calinou değil) |
| G17 | "LICENCE: Creative Commons Attribution v4.0 International … You must credit me as Raphael Hatencia" · meta: CC-BY 4.0 · 3,99 $ + ücretsiz demo `Particle FX 1.3 Free.zip` | **K**: CC-BY 4.0. Önceki "çelişki" uyarısı geçersiz; tam paket ücretli |
| G20 Frostwindz | "You are not allowed to redistribute or resell the assets." | **K**: kullanma (değişmedi) |
| S10 BigSoundBank #2700 | "License CC0 (public domain): Free and royalty-free" · "Sound of a €2 coin spinning on my varnished wooden kitchen table. It turns, then slows down and stops." · 0:15, 48 kHz stereo · lisans sayfası: "This is: Creative Commons CC0 1.0 Universal" (sayfa başlığı "Royalty-Free Sound License (CC0-like)") · yazar Joseph SARDIN | **K** CC0 |
| S8, S9, S2, M1, M5 | OGA alanları: "License(s): CC0" | **K** |

Ayrıntılar (yazar, dosya, süre) § 1-2 tablolarının Doğrulama sütununda.

**Çelişkiler:**
- G14'ün yazarı wreaderror.
- S7 `node/142820` bir koleksiyon sayfası.
- S11'in başlığı "Coin Drop", yazarı Vinrax.
- G17 için verilen çelişki uyarısı geçersiz: sayfa ve itch meta verisi ikisi de CC-BY 4.0. Paket ücretli, ücretsiz bir demosu var.
- M5'in OGG dosyası yok (MP3 + MIDI + BeepBox).

### 9.3 İndirilenler (ses)

Tümü CC0. Dönüştürme: `ffmpeg -ac 1 -ar 22050 -c:a libvorbis -q:a 2 -map_metadata -1`. Kenney UI dosyaları **dönüştürülmedi** (paket dosyası aynen).

| Dosya | Kaynak | Hedef olay | Süre | Bayt | sha256 (indirilen asıl dosya) |
|---|---|---|---|---|---|
| `kaynak/efekt/bigsoundbank/bsb-2700-coin-spinning-durma.ogg` | BigSoundBank #2700 FLAC, 12,60-13,95 sn kırpıldı (para 13,75 sn'de duruyor), 40 ms giriş + 150 ms çıkış sönümü | durma | 1,35 sn | 9 773 | FLAC `b945fc7b…4759a040` |
| `kaynak/efekt/oga-glass-break/glass_breaking.ogg` | OGA Glass Break (Till Behrend), WAV → OGG | parcalanma | 1,31 sn | 10 520 | WAV `37d29069…93f502b3` |
| `kaynak/efekt/oga-ice-shatter/LedasLuzta.ogg`, `LedasLuzta4.ogg` | OGA Ice breaking/shattering (IgnasD), 44,1 → 22,05 kHz | don-kirilma (2 varyant) | 0,59 / 1,04 sn | 6 792 / 9 758 | zip `b84ea396…e41cf9eb7` |
| `kaynak/efekt/kenney-interface-sounds/click_001.ogg`, `confirmation_001.ogg` | Kenney Interface Sounds 1.0 (OGA zip, Kenney `License.txt` dahil) | ui-tik, ui-onay | 0,10 / 0,29 sn | 4 876 / 8 968 | zip `f2193d07…27c81232` |

**Ses bütçesi:** 288 817 + 50 687 = **339 504 B ≤ 512 000** (kalan 172 496 B ≈ 168 KiB).

- `click_002`…`005` 10 ms'lik çok kısa tıklar; bu yüzden `click_001` seçildi.
- Buz paketinde 5 dosya var; 2'si alındı.

### 9.4 Müzik: bütçeye sığmıyor (indirilmedi, depoya konmadı)

| Aday | Asıl | Süre | Deneme kodlaması (mono) |
|---|---|---|---|
| M1 `battle_music_01-loop.ogg` | 2 724 366 B, 44,1 kHz stereo | 152 sn (döngü noktası ~7,5 sn) | Vorbis 22 kHz q0: 552 949 B · Opus 16k: 339 238 B |
| M5 `menu_title.mp3` | 1 577 378 B | 65,7 sn | Vorbis 22 kHz q0: 213 160 B · Opus 16k: 176 814 B |

Efektlerden sonra kalan ~168 KiB, en küçük denemeye (M5 Opus 16k) bile yetmiyor. Seçenekler (**sahip kararı**):
- (a) Müzik için ayrı bir bütçe (ör. ≤ 600 KB, akışla yüklenir).
- (b) M5'in BeepBox kaynağından 15-20 sn'lik kısa bir döngü üretilir (≈ 40-60 KB).
- (c) Müzik ertelenir.

M1'in 152 sn'lik parçası kesilerek kısaltılamaz; döngü yapısı buna izin vermiyor.

### 9.5 Görsel paketler (G7, G8): indirildi (sahip izniyle)

Sahip "her şeyi çalıştırabilirsin" dedi. itch ücretsiz ("Name your own price", 0 $) indirme akışı betikle izlendi: `download_url` → indirme sayfası → `file/<id>`. İmzalı bağlantılar 60 sn geçerli.

| Paket | Klasör | İçerik | Kare | Değerlendirme (hibrit kamera, gözle) |
|---|---|---|---|---|
| G8 Aim Studios | `kaynak/efekt/aim-explosions/` | 9 PNG, ~51 KB | 32 px (3×3) ve 64 px şeritler | **Uygun (hava):** `Realistic_Blast_default` (11 kare: yıldız → turuncu bulut → duman), Kor ağır çarpışma / Parçalanma · `Foam_bubble_explosion` (10 kare, camgöbeği parçalar), Don / Parçalanma kırıkları · `Blast_*` 32 px, çarpışma. **Uymaz:** yeşil ve macenta varyantlar. Kontur yok, doygun; element rampasına göre yeniden renklendirilmeli |
| G7 Foozle | `kaynak/efekt/foozle-pixel-magic/` | birleşik sheet 640×832 + ikonlar + Readme | **64×64** (sayfadaki "32x32" yalnız ikonlar) | **Yedek havuz:** Explosion, Tornado, Earth_Spike (dikey, okunur). **Kullanılmaz:** Fire_Ball, Water, Wind, Molten_Spear (yandan mermi), Rocks (yandan, basık), Portal (mor). Koyu konturlu RPG stili, pixelfx'ten kalın çizgili: birlikte kullanılırsa stil farkı belirgin olur |

**Atlas etkisi:** Önerilen seçim (Aim 3 sheet + Foozle 3 sütun) ortak atlasa sığar; 2048²'nin < %5'i. Atlasa henüz alınmadı; `veri/manifest-gorsel.json` → `kayitAdaylari`.

**Sanat yönetmeni önerisi:**
- Birincil efekt dili pixelfx olarak kalır.
- Aim `Realistic_Blast_default` ve `Foam_bubble_explosion`, Parçalanma için pixelfx'te olmayan "dolu bulut" ve "kırık parça" katmanını verir. Element rampasına yeniden renklendirilerek eklenmesini öneririm.
- Foozle yalnız yedek.

### 9.6 Kenney Impact Sounds orijinal karşılaştırma

kenney.nl otomatik istemciyi reddediyor (§ 9.1). Paket OGA'da ve kenney.itch.io'da yok (itch'te yalnız ücretli "All-in-1" var). sha256 karşılaştırması **yapılamadı**; durum **K-ayna** olarak kalıyor.
- **Dolaylı kanıt:** Aynı yazarın OGA'daki Interface Sounds zip'inde Kenney'nin `License.txt` şablonu var ("License: (Creative Commons Zero, CC0)"). Impact paketinin kendi `License.txt`'si alınamadı; **uydurulmadı**.
- **Sahip için:** kenney.nl/assets/impact-sounds'tan zip'i tarayıcıdan indirip depoya (ya da sohbete) koyarsan karşılaştırırım.

### 9.7 pixelfx toz paleti (pişirildi, sahip izniyle)

`recete.json` ve `arac/bake.py` güncellendi: `secenek` alanı `--opts`'a ekleniyor; eski `kareSiniri` KeyError'ı giderildi.

| Efekt | Palet | Ek seçenek |
|---|---|---|
| `impacts/heavy-landing` | toz-7: `#1E1A14,#3A3024,#5E5040,#8A7458,#A8987C,#C2AC86,#EDE0C8` | `stone: #6E604C` |
| `impacts/ground-slam` | kaya (değişmedi) | `stone: #6E604C` (eski mor `#4a3f69` yerine) |
| `spawn/poof` | toz-6: `#3A3024,#6E604C,#A8987C,#C2AC86,#EDE0C8,#FFFFFF` | `stars: #C2AC86,#EDE0C8,#FFFFFF` |
| `pickups/collect-burst` | nötr açık-8 `#1E1A14 … #FFFFFF` (oyunda element rengiyle tint) | — |

**Pişirme (sahip "her şeyi çalıştırabilirsin" dedi):** 16 efektin hepsi yeniden render edildi (`arac/bake.py`, `pack.py`, `prev2.py`). Çıktı deterministik: 6 element atlası bayt bayt aynı çıktı; yalnız `efekt.png` + `efekt.json` değişti (656 280 → 656 625 B). Önizlemede gözle bakıldı:
- `toz-halka` (heavy-landing) ve `toz-bulut` (poof) bej-gri toz; yıldızlar krem.
- `zemin-sok` (ground-slam) taşları ve dumanı sıcak gri; mor yok.
- `enerji-doldu` (collect-burst) beyaz-krem; oyunda element rengiyle tint edilecek.

### 9.8 Sahip kararı bekleyenler

- **K10 müzik bütçesi:** § 9.4'teki (a), (b) ya da (c).
- **K12 elle indirme:** Yalnız Kenney Impact zip'i (kenney.nl otomatik istemciyi reddediyor; tarayıcıdan).
- **K14 Aim/Foozle seçimi:** § 9.5 önerisi (Aim 2 sheet Parçalanma/Don için, Foozle yedek) onaylanırsa ortak atlasa eklenir.
- **K13 G17 Ragnapixel (CC-BY 4.0):** Yalnız ücretsiz demo kullanılabilir; gerekli mi?
