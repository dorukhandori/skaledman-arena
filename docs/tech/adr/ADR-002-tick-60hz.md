# ADR-002: Simülasyon tick hızı 60 Hz

Tarih: 2026-11-01 · Durum: kabul edildi (K-6) · Sahibi: `@axiom` + `@relay`

## Bağlam

Referans oyun 60 Hz tick, tick başına bir girdi mesajı, yama yayını ayrı. En kısa telegraf 0,08 s (anlık). Mimari taslağı 30 Hz önermişti: 0,08 s = 2,4 tick, vuruş zamanlaması ±17 ms oynar.

## Seçenekler

1. **60 Hz tick, 20 Hz yama** — seçildi. Referans oyunla aynı his; 1v1 odada sunucu CPU önemsiz (`docs/tech/mimari.md` § 3b).
2. 30 Hz tick, en kısa telegraf 0,1 s: yarı CPU, Colyseus örneklerinin varsayılanı.
3. F0'da ikisini ölçüp sonra karar: sahip beklemek istemedi.

## Karar

Sahip 2026-11-01 açık kararlar turunda **60 Hz**'i seçti.

## Sonuçlar

- `setFixedTimestep(step, 60)`; paylaşılan `dt = 1/60`; istemci tahmini aynı adımla.
- Yama yayını (`patchRate`) 20 Hz; uzak dövüşçüler 100 ms gecikmeli lerp.
- Yerel (çevrimdışı) F0 döngüsü de 60 Hz birikimli adım kullanır, en çok 6 adım/kare (ölüm sarmalı koruması).
- Bütçe: 1v1 oda adımı < 1 ms; 50 eşzamanlı oda tek çekirdekte; `@colyseus/loadtest` ile F1'de ölçülür.
