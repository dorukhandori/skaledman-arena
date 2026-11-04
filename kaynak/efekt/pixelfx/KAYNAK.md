# pixelfx (patch-gg) — pişirme reçetesi

- **Kaynak:** https://github.com/patch-gg/pixelfx, commit `a84159688af3ca37a4be05a0d422b94451b2e24e` (2026-10-31), sürüm 0.3.0.
- **Lisans:** MIT (`LICENSE` ve `NOTICE.md` aynen kopyalandı). Telif: Patch; Hugo Duprez (Sprite Fusion uyarlamaları). `gallery/fonts` (Patch Pixel) MIT dışı, **kullanılmaz**.
- **Durum:** depoda hazır PNG yok (efektler kodla çizilir). Pişirme `node tools/render.mjs <id> --sheet` ile yapılır; bu oturumda dış kaynaklı kod çalıştırma izni verilmediği için **PNG üretilmedi**. Seçim ve parametreler `recete.json` ve `veri/manifest-gorsel.json` içinde.
- **Bütçe:** ham 30 fps tam tuval 16 efekt ≈ 2048²'nin 8,1 katı; reçete (12 fps, kare sınırı, hedef kutuya kırpma) ≈ %42.
- Yazı içeren efekt seçilmedi; `--no-actor` ile kukla/karakter gövdesi çıkarılır.
