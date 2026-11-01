# Skaledman Arena

[skaledman.com](https://skaledman.com) albümündeki Pokémon Infinite Fusion kartlarıyla tarayıcıda oynanan, **gerçek zamanlı 1v1 arena**. Kick yayıncısı swaggybark'ın izleyicileri açtıkları kartlarla PokeRivals tarzı dövüşür: klavye hareket, fare nişan; kartın iki saldırısı iki yetenek tuşu, tipi temel vuruş, yeteneği pasif; 3 kartlık takım maç ortasında değişir.

Albüm, kart açma ve kanal puanı Skaledman'da kalır. Bu depo yalnız **dövüş katmanıdır**: Skaledman'da "arenada savaş" seçildiği andan sonrası. Kâr amaçsız hayran projesi.

**Durum (Kasım 2026):** F0 çevrimdışı prototip oynanabilir. Çevrimiçi maç (F1), Kick girişi ve kendi kartların (F2), yayın entegrasyonu (F3) sırada. Yol haritası: [docs/production/roadmap.md](docs/production/roadmap.md).

## Hızlı başlangıç

Gerekenler: Node 22+, npm.

```bash
npm install
npm run dev
```

`npm run dev` tek Vite süreci içinde hem istemciyi hem Colyseus sunucusunu açar: http://localhost:5173

| Ekran | Adres | Ne gösterir |
|---|---|---|
| Arena | `/?ekran=arena` | iki fusion, klavye + fare, bot rakip, İskeletler Diyarı sahnesi |
| Birleştirme Lab | `/?ekran=lab` | kart resminin yanında 8 yönlü animasyonlu fusion, animasyon ve yön seçimi |

Arena parametreleri: `a=<fusionId>`, `b=<fusionId>` (ör. `251.443`), `tohum=<sayı>` (deterministik maç), `hasar=<çarpan>`. Lab: `kart=<fusionId>`, `anim=Idle|Walk|Attack|Hurt|…`, `yon=0-7`, `kip=tek|sekiz|kalabalik`, `shiny=0`.

### Kontroller

WASD hareket · 1–4 veya tekerlek hamle seçer · sağ tuş basılı nişan, bırakınca atış · Shift dash · Space zıplama · Z dinlenme · Q/E takım değişimi · R maç sonunda tekrar.

### Fusion sprite'larını üretmek

Dövüşçüler PMD SpriteCollab animasyon kareleri ile sanatçının fusion paletinden **kodla birleştirilir**; üretilen atlaslar `public/fusion/` altına yazılır ve git dışıdır. İlk çalıştırmada üretmek gerekir:

```bash
npm run birlestir -- --rastgele 20 --tohum 1
```

Belirli kartlar için `npm run birlestir -- --id 251.443 --id 76.538`. Yöntem ve kapsama: [docs/art/fusion-animasyon.md](docs/art/fusion-animasyon.md).

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | geliştirme sunucusu (istemci + Colyseus, HMR) |
| `npm run build` | üretim paketi: `dist/client` + `dist/server/server.mjs` |
| `npm test` | vitest (kurallar, simülasyon determinizmi, botlar, atlas, veri çekici) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | paylaşılan simülasyon kapısı: `src/paylasilan` içinde DOM, Node, `Math.random`, `Date.now` yasak |
| `npm run birlestir` | fusion sprite atlası üretimi |
| `npm run veri:cek` | Skaledman anlık görüntüsü (saatte en çok 1 istek/uç, `.cache/` içine) |
| `npm run veri:kapsama` | SpriteCollab kapsama tablosu |

## Nasıl çalışır

- **Yığın:** Vite + TypeScript, PixiJS 8 istemci, Colyseus 0.18 sunucu (gömülü tahmin/uzlaştırma), tek paket ([colyseus/vite](https://github.com/colyseus/vite) düzeni), zod, SQLite (F1).
- **Paylaşılan simülasyon** (`src/paylasilan`): 60 Hz sabit adım, hareket, dash, zıplama, 6 hamle ailesi (mermi, ışın, koni, alan, poke, embestida), yanık/felç, stat kademeleri, takım, çarpışma. İstemci ve sunucu aynı kodu koşturur; tohumlu PRNG, saat yok. ESLint bunu zorlar.
- **Kart → dövüşçü:** Skaledman kartının 6 statı ana seri formülüyle HP/hız/hasara, iki saldırısı `(tip, güç) → aile` tablosuyla hamleye, yeteneği pasife çevrilir. Kurallar veridir; iki taraf aynı tabloyu okur.
- **Sunucu karar verir** (F1): konum, HP, cooldown, vuruş, sonuç yalnız sunucuda; istemci yalnız girdi yollar.
- **Skaledman verisi:** herkese açık JSON uçları **saatte bir, sunucu tarafında** çekilir; oyun siteyi canlı çağırmaz. `veri/*.json` anlık görüntüler test fixture'ı ve çevrimdışı kaynaktır.

Mimari ve kararlar: [docs/tech/mimari.md](docs/tech/mimari.md), [docs/tech/adr/](docs/tech/adr/). Oyun tasarımı: [docs/design/oyun-konsepti.md](docs/design/oyun-konsepti.md).

## Skaledman'a bağlanma

Arena ayrı süreç olarak çalışır; Skaledman'a üç küçük dokunuş yeter: "Arenada savaş" düğmesi, kısa ömürlü imzalı token veren bir devir ucu, isteğe bağlı sonuç ucu. Token biçimi, uçlar, güvenlik ve deploy: [docs/tech/skaledman-eklenti.md](docs/tech/skaledman-eklenti.md).

## Depo düzeni

```
src/paylasilan/   kurallar + simülasyon (iki tarafta çalışır, DOM/Node yok)
src/istemci/      PixiJS istemci: ekranlar, oyun sahnesi, HUD, sprite animatörü
src/sunucu/       Colyseus sunucu ve odalar
araclar/          fusion birleştirme, veri çekimi, denge turnuvası
veri/             Skaledman anlık görüntüleri, SpriteCollab kapsama
test/             vitest
docs/             tasarım, teknik, sanat, araştırma, üretim
```

## Katkı ve geri bildirim

Hata, "bu kart böyle görünmemeli", denge gözlemi: GitHub issue açın. Skaledman'ı geliştiren kişiyle devir sözleşmesini birlikte kapatmak istiyoruz; iletişim için issue yeterli.

## Lisans ve krediler

- Kod lisansı henüz seçilmedi (öneri: MIT); proje iskeleti [colyseus/vite](https://github.com/colyseus/vite) MIT lisanslıdır ([docs/tech/LICENSE-colyseus-vite-starter.txt](docs/tech/LICENSE-colyseus-vite-starter.txt)).
- Pokémon, Nintendo / Creatures Inc. / GAME FREAK inc. markasıdır. Fusion çizimleri [Pokémon Infinite Fusion](https://infinitefusion.fandom.com) topluluğu sanatçılarına aittir; sanatçı adları oyun içinde gösterilir.
- Animasyon kareleri [PMD SpriteCollab](https://sprites.pmdcollab.org) projesinden, kendi lisans ve kredi koşullarıyla.
- Oynanış ilhamı: PokeRivals.
- Reklam yok, satış yok. Hak sahiplerinden gelen bir talep üzerine ilgili içerik kaldırılır.
