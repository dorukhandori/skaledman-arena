# ADR-001: Teknoloji yığını

Tarih: 2026-11-01 · Durum: kabul edildi (K-2, K-8, K-9, K-10) · Sahibi: `@axiom`

## Bağlam

Skaledman kartlarıyla PokeRivals tarzı gerçek zamanlı 1v1 tarayıcı arenası. Tek kişilik ekip + ajanlar; netcode sonradan eklenemez, mimariyi belirler. Referans oyun PokeRivals: Vite + TS + PixiJS 8 istemci, Fly.io'da ham WebSocket sunucu, 60 Hz, yalnız kendi konumu tahmin (`docs/research/pokerivals-paket-analizi.md`).

## Seçenekler

1. **Vite + TypeScript + PixiJS 8 istemci; Colyseus 0.18 yetkili sunucu, gömülü netcode; tek paket (`colyseus/vite` başlangıcı)** — seçildi.
2. Aynı istemci + ham WebSocket ve elle yazılmış tahmin/uzlaştırma (PokeRivals'ın yolu): 1–2 hafta ek iş, hata yüzeyi bizde.
3. Phaser + Colyseus (pokemonAutoChess, PokeMMO örnekleri): Phaser'ın sahne/fizik yükü gereksiz; Pixi 8 daha hafif ve PokeRivals'la aynı.
4. Colyseus 0.17 + elle interpolasyon (tanks demosu): daha oturmuş sürüm, ama tahmin katmanı yok.

## Karar

Sahip (2026-11-01): "önce tasarım ve github'dan hazır bizi yormayacak bir iskelet ve mimari çalışması yapalım" → `docs/tech/mimari.md`; sonra açık kararlarda **0.18**, **tek paket**, **npm**, **Türkçe tanımlayıcılar** seçildi.

Kurulum 2026-11-01: `colyseus@0.18.10` (Vite eklentisi `colyseus/vite` ile tek süreç çalışıyor), `@colyseus/schema@5.0.43` (`schema({ alan: t.string() })` biçimi; dize kısayolları 5'te yok), `@colyseus/sdk@0.18.9`, `pixi.js@8.22.0`, `vite@8.3.5`, `vitest@5` (ayrı `vitest.config.ts`; Colyseus eklentisi test ortamında HTTP sunucu ister), `sharp` (sprite aracı), `zod@4`.

## Sonuçlar

- Paylaşılan simülasyon `src/paylasilan` iki tarafta da çalışır; DOM/Node/`Date.now`/tohumsuz rastgele yasak.
- Ağ kodu `src/istemci/ag/` ve `src/sunucu/odalar/` ile sınırlı tutulur.
- **Geri dönüş tetiği (0.18 → 0.17 + elle interpolasyon):** F1'de iki gerçek istemciyle 150 ms yapay gecikmede `Predict.reconciler` düzeltmeleri görünür zıplama yapıyorsa ya da `allowRewindState` vuruşları 1 hafta içinde çözülemeyen bir hatayla yanlış sayıyorsa `@axiom` geri dönüşü önerir; karar sahibin.
- Üretim: `vite build --app` → `dist/server/server.mjs` + `dist/client`, tek süreç, VPS'te ayrı systemd birimi (`docs/tech/mimari.md` § 5).
