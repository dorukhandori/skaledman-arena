# Topaç parçaları üretim kaydı (Mac hattı)

Brief: `docs/art/topac-uretim-istegi.md`. Hat: `araclar/sanat/README.md` + `araclar/sanat/topac-mac.ts` (Tripo GLB → Blender
simetrik dilim → `topac-uret.ts` pişiricisi → biçim B). Ham dosyalar ve satır satır kayıt depo dışında
(`art-source/topac/manifest.jsonl`, `art-source/topac/tripo-kayit.jsonl`).

| Tarih | Araç | Ne | Adet | Maliyet |
|---|---|---|---|---|
| 2026-11-05 | Gemini `gemini-3.1-flash-image` | Parti 1: 4 ikon (Ok Gövde, Hafif Disk, Düz Uç, Kor Göktaşı) | 4 | ≈$0,18 |
| 2026-11-05 | Gemini | Parti 1: 4 Tripo konsepti + 8 yeniden üretim (ilk tur ret: Ok Gövde 4 kanat, Disk 8-9 çıkıntı, Uç 12 nervür ve tabansız, Göktaşı bütün topaç) | 12 | ≈$0,54 |
| 2026-11-05 | Tripo `image-to-model` v3.1-20260211, dokulu | Parti 1: 4 model | 4 | 160 kredi (2985 → ≈2825, kayıttan hesap) |
| 2026-11-05 | Blender 5.2.2 (yerel, Cycles CPU veri geçişi) | 4 parça × 32 ince açı × 3 geçiş (+ sol ayna Gövde) | — | 0 |
| 2026-11-05 | Gemini | Parti 2: 7 Gövde ikonu | 7 | ≈$0,32 |
| 2026-11-05 | Gemini | Parti 2: 7 Gövde Tripo konsepti × 2 varyant + Savrulan 2. tur × 2 (ilk model kancaları yüksek duvar yaptı) | 16 | ≈$0,72 |
| 2026-11-05 | Tripo `image-to-model` v3.1-20260211 | Parti 2: 7 Gövde + Savrulan yeniden | 8 | 320 kredi (≈2825 → ≈2505, kayıttan hesap) |
| 2026-11-05 | Gemini | Parti 3: 16 ikon (7 Çekirdek + 4 Disk + 5 Uç) + 7 Çekirdek Tripo konsepti × 2 varyant | 30 | ≈$1,35 |
| 2026-11-05 | Tripo `image-to-model` v3.1-20260211 | Parti 3: 7 Çekirdek (Disk/Uç parametrik kaldı: sahip kararı, 440 kredi tasarruf) | 7 | 280 kredi (≈2505 → ≈2225, kayıttan hesap) |

Parti 1 toplamı: **≈$0,72 Gemini + 160 Tripo kredisi** (brief tahmini $0,5 + 160-200).
Parti 2 toplamı: **≈$1,04 Gemini + 320 Tripo kredisi** (öngörü $0,95 + 280; fark Savrulan'ın ikinci turu).
Parti 3 toplamı: **≈$1,35 Gemini + 280 Tripo kredisi**. Genel toplam: **≈$3,11 Gemini + 760 Tripo kredisi** (brief tahmini ≈$3,2 + 1 280).
