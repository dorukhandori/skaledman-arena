# araclar/sanat: görsel üretim hattı (Gemini + Tripo + Blender)

İlk kullanım: kutsal canavarlar ve Pergel (2026-11-05, `docs/design/beyblade/06-kutsal-canavarlar.md`). Aynı hat topaç parçaları (Çekirdek, Gövde, Disk, Uç) ve başka 2B/3B varlıklar için kullanılabilir.

**Yalnız sahibin Mac'inde çalışır.** Anahtarlar (`~/.facecodex/config.json` Gemini, `~/.openclaw/credentials/tripo-api-key`), Blender 5.2 ve Python sanal ortamı (`~/.venvs/uo-asset`: Pillow + numpy) orada. Bulut oturumu bu hattı çalıştıramaz; ne üretileceğini (id, tarif, boyut, çıktı yolu) yazıp Mac oturumuna iletir.

Ham dosyalar `art-source/` (depo dışı, `.gitignore`); oyuna giren çıktı `public/` altına.

| Adım | Betik | Ne yapar | Ücret |
|---|---|---|---|
| 1. 2B görsel | `gemini_uret.py` | `gemini-3.1-flash-image`, düz macenta/yeşil zeminde pixel art; isteğe bağlı referans görsel ile tutarlı varyant. Tarifler dosyanın içindeki sözlüklerde. Her çağrı `art-source/ruh/manifest.jsonl`'a yazılır | ~$0,045/görsel |
| 2. Alfa + kırp | `anahtarla.py <en_uzun> giris cikis ...` | Köşe tohumuyla zemin taşma doldurma, yumuşak kenar, zemin rengini geri çıkarma, kırpma, sığdırma | yok |
| 3. 3B model | `tripo_model.mjs <id...>` | Tripo `image-to-model` (dokulu, `v3.1-20260211`), GLB indirir, kredi kaydı `art-source/ruh/tripo-kayit.jsonl`. `TRIPO_API_KEY` yalnız o komuta ortamla verilir | 40 kredi/model |
| 4. Kare işleme | `render_ata.py` (Blender) | Normalize, element renginde kenar ışığı, 3/4 kamera; 24 kare (yükseliş/kükreme/döngü) ya da `yonler` modu (4 yön kontrolü) | yok |
| 5. Piksel sayfa | `sayfala.py` | 176 px hücre, ortak 40 renk palet, 1 px koyu kontur, 6×4 ızgara + json | yok |
| Pano | `pano2.py` | Gözle kontrol için kontak sayfası | yok |

Topaç parçası için öneri: 2B ikon (Atölye/Market) adım 1-2 yeterli; üstten bakış maç sprite'ı kod ile döndüğü için tek kare üstten görünüm (`topac-pixel-plani.md`) adım 1-2, katmanlı 3B patlatılmış görünüm gerekiyorsa 3-5.
