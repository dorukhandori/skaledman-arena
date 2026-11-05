# Foozle "Pixel Magic Effects" 1.0

- **Eser:** lordfitoi tarafından çizildi, Foozle dağıtıyor. https://foozlecc.itch.io/pixel-magic-sprite-effects
- **Lisans:** CC0 1.0. Paketin kendi `Readme.txt` dosyası aynen burada; ilgili kısım: "License: (Creative Commons Zero, CC0) http://creativecommons.org/publicdomain/zero/1.0/ This content is free to use and modify for all projects, including commercial projects. Attribution not required." `LICENSE` = CC0 1.0 yasal metni.
- **İndirme:** itch ücretsiz akış, `Foozle_2DE0001_Pixel_Magic_Effects.zip` (104 263 B, sha256 `0c04ab8ee856988b55885a92305d5382459cc855b2a6361c417bb11606f41e9a`), 2026-11-04, sahip izniyle. Zip içinden yalnız birleşik sheet'ler + Readme alındı; kare kare PNG'ler alınmadı (aynı içerik).
- **İçerik:** `Pixel_Magic_Effects_Animations.png` 640×832: 10 sütun, 64×64 kareler. Sütunlar: Fire_Ball 10, Rocks 10, Water 10, Wind 10, Portal 10, Explosion 7, Molten_Spear 12, Earth_Spike 9, Water_Geyser 13, Tornado 9 kare. `Pixel_Magic_Effects_Icons.png` 320×32: 10 ikon, 32×32.
- **Çelişki:** Sayfadaki "32x32 format" ifadesi yalnız ikonlar için doğru; animasyon kareleri **64×64**.
- **Hibrit kamera değerlendirmesi (gözle):**
  - **Fire_Ball, Water, Wind, Molten_Spear:** yandan mermi. Topaç oyununda karşılığı yok; kullanılmaz.
  - **Explosion** (7 kare, sarı yıldız → turuncu kıvılcım): hava öğesi, kritik çarpışma için yedek.
  - **Tornado** (9 kare, dikey): Kasırga Alanı için pixelfx `tornado`'ya alternatif.
  - **Earth_Spike, Water_Geyser:** dikey, eğik kamerada okunur. Kaya/Girdap Ulti yedeği.
  - **Rocks:** yandan, zemine basık; kullanılmaz.
  - **Portal:** mor, palete uymuyor.
  - **Genel:** Koyu konturlu, doygun "RPG" stili; pixelfx atlaslarından daha kalın çizgili. Birlikte kullanılırsa stil farkı belirgin olur. Öncelik düşük, yedek havuz.
- **Atlas etkisi:** 640×832 sheet; yalnız Explosion + Tornado + Earth_Spike seçilirse ~25 kare × 64² ≈ 2048²'nin %2,4'ü.
