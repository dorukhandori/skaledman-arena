# Devran

**Devran: özgün dönen topaç dövüşü; kâr amaçsız.** Tarayıcıda, gerçek zamanlı 1v1: üç topaçlık takımınla çanakta
rakibi durdur, dışarı at ya da parçala. Klavye sürer, fare nişan alır; her topacın Çekirdeğinde bir ruh, ruhun
yetenekleri, Ulti'si ve takımın paylaştığı **Takım Ultisi** var. Kick yayınlarında izleyicilerin kendi hesabıyla
oynaması ve yayıncının OBS'te **seyirci görünümünü** göstermesi için yapıldı. Reklam yok, satın alma yok.

**Durum (Kasım 2026):** D1–D8 dilimleri bitti (sim, yetenekler + Ulti + Takım Ultisi, çevrimiçi maç, hesaplar,
Atölye, Market, Başarımlar, Altın, hızlı maç, sonuç ekranı, seyirci/OBS görünümü, gizlilik + hesap silme, krediler).
Sırada: ilk test gecesi ([docs/production/test-gecesi.md](docs/production/test-gecesi.md)), Görsel Uyum Geçişi ve Kick
girişi. Ayrıntı: [docs/production/roadmap.md](docs/production/roadmap.md), dilim raporları `docs/production/raporlar/`.

## Hızlı başlangıç

```bash
npm install
npm run dev          # http://localhost:5173 (istemci + Colyseus sunucusu tek süreçte)
```

| Ekran | Adres | Ne |
|---|---|---|
| Karşılama / Atölye | `/` | kayıt, giriş, takım kurma |
| Lobi | `/?ekran=lobi` | hızlı maç, oda kodu (`#oda=ABCDEFGH`) |
| Seyirci (OBS) | `/#izle=ABCDEFGH` (`&seffaf=1`) | giriş yok, kontrol yok; Lobi'de "Seyirci bağlantısını kopyala" |
| Bota karşı maç | `/?ekran=mac&oto=dolas` | çevrimdışı tam maç (`oto`: bot oynar) |
| Topaç Lab | `/?ekran=topac-lab` | tek tur, parça denemesi |
| Gizlilik · Krediler | `/gizlilik` · `/krediler` | |

## Komutlar

| Komut | Ne |
|---|---|
| `npm test` · `npm run lint` · `npm run typecheck` · `npm run build` | kapılar |
| `npm run test:tarayici` | altın senaryo hash'leri Node = Chromium (deterministik sim) |
| `npm run altin:uret` | altın senaryoları yeniden üret (bilinçli sim değişikliğinde) |
| `npm run denge:turnuva` | bot turnuvası (süre, bitiş dağılımı, kazanım bandı) |
| `npm run ag:matris` · `npm run ag:ekran` | ağ profili (N2/N3) iki istemci hash denetimi |
| `npm run krediler:uret` | krediler ↔ varlık manifestleri denetimi |

## Mimari (kısa)

- **Paylaşılan sim** (`src/paylasilan/`): 60 Hz sabit adım, deterministik (tarayıcı = Node, FNV-1a 64 hash). Bot da burada.
- **Sunucu** (`src/sunucu/`): Colyseus 0.18 yetkili oda, SQLite (better-sqlite3), REST uçları. Ayrıntı: [docs/tech/backend.md](docs/tech/backend.md).
- **Ağ** (`src/ag/`): protokol, durum şeması; istemci kendi topacını tahmin eder, rakibi 100 ms geriden ara değerler. [docs/tech/netcode.md](docs/tech/netcode.md).
- **İstemci** (`src/istemci/`): Vite + TypeScript + PixiJS 8; HUD DOM katmanı.

## Lisans ve krediler

Kod: lisans dosyası henüz yok (depo sahibi seçecek); katkılar PR ile. Üçüncü taraf
varlıklar ve yazılımlar: oyun içi `/krediler` sayfası ve [docs/art/krediler.md](docs/art/krediler.md). Devran'ın
dünyası, topaçları ve ruhları özgündür; herhangi bir marka ya da başka bir oyunla bağı yoktur.
