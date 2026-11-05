# Ruh ve Pergel üretim kaydı

Hat: `araclar/sanat/README.md`. Ham dosyalar ve satır satır kayıt depo dışında (`art-source/ruh/manifest.jsonl`, `art-source/ruh/tripo-kayit.jsonl`).

| Tarih | Araç | Ne | Adet | Maliyet |
|---|---|---|---|---|
| 2026-11-05 | Gemini `gemini-3.1-flash-image` | 21 ruh portresi (+8 yeniden üretim: Ata halesi zemine karıştı, Közkartal ankaya benzedi, Savrukkırlangıç okunmadı) | 29 | ≈$1,3 |
| 2026-11-05 | Gemini | 6 Ata için Tripo konsepti | 6 | ≈$0,27 |
| 2026-11-05 | Gemini | Pergel: 1 taban + 2 referanslı ifade | 3 | ≈$0,14 |
| 2026-11-05 | Tripo `image-to-model` v3.1-20260211, dokulu | 6 Ata modeli | 6 | 240 kredi (3225 → 2985) |
| 2026-11-05 | Blender 5.2 (yerel) | 6 × 24 kare + yön kontrolleri | — | 0 |

Lisans notu: üretimler projenin kendi özgün varlıklarıdır. Canon kutsal canavar eşlemeleri (`00-lore-cercevesi.md` § 3.4) bilerek kullanılmadı.

Entegrasyon (2026-11-05, `devran-kod`): krediler `docs/art/krediler.md` § Kendi üretimimiz (yapay zekâ notu) ve `veri/manifest-gorsel.json` (`ruh.ata-hologram`, `ruh.ata-kaynak`, `ruh.portre`, `bilgic.pergel`; `yapayZeka: true`, bayt) satırlarıyla eşlendi; `npm run krediler:uret` eksiksiz. Ayrıntı `docs/production/raporlar/SANAT-ENTEGRASYON.md`.

