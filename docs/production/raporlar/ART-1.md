# ART-1 raporu: topaç sprite'ları, 3B → pixel (bulut hattı)

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** teknik sanatçı / sanat yönetmeni (`@iris` + `@byte`)
Koordinatör kararıyla kapsam daraldı: nihai topaç sanatı sahibin Mac hattında (Gemini + Tripo + Blender 5.2) üretilecek; istek belgesi `docs/art/topac-uretim-istegi.md`. Bu oturum bulut yedeğini, çift biçimli yükleyiciyi ve oyun içi bağlamayı bitirdi. Menü ikon bağlaması (adım 4) YAPILMADI.

## 1. Hat ve araçlar

| Adım | Araç (sürüm) | Dosya |
|---|---|---|
| Parametrik modeller (kutupsal yükseklik alanı katı + torna) | JSON tanım | `kaynak/topac/parcalar-3b.json` (27 parça) |
| Veri geçişli render (normal + sınıf/derinlik, ışıksız, ×4, kenar yumuşatma yok) | Blender 4.0.2 (apt), Cycles CPU başsız | `araclar/sanat/blender/topac_render.py` |
| İndirgeme, toon (sol-üst nokta ışık, 4 ton + parlama), Bayer 4×4, iç + 1 px dış çizgi, kademeler, 6 Element boyası, paketleme, kontakt levha | Node + sharp 0.34 | `araclar/sanat/topac-uret.ts` (`npm run topac:uret`) |
| Gri ton → 6 Element palet takası (Mac çıktısı için) | Node + sharp | `araclar/sanat/palet-takasi.ts` |

Three.js yedeğine gerek kalmadı (Blender apt'tan ~4 dk'da kuruldu). Tam set render + pişirme: 6,4 dk.

## 2. Çıktı

- `public/topac/`: 48 Gövde sayfası (8 × 6 Element), 5 Disk, 6 Uç, 8 Çekirdek, `ikon-48.png`, `ikon-24.png`; **toplam 592 KB**. Gövde sayfası 512×384 (kiral) ya da 512×192, 17-76 KB; Disk/Uç/Çekirdek 0,5-3,6 KB.
- Kare 64×64, çapa (32, 54) = uç temas noktası; 1 doku pikseli = 1 sanat pikseli (1,1574 topaç birimi). Periyot başına keskin 8 + bulanık 8 + bulanık disk 3 kare; kiral Gövde'lerde (5) aynalı mesh'le sol satırlar.
- Meta `veri/topac-gorsel.json` (periyot, satırlar, ustZ, dış yarıçap, ikon yerleri, `bicimB` listesi).
- Önizlemeler: `docs/art/topac-sprite-onizleme.png` (Kor seti: 3 kademe + sol ayna + 6 Element, referans 07 kırpıntısı yanında), `docs/art/topac-parca-seti.png` (27 parça); oyun içi `docs/production/raporlar/ekran/ART-mac.png`, `ART-lab.png`.

## 3. Oyuna bağlama

`TopacAtlas.ts` iki biçimi okur (A: bulut sayfası + gömülü meta; B: Mac şeritleri + parça json'u, yalnız `bicimB`'de listeliyse istenir, gereksiz 404 yok). `TopacYandan` dört katman da yüklenince Sprite kipine geçer: kademe (yüksek = bulanık disk 12 fps, orta = bulanık kanat, düşük = keskin), kare = ⌊θ / (periyot/8)⌋, sol dönüşte aynalı satır, Disk yüksekliği Gövde + Çekirdek'i kaydırır, çatlak ve flaş üstte Graphics, Durma tint, Parçalanma'da sprite gizlenir. Atlas yoksa ya da yüklenemezse yordamsal çizim aynen kalır. Sim, `src/paylasilan/**` ve altın hash'ler değişmedi; kare başına iş: 4 doku ataması.

## 4. Kalite (referans 07 turuncu topaç) — 3/5

Spike 4 turda ayarlandı: (1) 35°, düz ton, sahte çatlak çizgileri → (2) 32°, güçlü halkalar, ton eşikleri, iç çizgi eşiği 3 birim → (3) daralan alt yüzler, kısa Uç → (4) **26°** (yan bant okunur, Uç ucu görünür). İyi: parçalı yığın, renkli koyu dış çizgi, sol-üst ışık, koyu ön bant, eş merkezli sırtlar, kusursuz periyot döngüsü. Kalan farklar: el işi amblem (alev/sarmal) yok; rampa kırmızıya kayık (referansta turuncu → sarı ton kaydırması); Çekirdek küçük; Disk'ler birbirine benziyor; yüzey "plastik". Mac hattıyla beklenti: ikonlar 4/5, dönen sprite'lar simetrileştirilirse 3,5-4/5 (istek belgesi § 0).

## 5. Doğrulama

`npm test` 20 dosya / 407 test yeşil (yeni `test/topac-atlas.test.ts` dahil), `npm run test:tarayici` Node = Chromium bit bit aynı, `npm run lint`, `npm run typecheck`, `npm run build` yeşil; Vite 5195 + Playwright maç (`?ekran=mac&oto=kenar`) ve Lab: **konsol hatası 0**. p95 kare süresi ölçülmedi (değişiklik kare başına sabit 4 doku ataması; Graphics çizimi azaldı).

## 6. Sonraki adım

Mac oturumu Parti 1 (kalite kapısı) → sahip onayı. Menü ikonları (`src/istemci/ekranlar/**`) `ikon-48/24` atlasına, menü ajanının ikinci turu bittikten sonra minimal diff ile bağlanmalı. Avatar/ruh: mevcut Mac hattı (`docs/art/ruh-uretim-kaydi.md`) zaten çalışıyor.

**Lisanslar:** tüm topaç görselleri kendi üretimimiz (CC0); Blender (GPL) ve sharp (Apache-2.0) yalnız araç, dağıtılmaz. IP: canon parça yok, kanatlı kuş/ejderha yok.
