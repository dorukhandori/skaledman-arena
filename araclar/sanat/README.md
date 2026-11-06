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
| Topaç parçaları | `topac-mac.ts` (+ `blender/topac_glb_render.py`) | Tripo GLB'yi eksene çevirir, 360/n dilimden simetrileştirir, `topac-uret.ts` pişiricisiyle biçim B şeritleri, Atölye GLB'si (`public/topac/model/`), 48/24 ikon, kontakt levha; `bicimB` ve `glb` listelerini günceller. Parça ayarı dosyadaki `MAC` tablosunda. Kayıt `docs/art/topac-uretim-kaydi.md` | yok |

Topaç parçası için öneri: 2B ikon (Atölye/Market) adım 1-2 yeterli; üstten bakış maç sprite'ı kod ile döndüğü için tek kare üstten görünüm (`topac-pixel-plani.md`) adım 1-2, katmanlı 3B patlatılmış görünüm gerekiyorsa 3-5.

## Harita / Maden / Ocak sanat turu (2026-11-06)

| Adım | Betik | Ne yapar |
|---|---|---|
| 1 | `harita_gemini.py <hp1\|hp2\|hpk\|hp3\|hpb\|id> [--varyant b]` | Gemini ham görseller → `art-source/harita/ham/`; kayıt `art-source/harita/manifest.jsonl` |
| 2 | `harita_piksel.py [ikon\|kalip\|zemin]` | Alfa (`anahtarla.py`), piksele indirme (ham paletinden medyan kesim + BOX), 1 px `#05050A` kontur, gri kalıp → kademe/bölge rampası, paletli PNG (`harita_png.py`). Varyant seçimi `art-source/harita/secim.json` |
| 3 | `tripo_model.mjs --alan harita karakter-0 …` | 4 karakter modeli (40 kredi/model) |
| 4 | `blender/karakter_render.py -- <glb> <klasör> [kontrol]` | Konuma göre iskelet (kol kapsülü, bacak, baş), 27 poz, 3/4 sağa bakan ortografik kamera, KAZ'da ilkel kazma |
| 5 | `harita_karakter.py` | 16×24 hücre, 9×3 sayfa, ≤ 24 renk, yeşil giysi → 6 profil rengi |
| 6 | `harita_manifest.py` | `veri/manifest-gorsel.json` `harita` bloğu |

`harita-asset-uret.ts` (kodla yer tutucu) artık yalnız `--yer-tutucu` ile çalışır.

