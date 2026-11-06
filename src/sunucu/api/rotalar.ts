import { z } from "zod";
import { PROTOKOL_SURUMU } from "../../ag/protokol.ts";
import { KATALOG_OZETI } from "../../ag/katalog.ts";
import { ELEMENT_CARKI } from "../../paylasilan/kurallar/ayar.ts";
import { seviyeAraligi } from "../../paylasilan/kurallar/ilerleme.ts";
import { cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import { type Depo, depo } from "../db/depo.ts";
import { type Istek, type Uygulama, type Yanit, govdeOku, ip, kokenTamam, oturumId, oturumdakiOyuncu, yaz } from "./ortak.ts";
import { atolyeRotalariKur } from "./atolye.ts";
import { marketRotalariKur } from "./market.ts";
import { armaDenetle, haritaRotalariKur } from "./harita.ts";
import { madenRotalariKur } from "./maden.ts";
import { ocakRotalariKur } from "./ocak.ts";
import { haritaAcikMi, ocakAcikMi } from "../oyuncu/harita.ts";
import { seviye as ustalikSeviye } from "../../paylasilan/kurallar/ustalik.ts";
import { basarimOlayiIsle } from "../oyuncu/basarimYaz.ts";
import { sonMacOzeti } from "../oyuncu/sonMac.ts";

export type { Istek, Uygulama, Yanit };
export { oturumdakiOyuncu };
import {
  BILET_SN, OTURUM_CEREZI, OTURUM_GUN, biletUret, cerezBasligi, denemeIzinli, kimlikModu, oturumCereziDegeri, sahteDogrula,
  sifreDogrula, sifreHashle, yeniOturumId,
} from "../kimlik.ts";
import { adAnahtari, adDogrula, sifreDogrula as sifreKurali } from "../oyuncu/kurallar.ts";
import { sunucuTakimlari } from "../oyuncu/takim.ts";
import type { TakimUyeKodu } from "../../paylasilan/veri/takimlar.ts";
import { acikOdaSayisi } from "../odaKayit.ts";

// REST uçları (docs/tech/backend.md). Express 5 (Colyseus `defineServer.express`) üstünde; express tipleri kurulu
// değil, yalnız kullandığımız yüzey. Tüm yazımlar sunucuda; istemci hiçbir sayaç/Altın/XP göndermez.

export const AMBLEMLER = ELEMENT_CARKI; // arma: 6 element simgesi (US-1.2)
export const RENKLER = ["#f4cf47", "#e3350d", "#2fb8e8", "#7fe3a0", "#c58bff", "#f2a33a"] as const;
export const ILK_DEVIR = "ilk-devir";

const KayitSema = z.object({ ad: z.string().max(64), sifre: z.string().max(256), sifreTekrar: z.string().max(256) });
const GirisSema = z.object({ ad: z.string().max(64), sifre: z.string().max(256) });
const ProfilSema = z.object({ arma: z.string().max(40), renk: z.enum(RENKLER), destekKanali: z.string().trim().max(25).regex(/^[A-Za-z0-9_]*$/).optional() });
const IlkCekirdekSema = z.object({ set: z.string().max(20) });
const HesapSilSema = z.object({ sifre: z.string().max(256) });

function oturumAc(r: Yanit, oyuncuId: number, d: Depo): void {
  const id = yeniOturumId();
  d.oturumAc(id, oyuncuId, Date.now() + OTURUM_GUN * 86400_000);
  r.setHeader("Set-Cookie", cerezBasligi(OTURUM_CEREZI, oturumCereziDegeri(id), OTURUM_GUN * 86400));
}

/** Oturumdaki oyuncunun tam görünümü (`/api/ben`). */
export function benGorunumu(d: Depo, oyuncuId: number) {
  const o = d.oyuncu(oyuncuId);
  if (!o) return null;
  const basarimlar = d.basarimlar(oyuncuId).filter((b) => b.tamam).map((b) => b.basarim_id);
  const cekirdekler = d.cekirdekler(oyuncuId).map((c) => {
    const t = cekirdekBul(c.tanim_id);
    const a = seviyeAraligi(c.seviye);
    return { id: c.id, tanimId: c.tanim_id, ad: t.ad, element: t.element, koken: t.koken, seviye: c.seviye, tecrube: c.tecrube, alt: a.alt, ust: a.ust, omur: c.omur, yon: c.yon };
  });
  // D6: yalnız oynanabilir takımlar (Lobi, Antrenman); düzenleme görünümü /api/atolye
  const takimlar = sunucuTakimlari(d, oyuncuId).filter((t) => t.oynanabilir).map((t) => ({
    id: String(t.takimNo), ad: t.ad, uyeler: t.uyeler as TakimUyeKodu[], eksik: 0, bos: 0,
  }));
  return {
    girisli: true as const,
    protokol: PROTOKOL_SURUMU,
    katalog: KATALOG_OZETI,
    oyuncu: { id: o.id, ad: o.ad, arma: o.arma, renk: o.renk, destekKanali: o.destek_kanali, profilTamam: o.arma !== null },
    cekirdekler,
    takimlar,
    aktifTakim: String(o.aktif_takim),
    basarimlar,
    marketAcik: basarimlar.includes(ILK_DEVIR),
    /** D7: Altın bakiyesi (defter toplamı) */
    altin: d.bakiye(oyuncuId),
    /** TEMIZLIK #5: son maç özeti (Pergel ring-out ipucu, sunucudaki biten maç sayısı); hiç maç yoksa null */
    sonMac: sonMacOzeti(d, oyuncuId),
    /** Harita (08 § 4): İlk Devir sonrası açık; karakter gövdesi, profil çerçevesi */
    harita: { acik: haritaAcikMi(d, oyuncuId), konum: o.harita_konum ?? null },
    karakter: o.karakter ?? 0,
    cerceve: o.cerceve ?? null,
    /** Ustalık seviyeleri (profil rozeti ⛏/⚒; maç ekranlarında GÖSTERİLMEZ, G-0) ve Ocak görünürlüğü (İlk Kazı) */
    ustalik: { madencilik: ustalikSeviye(d.ustaliklar(oyuncuId).madencilik), isleme: ustalikSeviye(d.ustaliklar(oyuncuId).isleme) },
    ocakAcik: ocakAcikMi(d, oyuncuId),
  };
}

export function rotalariKur(app: Uygulama): void {
  app.get("/api/saglik", (_q, r) => {
    r.json({ ok: true, protokol: PROTOKOL_SURUMU, katalog: KATALOG_OZETI, kimlik: kimlikModu(), odalar: acikOdaSayisi() });
  });

  app.get("/api/ben", (q, r) => {
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    const g = id !== null ? benGorunumu(d, id) : null;
    yaz(r, 200, g ?? { girisli: false, protokol: PROTOKOL_SURUMU, katalog: KATALOG_OZETI });
  });

  app.get("/api/ad-uygun", (q, r) => {
    const v = adDogrula(String(q.query["ad"] ?? ""));
    if (v.hata) { yaz(r, 200, { uygun: false, hata: v.hata }); return; }
    yaz(r, 200, depo().oyuncuAdla(adAnahtari(v.ad)) ? { uygun: false, hata: "alinmis" } : { uygun: true });
  });

  app.post("/api/kayit", async (q, r) => {
    if (!kokenTamam(q, r)) return;
    let b: z.infer<typeof KayitSema>;
    try { b = KayitSema.parse(await govdeOku(q)); } catch { yaz(r, 400, { hata: "bicim" }); return; }
    if (!denemeIzinli(`kayit:${ip(q)}`)) { yaz(r, 429, { hata: "cok" }); return; }
    const v = adDogrula(b.ad);
    if (v.hata) { yaz(r, 400, { hata: v.hata }); return; }
    const sk = sifreKurali(b.sifre);
    if (sk) { yaz(r, 400, { hata: sk === "kisa" ? "sifreKisa" : "sifreUzun" }); return; }
    if (b.sifre !== b.sifreTekrar) { yaz(r, 400, { hata: "eslesmiyor" }); return; }
    const d = depo();
    const anahtar = adAnahtari(v.ad);
    if (d.oyuncuAdla(anahtar)) { yaz(r, 409, { hata: "alinmis" }); return; }
    const hash = await sifreHashle(b.sifre);
    const id = d.oyuncuOlustur({ ad: v.ad, adAnahtar: anahtar, sifreHash: hash, simdi: Date.now() });
    if (id === null) { yaz(r, 409, { hata: "alinmis" }); return; }
    oturumAc(r, id, d);
    console.log(`[kimlik] kayıt: oyuncu ${id}`);
    yaz(r, 201, { ok: true });
  });

  app.post("/api/giris", async (q, r) => {
    if (!kokenTamam(q, r)) return;
    let b: z.infer<typeof GirisSema>;
    try { b = GirisSema.parse(await govdeOku(q)); } catch { yaz(r, 400, { hata: "bicim" }); return; }
    const anahtar = adAnahtari(b.ad);
    if (!denemeIzinli(`giris:${ip(q)}:${anahtar}`)) { yaz(r, 429, { hata: "cok" }); return; }
    const d = depo();
    const o = d.oyuncuAdla(anahtar);
    const dogru = o ? await sifreDogrula(b.sifre, o.sifre_hash) : await sahteDogrula(b.sifre);
    if (!o || !dogru) { yaz(r, 401, { hata: "yanlis" }); return; }
    oturumAc(r, o.id, d);
    yaz(r, 200, { ok: true });
  });

  app.post("/api/cikis", (q, r) => {
    if (!kokenTamam(q, r)) return;
    const id = oturumId(q);
    if (id) depo().oturumSil(id);
    r.setHeader("Set-Cookie", cerezBasligi(OTURUM_CEREZI, "", 0));
    yaz(r, 200, { ok: true });
  });

  /**
   * D8 hesap silme (nile B-28; iki adım istemcide, burada şifre onayı): oturumdaki oyuncunun tüm verisi silinir,
   * maç satırları anonimleşir, oturum çerezi temizlenir. Misafire uygulanmaz (oturum yok → 401). Kaba kuvvet
   * girişle aynı sınır. İkinci çağrı: oturum artık yok → 401 (depo düzeyinde idempotent).
   */
  app.delete("/api/hesap", async (q, r) => {
    if (!kokenTamam(q, r)) return;
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    let b: z.infer<typeof HesapSilSema>;
    try { b = HesapSilSema.parse(await govdeOku(q)); } catch { yaz(r, 400, { hata: "bicim" }); return; }
    if (!denemeIzinli(`sil:${ip(q)}:${id}`)) { yaz(r, 429, { hata: "cok" }); return; }
    const o = d.oyuncu(id);
    if (!o || !(await sifreDogrula(b.sifre, o.sifre_hash))) { yaz(r, 401, { hata: "yanlis" }); return; }
    d.hesapSil(id);
    r.setHeader("Set-Cookie", cerezBasligi(OTURUM_CEREZI, "", 0));
    console.log(`[kimlik] hesap silindi: oyuncu ${id}`);
    yaz(r, 200, { ok: true, silindi: true });
  });

  /** D8: son 20 maç (rakip adı; hesabını silen rakip "Silinmiş oyuncu", bot "Devran botu"). */
  app.get("/api/maclar", (q, r) => {
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    const maclar = d.sonMaclar(id).map((m) => {
      const ben = m.a === id ? "a" : "b";
      const rakipId = ben === "a" ? m.b : m.a;
      const silindi = (ben === "a" ? m.silinen_b : m.silinen_a) === 1;
      const rakipAd = rakipId !== null ? (d.oyuncu(rakipId)?.ad ?? "Silinmiş oyuncu") : silindi ? "Silinmiş oyuncu" : m.bot ? "Devran botu" : "—";
      const puan = m.puan.split("-").map(Number) as [number, number];
      return {
        id: m.id, mod: m.mod, tarih: m.baslangic, rakipAd, skor: ben === "a" ? puan : [puan[1], puan[0]],
        sonuc: m.kazanan === id ? "zafer" : m.bitis_nedeni === "iptal" ? "iptal" : "yenilgi", sureSn: m.sure,
      };
    });
    yaz(r, 200, { maclar });
  });

  /** Profil (US-1.2): ad kayıttan gelir; arma, renk, destek kanalı. */
  app.post("/api/profil", async (q, r) => {
    if (!kokenTamam(q, r)) return;
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    let b: z.infer<typeof ProfilSema>;
    try { b = ProfilSema.parse(await govdeOku(q)); } catch { yaz(r, 400, { hata: "bicim" }); return; }
    const armaHata = armaDenetle(d, id, b.arma);
    if (armaHata) { yaz(r, armaHata === "bicim" ? 400 : 403, { hata: armaHata }); return; }
    d.profilKaydet(id, { arma: b.arma, renk: b.renk, destekKanali: b.destekKanali || null });
    yaz(r, 200, { ok: true });
  });

  app.post("/api/ilk-cekirdek", async (q, r) => {
    if (!kokenTamam(q, r)) return;
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    let b: z.infer<typeof IlkCekirdekSema>;
    try { b = IlkCekirdekSema.parse(await govdeOku(q)); } catch { yaz(r, 400, { hata: "bicim" }); return; }
    const s = d.ilkCekirdek(id, b.set, Date.now());
    if (s === "set") { yaz(r, 400, { hata: "set" }); return; }
    if (s === "var") { yaz(r, 409, { hata: "var" }); return; }
    yaz(r, 201, { ok: true });
  });

  /**
   * Antrenman eğitimi bitti → "İlk Devir" (Market açılır). Eğitim istemcide koşar ve 25 sn otomatik geçişle zaten
   * beklemeyle bitirilebilir; uç yalnız bayrak yazar (sayı, Altın, XP almaz), idempotent.
   */
  app.post("/api/egitim-bitti", (q, r) => {
    if (!kokenTamam(q, r)) return;
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    // D7: İlk Devir başarım yolundan (Altın ödülü 100, defter `basarim:ilk-devir:<oyuncu>`; idempotent)
    const s = basarimOlayiIsle(d, id, { olay: { antrenmanBitti: true } }, Date.now());
    const yeni = s.degisimler.some((x) => x.id === ILK_DEVIR && x.tamamlandi);
    yaz(r, 200, { ok: true, yeni, basarim: ILK_DEVIR, altin: s.odul, bakiye: d.bakiye(id) });
  });

  /** Oda bileti: 60 s, tek kullanımlık; Colyseus katılımında `onAuth` doğrular. */
  app.post("/api/bilet", (q, r) => {
    if (!kokenTamam(q, r)) return;
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    yaz(r, 200, { bilet: biletUret(id), sn: BILET_SN });
  });

  atolyeRotalariKur(app);
  marketRotalariKur(app);
  haritaRotalariKur(app);
  madenRotalariKur(app);
  ocakRotalariKur(app);
}
