# pixelfx (patch-gg) — pişirme reçetesi

- **Kaynak:** https://github.com/patch-gg/pixelfx, commit `a84159688af3ca37a4be05a0d422b94451b2e24e` (2026-10-31), sürüm 0.3.0.
- **Lisans:** MIT (`LICENSE` ve `NOTICE.md` aynen kopyalandı). Telif: Patch; Hugo Duprez (Sprite Fusion uyarlamaları). `gallery/fonts` (Patch Pixel) MIT dışı, **kullanılmaz**.
- **Durum (2026-11-04, sahip onayıyla):** 16 efekt `node tools/render.mjs <id> --sheet --no-actor --bg none --fps 12` ile pişirildi, kare başına kırpılıp 7 atlasa paketlendi: `atlas/efekt.png` (ortak, 2048×1024) + `atlas/efekt-<element>.png` (6 element, ≤ 1024²). Pixi `Spritesheet` JSON biçimi (`frames`, `animations`, kırpılmış kareler için `spriteSourceSize`/`sourceSize`, `anchor` = pixelfx pivot); `meta.devran` içinde fps, döngü, kare süresi. Toplam PNG 2 925 365 B. Araçlar `arac/` (bake.py, pack.py, prev2.py), önizleme `onizleme.png`.
- **Değiştirilmiş efekt:** `water/whirlpool` yerel fork'ta `SY` 0.6 → 0.875 (hibrit çanak oranı); `arac/whirlpool-SY.diff`. MIT gereği değişiklik burada kayıtlı.
- **Bütçe:** ham 30 fps tam tuval ≈ 2048²'nin 8,1 katı; 12 fps birleşik kutu kırpma 2,28 katı → atlas bölündü. İlk denemede kare sınırı fps'i 3-4'e düşürdü (çok kesik), bırakıldı.
- Yazı içeren efekt seçilmedi; `--no-actor` ile kukla/karakter gövdesi çıkarılır.
- **Yeniden pişirme (2026-11-04, sahip izniyle; efekt-kaynaklari.md § 9.7):** 4 efektin (heavy-landing, ground-slam, poof, collect-burst) paleti ve `secenek` alanı (stone/stars) güncellendi, `efekt.png` yeniden pişirildi. Komutlar: pixelfx `a841596` klonunu `<S>/dl/pixelfx`'e, SY fork'unu `<S>/dl/pixelfx-fork`'a koy, ardından `cd <S> && python3 arac/bake.py <S> recete.json`, `python3 arac/pack.py <S> atlas recete.json` ve `python3 arac/prev2.py atlas onizleme.png`.
