# ADR-003: Kontrol şeması PokeRivals ile aynı

Tarih: 2026-11-01 · Durum: kabul edildi (K-7) · Sahibi: `@tide` (UX) + `@helix`

## Bağlam

Konsept taslağı "sol tık temel vuruş, Q/E kartın iki saldırısı, Space dash, Tab takım" şemasını öneriyordu. PokeRivals'ın şeması paket analizinde okundu (`docs/research/pokerivals-paket-analizi.md` § 7): WASD/oklar, 1–4 veya fare tekerleği hamle seçer, **sağ tuş basılı nişan, bırakınca atış**, Shift dash, Space zıplama, Tab/Q/E takım, Z dinlenme; dokunmatik ve gamepad eşlemeleri de var.

## Seçenekler

1. **PokeRivals şeması birebir** — seçildi. PokeRivals oyuncusu anında uyum sağlar; "aynı gönderdiğim ilk örnekteki gibi" hedefiyle tutarlı.
2. Konsept şeması: daha az tuş, zıplama yok; öğrenmesi kolay ama hedefli alan hamleleri için nişan jesti eksik.
3. `ux-designer` karşılaştırsın: sahip beklemek istemedi.

## Karar

Sahip 2026-11-01: **PokeRivals şeması**.

## Sonuçlar

- F0'da uygulanan: WASD/oklar, 1–4 + tekerlek, sağ tuş nişan/bırak, sol tık = seçili yuvayı nişan yönüne at (kolaylık), Shift dash. Zıplama, Tab takım değiştirme ve Z dinlenme F2'de (takım sistemiyle).
- Yuva doldurma: yuva 1–2 kartın iki saldırısı, yuva 3 tipe göre temel vuruş, yuva 4 seviye/açılış kuralıyla sonra (`docs/design/oyun-konsepti.md` § 11–12).
- Girdi şeması (`Girdi`): hareket vektörü, nişan **dünya noktası** (açı değil), seçili yuva, ateş, dash; sunucuda `sanitize` ile kırpılır.
- Dokunmatik ve gamepad F3 sonrası; PokeRivals'ın 960×540 koordinatlı düzeni referans.
