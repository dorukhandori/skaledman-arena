# Krediler ve lisanslar (Devran)

**Güncelleme:** 2026-11-05 · Kaynak kayıtları: `veri/manifest-ses.json`, `veri/manifest-gorsel.json`, `kaynak/efekt/*/KAYNAK.md`.
Kural: yalnız ücretsiz ve lisansı uygun kaynak (CC0 tercih; MIT / CC-BY atıfla; NC ya da yeniden dağıtım yasağı olan kullanılmaz). Oyun içi "Krediler" ekranı bu dosyadan üretilir.

## Depoda bulunan dış varlıklar

| Varlık | Yazar / kaynak | Lisans | Atıf metni (oyun içi) | Durum |
|---|---|---|---|---|
| 12 metal / teneke / plaka / cam / çan vuruş sesi (`kaynak/efekt/kenney-impact-sounds/`) | Kenney, *Impact Sounds* — https://kenney.nl/assets/impact-sounds | CC0 1.0 | "Ses efektleri: Kenney (www.kenney.nl), CC0" | aday, entegre değil; köken GitHub aynası, kenney.nl'den yeniden doğrulanacak |
| Durma sesi: bozuk para yatışı (`kaynak/efekt/bigsoundbank/`) | Joseph Sardin, BigSoundBank #2700 — https://bigsoundbank.com/coin-spinning-on-a-table-4-s2700.html | CC0 1.0 | "Durma sesi: Joseph Sardin, BigSoundBank (CC0)" | aday, entegre değil; kırpıldı + mono OGG |
| Cam kırılma sesi (`kaynak/efekt/oga-glass-break/`) | Till Behrend — https://opengameart.org/content/glass-break | CC0 1.0 | "Cam kırılma: Till Behrend (OpenGameArt), CC0" | aday, entegre değil; mono OGG |
| 2 buz kırılma sesi (`kaynak/efekt/oga-ice-shatter/`) | IgnasD — https://opengameart.org/content/ice-breakingshattering | CC0 1.0 | "Buz kırılma: IgnasD (OpenGameArt), CC0" | aday, entegre değil; 22 kHz OGG |
| UI tık + onay (`kaynak/efekt/kenney-interface-sounds/`) | Kenney, *Interface Sounds* — https://opengameart.org/content/interface-sounds | CC0 1.0 | "Arayüz sesleri: Kenney (www.kenney.nl), CC0" | aday, entegre değil; dosyalar aynen, Kenney `License.txt` dahil |
| 9 patlama sprite sheet'i (`kaynak/efekt/aim-explosions/`) | Aim studios — https://aim-studios.itch.io/explosions-pixel-art | CC0 1.0 | "Patlama efektleri: Aim studios (CC0)" | 2 şerit element rengine boyanıp atlasa alındı (`efekt-kor` kor-bulut, `efekt-don` don-parca); entegre değil |
| Büyü efektleri sheet'i (`kaynak/efekt/foozle-pixel-magic/`) | lordfitoi, Foozle dağıtımı — https://foozlecc.itch.io/pixel-magic-sprite-effects | CC0 1.0 | "Büyü efektleri: Foozle / lordfitoi (CC0)" | yedek havuz, atlasa alınmadı |
| 7 efekt atlası, 16 efekt (`kaynak/efekt/pixelfx/atlas/`) | pixelfx (Patch, Hugo Duprez) | MIT | "Efektler: pixelfx — Patch, Hugo Duprez (MIT)" + aşağıdaki MIT bildirimi | pişirildi, entegre değil |

## Yazı tipleri (GU-01, menü dili v2)

| Varlık | Yazar / kaynak | Lisans | Atıf metni (oyun içi) | Durum |
|---|---|---|---|---|
| Jersey 10 (`public/yazi/Jersey10-Regular.ttf`; başlık, düğme, rakam) | Sarah Cadigan-Fried, The Soft Type Project — https://github.com/scfried/soft-type-jersey (google/fonts `ofl/jersey10`) | SIL OFL 1.1 | "Jersey 10: Sarah Cadigan-Fried (SIL Open Font License 1.1)" | entegre; lisans `public/yazi/Jersey10-OFL.txt`; Türkçe glif tam (İ ı Ö ö Ş ş Ğ ğ Ü ü Ç ç) |
| m5x7 (`public/yazi/m5x7.ttf`; etiket, açıklama) | Daniel Linssen — https://managore.itch.io/m5x7 (crates.io `m5x7` 1.0.0 TTF) | CC0 1.0 | "m5x7: Daniel Linssen (CC0)" | entegre; lisans `public/yazi/m5x7-CC0.txt`; Türkçe glif tam |

## Pişirilmiş kod kaynaklı efektler

| Kaynak | Telif | Lisans | Not |
|---|---|---|---|
| pixelfx — https://github.com/patch-gg/pixelfx (commit `a841596`); 16 efekt pişirildi: `kaynak/efekt/pixelfx/atlas/` (7 atlas), `water/whirlpool` değiştirildi (SY) | Copyright (c) 2026 Patch; Copyright (c) 2026 Hugo Duprez (Sprite Fusion, https://www.spritefusion.com/pixel-art-vfx) | MIT | Tam metin `kaynak/efekt/pixelfx/LICENSE`. Pişmiş PNG'lerle birlikte bildirim korunur. Patch Pixel fontu MIT dışı, kullanılmaz |
| pixel-vfx-codex — https://github.com/888wing/pixel-vfx-codex (commit `a7f829b`) | Copyright (c) 2026 Pixel VFX Codex contributors; 00GameDevs (@00vchannel); Amir Mushich (pixel-plays) | MIT | Tam metin `kaynak/efekt/pixel-vfx-codex/LICENSE`. 00GameDevs adı oyunda yalnız burada geçer |

## Kendi üretimimiz

| Varlık | Araç | Lisans |
|---|---|---|
| 16 sentez ses (`public/ses/*.wav`) | `araclar/ses-uret.ts` | CC0 (bizim) |
| 22 menü dokusu ve ikon sprite'ı (`src/istemci/stil/doku/*.png`: duvar, taş çerçeve, lento, plaka, düğme dolguları, ahşap, blueprint, gece, tapınak, element/kilit/sikke/kalkan/◄) | `araclar/menu-dokulari.ts` (tohumlu, yordamsal) | CC0 (bizim) |
| Topaç parça sprite'ları ve ikonları (`public/topac/`, 27 parça) | `araclar/sanat/topac-uret.ts` + Blender 4.0.2 (`araclar/sanat/blender/topac_render.py`), parametrik modeller `kaynak/topac/parcalar-3b.json` | CC0 (bizim) |
| Atari arka plan döngüsü (`kaynak/efekt/muzik-sentez/atari-dongu.ogg`) | `kaynak/efekt/muzik-sentez/atari-dongu.py` | CC0 (bizim) |
| 6 Ata hologram sayfası (`public/ruh/ata/<element>-holo.png` + `-holo-k.png`) ve renkli kaynak sayfaları (`public/ruh/ata/<element>.png` + `.json`) | **Yapay zekâ üretimi:** Gemini `gemini-3.1-flash-image` (konsept) → Tripo `image-to-model` v3.1 (3B model) → Blender 5.2 (kare render) → `araclar/sanat/sayfala.py`, `hologram.py` (palet, kontur, hologram pişirme); kayıt `docs/art/ruh-uretim-kaydi.md` | bizim (yapay zekâ çıktısı; hizmet koşulları: çıktı kullanıcıya ait, sahip doğrulayacak) |
| 21 ruh portresi (`public/ruh/portre/*.png`; Özel Yetenek bayrağı kapalı, maçta yüklenmez) | **Yapay zekâ üretimi:** Gemini `gemini-3.1-flash-image` → `araclar/sanat/anahtarla.py` (alfa, kırpma) | bizim (yapay zekâ çıktısı; aynı not) |
| Rehber Pergel portreleri (`public/bilgic/{anlatiyor,aslinda,sevinc}.png`) | **Yapay zekâ üretimi:** Gemini `gemini-3.1-flash-image` (1 taban + 2 referanslı ifade) → `anahtarla.py` | bizim (yapay zekâ çıktısı; aynı not) |

Yapay zekâ notu: ruh/Ata/Pergel görselleri sahibin onayıyla üretim hattında (`araclar/sanat/README.md`) yapay zekâ araçlarıyla üretildi ve elle seçildi/işlendi; mevcut bir serinin karakteri ya da canon kutsal canavar eşlemesi bilerek kullanılmadı (`docs/art/ruh-uretim-kaydi.md`). Ham dosyalar depo dışında (`art-source/`, `.gitignore`).

## MIT bildirimi (oyun içi krediler sayfasına eklenecek metin)

```
pixelfx — Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez
Pixel VFX Codex — Copyright (c) 2026 Pixel VFX Codex contributors;
  effects after 00GameDevs (Copyright (c) 2026 00GameDevs, @00vchannel);
  techniques after pixel-plays (Copyright (c) 2026 Amir Mushich)
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
following conditions: The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
