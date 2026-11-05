> **TARİHÇE: 2026-11-04'ten beri İPTAL.** Skaledman verisi çekilmiyor; oyun verisi bizim `veri/*.json` dosyalarımızdır ve
> çalışma anında dışarıdan hiçbir şey alınmaz. **Yerine:** [veri-modeli.md](veri-modeli.md) (veri şemaları, SQLite),
> [mimari.md](mimari.md) § 4 (güncel paylaşılan-sim lint kapısı ve determinizm), [ADR-004](adr/ADR-004-determinizm.md),
> [ADR-006](adr/ADR-006-devran-donusumu.md). Aşağıdaki gövde değiştirilmeden tarihçe olarak tutulur; otorite değildir.

# Veri çekimi ve paylaşılan-kod kapısı

> **TARİHÇE / İPTAL (D8, B-37):** Bu belge iptal edilen ilk fikrin (hayran kartlarıyla arena, 2026-11-01) kaydıdır; içerik değiştirilmeden tarihçe olarak tutulur. Proje **Devran**'a (özgün dönen topaç dövüşü, kâr amaçsız) döndü; marka, kart, sprite ve dış site bağımlılığı yoktur. Güncel belgeler: `docs/production/devran-kod-brief.md`, `docs/production/raporlar/D1.md … D8.md`.

`[@vault · Backend Engineer]` · 2026-11-01 · Durum: F0 aracı; sunucudaki saatlik senkron (SQLite) bunu temel alır.

## 1. Paylaşılan benzetim kapısı (`npm run lint`)

`eslint.config.js` (düz yapılandırma, `typescript-eslint` ayrıştırıcısı) yalnızca `src/paylasilan/**/*.ts` için kural koyar; repo geri kalanı lint edilmez. Amaç stil değil: istemci ve sunucu aynı adımı bit bit aynı koşturmalı (tahmin/uzlaşma buna dayanır).

| Kural | Yasak |
|---|---|
| `no-restricted-globals` | `window document navigator location history localStorage sessionStorage requestAnimationFrame fetch XMLHttpRequest WebSocket crypto performance setTimeout/Interval/Immediate process Buffer require module exports __dirname __filename globalThis self global` |
| `no-restricted-properties` | `Math.random`, `Date.now`, `performance.now`, `crypto.getRandomValues/randomUUID` |
| `no-restricted-syntax` | `new Date()`, `Date()`, `Date.parse/UTC`, `Math['random']`, `Intl`, `toLocale*` |
| `no-restricted-imports` | `node:*`, `fs path os crypto http https net child_process worker_threads`, `pixi.js`, `colyseus`, `@colyseus/*`, `**/sunucu/**`, `**/istemci/**`, `**/araclar/**` |

Rastgelelik için tohumlu üreteç (`sim/rastgele.ts`), zaman için adım sayacı kullanılır. Kural dışı bir satır gerçekten gerekiyorsa `eslint-disable` yazılır; kullanılmayan disable yönergesi de hata sayılır. Kapının işlediği, kurala uyan ve uymayan örnekle sınandı (stdin üzerinden `--stdin-filename src/paylasilan/x.ts`).

## 2. Skaledman anlık görüntü çekicisi (`npm run veri:cek`)

`araclar/veri-cek.ts`. Oyun kodu Skaledman'ı canlı çağırmaz; bu araç (ve ileride sunucudaki saatlik işi) tek çağıran taraftır.

- **Uçlar:** `/api/kartlar` → `kartlar.json`, `/api/history` → `gecmis.json`, isteğe bağlı `--detay <fusionId[,..]>` → `detay-<id>.json`.
- **Saygı kuralları:** uç başına saatte en çok 1 istek (son deneme zamanı `.cache/veri-cek-durum.json`, git dışı; deneme **istekten önce** yazılır, hata da sayılır); açık `User-Agent: SkaledmanArena/0.0.1 (+fan project; contact via repo)`; uçlar sırayla (aynı anda tek bağlantı); 15 sn zaman aşımı; 5 MB gövde sınırı; yönlendirme izlenmez. `--zorla` saatlik sınırı atlar. Site sahibi dur derse aracı çalıştırmayı bırak.
- **Doğrulama:** HTTP 2xx + JSON içerik türü + zod (`src/paylasilan/kart.ts` şemaları; detayda çekirdek alanlar ve istenen kimlikle eşleşme) + boş olmama. Başarısız ya da şüpheli (kayıt sayısı eskisinden düşük; `--zorla` ile geçilir) yanıt **yazılmaz**, eldeki dosya kalır. Geçerli gövde ham haliyle yazılır (yukarı akışla bayt bayt aynı), tmp + `rename` ile atomik.
- **Çıktı dizini:** varsayılan `.cache/veri-cek/`. `veri/` fixture'ları (testler okur) yalnızca `--cikti veri` açıkça verilirse ezilir.
- **Doğrulandı (2026-11-01 19:03):** uç başına bir gerçek istek, geçici dizine: 227 kart, 227 geçmiş kaydı (fixture'larda 226; yeni açılış), detay `251.443` fixture ile bayt bayt aynı; hemen ardından ikinci çalıştırma üç uçta da "saatlik sınır" ile atladı.
- **Testler:** `test/veri-cek.test.ts` (sahte `fetch`, ağ yok): ham yazım, başlıklar, saatlik sınır (dolmadan/dolunca/`--zorla`/hatadan sonra), bozuk durum dosyası, her geçersiz yanıt türünde yazılmama, küçülme koruması, kimlik enjeksiyonu.

Sonraki adım (F1, sahip onayıyla): sunucuda aynı mantık `sunucu/veri/skaledman.ts` olarak saatlik zamanlayıcıya bağlanır ve çıktı SQLite'a yazılır; bu dosyadaki `cek()` ve şemalar yeniden kullanılır.
