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
import { basarimOlayiIsle } from "../oyuncu/basarimYaz.ts";

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
const ProfilSema = z.object({ arma: z.enum(AMBLEMLER as unknown as [string, ...string[]]), renk: z.enum(RENKLER), destekKanali: z.string().trim().max(25).regex(/^[A-Za-z0-9_]*$/).optional() });
const IlkCekirdekSema = z.object({ set: z.string().max(20) });

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

  /** Profil (US-1.2): ad kayıttan gelir; arma, renk, destek kanalı. */
  app.post("/api/profil", async (q, r) => {
    if (!kokenTamam(q, r)) return;
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    let b: z.infer<typeof ProfilSema>;
    try { b = ProfilSema.parse(await govdeOku(q)); } catch { yaz(r, 400, { hata: "bicim" }); return; }
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
}
