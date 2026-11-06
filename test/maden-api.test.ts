import { describe, expect, it } from "vitest";
import { Depo, veritabaniAc } from "../src/sunucu/db/depo.ts";
import { adAnahtari } from "../src/sunucu/oyuncu/kurallar.ts";
import { basarimOlayiIsle } from "../src/sunucu/oyuncu/basarimYaz.ts";
import { haritaGit } from "../src/sunucu/oyuncu/harita.ts";
import { madenBasla, madenBitir, madenKaz } from "../src/sunucu/oyuncu/maden.ts";
import { DURUM } from "../src/paylasilan/kurallar/harita.ts";
import { gunNo } from "../src/paylasilan/kurallar/ekonomi.ts";
import { isabetGecerli, isabetPenceresi } from "../src/paylasilan/kurallar/maden.ts";

// H3 kazı (docs/design/harita/08 § 6, 09 H3, 11 § 10 #4–#10): 700 ms, tek seans, sıra, tavan 40/60 + 61+ verimsiz,
// kapasite (düğüm başına), nadir yuva aynı gün aynı sıra, Ustalık yetmeyen nadir yuva ana kademe, şanssızlık koruması,
// TEMİZLE/USTALAŞ (USTA DAMAR +1), telemetri, H-H6 isabet adaleti (150 ms tek yön + 20 ms jitter + %2 kayıp).

const yeni = () => new Depo(veritabaniAc(":memory:"));
let n = 0;
const T0 = Date.parse("2026-11-04T09:00:00Z");
function kur(d: Depo, dugum = "b1-02") {
  const a = d.oyuncuOlustur({ ad: `Kazici${++n}`, adAnahtar: adAnahtari(`Kazici${n}`), sifreHash: "x", simdi: 1 })!;
  d.ilkCekirdek(a, "maden", 1);
  basarimOlayiIsle(d, a, { olay: { antrenmanBitti: true } }, 1);
  d.dugumYaz(a, "b1-01", { durum: DURUM.temizle });
  d.dugumYaz(a, dugum, { durum: DURUM.acik });
  if (dugum !== "b1-02") d.dugumYaz(a, "b1-02", { durum: DURUM.kesfet });
  for (const x of ["b1-03", "b1-05", "b1-07", "b1-08", "b1-10", "b1-11", "b1-12"]) if (dugum >= x) d.dugumYaz(a, x, { durum: Math.max(DURUM.acik, d.dugumSatiri(a, x)?.durum ?? 0) });
  haritaGit(d, a, dugum, T0);
  return a;
}
const basari = () => 0;
const iska = () => 0.999;

describe("kazı seansı", () => {
  it("başla: uzak / ustalık / kapalı; yanıt halka, kalan, dinç sayaç", () => {
    const d = yeni();
    const a = kur(d);
    const s = madenBasla(d, a, "b1-02", T0);
    expect(s).toMatchObject({ ok: true, kademe: 1, kalan: 6, kapasite: 6, sira: 0, halka: { periyotMs: 1400, pencere: isabetPenceresi() }, vurus: { bugun: 0, tam: 40, tavan: 60, metin: "DİNÇ VURUŞ 0/40" } });
    const b = kur(d, "b1-08");
    expect(madenBasla(d, b, "b1-08", T0)).toStrictEqual({ ok: false, hata: "ustalik", gerekli: 10 });
    d.haritaKonumYaz(b, "b1-01");
    expect(madenBasla(d, b, "b1-02", T0)).toStrictEqual({ ok: false, hata: "uzak" });
    expect(madenBasla(d, b, "b1-01", T0)).toStrictEqual({ ok: false, hata: "yok" });
  });

  it("700 ms kuralı (429 erken), sıra (409), tek seans (eski seans biter), bitir idempotent", () => {
    const d = yeni();
    const a = kur(d);
    const s = madenBasla(d, a, "b1-02", T0);
    if (!s.ok) throw new Error();
    expect(madenKaz(d, a, { seans: s.seans, sira: 0, isabetMs: null }, T0 + 699, basari)).toMatchObject({ ok: false, hata: "erken" });
    expect(madenKaz(d, a, { seans: s.seans, sira: 1, isabetMs: null }, T0 + 800, basari)).toMatchObject({ ok: false, hata: "sira" });
    const k = madenKaz(d, a, { seans: s.seans, sira: 0, isabetMs: null }, T0 + 800, basari);
    expect(k).toMatchObject({ ok: true, basari: true, verim: 3, kalan: 5, sira: 1, asama: DURUM.temizle, yeniAsama: true });
    // aynı sıra ikinci kez (çift gönderim) → sıra hatası
    expect(madenKaz(d, a, { seans: s.seans, sira: 0, isabetMs: null }, T0 + 1600, basari)).toMatchObject({ ok: false, hata: "sira" });
    const s2 = madenBasla(d, a, "b1-02", T0 + 2000);
    if (!s2.ok) throw new Error();
    expect(s2.sira).toBe(1);
    expect(madenKaz(d, a, { seans: s.seans, sira: 1, isabetMs: null }, T0 + 3000, basari)).toMatchObject({ ok: false, hata: "bitti" });
    expect(madenBitir(d, a, s.seans)).toMatchObject({ ok: true, ozet: { cevher: { 1: 3 }, vurus: 1 } });
    expect(madenBitir(d, a, s.seans)).toMatchObject({ ok: true });
    expect(madenBitir(d, a, "00000000-0000-4000-8000-00000000dead")).toStrictEqual({ ok: false, hata: "seans" });
  });

  it("kapasite 6: 7. vuruş reddedilir; ertesi gün (04:00) damar dolar", () => {
    const d = yeni();
    const a = kur(d);
    let t = T0;
    const s = madenBasla(d, a, "b1-02", t);
    if (!s.ok) throw new Error();
    for (let i = 0; i < 6; i++) { t += 800; expect(madenKaz(d, a, { seans: s.seans, sira: i, isabetMs: null }, t, basari).ok).toBe(true); }
    expect(madenKaz(d, a, { seans: s.seans, sira: 6, isabetMs: null }, t + 800, basari)).toMatchObject({ ok: false, hata: "bitti" });
    expect(madenBasla(d, a, "b1-02", t + 1000)).toStrictEqual({ ok: false, hata: "bitti" });
    const yarin = T0 + 86_400_000;
    expect(gunNo(yarin)).toBe(gunNo(T0) + 1);
    expect(madenBasla(d, a, "b1-02", yarin)).toMatchObject({ ok: true, kalan: 6 });
  });

  it("günlük çarpan: 41–60 yarım (en az 1), 61+ cevher 0 ama kazı kilitlenmez (verimsiz)", () => {
    const d = yeni();
    const a = kur(d);
    const gun = gunNo(T0);
    d.madenGunlukYaz(a, gun, "*", { vurus: 40, seri: 0, iska: 0 });
    const s = madenBasla(d, a, "b1-02", T0);
    if (!s.ok) throw new Error();
    expect(s.vurus.carpan).toBe(0.5);
    expect(madenKaz(d, a, { seans: s.seans, sira: 0, isabetMs: null }, T0 + 800, basari)).toMatchObject({ ok: true, verim: 1, tecrube: 5 });
    d.madenGunlukYaz(a, gun, "*", { vurus: 60, seri: 0, iska: 0 });
    const k = madenKaz(d, a, { seans: s.seans, sira: 1, isabetMs: null }, T0 + 1600, basari);
    expect(k).toMatchObject({ ok: true, basari: true, verim: 0, tecrube: 1, vurus: { metin: "DİNÇ VURUŞLAR BİTTİ · 04:00'TE YENİLENİR" } });
  });

  it("şanssızlık koruması: 3 ardışık ıskadan sonra başarı; ıskada yarım tecrübe ve cevher yok", () => {
    const d = yeni();
    const a = kur(d);
    const s = madenBasla(d, a, "b1-02", T0);
    if (!s.ok) throw new Error();
    const sonuclar = [0, 1, 2, 3].map((i) => madenKaz(d, a, { seans: s.seans, sira: i, isabetMs: null }, T0 + 800 * (i + 1), iska));
    expect(sonuclar.map((x) => x.ok && x.basari)).toStrictEqual([false, false, false, true]);
    expect(sonuclar[0]).toMatchObject({ verim: 0, tecrube: 5, asama: DURUM.kesfet });
  });

  it("nadir yuva: aynı gün aynı sıra (seans açıp kapamak değiştirmez); Ustalık yetmezse ana kademe", () => {
    const d = yeni();
    process.env.MADEN_SIRRI = "test-sirri";
    let bulundu: { a: number; sira: number } | null = null;
    for (let i = 0; i < 80 && !bulundu; i++) {
      const a = kur(d);
      const s = madenBasla(d, a, "b1-02", T0);
      if (s.ok && s.nadir) bulundu = { a, sira: s.nadir.sira };
    }
    expect(bulundu).not.toBeNull();
    const { a, sira } = bulundu!;
    const s2 = madenBasla(d, a, "b1-02", T0 + 5000);
    expect(s2.ok && s2.nadir?.sira).toBe(sira);
    expect(s2.ok && s2.nadir?.kazilabilir).toBe(false); // K2 eşiği 10, Ustalık 0
    if (!s2.ok) throw new Error();
    let t = T0 + 5000;
    let son = null;
    for (let i = 0; i <= sira; i++) { t += 800; son = madenKaz(d, a, { seans: s2.seans, sira: i, isabetMs: null }, t, basari); }
    expect(son).toMatchObject({ ok: true, kademe: 1, nadir: false });
    // Ustalık 10 olan oyuncu aynı sırada K2 alır
    d.ustalikYaz(a, "madencilik", 26300);
    delete process.env.MADEN_SIRRI;
  });

  it("maden USTALAŞ (30 başarılı vuruş): USTA DAMAR, kapasite 7", () => {
    const d = yeni();
    const a = kur(d);
    d.dugumYaz(a, "b1-02", { durum: DURUM.temizle, basariliVurusEk: 29 });
    const s = madenBasla(d, a, "b1-02", T0);
    if (!s.ok) throw new Error();
    const k = madenKaz(d, a, { seans: s.seans, sira: 0, isabetMs: null }, T0 + 800, basari);
    expect(k).toMatchObject({ ok: true, asama: DURUM.ustalas, ustaDamar: true });
    expect(madenBasla(d, a, "b1-02", T0 + 2000)).toMatchObject({ ok: true, kapasite: 7, kalan: 6, ustaDamar: true });
  });

  it("isabet +1 verim (sunucu doğrular); telemetri satırı yazılır", () => {
    const d = yeni();
    const a = kur(d);
    const s = madenBasla(d, a, "b1-02", T0);
    if (!s.ok) throw new Error();
    const [bas, bit] = isabetPenceresi();
    const P = 1400;
    // pencere ortasına denk gelen istemci zamanı (≥ 700 ms)
    let tc = 0;
    for (let x = 700; x < 700 + P; x++) { const f = (x + s.halka.fazMs) % P; if (f > bas + 20 && f < bit - 20) { tc = x; break; } }
    const k = madenKaz(d, a, { seans: s.seans, sira: 0, isabetMs: tc, gecikmeMs: 40 }, T0 + tc + 40, basari);
    expect(k).toMatchObject({ ok: true, isabet: true, verim: 4 });
    expect((d.db.prepare("SELECT COUNT(*) n FROM maden_vurus").get() as { n: number }).n).toBe(1);
  });
});

describe("H-H6: isabet halkası gecikmede adil (N3: 150 ms tek yön + 20 ms jitter + %2 kayıp, TCP yeniden iletim)", () => {
  /** tohumlu düzgün üreteç (test tekrarlanabilir) */
  function rng(t: number) { let s = t >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  const r = rng(42);
  const tekYon = () => 150 + (r() * 2 - 1) * 20 + (r() < 0.02 ? 200 + 150 : 0);
  it("gerçek isabetlerin ≥ %95'i kabul (RTT = son 3 isteğin ortancası), sahte (±400 ms) %0", () => {
    const [bas, bit] = isabetPenceresi();
    const P = 1400;
    const rtt: number[] = [tekYon() + tekYon(), tekYon() + tekYon(), tekYon() + tekYon()];
    let kabul = 0;
    let sahteKabul = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const faz = Math.floor(r() * P);
      // oyuncu halkayı penceredeyken basar (istemci saatiyle, en az 700 ms sonra)
      let tc = 700 + Math.floor(r() * P);
      while (!(((tc + faz) % P) >= bas && ((tc + faz) % P) <= bit)) tc++;
      const asagi = tekYon();
      const yukari = tekYon();
      const gecen = asagi + tc + yukari;
      const tahmin = [...rtt].sort((x, y) => x - y)[1]!;
      if (isabetGecerli(tc, gecen, faz, 150, Math.round(tahmin))) kabul++;
      if (isabetGecerli(tc + (r() < 0.5 ? -400 : 400), gecen, faz, 150, Math.round(tahmin))) sahteKabul++;
      rtt.shift();
      rtt.push(asagi + yukari);
    }
    expect(kabul / N).toBeGreaterThanOrEqual(0.95);
    expect(sahteKabul).toBe(0);
  });
});
