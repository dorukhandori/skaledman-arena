# ADR-004: Determinizm sözleşmesi (sim float64, fround yok)

Tarih: 2026-11-04 · Durum: kabul edildi (axiom § 4 karar 1, D4 brief ile değiştirilmiş) · Sahibi: `@axiom` + `@relay`

## Bağlam
Paylaşılan sim (`src/paylasilan`) sunucuda (Node/V8) yetkili, istemcide (tarayıcı) tahmin için koşar. Tahmin ve
yeniden oynatma, aynı girdiyle iki motorun bit bit aynı sonucu vermesine dayanır. Ağ şeması float32 taşır.

## Seçenekler
1. Sim float64; her `adim` sonunda tüm durum `Math.fround` ile f32'ye kilitlenir (axiom önerisi): ağdaki değer = tahminin başladığı değer.
2. **Sim float64, fround yok; float32 yalnız wire biçimi** (flint § 2) — seçildi.
3. Sabit nokta (tam sayı) sim: güvenli ama tüm formüller yeniden yazılır.

## Karar
Seçenek 2. Gerekçe: IEEE 754 `+ − * /` ve `Math.sqrt` her motorda doğru yuvarlanır; `fround` yeni bir yuvarlama
yüzeyi ve her adımda ek maliyet getirir, kazancı (wire ile tahminin aynı başlaması) uzlaşma eşiklerinin nicemleme
hatasından büyük olmasıyla zaten karşılanır (f32 hatası 240 br'de ~1,5e-5 br ≪ 0,5 br yok-say eşiği).

## Kurallar (ESLint kapısı, `src/paylasilan/**`)
- İzinli: `+ − * /`, `Math.sqrt`, `abs/min/max/floor/trunc/sign/imul`, karşılaştırıcılı `sort`, tam sayı adım.
- Yasak: `Math.hypot`, tüm trigonometri ve `exp/log/pow/cbrt`, `**`, `Math.fround`, `Math.random`, `Date`,
  `performance`, karşılaştırıcısız `sort`, `for..in`, `Intl`, DOM/Node/çerçeve importları. Trig: `kurallar/sinTablo.ts`.

## Sonuçlar
- Sunucu sim'i float64 tam sürer; şema (`src/ag/durum.ts`) yalnız wire'da f32. İstemcinin aldığı dünya f32'dir;
  "wire hash" iki tarafta aynı f32 yuvarlamasıyla (`gorunumdenDunya(…, f32)`) kurulur ve her 60 adımda karşılaştırılır.
- Altın hash'ler (FNV-1a 64) Node ve Chromium'da aynı (`npm run test:tarayici`); D4'te ek: sunucunun maç kaydı
  tarayıcıda yeniden oynatılır, her 60 adımın hash'i sunucununkiyle aynı (`AgMaci.kayitDogrula`, `test/ag.test.ts`).
- Tek sapma = S1.
