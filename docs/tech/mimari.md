# Devran: mimari

`[@axiom · Technical Director]` · 2026-11-06 · dal `devran-kod` (23a772b üstü çalışma ağacı) · Bu belge koddan doğrulanarak
baştan yazıldı. 2026-11-01 tarihli Skaledman çağı sürümü git geçmişinde durur; neden değiştiği: [ADR-006](adr/ADR-006-devran-donusumu.md).
Kaynak gösterilmeyen sayı yoktur; doğrulanamayan her şey "doğrulanmadı" diye işaretlidir.

Bağlı belgeler: [netcode.md](netcode.md) (oda, protokol, tahmin), [backend.md](backend.md) (kimlik, API, SQLite),
[veri-modeli.md](veri-modeli.md) (`veri/*.json`, tablolar, sim durumu), ADR-001…006 (`adr/`), sayılar için
`docs/design/tuning.md` (tek otorite).

## 1. Yığın ve sürümler (`package.json`, 2026-11-06)

| Katman | Paket | Sürüm | Not |
|---|---|---|---|
| İstemci render | `pixi.js` | 8.22.0 | maç, menü sahneleri |
| Atölye 3B | `three` | 0.186.1 | yalnız `src/istemci/atolye3d/` (Goruntuleyici, ikon önbelleği) |
| Ses | `@pixi/sound` | 6.0.2 | |
| Sunucu | `colyseus` | 0.18.10 | yetkili oda, `colyseus/vite` eklentisi |
| İstemci SDK | `@colyseus/sdk` | 0.18.9 | yalnız `src/istemci/ag/**` |
| Şema | `@colyseus/schema` | 5.0.43 | yalnız `src/sunucu/**` |
| Geliştirme panelleri | `@colyseus/monitor` 0.18.7, `@colyseus/playground` 0.18.6 | | yalnız `NODE_ENV≠production` (`src/sunucu/index.ts`) |
| Veritabanı | `better-sqlite3` | 13.0.3 | yalnız `src/sunucu/db/**` |
| Doğrulama | `zod` | 4.6.7 | veri şemaları, ağ mesajları, REST gövdeleri |
| Derleme | `vite` ^8.3.5, `typescript` ^5.9.3 | | |
| Test | `vitest` ^5.0.5 | | ayrı `vitest.config.ts` (Colyseus eklentisi testte yok) |
| Lint | `eslint` ^10.14.0, `typescript-eslint` ^8.72.1 | | kapı, stil değil |
| Araç | `tsx` ^4.21.0, `sharp` ^0.34.5 | | yalnız `araclar/` (Node), tarayıcıya girmez |

- Çalışma zamanı bağımlılıkları **tam sabit** (caret yok); geliştirme bağımlılıkları caret'li. Colyseus yükseltmesi ayrı commit +
  `npm run ag:matris` (netcode.md § 1).
- Node `>=22` (`engines`; CI Node 22, `.github/workflows/ci.yml`). Paket yöneticisi npm (`package-lock.json`).
- Planlanıp **kurulmayanlar**: `@pixi/ui`, gsap, AssetPack, `@colyseus/loadtest`. Yük testi aracı yok (§ 7).
- Kick OAuth kodu **yok**; kimlik ad + şifre (scrypt). Askıda, sahip söyleyene kadar yazılmaz (ADR-006, backend.md § 6).

## 2. Depo yerleşimi

Tek paket, tek `vite.config.ts` (`colyseus({ serverEntry: "/src/sunucu/index.ts", port: 2567, serveClient: true })`).

```
src/paylasilan/    iki tarafta koşar, determinizm kapısı (§ 4)
  sim/             Dunya, adim, fizik, carpisma, topac, yetenek, enerji, mac, tahmin, hash, rastgele, Girdi, durum
  kurallar/        ayar (AYAR: tuning sabitleri), sinTablo, ekonomi, market, basarim, ilerleme, atolye, kuyruk
  veri/            semalar (zod), katalog (veri/*.json yükleyici), profil, takimlar, cubuklar, yetenekSablon
  bot/bot.ts       paylaşılan bot (antrenman rakibi, hızlı maç dolgusu, denge turnuvası)
  egitim.ts, krediler.ts
src/ag/            ortak ağ sözleşmesi, Colyseus'suz: protokol (sabitler, mesajlar, zod), durum (wire alan tablosu),
                   katalog (KATALOG_OZETI), kayit (maç kaydı yeniden oynatma)
src/sunucu/        index (defineServer: odalar mac + izle, REST), odalar/ (MacOdasi, IzleOdasi, şema sınıfları),
                   mac/MacYonetimi (girdi tüketimi, adım, hash), api/ (rotalar, atolye, market), db/ (sema, depo),
                   oyuncu/ (maç sonu, XP, başarım yazımı, takım), kimlik, odaKayit, izleKayit, olcum
src/istemci/       main (ekran yönlendirici, dinamik import), ekranlar/, oyun/ (Pixi sahne, HUD, efekt, kamera),
                   ag/ (Baglanti, AgKatmani, AgMaci, IzleAgi), atolye3d/, bilgic/ (Pergel), ses/, stil/
veri/              parçalar, ruhlar, yetenekler, başarımlar, ipuçları, görsel/model/ses manifestleri, yasak sözcükler
araclar/           Node/tsx araçları: ağ matrisi ve simülatörü, ekran görüntüsü, ölçüm, altın hash üretimi, krediler,
                   sanat/ (Mac hattı: Gemini + Tripo + Blender, sharp ile atlas; Python betikleri)
kaynak/            sanat kaynakları (efekt, ruh, topac); public/ derlenmiş varlıklar (topac, efekt, ruh, ses, yazi, bilgic)
test/              vitest (26 dosya), test/altin/ (altın girdi + hash), test/denge/ (bot turnuvası)
deploy/            devran.service, devran-yedek.{service,timer}, kur.sh, yedek.sh, README.md
```

Modül sınırları ESLint ile zorlanır (`eslint.config.js`, netcode.md § 1):
`src/ag/**` zod + `src/paylasilan` dışında bağımlılık almaz; `@colyseus/sdk` yalnız `src/istemci/ag/**`; `colyseus` ve
`@colyseus/schema` yalnız `src/sunucu/**`; `@colyseus/core` hiçbir yerde doğrudan; `better-sqlite3` yalnız `src/sunucu/db/**`;
istemci sunucuyu, sunucu istemciyi import etmez. Ağ katmanının değişimi (0.17'ye dönüş) bu yüzden `src/istemci/ag/` +
`src/sunucu/odalar/` ile sınırlı kalır.

Kalıntı: `veri/spritecollab-tracker.json` (10 MB) Pokémon çağından; git'te yok, koda bağlı değil (grep ile
doğrulandı). Silinmesi ya da gitignore'a alınması sahibin onayına bağlı (durum-20261105 § 3).

## 3. Çalışma akışı

**Geliştirme:** `npm run dev` = tek `vite` süreci; istemci 5173 (`strictPort`), Colyseus 2567, iki tarafta HMR.
`.veri/` ve `*.sqlite*` izlenmez. Ekran seçimi `?ekran=<ad>` (`src/istemci/main.ts` yönlendiricisi, ekranlar dinamik import).

**Üretim:** `npm run build` = `vite build --app` → `dist/client/` + `dist/server/server.mjs`; tek süreç sunucu istemciyi de
dağıtır (`serveClient`). Derlenmiş giriş `server.listen(2567)` çağırır, yani **kod 127.0.0.1'e bağlamaz**; dış erişimi
systemd `IPAddressDeny=any` + `IPAddressAllow=localhost` keser (`deploy/README.md` notu, `dist/server/server.mjs` okundu).
Birimdeki `HOST=127.0.0.1` ortamının etkisi doğrulanmadı.

**Zamanlama (sunucu, `MacOdasi` + `src/ag/protokol.ts`):**
- `setFixedTimestep(() => this.adim(), SIM_HZ)`, `SIM_HZ = round(1 / AYAR.dt) = 60` (ADR-002). Sıra önemli: önce sabit adım,
  sonra `patchRate = null`; tersi adım hızını 4-50 Hz'e düşürüyordu (netcode.md § 5).
- Yama elle, adım hizalı: `YAMA_HZ = 20`, `YAMA_ADIMI = 3` adımda bir `broadcastPatch()`; hash adımında zorunlu yama.
- Olaylar her adım sonunda `MESAJ.olaylar` ile (yamayı beklemez); `HASH_ARALIGI = 60` adımda bir `h` (float64 hash) ve
  `hw` (wire f32 hash).
- Girdi `defineInput` ile güvenilir kanal (WebSocket/TCP); `BOSTA_TASIMA_ADIMI = 30`, `BIRIKME_ESIGI = 4`.
- Oda `mac` (`filterBy(["mod"])`, modlar `oda · hizli · antrenman`, `maxClients = 2`), seyirci odası `izle`
  (`filterBy(["kod"])`, `SEYIRCI_SINIRI = 50`). `PROTOKOL_SURUMU = 6`.

**Tahmin modeli A (ADR-005, `src/istemci/ag/AgMaci.ts`, `src/paylasilan/sim/tahmin.ts`):** istemci yalnız kendi topacının
sürüşünü `kendiAdimi` ile tahmin eder; topaç-topaç impulsu, hasar, Enerji, yetenek etkileri, puan yalnız sunucudan. Uzlaşma
`UZLASMA = { yokSay 0,5 · yumusakAdim 4 · buyukEsik 8 · buyukAdim 6 · sicrama 40 }` br (40 br eşiği sahip kararı N3). Rakip ve
seyircide topaçlar `ARA_DEGER_GECIKMESI_MS = 100` geriden ara değerlenir. SDK'nın `Predict.reconciler`'ı **kullanılmıyor**
(ADR-005 T1); uzlaşma bizim kodumuz. Hitstop yalnız görsel.

**Katılma ve uyum:** istemci `KATALOG_OZETI` (parcalar + ruhlar + yetenekler JSON'ları ve `AYAR`, `ELEMENT_EGILIM`,
`KOKEN_PASIF` üzerinden FNV-1a 64, `src/ag/katalog.ts`) yollar; uyuşmazsa ret 4102. Kimlik: oturum çerezi → `/api/bilet`
(60 s, tek kullanımlık HMAC bileti) → `MacOdasi.onAuth`; misafir yalnız `antrenman` (backend.md § 2).

## 4. Determinizm sözleşmesi (ADR-004)

- Sim float64, `Math.fround` yok; float32 yalnız wire biçimi (`src/ag/durum.ts`). İstemci `gorunumdenDunya(…, f32)` ile
  tam `Dunya` kurar.
- `src/paylasilan/**` ESLint kapısı: yasak globaller (window, document, navigator, localStorage, fetch, WebSocket, crypto,
  performance, setTimeout/setInterval, process, Buffer, require, globalThis…), `Math.random`, `Date`/`Date.now`/`new Date`,
  `performance.now`, `Math.hypot`, trigonometri, `pow/exp/log/cbrt`, `**`, `Math.fround`, `Intl`, `toLocale*`,
  karşılaştırıcısız `sort`/`toSorted`, `for..in`; Node modülleri, `pixi.js`, `colyseus`, `@colyseus/*`, `better-sqlite3`
  ve sunucu/istemci/araç importları. Trig için `kurallar/sinTablo.ts`, rastgelelik için `sim/rastgele.ts` (tohum + sıra).
- Lint kapısının kendisi testli: `test/lint-kapisi.test.ts` (yasak örneklerin gerçekten yakalandığı; ayrıntısı o dosyada).
- **Altın hash'ler:** `test/altin/*.json` girdi senaryoları + `*.hash` beklenen FNV-1a 64 (`sim/hash.ts`, `dunyaHash`); 17
  senaryo (boş girdi, durma, ring out, parçalanma, dash/çanak çarpışma, ulti, takım ultisi, tam bot maçı…). Üretim
  `npm run altin:uret`; Chromium'da aynı hash `npm run test:tarayici`.
- **Ağ üstünde:** wire hash her 60 adımda karşılaştırılır; tek sapma = S1. Sunucu maç kaydı tarayıcıda yeniden oynatılır
  (`AgMaci.kayitDogrula`, `test/ag.test.ts`). D8 ölçümü: N2 1348/1348, N3 1248/1248 karşılaştırma, sapma 0
  (`docs/production/raporlar/D8.md` § kapılar).
- Bilinen tutarsızlık: `eslint.config.js` içindeki `Math.fround` iletisi "ADR-004 yazılmadı" diyor; ADR-004 yazıldı. Kural
  doğru, yalnız ileti eski (düzeltme `@byte`/`@relay` işi).

## 5. Test ve kapılar

| Komut | Ne yapar |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint src` (determinizm + yalıtım kapısı) |
| `npm test` | `vitest run`, `test/**/*.test.ts`, `testTimeout` 30 s |
| `npm run build` | `vite build --app` |
| `npm run test:tarayici` | altın hash'ler Chromium'da |
| `npm run denge:turnuva` | bot-bot turnuvası (`test/denge/`) |
| `npm run ag:matris`, `ag:simulator`, `ag:ekran` | iki gerçek istemci, gecikme/jitter/kayıp profilleri N0-N6 |
| `npm run qa:bot`, `qa:cokme` | toplu bot maçı, çökme denemeleri |
| `npm run d5:akis` … `d8:akis`, `mac:ekran`, `lab:ekran`, `yetenek:ekran` | uçtan uca akış ve ekran görüntüsü |
| `npm run krediler:uret` | atıfı eksik manifest kaynağı → çıkış 1 |

CI (`.github/workflows/ci.yml`, PR ve `main` push): `npm ci` → typecheck → lint → test → build, Node 22, 15 dk. `devran-kod`
dalına push CI'ı tetiklemez (yalnız PR açılınca). Son bilinen sonuç: 26 dosyada 488/488 test, typecheck/lint/build temiz
(`durum-20261105.md` § 1, 23a772b). Bu belge yazılırken testler yeniden koşulmadı.

## 6. Dağıtım planı (`deploy/`)

Durum: dosyalar hazır, **VPS'e henüz kurulmadı**, alan adı sahip kararı (öneri `devran.ovarlak.games`).
- `deploy/kur.sh` (root): Node 22 yoksa NodeSource, `devran` sistem kullanıcısı, `/opt/devran` (rsync), `.env`
  (`.env.example`'dan, `OTURUM_SIRRI` `openssl rand -base64 48`), `npm ci`, `npm run build`, systemd birimi, `/api/saglik`.
- `deploy/devran.service`: `User=devran`, `NODE_ENV=production`, `ExecStart=/usr/bin/node dist/server/server.mjs`,
  `Restart=on-failure` / `RestartSec=3`, **`CPUQuota=150%`, `MemoryMax=1G`, `TasksMax=256`**, `ProtectSystem=strict`,
  `ReadWritePaths=/opt/devran/veri-db`, `IPAddressDeny=any` + `IPAddressAllow=localhost`. Kick OAuth gelirse dış çıkış
  için gevşetilmesi gerekir (backend.md § 6).
- Ortam: `KIMLIK_MODU=sifre`, `OTURUM_SIRRI` (≥ 32), `IZINLI_KOKENLER`, `VERI_DIZINI=/opt/devran/veri-db`,
  `GUVENILIR_VEKIL=1`; eksikse sunucu açılmaz (`kimlikAyarlariniDenetle`).
- Dış erişim Cloudflare Tunnel `devran` → `http://127.0.0.1:2567` (WebSocket geçer, UDP yok); test döneminde Cloudflare
  Access. Tünel `--config` ve tünel kimliğiyle kurulmalı: VPS'te varsayılan `config.yml` tradebot tünelidir (`~/.claude/rules/vps.md`
  tuzağı; `deploy/README.md` örneği varsayılan dosyayı kullanıyor, kurulumda düzeltilmeli).
- Yedek: `devran-yedek.timer` her gün 01:30 UTC (04:30 TR) `deploy/yedek.sh`. Site dışı kopya tanımlı değil.
- Güncelleme `git pull && sudo bash deploy/kur.sh`; süren maçlar düşer (tek süreç, durum belleğinde).

## 7. Bütçeler ve ölçümler

Bütçe yazılı değilse yoktur. Aşağıdakiler kaynaklı; "ölçülmedi" olanlar açık iştir.

| Bütçe | Eşik | Son ölçüm | Kaynak |
|---|---|---|---|
| Sim adımı (sunucu) | ADR-002: 1v1 oda adımı < 1 ms | p95 0,065 ms | D8.md |
| Oda adımı, seyircisiz (sim + yama) | p95 **≤ 0,3 ms** (ADR-002'nin 50 oda/çekirdek hedefinden: 16,7 ms ÷ 50 ≈ 0,33 ms) | D4 p95 0,19-0,25 ms | D4.md |
| Oda adımı, seyircili yayın odası (+ seyirci yansıtma) | p95 **≤ 4 ms** (yayın odası tek tük; aynı çekirdekte en çok 2 yayın odası + 25 seyircisiz oda sığar) | D8 (22 seyirci) p95 1,163 · p99 2,83 ms | D8.md |
| Eşzamanlı oda | ADR-002: 50 oda tek çekirdekte | **ölçülmedi** (yük testi aracı yok) | ADR-002 |
| Bant, oyuncu başına | aşağı ≤ 6 KB/s, yukarı ≤ 4 KB/s | aşağı 3,0-3,9, yukarı 0,7-0,85 KB/s | D4.md |
| Bant, seyirci başına | ≤ 6 KB/s | 1,57 KB/s | D8.md |
| İlk yükleme, varlık | ≤ 1,5 MB | 533 KB | TEMIZLIK.md § 2 |
| İlk yükleme, toplam | hedef 1,5 MB sıkıştırmasız | 1 621 KB sıkıştırmasız (aşım kod), gzip tahmini ≈ 750 KB | TEMIZLIK.md § 2 |
| Lobi JS parçası | ilk JS ≤ 350 KB | 63,6 KB gzip | D4.md |
| Parçacık | en çok 400 | 51 | GU-F.md |
| Kare süresi | 16 ms (10 dövüşçü + efekt, axiom görevi) | yalnız CPU: `kareAt` medyan 1,5-1,6, p95 6,5-8 ms; gerçek GPU'da **ölçülmedi** (SwiftShader ≈ 100 ms/kare yazılım GL) | GU-F.md |
| Olay gecikmesi (N3) | p95 ≤ 200 ms | 348-490 ms; sıçrama/10 çarpışma 1,46-1,67 (kapı ≤ 1) | netcode.md "Karar N3" |
| Süreç | CPUQuota 150 %, MemoryMax 1 GiB | VPS'te **ölçülmedi** (kurulu değil) | devran.service |

Oda adımı eşiği 2026-11-06'da tek kurala indirildi (kalan-is #15): D4'ün 0,2 ms'si seyircisiz odaya, D8'in 4 ms'si seyircili yayın odasına aitti; ikisi ayrı satır olarak kaldı, sayı ADR-002'nin oda yoğunluğu hedefinden türetildi (yeni karar değil, var olan hedefin hesabı). İki ölçüm de kendi eşiğinin içinde.

Çekirdek seviyesi: `ilerleme.ts` Lv.4 eşiğini (2200 XP) tutar ama `tavan` 3'tür; Lv.4 sezon 2'de açılır (tuning.md § 14, § 17 ile aynı). Çelişki yok.

## 8. Riskler ve geri dönüş

- **Colyseus 0.18 tazeliği:** geri dönüş tetikleri ADR-005 § "0.17 + elle ara değerleme" (T1-T4). T1 (SDK reconciler) D4'te
  zaten aşıldı: SDK'nın tahmin katmanı kullanılmıyor, yalnız `defineInput`, `setFixedTimestep`, şema ve yeniden bağlanma.
  Dönüşün maliyeti bu yüzden `src/istemci/ag/` + `src/sunucu/odalar/` ile sınırlı.
- **Ağ N3** (p95 olay gecikmesi): taşıma kaynaklı; yol sahip kararı (güvenilmez girdi kanalı ya da tahmin B).
- **Tek süreç:** çökme ya da güncellemede süren maçlar kaydedilmez; systemd 3 sn'de kaldırır.
- **Kimlik:** Kick OAuth yok; `oyuncu.kick_id` sütunu boş bekliyor (veri-modeli.md).
