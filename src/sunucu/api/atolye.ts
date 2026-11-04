import { z } from "zod";
import { type TaslakTopac, takimDegerlendir } from "../../paylasilan/kurallar/atolye.ts";
import { seviyeAraligi } from "../../paylasilan/kurallar/ilerleme.ts";
import { profilCubuklari } from "../../paylasilan/veri/cubuklar.ts";
import { PARCALAR, cekirdekBul, parcaBul } from "../../paylasilan/veri/katalog.ts";
import { topacProfiliKur } from "../../paylasilan/veri/profil.ts";
import type { Depo } from "../db/depo.ts";
import { adAnahtari, adDegisimKalanGun, adDogrula, takimAdDogrula } from "../oyuncu/kurallar.ts";
import { envanterOku, sunucuTakimlari } from "../oyuncu/takim.ts";
import { type Istek, type Uygulama, type Yanit, oturumdakiOyuncu, yaz, yazimGirisi } from "./ortak.ts";
import { depo } from "../db/depo.ts";

// Atölye uçları (D6, US-2.1/2.2; docs/tech/backend.md § 3). İstemci yalnız örnek kimliği gönderir; sahiplik, tür,
// 3 farklı Çekirdek, parça tek topaçta, ödünç kotası sunucuda (`takimDegerlendir`, paylaşılan saf kural); çubuk
// sayıları sunucuda `topacProfiliKur` ile hesaplanıp yanıtta döner. Geliştirme uçları yalnız NODE_ENV != production
// ve yerel adresten (D7'de Market ve gerçek XP bunların yerini alır).

export const TAKIM_TAVANI = 3;
const id = z.number().int().positive().nullable();
const TopacSema = z.object({ cekirdek: id, govde: id, disk: id, uc: id });
const TakimSema = z.object({ ad: z.string().max(64).optional(), yuvalar: z.array(TopacSema).length(3) });
const AdSema = z.object({ ad: z.string().max(64) });
const YeniTakimSema = z.object({ ad: z.string().max(64).optional() });
const AktifSema = z.object({ takimNo: z.number().int().min(0).max(TAKIM_TAVANI - 1) });
const YonSema = z.object({ yon: z.enum(["sag", "sol"]) });
const ParcaVerSema = z.object({ tanim: z.string().max(40) });
const XpVerSema = z.object({ cekirdekId: z.number().int().positive(), xp: z.number().int().min(-5000).max(5000) });

/** Çekirdek Günlüğü + Atölye çekirdek görünümü. */
function cekirdekGorunumleri(d: Depo, oyuncuId: number) {
  return d.cekirdekler(oyuncuId).map((c) => {
    const t = cekirdekBul(c.tanim_id);
    const a = seviyeAraligi(c.seviye);
    return {
      id: c.id, tanimId: c.tanim_id, ad: t.ad, element: t.element, koken: t.koken, ruh: t.ruh, seviye: c.seviye, tecrube: c.tecrube,
      alt: a.alt, ust: a.ust, omur: c.omur, yon: c.yon === "sol" ? "sol" : "sag", ciftYon: t.katki.yon === "cift", devreDisi: c.omur !== null && c.omur <= 0,
      defter: { mac: c.mac_sayisi, galibiyet: c.galibiyet, krizGalibiyet: c.kriz_galibiyet, enUzunDonusSn: c.en_uzun_donus_sn, kararma: c.kararma },
    };
  });
}

/** Taslak topacın profil çubukları (sunucu hesaplar); eksikse null. */
function topacCubuklari(d: Depo, oyuncuId: number, y: TaslakTopac) {
  if (y.cekirdek === null || y.govde === null || y.disk === null || y.uc === null) return null;
  const c = d.cekirdek(oyuncuId, y.cekirdek);
  const parca = new Map(d.parcalar(oyuncuId).map((p) => [p.id, p.tanim_id]));
  const g = parca.get(y.govde), ds = parca.get(y.disk), u = parca.get(y.uc);
  if (!c || !g || !ds || !u) return null;
  try { return profilCubuklari(topacProfiliKur(c.tanim_id, g, ds, u, { yon: c.yon === "sol" ? "sol" : "sag" })); } catch { return null; }
}

export function atolyeGorunumu(d: Depo, oyuncuId: number) {
  const o = d.oyuncu(oyuncuId);
  if (!o) return null;
  const env = envanterOku(d, oyuncuId);
  const sunucu = sunucuTakimlari(d, oyuncuId, env);
  const takimlar = d.takimTaslaklari(oyuncuId).map((t) => {
    const s = sunucu.find((x) => x.takimNo === t.takimNo);
    return {
      takimNo: t.takimNo, ad: t.ad, yuvalar: t.yuvalar, degerlendirme: takimDegerlendir(t.yuvalar, env),
      oynanabilir: s?.oynanabilir ?? false, uyeler: s?.uyeler ?? [null, null, null],
      cubuklar: t.yuvalar.map((y) => topacCubuklari(d, oyuncuId, y)),
    };
  });
  const ilerleme: Record<string, number> = {};
  for (const b of d.basarimlar(oyuncuId)) ilerleme[b.basarim_id] = b.ilerleme;
  const kalanGun = adDegisimKalanGun(o, Date.now());
  return {
    oyuncu: { id: o.id, ad: o.ad, arma: o.arma, renk: o.renk, destekKanali: o.destek_kanali, adKalanGun: kalanGun },
    aktifTakim: o.aktif_takim,
    cekirdekler: cekirdekGorunumleri(d, oyuncuId),
    parcalar: d.parcalar(oyuncuId).map((p) => ({ id: p.id, tanimId: p.tanim_id, tur: parcaBul(p.tanim_id).tur })),
    takimlar,
    basarimIlerleme: ilerleme,
    takimTavani: TAKIM_TAVANI,
    gelistirme: process.env.NODE_ENV !== "production",
  };
}

function siraOku(q: Istek, r: Yanit): number | null {
  const n = Number(q.params["sira"]);
  if (!Number.isInteger(n) || n < 0 || n >= TAKIM_TAVANI) { yaz(r, 400, { hata: "sira" }); return null; }
  return n;
}

/** Geliştirme ucu kapısı: üretimde yok, yalnız geri döngü adresinden. */
function gelistirmeIzinli(q: Istek, r: Yanit): boolean {
  const a = q.socket.remoteAddress ?? "";
  const yerel = a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
  if (process.env.NODE_ENV === "production" || !yerel) { yaz(r, 404, { hata: "yok" }); return false; }
  return true;
}

export function atolyeRotalariKur(app: Uygulama): void {
  app.get("/api/atolye", (q, r) => {
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    yaz(r, 200, atolyeGorunumu(d, id));
  });

  /** Takımı yaz: yalnız örnek kimlikleri; doğrulama sunucuda (paylaşılan kural). */
  app.put("/api/takim/:sira", async (q, r) => {
    const g = await yazimGirisi(q, r, TakimSema);
    if (!g) return;
    const sira = siraOku(q, r);
    if (sira === null) return;
    const mevcut = g.d.takimTaslaklari(g.id).find((t) => t.takimNo === sira);
    if (!mevcut) { yaz(r, 404, { hata: "yok" }); return; }
    const yuvalar = g.b.yuvalar as TaslakTopac[];
    const v = takimDegerlendir(yuvalar, envanterOku(g.d, g.id));
    if (v.hatalar.length) { const h = v.hatalar[0]!; yaz(r, 400, { hata: h.kod, yuva: h.yuva, tur: h.tur }); return; }
    let ad = mevcut.ad;
    if (g.b.ad !== undefined) {
      const a = takimAdDogrula(g.b.ad);
      if (a.hata) { yaz(r, 400, { hata: `ad-${a.hata}` }); return; }
      ad = a.ad;
    }
    g.d.takimYaz(g.id, sira, ad, yuvalar);
    yaz(r, 200, { ok: true, atolye: atolyeGorunumu(g.d, g.id) });
  });

  /** Yeni takım (3 kayıtlı takım tavanı; US-2.1). Yuvalar boş başlar. */
  app.post("/api/takim", async (q, r) => {
    const g = await yazimGirisi(q, r, YeniTakimSema);
    if (!g) return;
    const var_ = new Set(g.d.takimTaslaklari(g.id).map((t) => t.takimNo));
    let no = -1;
    for (let k = 0; k < TAKIM_TAVANI; k++) if (!var_.has(k)) { no = k; break; }
    if (no < 0) { yaz(r, 409, { hata: "dolu" }); return; }
    let ad = `Takım ${no + 1}`;
    if (g.b.ad) {
      const a = takimAdDogrula(g.b.ad);
      if (a.hata) { yaz(r, 400, { hata: `ad-${a.hata}` }); return; }
      ad = a.ad;
    }
    const bos = { cekirdek: null, govde: null, disk: null, uc: null };
    g.d.takimYaz(g.id, no, ad, [bos, bos, bos]);
    yaz(r, 201, { ok: true, takimNo: no, atolye: atolyeGorunumu(g.d, g.id) });
  });

  /** Takım adı. */
  app.patch("/api/takim/:sira", async (q, r) => {
    const g = await yazimGirisi(q, r, AdSema);
    if (!g) return;
    const sira = siraOku(q, r);
    if (sira === null) return;
    const a = takimAdDogrula(g.b.ad);
    if (a.hata) { yaz(r, 400, { hata: `ad-${a.hata}` }); return; }
    if (!g.d.takimAdiYaz(g.id, sira, a.ad)) { yaz(r, 404, { hata: "yok" }); return; }
    yaz(r, 200, { ok: true, ad: a.ad });
  });

  /** Aktif takım (maça girişte varsayılan; Lobi yine değiştirebilir). */
  app.patch("/api/aktif-takim", async (q, r) => {
    const g = await yazimGirisi(q, r, AktifSema);
    if (!g) return;
    if (!g.d.takimTaslaklari(g.id).some((t) => t.takimNo === g.b.takimNo)) { yaz(r, 404, { hata: "yok" }); return; }
    g.d.aktifTakimYaz(g.id, g.b.takimNo);
    yaz(r, 200, { ok: true });
  });

  /** Yapay (çift yönlü) Çekirdek yön tercihi; maçta sim'e `yon` olarak gider (takım kodu). */
  app.patch("/api/cekirdek/:id", async (q, r) => {
    const g = await yazimGirisi(q, r, YonSema);
    if (!g) return;
    const cid = Number(q.params["id"]);
    const c = Number.isInteger(cid) ? g.d.cekirdek(g.id, cid) : null;
    if (!c) { yaz(r, 404, { hata: "yok" }); return; }
    if (cekirdekBul(c.tanim_id).katki.yon !== "cift") { yaz(r, 400, { hata: "yonSabit" }); return; }
    g.d.yonYaz(g.id, cid, g.b.yon);
    yaz(r, 200, { ok: true, yon: g.b.yon });
  });

  /** Oyuncu adı (30 günde bir; ux § 7). */
  app.patch("/api/ad", async (q, r) => {
    const g = await yazimGirisi(q, r, AdSema);
    if (!g) return;
    const o = g.d.oyuncu(g.id)!;
    const v = adDogrula(g.b.ad);
    if (v.hata) { yaz(r, 400, { hata: v.hata }); return; }
    const anahtar = adAnahtari(v.ad);
    if (v.ad === o.ad) { yaz(r, 400, { hata: "ayni" }); return; }
    const kalan = adDegisimKalanGun(o, Date.now());
    if (kalan > 0) { yaz(r, 409, { hata: "sure", kalanGun: kalan }); return; }
    const baska = g.d.oyuncuAdla(anahtar);
    if (baska && baska.id !== g.id) { yaz(r, 409, { hata: "alinmis" }); return; }
    if (!g.d.adDegistir(g.id, v.ad, anahtar, Date.now())) { yaz(r, 409, { hata: "alinmis" }); return; }
    console.log(`[kimlik] ad değişti: oyuncu ${g.id}`);
    yaz(r, 200, { ok: true, ad: v.ad });
  });

  // ---- geliştirme (yalnız yerel, NODE_ENV != production) ----
  app.post("/api/gelistirme/parca-ver", async (q, r) => {
    if (!gelistirmeIzinli(q, r)) return;
    const g = await yazimGirisi(q, r, ParcaVerSema);
    if (!g) return;
    if (!PARCALAR.parcalar.some((p) => p.id === g.b.tanim)) { yaz(r, 400, { hata: "tanim" }); return; }
    const v = g.d.parcaVer(g.id, g.b.tanim, Date.now());
    console.log(`[gelistirme] parça verildi: oyuncu ${g.id} ${g.b.tanim}`);
    yaz(r, 201, { ok: true, ...v });
  });

  app.post("/api/gelistirme/xp-ver", async (q, r) => {
    if (!gelistirmeIzinli(q, r)) return;
    const g = await yazimGirisi(q, r, XpVerSema);
    if (!g) return;
    const c = g.d.xpVer(g.id, g.b.cekirdekId, g.b.xp);
    if (!c) { yaz(r, 404, { hata: "yok" }); return; }
    console.log(`[gelistirme] xp: oyuncu ${g.id} çekirdek ${c.id} → ${c.tecrube} XP Lv.${c.seviye}`);
    yaz(r, 200, { ok: true, seviye: c.seviye, tecrube: c.tecrube });
  });
}
