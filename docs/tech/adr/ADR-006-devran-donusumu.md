# ADR-006: Devran dönüşümü (Skaledman ve Pokémon'dan ayrılma)

Tarih: 2026-11-04 (karar) · yazım 2026-11-06 · Durum: kabul edildi · Sahibi: `@axiom` (teknik sonuçlar); karar sahibin

## Bağlam

Proje 2026-11-01'de Kick yayıncısı swaggybark'ın skaledman.com kartlarıyla (Pokémon Infinite Fusion füzyonları) oynanan
gerçek zamanlı 1v1 arena olarak başladı. Mimari buna göre kuruldu: saatlik Skaledman `/api/kartlar` + `/api/history` çekimi,
kart → dövüşçü formülleri, PokéAPI'den tip tablosu, fusion sprite aynalama, Kick OAuth ile `user_id` eşleşmesi
(`docs/tech/skaledman-eklenti.md`, `docs/tech/veri-cekimi.md`, eski `mimari.md`). Bu yol üç dış bağımlılık taşıyordu: başka
birinin sitesinin verisi ve izni, üçüncü taraf IP (Pokémon, fan sprite'ları), Kick hesabı zorunluluğu.

## Seçenekler

1. Skaledman eklentisi olarak devam: veri ve kimlik Skaledman'a ve Kick'e bağlı; IP riski yüksek; başkasının yol haritasına bağımlı.
2. Pokémon füzyonlarını kendi verimizle sürdürmek (Skaledman'sız): dış site bağımlılığı kalkar, IP riski kalır.
3. **Tamamen özgün oyun** (dönen topaç dövüşü, kendi parça/ruh/yetenek verisi): yığın aynı kalır, veri katmanı ve
   kimlik yeniden yazılır, IP riski kendi ürettiğimiz varlıklara iner. Seçildi.

## Karar

Sahip (2026-11-04): **"skaledman'dan bağımsız bir proje olacak. diğer projeyi başkaları götürüyor."** Proje **Devran** oldu:
özgün, kâr amaçsız, tarayıcıda gerçek zamanlı 1v1 topaç dövüşü. Aynı gün sahip Kick OAuth'u sona bıraktı; kimlik oyuncu adı +
şifre (`docs/tech/backend.md` üst not).

## Sonuçlar

- **Yığın değişmedi** (ADR-001): Vite + TypeScript + PixiJS 8, Colyseus 0.18 yetkili sunucu, tek paket, `src/paylasilan`
  paylaşılan sim, SQLite, VPS + Cloudflare Tunnel. ADR-002 (60 Hz) geçerli; ADR-004/005 Devran döneminde yazıldı.
  three.js yalnız Atölye 3B için sonradan eklendi (`docs/tech/mimari.md` § 1).
- **Veri kaynağı:** dış veri çekimi yok. Parça, ruh, yetenek, başarım ve ipucu verisi bizim `veri/*.json` dosyalarımızdır,
  zod ile doğrulanır, istemci ve sunucu aynısını paketler (`docs/tech/veri-modeli.md`). `src/` ve `araclar/` içinde
  "skaledman", "pokeapi", "fusion" geçen dosya yok (2026-11-06 grep); `veri/spritecollab-tracker.json` (git dışı) kalıntıdır.
- **Kimlik:** ad + şifre, `scrypt` (N = 2^15, r = 8, p = 1), HMAC imzalı oturum çerezi ve 60 s'lik tek kullanımlık oda bileti
  (`src/sunucu/kimlik.ts`). Kick OAuth **askıda**, sahip söyleyene kadar yazılmaz; `oyuncu.kick_id` sütunu (UNIQUE, NULL) ileride
  bağlamak için yerinde. Kick gelince çerez/bilet akışı aynı kalır, yalnız kimlik kanıtı değişir; systemd `IPAddressDeny=any`
  dış çıkış için gevşetilmeli.
- **IP hijyeni:** eski marka ve fan-IP adları testle denetlenir (B-37); kanonik tasarım ve tanınır kutsal canavar eşlemeleri yasak
  (CLAUDE.md "Original IP only").
- **Belgeler:** 2026-11-04 öncesi Skaledman/Pokémon belgeleri (`docs/design/oyun-konsepti.md`, `docs/art/fusion-animasyon.md`,
  `docs/tech/skaledman-eklenti.md`, `docs/tech/veri-cekimi.md`, yol haritasındaki F0-F3 ve K-1…K-16) **tarihçedir, otorite
  değildir**. ADR-001 ve ADR-003'e tarihli not düşüldü; kararları değişmedi. `mimari.md` 2026-11-06'da koddan yeniden yazıldı.
- **Geri dönüş:** geri dönmek yeni bir sahip kararı ister; teknik olarak veri katmanı ve kimlik baştan yazılmadan mümkün değil.
