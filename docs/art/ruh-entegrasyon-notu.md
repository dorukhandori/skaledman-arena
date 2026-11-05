# Ruh / Ata / Pergel entegrasyon notu (bulut oturumu için)

Dal: `devran-sanat` (origin/devran-kod `d360444` üstüne rebase). Tasarım `docs/design/beyblade/06-kutsal-canavarlar.md`, Pergel `docs/ux/bilgic-pergel.md`.

## Dosyalar
| Yol | Ne |
|---|---|
| `public/ruh/ata/<element>.png` + `.json` | 6 Ata, 176 px hücre, 6×4 ızgara, 24 kare (0-9 yükseliş, 10-15 kükreme, 16-23 döngü), 16 fps |
| `public/ruh/portre/<ruh-id>.png` | 21 ruh portresi (en uzun kenar 320, 96 renk). Şimdilik oyunda yüklenmez |
| `public/bilgic/{anlatiyor,aslinda,sevinc}.png` | Pergel ifadeleri |
| `src/istemci/oyun/RuhGorsel.ts` | Canavar sunumu (yükleme, belirme, kükreme, vinyet, ad bandı) |
| `src/istemci/bilgic/` | Pergel: `Pergel.ts` (DOM), `secim.ts` (saf seçim), `depo.ts`, `ipuclari.ts` |
| `veri/ruhlar.json` | Ata kayıtlarına `unvan` |
| `veri/ipuclari.json` | 12 ipucu |

## Giriş noktaları
- `YetenekGorsel`: kurucuda `this.ruh = new RuhGorsel(...)`; `ruh.kap` zemin kabında (`this.zemin`, hibritte `zeminDuzlem` içi) **dekal ve telegraftan önce**. `olay()` başında `this.ruh.olay(o, d)`, `guncelle()` içinde `ruh.onYukle(d)` + `ruh.ilerle(dt)`, `temizle()` içinde `ruh.temizle()`. `flas` setter'ı `ruh.flas`'ı da ayarlar.
- Kademe 3/4 için eski silüet kodu (`siluetler.push`) kaldırıldı; `ruhSiluetCiz` RuhGorsel'e **yedek** olarak verilir (doku yüklenmediyse ya da Takım Ultisi'nde portre bayrağı kapalıysa). Sayaçlar (`siluet`, `takimUlti`, `kenarParlama`) aynı artar.
- `Atolye.ts` (Kuşak Taşı): `pergelBagla(kok, v)` kurucuda `ciz()` sonrası; takım kartlarına `data-pergel-hedef`; `.at .pergel` alt şeridin üstüne kaldırılır.
- `Ayarlar.ts`: `pergel: "acik" | "sorunca" | "kapali"`.

## Bayraklar
- `RUH_PORTRE_OZEL_YETENEK = false` (`RuhGorsel.ts`): sahip kararı, ilk sürümde canavar yalnız Ulti'de. `true` olunca Özel Yetenek'te çekirdeğin ruhu, Takım Ultisi'nde üç portre belirir.

## İzdüşüm
Konumlar düz sim çizim koordinatında (`SAHNE.merkezX + x`, `merkezY + z`); her belirme `scale(1/B, 1/(B·k))` ile dik ve ekranda sabit boyda. Ata'nın ayak çizgisi **ekran** y 425-515 arasına sıkıştırılır (HUD süre plakası ve alt şerit dışında), sonra düze çevrilir (`ekrandanDuze`). Ad bantları `ekranKatmani`'nda (`dunyadanEkrana`).

## Beklenen çakışma noktaları
`YetenekGorsel.ts` (yetenekBasladi dalı, kurucu katman sırası), `Atolye.ts` (kurucu sonu, takım kartı), `Ayarlar.ts` (alan listeleri).

## Açık
- `/api/ben` son maç sonucu yok: Pergel `ring-out` ipucu çalışmaz (Paca SA #17).
- Ata rig/gerçek kükreme (Tripo ~390 kredi): sahip onayı olmadan başlatılmaz (SA #18).
