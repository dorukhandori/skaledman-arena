# Ruh / Ata / Pergel entegrasyon notu (bulut oturumu için)

Dal: `devran-sanat` (origin/devran-kod `d360444` üstüne rebase). Tasarım `docs/design/beyblade/06-kutsal-canavarlar.md`, Pergel `docs/ux/bilgic-pergel.md`.

## Dosyalar
| Yol | Ne |
|---|---|
| `public/ruh/ata/<element>-holo.png` (+ `-holo-k.png` yarım boy) | Oyunda kullanılan hologram sayfaları: 192 (96) px hücre, 6×4, 24 kare (0-9 yükseliş, 10-15 kükreme, 16-23 döngü), 16 fps, ayak y 184 (92) |
| `public/ruh/ata/<element>.png` + `.json` | Renkli kaynak sayfa (hologram buradan pişirilir: `araclar/sanat/hologram.py`) |
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

## Hologram ve izdüşüm
- Ata hologramı `sahne.efektKatmani`'nda (dünya koordinatı, topaçların üstü). Taban: çizilen topacın zemin noktası − 40 dünya px (hibrit; topacın üst yüzü). **`Mac.ts`**: `yetenekGorsel.ruh.topacKonumu = (i) => gorseller[i].kok` konumu (ara değerleme + geri tepme dahil); bağlanmazsa sim konumu kullanılır ve hologram topaçtan kayar.
- Tamsayı ölçek: sprite ölçeği `2 / yakinlik` (ekranda ×2), konum önbellek ızgarasına (`2 / yakinlik` dünya birimi) oturur; hibrit dünya `cacheAsTexture` 0,5 çözünürlükte.
- **Maske ve filtre yok** (önbellek içinde bozuluyor): şekillenme, karenin 12 yatay alt dokusu (şerit) ile yapılır; V ışığı ve tarama `Graphics` (toplamalı).
- `RuhGorsel.ilerle(dt, d)`: `d` ile topacı izler.

## Beklenen çakışma noktaları
`YetenekGorsel.ts` (yetenekBasladi dalı, kurucu katman sırası, `ruh.ilerle(dt, d)`), `Mac.ts` (yetenekGorsel kurulduktan sonra `topacKonumu` satırı), `Atolye.ts` (kurucu sonu, takım kartı), `Ayarlar.ts` (alan listeleri).

## Açık
- `/api/ben` son maç sonucu yok: Pergel `ring-out` ipucu çalışmaz (Paca SA #17).
- Ata rig/gerçek kükreme (Tripo ~390 kredi): sahip onayı olmadan başlatılmaz (SA #18).

## Entegre edildi (2026-11-05, `devran-kod`)
Birleşti (`e8a5dd2`, `45d242a`); ayrıntı `docs/production/raporlar/SANAT-ENTEGRASYON.md`. Entegrasyonda değişenler: `onYukle` artık tembel (maç başında sayfa inmez; Ulti Enerjisi yarıda o elementin `-holo` + `-holo-k` sayfası, Takım Enerjisi yarıda üç üyeninki); Takım Ultisi bayrak kapalıyken üç Ata hologramı (ortada çağıranınki); Ata ad bandı kaldırıldı, unvan HUD'un tek Ulti bandında ("ULTİ · <ad> · <unvan>", alt-orta, `MacHud .bant.asagi`); `?debug&ruhportre=1` bayrağı yalnız doğrulama için açar; Pergel Kuşak Taşı stili ve Ayarlar › İpuçları (Açık/Kapalı).

