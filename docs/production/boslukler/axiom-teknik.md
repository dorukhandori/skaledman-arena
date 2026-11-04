# Boşluk taraması: teknik ve mimari (Devran)

**Tarih:** 2026-11-04 · **Yazar:** [@axiom · Technical Director] · **Durum:** tarama bitti, kararlar sahibin itirazına açık.
**Okunan:** `CLAUDE.md`, `docs/design/beyblade/00..05`, `docs/art/topac-pixel-plani.md`, `docs/tech/mimari.md`, `docs/tech/adr/ADR-001..003`, `docs/research/beyblade/04` § 4, `06` § 4-5, `package.json`, `package-lock.json`, `src/` (tamamı), `test/`, `eslint.config.js`, `.github/workflows/ci.yml`, `docs/production/ACTIVE_WORK.md`.
**Ölçülen (2026-11-04, bu dal):** `vitest run` 105/105 geçti, `npm run lint` ve `npm run typecheck` temiz. Bütçe sayıları **ölçülmedi**, hedeftir.

## 0. Özet

- Yığın (Vite + TS + Pixi 8 + Colyseus 0.18 + tek paket) Devran için **değişmez**; değişen şey sim, veri modeli ve görsel hat.
- Kodlamayı fiilen bloklayan altı şey var: (1) birim/ölçek/bakış tanımsız, (2) determinizm kuralı lint'te yok, (3) parça kataloğu sözleşmesi yok, (4) maç akışı (tur, değişim, ani ölüm) belirsiz, (5) tahmin modeli A/B açık, (6) `CLAUDE.md` ve `mimari.md` hâlâ Skaledman/Pokémon diyor ve her ajan oturumuna yükleniyor. § 4'te beşine cevap verdim; altıncısı belge işi.
- `src/`'nin ~4 950 satırından ~2 450'si (dosya bazında sayım) kalır ya da evrilir: sabit adım döngüsü, Girdi, çarpışma çözücü, PRNG, efekt havuzu, sahne iskeleti, protokol, lint kapısı. Ama evrilenlerin büyükleri (`durum.ts`, `adim.ts`, `takim.ts`, `Efektler.ts`) yarıdan fazla yeniden yazılır. Kalanı silinir: Pokémon kuralları, fusion sprite hattı, Skaledman çekimi, hamle/mermi/durum sim'i.

## 1. Mevcut kodun kaderi

| Dosya | Kader | Not |
|---|---|---|
| `paylasilan/sim/Dunya.ts`, `durum.ts` | **evrilir** | `Dovuscu` → `Topac`, `Olay` birliği yeniden yazılır, `kalanSure` (float s) → `kalanTick` (tamsayı) |
| `paylasilan/sim/adim.ts` | **evrilir** | ivme/sürtünme/desen modeli (05 § 2.2); `yonBul` çağrısı (`:55`) kalkar: sim sprite sözleşmesine bağımlı olamaz |
| `paylasilan/sim/carpisma.ts` | **kalır** | `daireDaireCoz`, `konumCoz` kalır; `Math.hypot` (`:66,131`) → `kok2` |
| `paylasilan/sim/Girdi.ts` | **kalır, sınırlar değişir** | Alanlar aynı (01 § 1.2 doğru), ama `nisanX/nisanZ` kırpması eski dikdörtgene göre (`:42-47`); merkez orijinli çanakta yanlış. `PROTOKOL_SURUMU` 2 olur |
| `paylasilan/sim/rastgele.ts` | **kalır** | `Math.imul` + tamsayı; deterministik |
| `paylasilan/sim/takim.ts`, `zipla.ts` | **evrilir** | Tur sonu zorunlu değişim + `<%25` geri çekme; zıplama → Sekme |
| `paylasilan/sim/hamle.ts` | **silinir**, evre makinesi kalıbı (`aviso/atilis/toparlan`) `yetenek.ts`'e taşınır | `Math.cos` (`:83,94`) gider |
| `paylasilan/sim/mermiler.ts`, `vurus.ts`, `durumlar.ts`, `kademe.ts` | **silinir** | `Alan` yapısı (durum.ts:115) alan yetenekleri için korunur |
| `paylasilan/kart.ts`, `atlas.ts`, `dovuscu.ts`, `kurallar/tipler.ts`, `statlar.ts`, `hamleler.ts` | **silinir** | Yerine `kurallar/parcalar.ts` + `topacProfiliKur()` |
| `paylasilan/kurallar/ayar.ts`, `botlar.ts` | **evrilir** | `saha` (İskeletler Diyarı) → `canak`; HP/tip/durum anahtarları gider |
| `src/ag/protokol.ts` | **kalır, sürüm 2** | `KatilmaSema` fusionId alır (`:48-56`) → `takimId`; `BitisNedeni` → durma/ringOut/parcalanma/sure/terk |
| `sunucu/index.ts`, `odalar/ArenaOdasi.ts` | **kalır (iskelet)** | `@colyseus/core` doğrudan import ediliyor ama `package.json`'da yok (lock'ta 0.18.24, geçişli) → `colyseus`'tan al |
| `istemci/oyun/Oyun.ts`, `Sahne.ts`, `Efektler.ts`, `Girdi.ts`, `Nisan.ts`, `renkler.ts` | **evrilir/kalır** | Birikimli 60 Hz döngü kalır; Sahne'nin 2.5D derinlik ölçeği kalkar; Efektler parçacığı `Parcaciklar.ts`'e çıkar |
| `istemci/oyun/Bot.ts` | **taşınır** → `paylasilan/bot/` | Sunucu botu, Antrenman ve bot turnuvası aynı kodu koşmalı; `test/sim-bot.test.ts` bugün istemciden import ediyor |
| `istemci/oyun/Dovuscu.ts`, `KartPanosu.ts`, `IskeletCizimi.ts`, `Hud.ts` (HP kısmı), `sprite/*`, `stil/tipSimgesi.ts`, `ekranlar/BirlestirmeLab.ts` | **silinir** | `AtlasYukleyici` deseni (nearest, önbellek) `TopacAtlas.ts`'e taşınır |
| `araclar/fusion/*`, `fusion-birlestir.ts`, `spritecollab-kapsama.ts`, `veri-cek.ts`, `araclar/denge/*` | **silinir** (denge: kalıp olarak yeniden yazılır) | |
| `veri/kartlar.json`, `gecmis.json`, `ornek-detay-*.json`, `spritecollab-*.json` | **silinir** | |
| `test/kart`, `kurallar`, `sprite-atlas`, `veri-cek`, `sim-mekanik` | **silinir**; `sim.test.ts` determinizm kalıbı kalır | |
| `eslint.config.js`, `ci.yml`, `vite/vitest.config.ts` | **kalır**, lint genişler (§ 4 karar 1) | |

## 2. Boşluk ve çelişki tablosu

Önem: **bloklar** = ilk 3 kodlama adımı (§ 5) bu olmadan başlayamaz · **yüksek** = F1 içinde kapanmalı · orta / düşük.

| # | Boşluk / çelişki | Kanıt | Önem | Önerilen dolgu (karar · belge · kim) | Kodlamayı bloklar mı |
|---|---|---|---|---|---|
| **A. Mimari ve netcode** ||||||
| 1 | Tahmin modeli A (yalnız kendi sürüş) / B (rakip ileri tahmin + "tentative" çarpışma) açık | 05 § 4, § 4.1 (8 madde) | bloklar | § 4 karar 2 · `ADR-005-tahmin-modeli.md` · `@relay` uygular | Evet, adım 3 |
| 2 | Determinizm kuralı kodda yok: sim'de 14 `Math.hypot`, 2 `Math.cos`, 1 `Math.atan2`; lint yalnız `random/Date/performance` yasaklar; `**` ve `Math.pow` da ECMAScript'te yaklaşık; 05 § 2.2-2.4 formülleri `²` yazıyor | grep (§ 1), `eslint.config.js:41-58`, 05 § 2.8, 06 § 4 ve § 5c-3 | bloklar | § 4 karar 1 · `ADR-004-determinizm.md` · `@axiom` lint, `@byte` `kok2` | Evet, adım 1 |
| 3 | Determinizm testi yalnız **aynı süreçte** tekrarı sınar; Node ↔ tarayıcı (V8/SpiderMonkey/JSC) karşılaştırması yok | `test/sim.test.ts:45-63` | yüksek | Altın hash dosyası (`test/altin/*.json`, tick başına durum özeti) Node'da üretilir, F1'de Playwright ile Chromium + Firefox aynı betiği koşar (06 § 5c-4) · `@flint` | Hayır (F1 kapısı) |
| 4 | Ağ nicemlemesi: şema float32, sim float64 → sunucu tam hassasiyetle sürer, istemci float32 anlık görüntüden yeniden oynatır; çarpışmalı sim'de sapma büyür | mimari § 3 ("`float32`"), 05 § 2.8 son madde, § 4.1 #1, #7 | yüksek | § 4 karar 1: her `adim` sonunda durum alanları `Math.fround` ile nicemlenir (iki tarafta) · `@relay` | Hayır, adım 3'te gerekli |
| 5 | Topaç durum şeması yok; sunucu odası yalnız `faz` + `oyuncuSayisi`; mimari § 3 şeması HP/kartId/cooldown[4] | `ArenaOdasi.ts:5-8`, mimari § 3 | bloklar (adım 3) | `Topac { x,z,vx,vz,stamina,tik,enerji: f32; dashKalan,dashBekleme,sekmeKalan,temasKilidi: u16 tik; durum: u8 (aktif/sahaDisi/durma/parcalandi); yon: i8; uye: u8 }`, `Mac { faz:u8, tur:u8, puan:[u8,u8], kalanTick:u32, takimEnerjisi:[f32,f32] }` · mimari § 3 · `@relay` | Evet, adım 3 |
| 6 | Mesaj protokolü eski: `KatilmaSema.takim` fusionId dizisi; `Olay` birliği hamle/mermi/yanık; `docs/tech/netcode.md` ve ADR-004'e atıf var, ikisi de yok | `protokol.ts:5,48-56,73`, `durum.ts:127-144`, `Girdi.ts:58` | bloklar (adım 3) | `PROTOKOL_SURUMU = 2`; katılma `{ v, takimId, mod }` (parça listesi **istemciden alınmaz**, sunucu SQLite'tan okur); olaylar (`carpisma, duvar, ringOut, parcalandi, durma, turBitti, yetenek*`) her adım sonunda anında mesaj (`MESAJ.olaylar`), yamayı beklemez · `netcode.md` yazılır · `@relay` | Evet, adım 3 |
| 7 | Netcode yalıtımı belgede üç farklı yer: mimari § 1 `src/client/ag/`, § 2 `src/istemci/ag/`, gerçekte `src/ag/protokol.ts` + boş `src/istemci/ag/` | mimari § 1:29, § 2:79, `ls src/ag src/istemci/ag` | orta | `src/ag/` = ortak sözleşme (zod, Colyseus'suz); yalnız `src/istemci/ag/**` `@colyseus/sdk` import eder, yalnız `src/sunucu/**` `colyseus` import eder; ESLint `no-restricted-imports` ile · `@axiom` | Hayır |
| 8 | Pre-release'de sürüm aralığı açık: `colyseus ^0.18.10`, `@colyseus/sdk ^0.18.9`, `@colyseus/schema ^5.0.43`; `npm i` sessizce kırıcı yama çekebilir | `package.json`, lock: core 0.18.24 | yüksek | Tam sürüm sabitle (caret yok), yükseltme yalnız ayrı commit + determinizm/ağ testleriyle · ADR-001 notu · `@axiom` | Hayır (5 dk) |
| 9 | 0.17 geri dönüş tetiği vuruş geri sarmasına göre yazılmış; topaçta geri sarma kullanılmıyor | ADR-001 Sonuçlar, 05 § 4 "geri sarma anlamlı değildir" | orta | Yeni tetikler § 4 karar 2'de (T1-T4) · ADR-001 güncellenir · `@axiom` | Hayır |
| 10 | Maç fazı yok: sim'de `faz/tur/turArasi/aniOlum` yok, bitiş yalnız `ko`/`sure` | `Dunya.ts:77-95`, 01 § 2.2-2.3 | bloklar (adım 2) | § 4 karar 5 · `@helix` onayı, `@byte` | Evet, adım 2 |
| 11 | Yeniden bağlanma: 10 s sabit; 06 30 s önerir; kopan topacın davranışı ve "terk" ödülü yazılı değil | `protokol.ts:16`, 06 § 5c-6, 03 US-3.4 | düşük | 10 s kalır (90 s maçta 30 s çok); kopukken `bosGirdi`; süre dolarsa rakip kazanır, terk eden 0 Altın, başarım sayılmaz · `netcode.md` · `@relay` | Hayır |
| 12 | Bot istemcide; sunucu botu, Antrenman (03 US-1.3, US-2.3) ve boş kuyruk dolgusu (06 § 5c-8) aynı botu ister | `istemci/oyun/Bot.ts`, `test/sim-bot.test.ts:9` | yüksek | `src/paylasilan/bot/` (yalnız `Girdi` üretir, tohumlu); topaç botu yeniden yazılır · `@byte` | Hayır (adım 2'de rakip olarak gerekli) |
| 13 | Eşleştirme/lobi: üç mod, 20 s takım seçimi, bot dolgusu, bot maçının ödülü tanımsız | 03 US-5.1, mimari § 2 `LobiOdasi` | orta | Önerim: kuyrukta 20 s sonra bot teklifi; bot maçı Altın ve başarım vermez · `@helix`/`@ledger` karar, `@relay` | Hayır (F1 sonu) |
| 14 | Seyirci koltuğu yok (`maxClients = 2`) | `ArenaOdasi.ts:13`, 03 US-5.4 | düşük | F2: seyirci ayrı rol, girdisi yok sayılır · `@relay` | Hayır |
| **B. Veri modeli, kimlik, sahtecilik** ||||||
| 15 | Parça kataloğu sözleşmesi yok. 00 § 5.2 sekiz parametre sayar; 05 § 2 parça başına ~14 alan ister (ivme, vSurus, sürtünme, sekme `e`, `kCakilma`, `vRO`, kanat `kn`...); `kanat` hem sim (05 § 2.4 açı penceresi) hem sanat meta'sında (pixel § 7.5) | 00 § 5.2, 05 § 2.2-2.5, pixel § 7.5 | bloklar (adım 2) | § 4 karar 4 · `docs/tech/veri-modeli.md` · `@byte` şekil, `@ledger` sayı | Evet, adım 2 |
| 16 | Element kaynağı çelişkili: 00 § 2.2 Çekirdek; 00 § 2.3 "Gövdenin motif elementi"; pixel planı Çekirdek'ten boyar ve soruyor | 00 § 2.2, § 2.3, pixel § 2.3, § 10 #1 | yüksek | § 4 karar 4 · `@helix` itiraz edebilir | Hayır (adım 2'de tek element yeter) |
| 17 | Tip (Saldırgan/Dayanıklı/Kale/Denge) nasıl çıkar yazılı değil; 05 formülünde tip çarpanı yok, 03 filtre olarak ister | 00 § 3.3, 01 § 3.2, 05 § 2.4, 03 US-2.1 | orta | Tip **türetilmiş etiket**: `tipBul(profil)` saf fonksiyon, sim'de çarpan yok; üçgen parametrelerden doğar, bot turnuvası doğrular · `@ledger` | Hayır |
| 18 | Dönüş yönü (`yon`) sim'de yok: Emiş, zıt yön eşitleme ve Karanlık'ın ilk sürümde olması (02 K-10) bunu ister, 05 § 2.3-2.4 formülünde terim yok | 00 § 2.4, R04 § 4.1 #8, 05 § 2.4 | yüksek | 05 § 2.4'e zıt yön teriminin şekli eklenir; adım 1-2'de herkes sağ · `@byte` + `@ledger` | Hayır |
| 19 | SQLite şeması yok; mimari § 4 tabloları Skaledman'a göre (`kart.fusion_id`); `better-sqlite3` kurulu değil | mimari § 4, 03 § 7 son satır, `package.json` | yüksek | Statik tanımlar (parça, başarım, yetenek) **repoda JSON**, DB yalnız örnek ve sahiplik: `oyuncu(kick_id PK, ad, ad_degisti, arma, renk, destek_kanali, elo, olusturma)`, `oturum(id, kick_id, bitis)`, `cekirdek(id, kick_id, tanim_id, seviye, tecrube, kararma, omur, yon)`, `parca(id, kick_id, tanim_id, edinme)`, `takim(id, kick_id, ad, sira, cekirdek_id, govde_id, disk_id, uc_id)` (UNIQUE parça başına tek takım yuvası), `altin_defteri(id, kick_id, miktar, neden, ref UNIQUE)`, `basarim(kick_id, basarim_id, ilerleme, tamam)`, `mac(id, mod, a, b, kazanan, puan, sure, bitis_nedeni, katalog_ozeti, baslangic)`; `better-sqlite3` tam sürüm, vite SSR `external` · `docs/tech/backend.md` · `@vault` | Hayır (adım 1-3 SQLite'sız) |
| 20 | Altın ve satın alma bütünlüğü: çift harcama, yarış, tekrar gönderim | 03 US-3.1, US-3.4 | yüksek | Bakiye = defter toplamı; satın alma tek SQLite işlemi, `ref` UNIQUE (idempotent); maç ödülü yalnız oda kapanırken sunucu yazar, `mac.id` ile bir kez; eritme RNG'si sunucuda `crypto` · `@vault` | Hayır |
| 21 | Başarım sayımı hangi veriden? | 03 US-4.1, US-4.2 | orta | Sim olaylarından sunucuda maç özeti (`bitis`, `kriz`, `seritSuresi`...) çıkarılır; başarım tanımı JSON + saf sayaç fonksiyonu; istemci hiçbir sayaç göndermez · `@vault` | Hayır |
| 22 | Kick kimliği: mimari § 4'teki Skaledman `userId` eşleşmesi artık anlamsız; WebSocket'te çerez ve cross-site WS ele geçirme; misafir yok ama geliştirme/CI girişi tanımsız | mimari § 4, 03 US-1.1 | yüksek | REST'te HTTP-only imzalı oturum çerezi; oda katılımında `/api/bilet`'ten 60 s ömürlü HMAC bileti `onAuth`'ta doğrulanır + `Origin` kontrolü; `KIMLIK_MODU=yerel` yalnız geliştirmede; Kick App + 2FA sahip işi · `backend.md` · `@vault` | Hayır (adım 3 sahte kimlikle) |
| 23 | Katalog uyumu: istemci ve sunucu farklı parça sayılarıyla sim koşarsa tahmin sessizce sapar | 05 § 2 (tüm katsayılar `kurallar/`'dan) | orta | `katalogOzeti` (derleme anında JSON hash'i) katılmada karşılaştırılır, uyuşmazsa "sayfayı yenile" | Hayır |
| 24 | Gizlilik: Kick id/ad/kanal saklanıyor; silme yolu ve telemetri onayı yok | mimari § 3b telemetri, 03 US-1.2 | düşük | Hesap silme ucu, telemetri DNT'ye uyar · `@vault` | Hayır |
| **C. Performans ve bütçe** ||||||
| 25 | Bütçeler yazılı değil ("sayı sahibi `@axiom`", "spike'ta ölçülür") | 05 § 5, pixel § 5.3, § 8.4 | yüksek | § 3 tablosu; `mimari.md` § 7'ye taşınır | Hayır |
| 26 | Parçacık bugün `Graphics` başına `clear()` ile; 400 parçacıkta ölçeklenmez | 05 § 1 (Efektler.ts:214-228), pixel § 5.3 | orta | `ParticleContainer` + tek atlas; tavan 400 iki belgede aynı, tutarlı | Hayır (adım 3+) |
| 27 | Atlas sayfa boyutu ve maç başına yük sınırı yok | pixel § 3.4, § 7.3 | düşük | Sayfa ≤ 2048², maç başına ≤ 8 sayfa (§ 3) | Hayır |
| 28 | Ses bağımlılığı (`@pixi/sound`) kararı bende | 05 § 3.3, § 8 #6 | düşük | Kabul: `@pixi/sound` tam sürüm, yalnız `istemci/ses/` cephesinden, his katmanı adımında; ses dosyaları CC0 + manifest · ADR-001 eki | Hayır |
| **D. Belgeler arası çelişkiler** ||||||
| 29 | Bakış: 05 § 3.3 squash `Sahne.zOrani ≈ 0,69` (2.5D); pixel § 1.1 C tam üstten, 2.5D ölçeği kalkar | 05 § 3.3, pixel § 1.1 madde 4 | bloklar | § 4 karar 3 (tam üstten, z oranı 1) | Evet, adım 1 |
| 30 | Ölçek: sim dikdörtgen 760×480 birim + engel + `r = 14`; 05 daire çanak `R` + `r = 14`; pixel Topaç 64 px, çanak ~440 px (oran %15). `r = 14` ile bu oran çanak çapını ~190 birim yapar, 05'in 260 birim/s sürüşü çanağı 0,7 s'de geçer. Birim↔piksel eşlemesi hiçbir yerde yok | `ayar.ts:15-33`, `Arena.ts:12-20`, 05 § 2.2, § 2.5, pixel § 1.2 | bloklar | § 4 karar 3 | Evet, adım 1 |
| 31 | Game feel sayıları iki belgede farklı: 05 üç kademe (hitstop 33/66/100 ms, zoom %3/150 ms, parçacık 6-8/14-18/24, Parçalanma 40), pixel dört kademe (0/33/67/100 + 250 ms ×0,3, ×1,03/80 ms, 6/14/28/50, squash ×1,08/×1,15) | 05 § 3.2, pixel § 5.1 | orta | Tek kaynak `docs/design/tuning.md` "his" tablosu; o yazılana kadar **05 § 3.2 kazanır** (`vn` eşiklerine bağlı); pixel § 5.1 ona atıf yapar · `@byte` + `@iris` | Hayır |
| 32 | Hitstop yetişme eşiği "fark 40 birimi aşarsa atla" ama `vMutlak` 700 birim/s × 100 ms = 70 birim: kritik vuruşta neredeyse her zaman atlar | 05 § 2.2 madde 6, § 3.3 | orta | Eşik `vMutlak × hitstop` ile türetilir; spike'ta ölçülür · `@byte` | Hayır |
| 33 | Dash: 01 "mevcut dash kalır (60 br / 0,15 s / 10 s)"; 05 impuls 400 birim/s, dokunulmazlık yok. 10 s bekleme çarpışma oyununda ana hareket için uzun | 01 § 1.1, 05 § 2.7, `ayar.ts:38` | orta | 05 § 2.7 modeli; bekleme `@ledger` · `@helix` onaylar | Hayır (adım 1 05'i uygular) |
| 34 | Sekme: 01 "0,3 s havada, çarpışma geçirmez"; mevcut zıplama 0,5 s; 05 § 2.7 "hayalet his"e karşı. Sekme 05'te hiç yok | 01 § 1.1, `ayar.ts:77`, 05 § 2.7 | orta | `@helix` karar; adım 1-2'de Sekme kapalı | Hayır |
| 35 | Telegraf: 00 § 4.7 "hedef ≥ 0,45 s" der, tablosunda 0,2 s satırları var; 01 § 4.3 Ulti 0,9 s, 05 § 3.2 "aviso 0,2-0,45 s" | 00 § 4.7, 01 § 4.3, 05 § 3.2 | orta | Kaçılabilir her yetenekte alt sınır 0,3 s (2 × 150 ms test RTT); 0,2 s yalnız kaçılması gerekmeyen kendine etkiler · `@relay` onaylar, `tuning.md` | Hayır |
| 36 | Takım değişimi: 02 K-6 "bitiş sonrası zorunlu + `<%25` geri çek"; kod serbest Q/E/Tab + 5 s KO seçimi; yeni topacın nereye ve hangi korumayla indiği yok (`dusus` kalır deniyor) | 01 § 1.2, § 2.3, `ayar.ts:87`, `takim.ts` | bloklar (adım 2) | § 4 karar 5 | Evet, adım 2 |
| 37 | Ani ölüm tanımsız: "kenar daralır, erime artar"; sonraki bitiş maçı mı bitirir, üst sınır var mı? Oda ömrü sınırsız kalabilir | 01 § 2.3, 02 K-4 | bloklar (adım 2) | § 4 karar 5 | Evet, adım 2 |
| 38 | Yavaş çekim (×0,3) ve devrilme süsü istemci render saatini sim'in gerisine düşürür; "kesintisiz akış" bununla çakışır | 05 § 3.2 Parçalanma, pixel § 5.1, 01 § 2.3 | orta | § 4 karar 5'teki `turArasi` fazı süsü emer | Hayır |
| 39 | `enerji` adı çakışıyor: kodda zıplama enerjisi 0..1; 05 `enerji` 0..1; 00/01 3 dilim + ayrı 4. takım dilimi | `durum.ts:61`, 05 § 2.1, 01 § 4.1 | düşük | `enerji` 0..3 (1 = bir dilim), `takimEnerjisi` ayrı alan; zıplama enerjisi kalkar | Hayır |
| 40 | Yetenek veri şeması ve yuva 4 "Parça Tekniği" hiçbir yerde tanımlı değil; 00 § 4.7 yalnız örnek | 01 § 1.1, 00 § 4.7 | yüksek | `@helix` yetenek şeması (`kurallar/yetenekler.ts`: kademe, telegraf, etki ailesi, bedel); adım 4 | Hayır (ilk 3 adım yeteneksiz) |
| 41 | Karar numaraları çakışıyor: 02 K-1..K-12, roadmap zaten K-1..K-16 (ör. K-5 = 8 yönlü sprite / Kuyu; K-7 = kontroller / Lv.4) | 02, `roadmap.md:32-53`, CLAUDE.md "Decided" | orta | 02'deki kararlar **D-1..D-12** olarak yeniden numaralanır, roadmap'e "Devran pivotu" bölümü · `@nile` | Hayır |
| **E. Süreç ve yönlendirme** ||||||
| 42 | `CLAUDE.md`, `AGENTS.md`, `mimari.md` § 1-4 hâlâ Skaledman/Pokémon/8 yönlü sprite diyor; `CLAUDE.md` her ajan oturumuna yükleniyor ve `.gitignore`'da | CLAUDE.md "What this is/Decided", `.gitignore`, mimari § 2, § 4 | bloklar | Sahip onaylı kimlik metni ana oturumda yazılır; `mimari.md` § 1-4 ve `ADR-006-devran-pivotu.md` `@axiom` | Evet (ajanlar eski yönergeyle kod yazar) |
| 43 | Kirli çalışma ağacı: silinecek dosyaların dördü (`Arena.ts`, `BirlestirmeLab.ts`, `Hud.ts`, `KartPanosu.ts`) commit edilmemiş değişiklik taşıyor | `git status` | bloklar (silme) | Sahip commit eder, `skaledman-son` etiketi atılır, silme ayrı commit | Evet, silme adımı |
| 44 | `ACTIVE_WORK.md` "Devam eden"de 2026-11-01'den kalma dört talep (`@relay` ADR-004 dahil, hiç yazılmadı) | `ACTIVE_WORK.md:7-10` | orta | `@nile` temizler | Hayır |
| 45 | `docs/research/` depo dışında; tüm tasarım belgeleri R01-R06'ya atıf yapıyor | commit b5461e5, `.gitignore` | düşük | Kabul; kararı taşıyan sayı ve gerekçe tasarım belgesine yazılır (zaten öyle) | Hayır |

## 3. Bütçeler (hedef, ölçülmedi; F1'de ölçülür, aşan kapı kırmızıdır)

| Bütçe | Sayı | Ölçüm |
|---|---|---|
| İstemci kare süresi | p95 ≤ 16,7 ms, entegre GPU'lu 2019 dizüstü, 2 Topaç + 400 parçacık + iz | Chrome Performance, efekt yoğun çarpışma dizisi |
| Efekt güncelleme + çizim | ≤ 1,5 ms / kare | aynı |
| Sim adımı (istemci) | ≤ 0,3 ms; yeniden oynatma 150 ms RTT'de ≤ 15 adım → ≤ 4,5 ms / yama | vitest bench |
| Draw call | sahne ≤ 40, efekt katmanı ≤ 10 | Pixi istatistik |
| Doku | atlas sayfası ≤ 2048²; maç başına ≤ 8 sayfa, GPU dokusu ≤ 32 MB | yükleyici sayacı |
| İndirme | ilk JS ≤ 350 KB gzip; maç varlıkları ≤ 1,5 MB; soğuk açılış toplam ≤ 3 MB; ses ≤ 500 KB | `vite build` raporu |
| Sunucu oda adımı (60 Hz) | ≤ 0,2 ms → oda başı ≤ %1,2 çekirdek; 50 eşzamanlı oda ≤ 1 çekirdek; oda başı RAM ≤ 5 MB | `@colyseus/loadtest` |
| systemd | `CPUQuota=150%`, `MemoryMax=1G` (mimari § 5) | VPS |
| Bant (istemci başına, `@relay` ile) | aşağı ≤ 6 KB/s ortalama (yama 20 Hz + olaylar), yukarı ≤ 4 KB/s (60 Hz girdi) | Colyseus istatistik |
| Ağ testi koşulu | 150 ms RTT + 20 ms jitter + %2 kayıp, iki gerçek istemci | 05 § 7 |

## 4. Kodlamaya başlamak için zorunlu 5 karar (önerdiğim cevaplar)

Sahip itiraz etmezse bunlar geçerlidir; ADR olarak yazılır.

**Karar 1. Determinizm sözleşmesi (ADR-004).** Sim **float64** kalır, sabit nokta yok. İzinli işlemler: `+ − * /`, `Math.sqrt`, `min/max/abs/floor/ceil/round/trunc/sign`, `Math.imul`, `Math.fround`, karşılaştırma. **Yasak:** `Math.hypot`, tüm trigonometri, `exp/log/pow/cbrt` ve `**` operatörü (kare `x*x` yazılır); trig gereken yer betikle üretilip repoya konan literal tablodan okur (`kurallar/sinTablo.ts`). Her `adim` sonunda `nicemle(d)` sim durumundaki her float'ı `Math.fround` ile f32'ye kilitler: ağdaki değer ile tahminin başladığı değer bit bit aynı olur. Lint bu listeyi `no-restricted-properties` + `no-restricted-syntax` (`BinaryExpression[operator='**']`) ile zorlar; eşik gevşetilmez. Test: 600 adımlık iki Topaç çarpışma senaryosu, A-B ve B-A sırası aynı sonuç, altın hash dosyası; F1'de Chromium + Firefox karşılaştırması.

**Karar 2. Tahmin modeli A, B ölçüyle açılır (ADR-005).** F1 tabanı **A**: istemci yalnız kendi sürüşünü, sürtünmesini ve duvar/kenar çarpmasını tahmin eder; Topaç-Topaç impulsu yalnız sunucuda; rakibe karşı istemci yalnız **konumsal** ayırma yapar (içinden geçmesin), hız değiştirmez. Çarpışma olayı adım sonunda anında mesajla gelir, his oradan oynar. **B'ye geçiş tetiği:** 150 ms / 20 ms / %2 koşulunda çarpmadan görsel tepki > 200 ms ya da sahibin his puanı < 4/5 (05 § 7 ölçütleri). Netcode yalıtımı lint ile (§ 2 #7). Colyseus sürümleri tam sabitlenir. **0.17 + elle ara değerleme tetikleri:** T1 `Predict.reconciler` hız/stamina gibi özel durum alanlarını SDK iç API'sine yama yapmadan yeniden oynatamıyor; T2 aynı ağ koşulunda 10 çarpışmada > 1 görünür sıçrama ve reconciler eşikleriyle 2 iş gününde çözülmüyor; T3 0.18.x yamasında kırıcı değişiklik ya da bizi bloke eden hata upstream'de 5 iş gününde çözülmüyor; T4 `setFixedTimestep(60)` 10 s'de > 1 adım kaçırıyor. Tetik olursa geri dönüşü öneririm, karar sahibin.

**Karar 3. Bakış, birim ve arena biçimi (mimari § 3'e).** Tam üstten (pixel planı C), z oranı 1; 2.5D derinlik ölçeği kalkar. **1 sim birimi = 1 mantıksal piksel** (960×540 tuval, tam sayı ölçek). Arena merkez orijinli daire çanak: `R = 220`, `x, z ∈ [−R, R]`; sim arayüzü `kenarMesafesi(x, z) → { derinlik, nx, nz }` (05 § 2.2), dikdörtgen engeller veri olarak kalabilir ama ilk çanakta yok. Topaç **hit yarıçapı 28**, sanat 64 px (kanat uçları hit dışında; iki alan ayrı, pixel § 7.5). 05'in hız adayları bu ölçekte `@ledger` ile yeniden ayarlanır; tünelleme sınırı `vMutlak · dt < r` (700/60 = 11,7 < 28) tutar. `girdiTemizle` nişan kırpması çanaktan türetilir (`±(R + nisanTasma)`), `PROTOKOL_SURUMU = 2`.

**Karar 4. Parça kataloğu ve profil sözleşmesi (`docs/tech/veri-modeli.md`).** Statik tanımlar repoda: `veri/parcalar.json` (Çekirdek/Gövde/Disk/Uç), `veri/basarimlar.json`, ileride `veri/yetenekler.json`; zod şeması `src/paylasilan/kurallar/parcalar.ts`. Her parça `{ id, tur, ad, sim: {...}, gorsel: {...} }`; sim yalnız `sim`'i okur, `gorsel` (kare dizisi, periyot) sim'e girmez. Gövdenin kanat sayısı sim'i etkilediği için `sim.kanat` olarak burada durur; sanat meta'sı (`veri/topac-parca.json`) aynı `id` ile anahtarlanır ve test her katalog parçasının sanat kaydı olduğunu doğrular. `topacProfiliKur(cekirdek, govde, disk, uc) → TopacProfili` saf fonksiyon (eski `profilKur` yerine); Topacın **Element'i Çekirdek'ten** gelir, Gövde yalnız uyum cezası için isteğe bağlı `motif` taşır; tip etiketi türetilir (§ 2 #17). DB yalnız örnekleri ve sahipliği tutar (§ 2 #19). Derleme anında `katalogOzeti` üretilir ve katılmada karşılaştırılır.

**Karar 5. Maç akışı durum makinesi (sim'de; `@helix` onayı).** `faz`: `geriSayim` (2 s) → `tur` → `turArasi` (1,5 s, girdi yok sayılır, yavaş çekim ve devrilme süsü burada oynar) → `tur`... → `bitti`. Bitişte kaybedenin topacı **emekli olur** (maçta geri dönmez; 3 kayıptan önce rakip 3 puana ulaştığı için 3 topaç her zaman yeter); sıradaki üye takım sırasıyla otomatik gelir, `turArasi`'nda Tab+1-3 ile başka canlı üye seçilebilir. Her turda **iki topaç da doğum noktalarına döner** (yeni topacın düşüş noktasında avlanmasını önler; 01'deki "kesintisiz akış"tan sapma budur, `@helix` itiraz edebilir); kazanan staminasının `%x`'ini geri alır, `tik` sıfırlanır. Eşzamanlı bitiş: puan yok, tur tekrar. Kendi düşüşü: rakibe puan. `stamina < %25` geri çekme: 2 s savunmasız çekilme, çekilen üye maçta geri dönebilir, tur sayılmaz. **Süre:** 90 s'de 3 puana ulaşan yoksa **ani ölüm**: çanak yarıçapı 10 s'de `R`'den `0,7 R`'ye daralır, erime ×2; **sonraki bitiş maçı bitirir** (öndeki kazanır; eşitse bitişi yapan kazanır). **Mutlak sınır 120 s**: hâlâ bitmediyse puan, eşitse stamina oranı, eşitse berabere. Tüm süreler tamsayı tik (`kalanTick`).

## 5. İlk 3 kodlama adımı ve dayandıkları kararlar

1. **Tek Topaç sürüş + çanak + duvar (çevrimdışı, Topaç Lab ile paralel).** Gereken: karar 1, 3; aday katsayılar 05 § 2.2. Önkoşul: § 2 #42 ve #43 (kimlik metni, `skaledman-son` etiketi, eski kodun silinmesi). Kapı: lint (genişlemiş), 600 adım determinizm, sahip oynar.
2. **İki Topaç impuls + stamina + Durma/Ring Out/Parçalanma + maç akışı, bota karşı.** Gereken: karar 4 (katalogda 3 Gövde + 2 Disk + 3 Uç + 3 Çekirdek, pixel § 8.1 ile aynı sayı), karar 5, `paylasilan/bot/`. Kapı: A-B/B-A simetri testi, bot turnuvası maç süresi dağılımı 40-90 s (01 § 2.3).
3. **Sunucu yetkili 1v1 + tahmin A.** Gereken: karar 2, § 2 #5 şema, #6 protokol v2, sahte kimlik (`KIMLIK_MODU=yerel`). Kapı: 150 ms / 20 ms / %2 altında iki gerçek istemci, 05 § 7 ölçütleri, § 3 bant ve oda adımı bütçeleri.

Kick girişi, SQLite, market, başarım ve yetenekler bu üç adımı bloklamaz; F1'in ikinci yarısında `@vault` ve `@helix` belgeleriyle gelir.
