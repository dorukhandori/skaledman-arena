# Aim Studios "Explosions - Pixel Art" (9 sheet)

- **Eser:** Aim studios. https://aim-studios.itch.io/explosions-pixel-art
- **Lisans:** CC0 1.0. Sayfadan aynen: "LICENSE: CC0 License. You can use the assets, modified or as it is, in your commercial as well as non-commercial projects without credit or mention." itch meta: "Asset license Creative Commons Zero v1.0 Universal". Pakette lisans dosyası yok; `LICENSE` = CC0 1.0 yasal metni.
- **İndirme:** itch "Name your own price" ücretsiz akışı (0 $), 2026-11-04, sahip izniyle. Dosya adları itch yükleme başlıklarından (boşluk → `_`).

| Dosya | Boyut | Izgara | sha256 |
|---|---|---|---|
| Blast_blue_32x32.png | 96×96 | 3×3, 32 px | `72068afe…cb53322f` |
| Blast_default_32x32.png | 96×96 | 3×3, 32 px | `fdb3a2e3…24ebc663` |
| Explosion_blue_32x32.png | 96×96 | 3×3, 32 px | `afd9634e…6f79405d` |
| Explosion_default_32x32.png | 96×96 | 3×3, 32 px | `088829eb…160b4c93` |
| Realistic_Explosion_default/green/fantasy_64x64.png | 256×128 | 4×2, 64 px | (3 dosya, SHA256SUMS) |
| Realistic_Blast_default_64x64.png | 704×64 | 11×1, 64 px | `0a51d734…fd17454e` |
| Foam_bubble_explosion_64x64.png | 640×64 | 10×1, 64 px | `a500df25…382eaac4` |

Tam sha256 listesi `SHA256SUMS` dosyasında (indirilen asıl dosyalar).

- **Hibrit kamera değerlendirmesi (gözle):**
  - Hepsi **hava** öğesi (üstten/önden radyal), eğik çanakta yön sorunu yok.
  - Uygun olanlar:
    - `Realistic_Blast_default` (sarı yıldız → turuncu bulut → koyu duman, 11 kare): Kor ağır çarpışma / Parçalanma.
    - `Foam_bubble_explosion` (beyaz yıldız → camgöbeği parçalar, 10 kare): Don çarpışma / Parçalanma kırık parçaları.
    - `Blast_default` / `Blast_blue` 32 px: hafif-ağır çarpışma kıvılcımı.
  - Uygun olmayanlar: `Realistic_Explosion_green` / `fantasy` (yeşil, macenta) tasarım paletine uymuyor.
  - Çizgi kalınlığı yer yer 2 px, kontur yok. pixelfx'ten daha "kalın" ve doygun; renkler element rampasına çekilmeli.
- **Atlas etkisi:** 9 PNG toplam ~51 KB; en büyüğü 704×64. Ortak atlasa sığar (2048²'nin < %2'si).
