# CANLI-1: Devran VPS'e çıkış (2026-11-06)

Yapan: Mac oturumu (VPS erişimi var), `docs/production/canliya-cik.md` düzenine göre. Sır içermez.

## Sonuç
**https://devran.ovarlak.games canlı.** Kaynak: `devran-kod` (MOBIL-1 dahil), 523/523 test, typecheck, lint, build yeşil.

```
GET /api/saglik → {"ok":true,"protokol":6,"katalog":"934bcfd25effd463","kimlik":"sifre","odalar":0}
```

## Kurulum özeti
| Konu | Değer |
|---|---|
| Sunucu | Node 22, `/opt/devran`, kullanıcı `devran`, systemd `devran`, `CPUQuota=150%`, `MemoryMax=1G` |
| **Port** | **2568.** 2567'yi aynı VPS'te WyrmWar tutuyor; derlenen sunucu portu koda gömer, bu yüzden `vite.config.ts` `SUNUCU_PORT` okur, `deploy/kur.sh` 2568 ile derler ve çıktıyı doğrular |
| Tünel | Ayrı tünel `devran`, `/etc/cloudflared/devran.yml`, systemd `cloudflared-devran` (WyrmWar tünelinden bağımsız) |
| DNS | `devran.ovarlak.games` CNAME → tünel |
| Kimlik | `KIMLIK_MODU=sifre`; `IZINLI_KOKENLER=https://devran.ovarlak.games`; Cloudflare Access **yok** (herkese açık) |
| Yedek | `devran-yedek.timer` her gün 01:30 UTC, `/opt/devran/yedek` (14 gün). İlk elle yedek: bütünlük ok. **Aynı diskte; site dışı kopya yok** |
| İzinler | `veri-db` ve `yedek` dizinleri 0700, `.env` 0600 |

## Doğrulananlar
- Ana sayfa 200, tarayıcı konsolu temiz, tünelden WebSocket yükseltmesi açılıyor.
- Port 2568 dışarıdan kapalı; WyrmWar (2567 ve tüneli) etkilenmedi.
- `POST /api/gelistirme/altin-ver` → **404** (üretimde geliştirme uçları kapalı).
- `/gizlilik` 200, `/krediler` 200.
- Yanlış Origin'li kayıt isteği → **403**.
- `/monitor`, `/playground`, `/api/olcum` istemci sayfasına düşüyor (araç değil); üretimde kapalı.

## Yapılmadı (insan gerekir)
`canliya-cik.md` § 5: hesapla kayıt, bot maçı, iki hesapla oda maçı (hash sapması 0), telefonda gerçek cihaz, OBS `#izle=` bağlantısı.
Canlı üretim sitesinde bu oturum hesap açmadı; ilk oyuncu denemesi sahipte.

## Kalan riskler
- Sunucu girişi `listen(port)` ile tüm arayüzlere bağlanır (kalan-is 12); dış erişimi systemd `IPAddressDeny` + nftables keser.
- Yedek site dışına kopyalanmıyor.
- Herkese açık; kapalı alfa için Cloudflare Access eklenebilir (e-posta listesi sahipte).
- Güncelleme: kaynak rsync + `bash deploy/kur.sh` (maç yokken).
