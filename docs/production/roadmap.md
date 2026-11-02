# Skaledman Arena — yol haritası ve karar günlüğü

Sahibi: `@nile`. Bu dosya nerede olduğumuzu söyler ve karar veren belgeye işaret eder; kendisi karar vermez.

## Durum (2026-11-01)

**F0 prototipi oynanabilir** (dal `f0/arena-prototip`, ilk commit 2026-11-01; eklenti yazısı `docs/tech/skaledman-eklenti.md`): `npm run dev` → `?ekran=arena` iki Skaledman fusion'ı gerçek kare animasyonla dövüşüyor (klavye + fare, bot), `?ekran=lab` 29 birleştirilmiş fusion; typecheck temiz, 58 test yeşil. Özet ve ekran görüntüleri `docs/research/spikes/2026-11-01-f0-prototip.md`. Kalan kodlama ve birleştirme işleri sahibin isteğiyle **Opus 5.5 oturumuna** devredildi. Belgeler: `docs/design/oyun-konsepti.md`, `docs/tech/mimari.md`, `docs/art/fusion-animasyon.md`. Ajan rosteri kuruldu. Paca projesi açıldı (SA), Sprint 1 · F0.

**Sıradaki dilim:** F0 / Birleştirme Lab (`docs/art/fusion-animasyon.md` § 6) — proje iskeleti (`colyseus/vite` klonu) + PMD SpriteCollab'dan fusion birleştirme aracı + 20 fusion'un kart resmiyle yan yana, 8 yönde Idle/Walk/Attack/Hurt oynatılması; yanında 5 kart için PixelLab denemesi (sahip onayıyla).

## Aşamalar

| Aşama | Kapsam | Durum |
|---|---|---|
| F0 | Çevrimdışı prototip: Birleştirme Lab, tek arena, 2 kart, 4 yuva, tip etkinliği, bot | **oynanabilir** (2026-11-01); kalan: sahip değerlendirmesi, denge, zıplama, takım |
| F1 | Çevrimiçi 1v1: Colyseus 0.18, kodla oda, tahmin + interpolasyon, VPS | bekliyor |
| F2 | Kick girişi, kendi kartların, 3'lü takım, 30 el yapımı hamle, 30 yetenek, dojo | bekliyor |
| F3 | Yayın: izleyici görünümü, `!dövüş`, Dayı botu, Elo | bekliyor |

## Kararlar

- **K-1 (2026-11-01)** Fikir: Skaledman kartlarıyla gerçek zamanlı arena; yalnız dövüş katmanı. Sahip: "bu platformun sadece dövüş kısmına böyle bir şey yazmak istiyorum." Belge: `docs/design/oyun-konsepti.md`.
- **K-2 (2026-11-01)** Yığın: Vite + TS + PixiJS 8, Colyseus 0.18 gömülü netcode, `colyseus/vite` tek paket, Kick OAuth, SQLite, VPS. Sahip: "önce tasarım ve github'dan hazır bizi yormayacak bir iskelet ve mimari çalışması yapalım" → `docs/tech/mimari.md`. ADR-001 yazılacak (`@axiom`).
- **K-3 (2026-11-01)** Fusion'lar modellenmez, ölçülür; animasyon prosedürel + mesh deformasyonu + kodla çizilen efekt; üretken animasyon yalnız ödül katmanı. Belge: `docs/art/fusion-animasyon.md`.
- **K-4 (2026-11-01)** Ekip: WyrmWar rosteri aynı nick'lerle taşındı; önce ajanlar kuruldu (sahip: "Önce ajanları kur").
- **K-5 (2026-11-01)** Animasyon: prosedürel/mesh yöntemi temel olarak **reddedildi**. Sahip: "direkt arena içerisinde gerçek modellenmiş 2d karakterlerin dövüşünü istiyorum aynı gönderdiğim ilk örnekteki gibi." Hedef 8 yönlü kare animasyonlu piksel karakter. Temel yöntem adayı Yol A (PMD SpriteCollab birleştirme, 224/226 kapsama), ödül/yedek Yol B (PixelLab). K-3'ün animasyon kısmı geçersiz; sprite ölçümü yalnız palet çıkarımı için kalır. Belge: `docs/art/fusion-animasyon.md`.

- **K-6 (2026-11-01)** Tick hızı **60 Hz** (yama yayını 20 Hz). Sahip seçti; gerekçe `docs/tech/mimari.md` § 3b.
- **K-7 (2026-11-01)** Kontrol şeması **referans oyununki**: WASD, 1–4 veya tekerlek hamle seçer, sağ tuş basılı nişan ve bırakınca atış, Shift dash, Space zıplama, Tab/Q/E takım. Konsept § 2'deki Q/E şeması iptal.
- **K-8 (2026-11-01)** Colyseus **0.18** (gömülü netcode); geri dönüş 0.17 + elle interpolasyon, tetik `technical-director`'da.
- **K-9 (2026-11-01)** **Tek paket** (`colyseus/vite` düzeni), **npm**.
- **K-10 (2026-11-01)** Kod tanımlayıcıları **Türkçe**; kütüphane API'leri ve commit mesajları İngilizce.
- **K-11 (2026-11-01)** Paca projesi **Skaledman Arena** açılır, F0 kartlarıyla.
- **K-12 (2026-11-01)** Skaledman ve izinler: sahip, Skaledman'ın topluluktan biri tarafından **açık kaynak** yayınlandığını söyledi: "sahibi bunu zaten açık kaynak olarak topluluktan birisi yayınladı. bunu geliştirebiliriz gönül rahatlığıyla." Onay engeli kalktı; depo bulununca `docs/research/`'e not düşülür ve dövüş katmanının o depoya mı yoksa yanına mı yazılacağı K-13 olarak sorulur. Pokémon IP ve sanatçı sprite'ları için kâr amaçsız + kredi kuralı aynen sürer.

- **K-14 (2026-11-01)** İlk arena **İskeletler Diyarı**. Sahip: "ilk arenamız 'iskeletler diyarı' olacak". Özellik `docs/design/arenalar/iskeletler-diyari.md` (`@cove`), veri `ayar.ts` `saha`, çizim `src/istemci/oyun/IskeletCizimi.ts`. Açık sorular (köşe siperi, zemin tonu, ilk anda kafatası hattı kapatsın mı) sahipte.
- **K-15 (2026-11-01)** Arenada dövüşen her fusion'ın **Skaledman kartı** görünür. Sahip: "savaşan pokemonların skaledman'dan hangi pokemon olduğu kart şeklinde arenada gözüksün". Sahadaki kart büyük, yedekler küçük, KO gri; `src/istemci/oyun/KartPanosu.ts` (kart HP ve nadirlik Skaledman formülleriyle).
- **K-16 (2026-11-01)** Zıplama, Z dinlenme, 3'lü takım (Q/E, Tab+1-3 düşüş noktası, KO sonrası 5 s seçim) ve stat kademeleri paylaşılan simülasyonda. Ajan tahminleri (zıplama beklemesi inişten, dinlenme ×2 cooldown / ×3 enerji, düşüş menzili 160) `tuning.md`'de sahip onayı bekler.

## Paca · Sprint 1 · F0 Birleştirme Lab (2026-11-01 → 2026-11-09)

| Kart | Başlık | Sahip |
|---|---|---|
| SA-1 | Tooling │ Proje iskeleti │ colyseus/vite klonu, PixiJS 8, Türkçe src düzeni, 60 Hz (Done; arena F0 dahil) | @axiom + @byte |
| SA-2 | Tooling │ Veri │ Skaledman, PokéAPI ve SpriteCollab anlık görüntüleri (Done) | @vault |
| SA-3 | Art │ Sprite hattı │ fusion-birlestir.ts (Done, 29 fusion, 226/226 kapsama) | @iris + @byte |
| SA-4 | Client │ Birleştirme Lab │ 20 fusion, 8 yön (çalışıyor; sahibin "bu o kart" kararı bekleniyor) | @spark |
| SA-5 | Research │ PixelLab │ 5 kart denemesi (sahip onayıyla) | @spark |
| SA-6 | Shared │ Kurallar │ tuning.md ve ilk hamle aileleri | @helix + @ledger |
| SA-7 | Process │ Kararlar │ ADR-001/002/003 (Done, `docs/tech/adr/`) | @axiom |
| SA-8 | Research │ Skaledman sayfası │ web sayfasından tam döküm (Done, `docs/research/skaledman-sayfa-analizi.md`) | @vault |

- **K-13 taslağı (2026-11-01)** Ürün çerçevesi netleşti: Skaledman'da "otomatik savaş" (onların) / "arenada savaş" (bizim) seçeneği; biz "arenada savaş" seçildiği andan sonrasını kodluyoruz. Devir sözleşmesi (`docs/design/oyun-konsepti.md` § 1b) depo görülünce kapanır. Sahip ayrıca: F0 prototipi bitince kalan kodlama ve birleştirme işleri **Opus 5.5 ile yeni bir oturumda** sürecek.

## Açık kararlar (sahip)

Skaledman deposunun adresi (GitHub'da bulunamadı; `z3x0fly/velutan` Swaggybark evreninin 3D haritası, ilgisiz); alan adı (`arena.skaledman.com` mu, kendi alanımız mı); sprite aynalama (Infinite Fusion topluluğuna sorulacak mı, yoksa Skaledman deposunun yaptığı gibi mi); dövüş katmanı Skaledman deposunun içine mi yanına mı (K-13, depo bulununca).

## Skaledman açık noktaları (sahip depoya ulaşınca kapanır)

Kaynak: `docs/research/skaledman-sayfa-analizi.md` § 6. Sayfadan çıkarılamayanlar: (1) yazar, depo, lisans; (2) barındırma (Node/Express çıkarımı); (3) Kick ödülünü dinleme yöntemi ve gecikmesi; (4) kart üretim kuralları: fusion seçimi, iki saldırının seçim ölçütü, yetenek seçimi, shiny oranı ve `hue`, Türkçeleştirme kaynağı, alternatif sprite (`a`/`b`) seçimi; (5) veri tabanı, ULID, `test` bayrağı; (6) oran sınırı, sayfalama; (7) `/giris` arkasındaki yetkili API (bilinmeyen `/api/*` → 401 "Giriş gerekli"); (8) `sprites.infinite-fusion.net` hotlink/CORS politikası; (9) `userId` = Kick `user_id` doğrulaması (bir OAuth girişiyle); (10) aynı fusion'ın ikinci açılışında davranış.

Sayfadan **kesinleşenler**: dört public GET ucu, `cache-control: no-store`, CORS yok (yalnız sunucu tarafı çekim), 15 sn polling, `sprite` alanı esas (29 `a` + 5 `b` alternatif sprite), shiny = aynı PNG + `hue-rotate`, kart HP ve nadirlik formülleri JS'te açık, `EFF`/`TYPE_TR`/tip renkleri ve 18 SVG glif alınabilir, 226 kartta kopya yok, 14 kullanıcının ≥ 3 kartı var.

## Araştırma notu (2026-11-01)

`docs/research/` (yerel, depoda değil) altında referans oyun için üç inceleme var: yığın ve benzer repolar; sahibin oynayışı izlenerek akış, HUD, ekonomi; istemci paketinden netcode ve simülasyon sabitleri. Son ikisi başka bir oturumda üretildi; sayısal değerler `docs/design/oyun-konsepti.md` § 11'e aday olarak aktarıldı.
