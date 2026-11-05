# Katkı rehberi (Devran)

Devran kâr amaçsız, özgün bir dönen topaç dövüşüdür. Her katkı PR ile gelir; `main` dalına doğrudan push yok.

## Başlamak

1. [Issues](https://github.com/dorukhandori/skaledman-arena/issues) sayfasına bakın; yeni başlayanlar için `iyi ilk görev` etiketi.
2. Kurulum:

```bash
git clone https://github.com/dorukhandori/skaledman-arena.git devran
cd devran
npm install
npm run dev
```

## Kurallar

- **Dil:** kod tanımlayıcıları Türkçe ASCII (`takimEnerji`, `yuvaDurumu`); oyuncuya görünen metin Türkçe; commit mesajı İngilizce
  (`feat(d8a): …`, `fix: …`, `docs: …`).
- **Paylaşılan sim (`src/paylasilan/`) deterministiktir:** DOM, Node API, `Math.random`, `Date.now`, yerel ayara bağlı
  çağrı yok (eslint kapısı). Sim'e alan eklerken `hash.ts` ve `src/ag/durum.ts` şemasını güncelleyin, `npm run altin:uret`
  ile altın hash'leri yeniden üretip PR'da nedenini yazın; `npm run test:tarayici` Node = Chromium olmalı.
- **Tasarım sütunları:** kolay öğrenilir, zor ustalaşılır; sadelik lore'un önünde
  ([docs/design/tasarim-sutunlari.md](docs/design/tasarim-sutunlari.md), [docs/design/sadelik-ilkeleri.md](docs/design/sadelik-ilkeleri.md)).
  Ekran başına tek ana eylem, kısa metin.
- **Sayılar** `docs/design/tuning.md` ve `src/paylasilan/kurallar/ayar.ts`'te; değiştirmeden önce bot turnuvası (`npm run denge:turnuva`).
- **Güvenlik:** kullanıcı ve takım adı yalnız `textContent` ile basılır; SQL yalnız hazırlanmış ifade; yazım uçları Origin + oturum ister.
- **Üçüncü taraf varlık** (görsel, ses, font): yalnız lisansı uygun (CC0 tercih; MIT / CC-BY atıfla) ve
  `docs/art/krediler.md` + `veri/manifest-*.json` kaydıyla. `npm run krediler:uret` eksik atıfı yakalar.
- **IP:** Devran özgündür; başka oyun, marka ya da karakter adı, görseli, logosu kullanılmaz. Ruhlar kanatlı kuş / ejderha / anka değildir.

## PR kontrol listesi

`npm run typecheck && npm run lint && npm test` yerelde yeşil, yeni davranışın testi var, görsel değişiklikte ekran
görüntüsü. Belge haritası:

| Konu | Belge |
|---|---|
| Ürün ve dilimler | `docs/production/devran-kod-brief.md`, `docs/production/roadmap.md` |
| Kurallar ve sayılar | `docs/design/tuning.md`, `docs/production/boslukler/flint-kurallar.md` |
| Kontrol, HUD, seyirci | `docs/ux/kontrol-ve-hud.md` |
| Sunucu, ağ | `docs/tech/backend.md`, `docs/tech/netcode.md` |
| Görsel dil, krediler | `docs/art/tasarim-dili.md`, `docs/art/krediler.md` |
| Gizlilik | `docs/gizlilik.md` |

## Davranış

Kibar ve açık olun; hata bildirimi yazana teşekkür edin, inceleyene sabır gösterin. Taciz, hakaret, kişisel saldırı yoktur.
