import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { PROTOKOL_SURUMU } from "../../ag/protokol.ts";
import { KATALOG_OZETI } from "../../ag/katalog.ts";
import { ELEMENT_CARKI } from "../../paylasilan/kurallar/ayar.ts";
import { seviyeAraligi } from "../../paylasilan/kurallar/ilerleme.ts";
import { cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import { type Depo, depo } from "../db/depo.ts";
import {
  BILET_SN, OTURUM_CEREZI, OTURUM_GUN, biletUret, cerezBasligi, cerezleriCoz, denemeIzinli, kimlikModu, kokenIzinli,
  oturumCereziCoz, oturumCereziDegeri, sahteDogrula, sifreDogrula, sifreHashle, yeniOturumId,
} from "../kimlik.ts";
import { adAnahtari, adDogrula, oduncDoldur, sifreDogrula as sifreKurali, takimEksigi } from "../oyuncu/kurallar.ts";
import { acikOdaSayisi } from "../odaKayit.ts";

// REST uçları (docs/tech/backend.md). Express 5 (Colyseus `defineServer.express`) üstünde; express tipleri kurulu
// değil, yalnız kullandığımız yüzey. Tüm yazımlar sunucuda; istemci hiçbir sayaç/Altın/XP göndermez.

export type Istek = IncomingMessage & { params: Record<string, string | undefined>; query: Record<string, unknown>; body?: unknown };
export type Yanit = ServerResponse & { json(v: unknown): void; status(k: number): Yanit; set(k: string, v: string): void };
export interface Uygulama {
  get(yol: string, f: (q: Istek, r: Yanit) => void | Promise<void>): void;
  post(yol: string, f: (q: Istek, r: Yanit) => void | Promise<void>): void;
}

export const AMBLEMLER = ELEMENT_CARKI; // arma: 6 element simgesi (US-1.2)
export const RENKLER = ["#f4cf47", "#e3350d", "#2fb8e8", "#7fe3a0", "#c58bff", "#f2a33a"] as const;
export const ILK_DEVIR = "ilk-devir";

const KayitSema = z.object({ ad: z.string().max(64), sifre: z.string().max(256), sifreTekrar: z.string().max(256) });
const GirisSema = z.object({ ad: z.string().max(64), sifre: z.string().max(256) });
const ProfilSema = z.object({ arma: z.enum(AMBLEMLER as unknown as [string, ...string[]]), renk: z.enum(RENKLER), destekKanali: z.string().trim().max(25).regex(/^[A-Za-z0-9_]*$/).optional() });
const IlkCekirdekSema = z.object({ set: z.string().max(20) });

async function govdeOku(q: Istek): Promise<unknown> {
  if (q.body && typeof q.body === "object") return q.body;
  const parcalar: Buffer[] = [];
  let boy = 0;
  for await (const p of q as AsyncIterable<Buffer>) {
    boy += p.length;
    if (boy > 16 * 1024) throw new Error("govde");
    parcalar.push(p);
  }
  const metin = Buffer.concat(parcalar).toString("utf8");
  return metin ? JSON.parse(metin) : {};
}

function ip(q: Istek): string {
  if (process.env.GUVENILIR_VEKIL === "1") {
    const h = q.headers["cf-connecting-ip"] ?? q.headers["x-forwarded-for"];
    const v = Array.isArray(h) ? h[0] : h;
    if (v) return v.split(",")[0]!.trim();
  }
  return q.socket.remoteAddress ?? "?";
}

function oturumId(q: Istek): string | null {
  return oturumCereziCoz(cerezleriCoz(q.headers.cookie)[OTURUM_CEREZI]);
}

/** Geçerli oturumun oyuncusu. */
export function oturumdakiOyuncu(q: Istek, d: Depo = depo()): number | null {
  const id = oturumId(q);
  return id ? d.oturumOyuncusu(id, Date.now()) : null;
}

function oturumAc(r: Yanit, oyuncuId: number, d: Depo): void {
  const id = yeniOturumId();
  d.oturumAc(id, oyuncuId, Date.now() + OTURUM_GUN * 86400_000);
  r.setHeader("Set-Cookie", cerezBasligi(OTURUM_CEREZI, oturumCereziDegeri(id), OTURUM_GUN * 86400));
}

/** Yazım uçları: Origin izinli olmalı (CSRF; SameSite=Lax'a ek). */
function kokenTamam(q: Istek, r: Yanit): boolean {
  const o = q.headers.origin;
  if (kokenIzinli(typeof o === "string" ? o : null)) return true;
  r.status(403).json({ hata: "koken" });
  return false;
}

function yaz(r: Yanit, kod: number, v: unknown): void {
  r.setHeader("Cache-Control", "no-store");
  r.status(kod).json(v);
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
  const takimlar = d.takimlar(oyuncuId).map((t) => {
    const eksikHam = takimEksigi(t.yuvalar.map((y) => (y && !y.devreDisi ? y.cekirdek : null)));
    const uyeler = oduncDoldur(t.yuvalar);
    return { id: String(t.takimNo), ad: t.ad, uyeler, eksik: takimEksigi(uyeler.map((u) => u.cekirdek)), bos: eksikHam };
  });
  return {
    girisli: true as const,
    protokol: PROTOKOL_SURUMU,
    katalog: KATALOG_OZETI,
    oyuncu: { id: o.id, ad: o.ad, arma: o.arma, renk: o.renk, destekKanali: o.destek_kanali, profilTamam: o.arma !== null },
    cekirdekler,
    takimlar,
    basarimlar,
    marketAcik: basarimlar.includes(ILK_DEVIR),
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
    const yeni = d.basarimTamamla(id, ILK_DEVIR);
    yaz(r, 200, { ok: true, yeni, basarim: ILK_DEVIR });
  });

  /** Oda bileti: 60 s, tek kullanımlık; Colyseus katılımında `onAuth` doğrular. */
  app.post("/api/bilet", (q, r) => {
    if (!kokenTamam(q, r)) return;
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    yaz(r, 200, { bilet: biletUret(id), sn: BILET_SN });
  });
}
