# HARITA-H3 · Kazı (sunucu)

**Tarih:** 2026-11-06 · **Dal:** `devran-kod`

## Ne yapıldı
- `src/sunucu/oyuncu/maden.ts` + `src/sunucu/api/maden.ts`: `POST /api/maden/basla` (201; 409 `kilitli·uzak·ustalik·bitti`, 404 `yok`, 403 `kapali`), `POST /api/maden/kaz` (200; 429 `erken` < 700 ms + `beklemeMs`, 409 `sira·bitti`, 404 `seans`), `POST /api/maden/bitir` (idempotent özet).
- Tek işlemde: cevher, Madencilik tecrübesi (bant × günlük çarpan), düğüm/gün sayaçları (`maden_gunluk` + `*` satırında isabet serisi ve ardışık ıska), telemetri (`maden_vurus`), aşama (ilk başarılı vuruş TEMİZLE, ömür boyu 30 başarılı vuruş USTALAŞ → **USTA DAMAR** kapasite +1, nadir +5 puan), seans ilerlemesi (faz her vuruşta `crypto.randomInt`).
- Nadir yuva: `fnv(MADEN_SIRRI, oyuncu, gün, düğüm)`; aynı gün aynı sıra, seans açıp kapamak değiştirmez; Ustalık yetmeyen nadir sıra ana kademeyi verir; sürüm tavanı K4.
- DİNÇ 1–40 ×1, 41–60 ×0,5 (başarıda en az 1), 61+ cevher 0 / tecrübe ×0,1 (kazı kilitlenmez); metin "ceza/yasak" içermez. Şanssızlık koruması (3 ıska → başarı, gösterilmez).
- Telemetri 30 gün: açılışta + günde bir `madenTelemetriTemizle`.
- `/api/ben` + `ustalik{madencilik, isleme}` (seviye), `ocakAcik`.
- **İsabet zamanlaması:** `KazSema` + `gecikmeMs` (istemcinin son 3 istek RTT'sinin ortancası). Sunucu `|isabetMs + gecikmeMs − gecen| ≤ 150` ve halka fazı `isabetMs + faz` penceredeyse isabet.

## Ölçüm: H-H6
- N3 benzetimi (150 ms tek yön + ±20 ms jitter + %2 kayıp, kayıpta +200 ms RTO + yol; 5 000 vuruş, tohumlu): gerçek isabet kabulü **≥ %95** (test eşiği), sahte (±400 ms) **%0**. Tolerans **±150 ms kaldı** (99 S-9'daki 250'ye genişletme gerekmedi).
- Not: ham istemci süresi (RTT'siz) gönderilseydi N3'te fark ≈ 300 ms olur, kabul %0'a yakın düşerdi → `gecikmeMs` alanı eklendi (varsaydım; 08 § 6 "REST'te güvenilir RTT yok" sorununun istemci tarafı çözümü). Halka fazı istemci zamanından okunur (oyuncunun gördüğü).

## Testler
- 579 → **589** (`maden-api` 9 + HTTP 1): 700 ms, sıra, tek seans, bitir idempotent, kapasite 6 (7. vuruş red) ve 04:00 yenilenme, 40/60/61+ çarpanları, şanssızlık, nadir yuva sabit + Ustalık yetmezse ana kademe, USTA DAMAR kapasite 7, isabet +1 ve telemetri, H-H6. lint/typecheck/build yeşil; sim dokunulmadı.

## Varsaydım
- 08 § 6 taslağındaki "toplam ≥ 60 → 409 gunlukTavan" yerine 02 § 6 / 11 § 5.1 / 99 S-23 kuralı: **61+ verimsiz, kilit yok** (sonraki belgeler kazanır).
- "Düğüm başına 9. vuruş reddi" (11 § 10): normal damarda 7., Derin Damar'da 9.; USTA DAMAR +1 (13 kazanır).
- A7 otomatik rapor (isabet ≥ %98 ve varyans < 20 ms) için telemetri hazır; rapor aracı yazılmadı (insan bakar; sonraki iş).
- Seans ömrü 5 dk hareketsizlik ya da gün değişimi.

## Sonraki
- H4 Ocak; H5'te `basarimMadenOlaylari` gerçek olaylarla (cevherKazildi, nadirDamar, isabetSerisi, cevherCesidi, ustalikSeviye).
