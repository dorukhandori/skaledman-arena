# Skaledman Arena: iskelet seçimi ve mimari

Tarih: 2026-11-01. Önceki belgeler: [pokerivals-inceleme.md](../research/pokerivals-inceleme.md), [oyun-konsepti.md](../design/oyun-konsepti.md). Bu belge "hangi hazır iskeletten başlıyoruz, kod nasıl bölünüyor, ağ nasıl çalışıyor, nasıl yayına çıkıyor" sorularını kapatır.

## 1. Karar özeti

**Tek bir hazır oyun iskeleti klonlanmaz.** GitHub'da "PixiJS 8 + Colyseus + gerçek zamanlı arena" olarak güncel ve bakımlı tek repo yok. Bunun yerine üç **resmî** kaynak birleştirilir; hepsi Colyseus ve PixiJS ekiplerinin kendi depoları, bakımlı ve MIT:

| Katman | Kaynak | Ne alınır |
|---|---|---|
| Proje iskeleti ve geliştirme döngüsü | [colyseus/vite](https://github.com/colyseus/vite) (resmî başlangıç, Nisan 2026) | Tek `vite` süreci içinde hem istemci hem sunucu, iki tarafta da HMR; `vite build --app` ile tek komutta üretim paketi. React kısmı atılır, yerine Pixi gelir |
| Ağ kodu (tahmin, uzlaştırma, gecikme telafisi) | [colyseus/prediction-playground](https://github.com/colyseus/prediction-playground) (resmî, Ekim 2026) + [netcode belgeleri](https://docs.colyseus.io/netcode/client-prediction) | Colyseus **0.18'e gömülü** `defineInput`, `setFixedTimestep`, `Predict.reconciler`, `attachAll` (lerp), `allowRewindState` + `lastSeenBy`, `predict.spawns`, `defineEvent`. 11 laboratuvarın kodu birebir örnek |
| Oda ve dünya kalıbı | [colyseus/realtime-tanks-demo](https://github.com/colyseus/realtime-tanks-demo) `server/` (0.17, Nisan 2026) | `BattleRoom`: ızgara tabanlı uzamsal dünya (`World`/`Cluster`), daire-dikdörtgen çarpışma (`Block`), mermiler, toplanabilirler, takımlar, yeniden doğma, 20 Hz döngü, yük testi botu (A* ile). Üstten bakışlı aksiyon odasının tamamı |
| İstemci klasör yapısı | [pixijs/open-games](https://github.com/pixijs/open-games) `bubbo-bubbo` | `screens/` + `navigation.ts`, `game/systems`, `game/entities`, `Pool`, `SystemRunner`, AssetPack ile varlık hattı, `@pixi/ui`, `@pixi/sound`, gsap |

Elenenler ve nedeni:

| Aday | Yıldız | Neden değil |
|---|---:|---|
| halftheopposite/TOSIOS | 448 | Colyseus 0.14, Pixi 6, React 16; 2019 mimarisi, taşıması yazmaktan pahalı |
| HasangerGames/suroi | 513 | Pixi 8 ve iyi netcode ama 2 767 dosyalık battle royale; kendi WS protokolü, Colyseus'un hazır tahmin katmanını kaybederiz |
| keldaanCommunity/pokemonAutoChess | 1 834 | Colyseus 0.18 ve SpriteCollab kullanıyor, bu iyi; ama Phaser 4 + React + Redux, 59 bin dosya. Referans olarak bakılır, iskelet olmaz |
| endel/colyseus-pixijs-boilerplate | 72 | Pixi 8.14 + Colyseus 0.17, 17 dosya; iyi ama `colyseus/vite` onun yerini aldı (tek süreç, HMR) |
| freddie-nelson/emile | 2 | Tek kişinin motoru, Colyseus 0.15'e bağlı |
| timetocode/nengi | 356 | 2.0 hâlâ alpha, JS; Colyseus 0.18 aynı şeyi resmî olarak veriyor |
| geckos.io | 1 487 | UDP/WebRTC; 1v1 nişanlı oyunda TCP WebSocket yeterli, Cloudflare Tunnel'dan UDP geçmez |
| Nevanyte/RougeHalla | 0 | Colyseus 0.18 + Phaser 4 üstten bakışlı arena, 5 gün önce başlamış; `packages/{client,server,shared}` bölümü ve bot turnuva koşum takımı fikir olarak alınır |

**Risk:** Colyseus 0.18 çok taze (0.18.10, 22 Ekim 2026; SDK 0.18.9, 30 Ekim). Netcode API'si resmî ve belgeli ama hata çıkabilir. Geri dönüş planı: 0.17 + elle interpolasyon (tanks demosunun yaptığı). Bu yüzden ağ kodu `src/client/ag/` altında tek modülde tutulur.

## 2. Depo yerleşimi

Tek paket, tek `vite.config.ts`, `colyseus/vite` başlangıcının düzeni. Workspace yok: üç kişiyi aşmayan ekipte pnpm workspace yalnız sürtünme. İstemci ve sunucu zaten aynı `src/paylasilan` kodunu import ettiği için tek paket doğal.

```
skaledman-arena/
├── index.html
├── vite.config.ts            # colyseus({ serverEntry: '/src/sunucu/index.ts', serveClient: true })
├── package.json
├── tsconfig.json
├── veri/
│   ├── kartlar.json          # Skaledman /api/kartlar anlık görüntüsü (fixture + çevrimdışı mod)
│   ├── gecmis.json           # /api/history anlık görüntüsü
│   └── tip-tablosu.json      # 18×18 etkinlik (PokéAPI'den bir kez üretilir)
├── public/
│   └── sprite/               # izinle aynalanan fusion PNG'leri; yoksa hotlink (yalnız geliştirme)
├── src/
│   ├── paylasilan/           # İKİ TARAFTA DA ÇALIŞIR; DOM yok, Node yok, Math.random yok
│   │   ├── kurallar/
│   │   │   ├── tipler.ts         # etkinlik, STAB
│   │   │   ├── statlar.ts        # kart statı → HP, hız, hasar formülleri (tasarım §3)
│   │   │   ├── aileler.ts        # (tip, güç bandı) → hamle ailesi geri dönüşü
│   │   │   ├── hamleler.ts       # el yapımı hamle kuralları (familia, aviso, cooldown, alcance, radio, durum)
│   │   │   └── yetenekler.ts     # pasifler
│   │   ├── sim/
│   │   │   ├── Girdi.ts          # defineInput şeması: yon x/z (int8), nisanAci (float32), tus (uint8 bitmask), seq
│   │   │   ├── adim.ts           # applyInput: hareket + dash; sunucu ve Predict aynı fonksiyonu çalıştırır
│   │   │   ├── Arena.ts          # sahne tanımı: halfWidth/depth, engeller (daire/kapsül/dikdörtgen), zeminler
│   │   │   ├── carpisma.ts       # daire-daire, daire-dikdörtgen, kapsül (tanks demosu Block.ts'den)
│   │   │   ├── mermiler.ts       # mermi/alan/koni ilerletme ve vuruş testi (deterministik)
│   │   │   └── rastgele.ts       # seed + seq → PRNG (playground lab 11)
│   │   ├── Durum.ts              # @colyseus/schema: ArenaDurumu { oyuncular, dovusculer, mermiler, alanlar, faz, sure }
│   │   └── kart.ts               # Skaledman kart tipi (zod) → Dovuscu profili
│   ├── sunucu/
│   │   ├── index.ts              # defineServer: odalar, createRouter (api), express (monitor, auth)
│   │   ├── odalar/
│   │   │   ├── ArenaOdasi.ts     # defineInput + setFixedTimestep(30) + allowRewindState; maç akışı
│   │   │   ├── LobiOdasi.ts      # oda kodu ABCD-EFGH, davet, takım seçimi, hazır
│   │   │   └── bot.ts            # basit bot: yaklaş, nişan al, cooldown'u dolanı bas
│   │   ├── kimlik/kick.ts        # OAuth 2.1 PKCE (id.kick.com), user:read → user_id, name; oturum çerezi
│   │   ├── veri/
│   │   │   ├── skaledman.ts      # saatte bir /api/kartlar + /api/history → SQLite; hata olursa son kopya
│   │   │   └── db.ts             # better-sqlite3: oyuncu, kart, mac, elo
│   │   └── yayin/kickWebhook.ts  # F3: chat.message.sent (!dövüş), channel.reward.redemption.updated
│   └── istemci/
│       ├── main.ts               # Pixi Application, navigation, ilk ekran
│       ├── navigation.ts         # open-games kalıbı
│       ├── ekranlar/             # Giris, Lobi, TakimSec, Arena, Sonuc, Dojo
│       ├── ag/
│       │   ├── baglanti.ts       # Client, joinOrCreate/joinById, yeniden bağlanma
│       │   └── tahmin.ts         # Predict.get, reconciler(kendi), attachAll(diğerleri, lerp 100 ms), spawns
│       ├── oyun/
│       │   ├── Sahne.ts          # 2.5D kamera, katman sırası (z'ye göre), zemin, engeller
│       │   ├── Dovuscu.ts        # sprite + prosedürel animasyon (bob, flip, squash, flaş, gölge)
│       │   ├── Efektler.ts       # koni/ışın/mermi/alan/aviso çizimleri (Graphics + parçacık havuzu)
│       │   ├── Hud.ts            # HP, cooldown halkaları, takım, süre
│       │   └── Girdi.ts          # klavye + fare → Girdi şeması; her tahmin adımında input.send()
│       └── ui/                   # @pixi/ui düğme, panel; DOM menüler için küçük yardımcılar
├── test/
│   ├── paylasilan/*.test.ts      # vitest: formüller, etkinlik, deterministik adım (aynı girdi → aynı durum)
│   └── denge/botTurnuvasi.ts     # 20 rastgele kart, bot-bot 200 maç, kazanma oranı raporu
└── deploy/
    ├── skaledman-arena.service   # systemd (kullanıcı arena, CPUQuota=150%, MemoryMax=1G)
    └── yayinla.sh                # build → rsync → restart
```

Kural: `src/paylasilan` içinde `Math.random`, `Date.now`, DOM veya Node API'si **yasak**; ESLint `no-restricted-globals` ile zorlanır. Tahmin ancak iki taraf aynı adımı bit bit aynı çalıştırırsa işler.

## 3. Çalışma zamanı: bir vuruşun yolculuğu

```
İstemci (60 fps)                              Sunucu (30 Hz sabit adım)
──────────────────                            ─────────────────────────
predict.tick(now) → n adım                    inputs.get(sid).next()        ← aynı Girdi
  girdi.data = {yon, nisan, tus}                applyInput(dovuscu, cmd, dt) ← aynı adim.ts
  input.send()  ─────── WS ───────►            hamleBas(cmd.tus) → mermi/alan üret
reconciler: kendi dövüşçümü anında              mermiler.ilerlet(dt)
  ilerlet, ack gelince rollback+replay           vuruş testi: rewind.lastSeenBy(sid)
attachAll(dovusculer, lerp, 100 ms)             (oyuncunun GÖRDÜĞÜ konuma göre)
predict.spawns: mermiyi tıklar tıklamaz        hasar = formül(atk/spa, def/spd, tip, STAB)
  çiz, sunucunun gerçek mermisine devret        durum: yanma/felç/donma zamanlayıcıları
defineEvent("vurus"): flaş + sayı anında,  ◄──  broadcast patch (20 Hz) + olaylar
  sunucu reddederse geri al
```

- **Tick:** sunucu **60 Hz** (`setFixedTimestep`, K-6), yama yayını 20 Hz, istemci render 60 fps.
- **Yetki:** konum, HP, cooldown, mermi ömrü yalnız sunucuda. İstemci yalnız `Girdi` gönderir; `sanitize` ile eksenler [-1,1], açı [-π,π] kırpılır (hız hilesi kapanır).
- **Gecikme telafisi:** vuruş testleri `allowRewindState({ maxRewindMs: 250 })` ile oyuncunun gördüğü ana geri sarılır; 60 ms Türkiye-Almanya hattında "vurduğumu gördüm ama girmedi" olmaz.
- **Rastgelelik:** %10 yanma gibi ihtimaller `seed ⊕ seq` ile türetilir; istemci ve sunucu aynı sonucu üretir, telde hiçbir şey gitmez.
- **Durum şeması:** `Dovuscu { x, z, aci, hp, maxHp, kartId, sahip, faz, cooldown[4] }`, `Mermi { x, z, vx, vz, tip, aile, sahip }`, `Alan { x, z, radius, kalan }`. Düz alanlar, `float32`; `@colyseus/schema` 5 ile `schema()` fonksiyonel tanım.

## 4. Veri ve kimlik

**Kick girişi.** OAuth 2.1 + PKCE, uçlar `https://id.kick.com/oauth/authorize` ve `/oauth/token`, kapsam yalnız `user:read`. Geri dönüşte `GET https://api.kick.com/public/v1/users` → `user_id`, `name`, `profile_picture`. `user_id`, Skaledman `history` kayıtlarındaki `userId` ile birebir aynı alan; eşleşme doğrudan. Oturum: imzalı HTTP-only çerez; Colyseus odasına girerken `onAuth` çerezi doğrular. Kick App açmak için hesapta 2FA şart (geliştirici paneli koşulu).

> Çekici aracı ve `src/paylasilan` lint kapısı: [veri-cekimi.md](veri-cekimi.md).

**Skaledman verisi.** Saatte bir `/api/kartlar` ve `/api/history` çekilir, SQLite'a yazılır; başarısızsa son kopya kullanılır. Oyun Skaledman'ı asla istek anında çağırmaz. `veri/*.json` anlık görüntüsü testlerin fixture'ı ve çevrimdışı geliştirme kaynağıdır. Site sahibiyle anlaşılırsa çekme yerine webhook veya tek toplu uç.

Sayfa analizinden (`docs/research/skaledman-sayfa-analizi.md`) gelen kesin kurallar: uçlarda **CORS yok**, çekim yalnız sunucu tarafında (`sunucu/veri/skaledman.ts`), tarayıcıdan asla; **ETag yok**, her çekim tam gövde (≈180 KB), ucuz değişiklik testi `history` imzası (kayıt sayısı + son ULID); kart görseli **`sprite` alanından** alınır, fusionId'den türetilmez (29 `a`, 5 `b` alternatif sprite); shiny ayrı görsel değil, `hue-rotate(hue) saturate(1.3)`; dövüşçü `id` (ULID) ile, kurallar `fusionId` ile anahtarlanır; kart gövdesi açılıştan dakikalar sonra dolabilir (`v: 2`), eksik gövdeli kayıt oynanabilir sayılmaz; `/api/detay` kart başına tembel çekilir (yetenek `key`'i pasif eşlemesi için gerekir). Yazma ucu yok: rozet ve galibiyet arenanın SQLite'ında kalır.

**Yayın olayları (F3).** Kick webhook'ları `events:subscribe` kapsamıyla: `chat.message.sent` (`!dövüş @ad`), `channel.reward.redemption.updated` (kanal puanı "Düello"). İmza doğrulama Kick'in açık anahtarıyla. kicklive bu akışı zaten kurmuş; aynı kalıp.

**Veritabanı.** better-sqlite3, tek dosya, günlük yedek. Tablolar: `oyuncu(kick_id, ad, avatar, elo, son_giris)`, `kart(fusion_id, sahip_kick_id, json, shiny, acilis)`, `mac(id, oda, a, b, kazanan, sure, baslangic)`.

## 5. Yayına alma

- `vite build --app` → `dist/client/` (statik) + `dist/server/server.mjs` (tek dosya sunucu). `serveClient: true` ile sunucu statiği de dağıtır: **tek süreç, tek port**.
- VPS'te ayrı kullanıcı `arena`, systemd `skaledman-arena.service`, `CPUQuota=150%`, `MemoryMax=1G`, port `127.0.0.1:2567`. Mevcut VPS kuralına uygun (ayrı birim + kullanıcı + kota).
- Dışarı açılış Cloudflare Tunnel (WebSocket geçer, UDP gerekmez); alan adı Skaledman sahibiyle konuşulur (`arena.skaledman.com` ideal; yoksa kendi alanımız).
- Colyseus `monitor` ve `playground` yalnız basic auth arkasında, üretimde playground kapalı.
- Ölçek: Colyseus tek süreç 1v1 odalarında yüzlerce eşzamanlı oyuncuyu taşır; 112 koleksiyoncu için fazlasıyla yeter. Redis'siz başlanır.

## 6. İlk haftanın adımları (F0)

1. **Gün 1:** `colyseus/vite` klonu, React çıkar, `pixi.js@8`, `@pixi/ui`, `@pixi/sound`, `zod`, `better-sqlite3`, `vitest` ekle. `src/{paylasilan,sunucu,istemci}` iskeleti. `npm run dev` tek komutla açılıyor.
2. **Gün 1–2:** `veri/kartlar.json` + `gecmis.json` indir; `kart.ts` zod şeması; `statlar.ts` formülleri ve testleri; `tip-tablosu.json` üret.
3. **Gün 2–3:** `Girdi.ts` + `adim.ts` (hareket + dash) + `Arena.ts` (tek sahne, 4 engel). Sunucuda `defineInput`/`setFixedTimestep`, istemcide `Predict.reconciler`. Playground lab 03 ve 04 birebir uyarlanır. Hedef: iki sekmede iki kare pürüzsüz dolaşıyor.
4. **Gün 3–4:** `hamleler.ts` ile 6 hamle (poke, mermi, koni, alan, embestida, ışın), `mermiler.ts`, `rewind` ile vuruş, hasar formülü. Lab 06, 09, 11 uyarlanır.
5. **Gün 4–5:** Pixi sahne: fusion sprite + prosedürel animasyon, HP çubuğu, cooldown halkaları, aviso halkası, efektler. Bot rakip.
6. **Gün 5:** Bot-bot turnuvası ile 20 kartın kazanma oranı; formüller %35–65 bandına çekilir. VPS'e ilk deploy, bağlantı paylaşılır.

Başlangıç komutları:

```bash
git clone https://github.com/colyseus/vite skaledman-arena && cd skaledman-arena && rm -rf .git && git init
```

```bash
npm i pixi.js@8 @pixi/ui @pixi/sound zod better-sqlite3 && npm i -D vitest @types/better-sqlite3
```

## 7. Test ve kalite

- **Determinizm testi:** aynı girdi dizisi ile `adim.ts` istemci ve sunucu bağlamında aynı durumu üretir (vitest, float karşılaştırma `toBeCloseTo` değil, tam eşitlik).
- **Kural testleri:** her hamle ailesi için menzil/yarıçap/cooldown sınırları; tip tablosu 324 hücre.
- **Denge koşumu:** `test/denge/botTurnuvasi.ts` sunucusuz, `paylasilan/sim` üzerinde 200 maç/dakika.
- **Yük:** `@colyseus/loadtest` ile 50 bot, 25 oda; tanks demosunun `loadtest.ts`'i kalıp.
- **Gecikme provası:** `@colyseus/sdk/debug` panelleri ile 150 ms yapay gecikmede oynanabilirlik; playground bunu hazır veriyor.

## 8. Açık kararlar

| Karar | Önerim | Alternatif |
|---|---|---|
| Paket düzeni | Tek paket (`colyseus/vite`) | pnpm workspaces `packages/{client,server,shared}` (RougeHalla gibi); ekip büyürse geçilir |
| Colyseus sürümü | 0.18 (gömülü tahmin) | 0.17 + elle interpolasyon; 0.18'de ciddi hata çıkarsa |
| Sprite kaynağı | İzinle aynalama (`public/sprite/`) | Hotlink; yalnız geliştirmede |
| Alan adı | `arena.skaledman.com` (sahip onayıyla) | Kendi alanımız |
| Kod dili | Türkçe tanımlayıcılar, İngilizce kütüphane API'si | Tamamen İngilizce |
| Paket yöneticisi | npm (başlangıç reposu npm) | pnpm |

## 3b. PokeRivals netcode'u ile karşılaştırma (2026-11-01 paket analizi sonrası)

Kaynak: [pokerivals-paket-analizi.md](../research/pokerivals-paket-analizi.md) § 1. PokeRivals: tek WebSocket, JSON + zod, protokol sürümü 35, **60 Hz tick**, tick başına 1 `intencion` mesajı (hareket vektörü + nişan noktası + ≤4 eylem), yalnız kendi konumu tahmin, uzlaştırma eşikleri 1,5 / 96 birim ve 10/s yumuşatma, uzak oyuncu için 2–4 tick uyarlamalı enterpolasyon gecikmesi + 15 tick'e kadar ekstrapolasyon, vuruşlar tamamen sunucuda, kendi HP'si olaylardan öne alınır, saniyede 1 ping, maç sonu ≤8 KB telemetri.

Bizim seçimimiz Colyseus 0.18 aynı modeli hazır veriyor (`defineInput` = `intencion`, `Predict.reconciler` = `gn`, `attachAll lerp` = `sn/ln`, `allowRewindState` = PokeRivals'ta olmayan gecikme telafisi). İki açık nokta:

- **Tick hızı (K-6, karar: 60 Hz):** 30 Hz önermiştik; PokeRivals 60 Hz, sahip 60'ı seçti. 0,08 s'lik telegraf 30 Hz'de 2,4 tick'e sığar; vuruş zamanlaması ±17 ms oynar. Seçenekler: (a) 60 Hz tick + 20 Hz yama (sunucu CPU ×2, 1v1 odada önemsiz), (b) 30 Hz ve en kısa telegraf 0,1 s. F0'da ikisi ölçülür; `network-programmer` + `technical-director`.
- **Girdi biçimi:** nişanı açı değil **dünya noktası** olarak göndermek (PokeRivals gibi) hedefli alan hamleleri ve düşüş noktası seçimi için gerekli; `Girdi` şemasına `nisanX/nisanZ` (float32, ±2000 kırpma) eklenir.

Alınacak küçük şeyler: ağ kalitesi göstergesi eşikleri (RTT > 220 ms veya 400 ms snapshot yok → kötü; > 120 ms veya gecikme > 3 tick → orta), maç sonu telemetri alanları (ping medyan/p95, jitter, düzeltme sayıları, kare histogramı; DNT'ye uyum), hata kodu listesi (flood, orden, salaLlena, reanudacion…), yazılım rasterizer uyarısı.
