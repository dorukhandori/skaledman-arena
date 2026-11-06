import { randomUUID } from "node:crypto";
import { z } from "zod";
import { basarimAciklama, KATEGORI_SIRASI } from "../../paylasilan/kurallar/basarim.ts";
import { gunNo, gununParcasi, yenilenebilir, yenilemeFiyati, zorluk } from "../../paylasilan/kurallar/ekonomi.ts";
import { ILERLEME } from "../../paylasilan/kurallar/ilerleme.ts";
import {
  KATMAN_AD, RAFLAR, gununParcasiAdaylari, marketDurumu, marketFiyati, rafUrunleri, satinAlmaDenetle, satisFiyati,
} from "../../paylasilan/kurallar/market.ts";
import { parcaMaliyeti, uretilebilirKademe } from "../../paylasilan/kurallar/ocak.ts";
import { seviye } from "../../paylasilan/kurallar/ustalik.ts";
import { SURUM_KADEME_TAVANI, kademeBul } from "../../paylasilan/veri/harita.ts";
import type { Parca } from "../../paylasilan/veri/semalar.ts";
import { BASARIMLAR, PARCALAR, cekirdekBul, parcaBul } from "../../paylasilan/veri/katalog.ts";
import type { Depo } from "../db/depo.ts";
import { depo } from "../db/depo.ts";
import { basarimOlayiIsle, ilerlemeler, tamamlananlar } from "../oyuncu/basarimYaz.ts";
import { sunucuTakimlari } from "../oyuncu/takim.ts";
import { type Uygulama, oturumdakiOyuncu, yaz, yazimGirisi } from "./ortak.ts";

// Market + Başarımlar + Altın defteri uçları (D7; docs/tech/backend.md § 3). Satın alma ve Yapay yenileme TEK SQLite
// işlemi (BEGIN IMMEDIATE): kilit/sahiplik/bakiye denetimi + defter −fiyat (`ref` UNIQUE) + envanter satırı. İstemci
// yalnız parça tanımı / Çekirdek kimliği gönderir; fiyat, indirim, kilit sunucuda. ERİTME YOK (nile § 0).

const ILK_DEVIR = "ilk-devir";
const SatinSema = z.object({ parca: z.string().min(1).max(40) });
const YenileSema = z.object({ cekirdekId: z.number().int().positive() });
const AltinVerSema = z.object({ miktar: z.number().int().min(-100000).max(100000) });
const CevherVerSema = z.object({ kademe: z.number().int().min(1).max(8), cevher: z.number().int().min(0).max(500), kulce: z.number().int().min(0).max(500) });
const BasarimVerSema = z.object({ basarim: z.string().max(40), ilerleme: z.number().int().min(0).max(1000) });

/** Günün parçası tohumu (sunucu; gün başına sabit). */
export function marketTohumu(): string {
  return process.env.MARKET_TOHUMU ?? "devran";
}

export function bugununParcasi(simdi: number): string | null {
  return gununParcasi(gunNo(simdi), marketTohumu(), gununParcasiAdaylari());
}

function sahipSayilari(d: Depo, id: number): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of d.cekirdekler(id)) m.set(c.tanim_id, (m.get(c.tanim_id) ?? 0) + 1);
  for (const p of d.parcalar(id)) m.set(p.tanim_id, (m.get(p.tanim_id) ?? 0) + 1);
  return m;
}

/** Ürün kartı parametre etkisi için referans topaç: aktif takımın ilk dolu (sahip olunan) yuvası. */
function referansTopac(d: Depo, id: number): { cekirdek: string; govde: string; disk: string; uc: string; yon: "sag" | "sol" } | null {
  const o = d.oyuncu(id);
  const t = sunucuTakimlari(d, id);
  const aktif = t.find((x) => x.takimNo === o?.aktif_takim) ?? t[0];
  const y = aktif?.yuvalar.find((x) => x !== null) ?? null;
  return y ? { cekirdek: y.cekirdek, govde: y.govde, disk: y.disk, uc: y.uc, yon: y.yon } : null;
}

/** Sim p50 (06 Tablo G, aktif profil) varsayılan külçe üretimi/gün: oyuncunun üretim verisi yoksa "(TAHMİN)". */
export const TAHMINI_KULCE_GUN = 6;

export interface CraftBilgisi { kademe: number | null; kulce: number; iscilik: number; gun: number | null; tahmini: boolean; hazir: boolean; ustalikEksik: number | null; metin: string }

/** Market kartı "CRAFT: 25 DON KÜLÇESİ · ~3 GÜN" (12 § 5.2): dürüst fiyat gösterimi, karanlık desen yok. */
export function craftBilgisi(p: Parca, U: number, kulce: readonly number[], kulceGun: number): CraftBilgisi {
  const k = uretilebilirKademe(p, U);
  if (k === null) {
    // Ustalık yetmiyor: katmanın en düşük kademesindeki eşik
    const ilk = [1, 2, 3, 4].filter((x) => x <= SURUM_KADEME_TAVANI).map((x) => parcaMaliyeti(p, x)).find((m) => m !== null) ?? null;
    if (!ilk) return { kademe: null, kulce: 0, iscilik: 0, gun: null, tahmini: false, hazir: false, ustalikEksik: null, metin: "CRAFT: YOK" };
    return { kademe: null, kulce: ilk.kulce, iscilik: ilk.iscilik, gun: null, tahmini: false, hazir: false, ustalikEksik: ilk.esik, metin: `CRAFT: İŞLEME ${ilk.esik} GEREKİR` };
  }
  const m = parcaMaliyeti(p, k)!;
  const eksik = Math.max(0, m.kulce - (kulce[k - 1] ?? 0));
  const ad = `${kademeBul(k).ad.replace(/ CEVHERİ$/, "")} KÜLÇESİ`;
  if (eksik === 0) return { kademe: k, kulce: m.kulce, iscilik: m.iscilik, gun: 0, tahmini: false, hazir: true, ustalikEksik: null, metin: "CRAFT: HAZIR · OCAK'A GİT" };
  const tahmini = kulceGun <= 0;
  const gun = Math.max(1, Math.ceil(eksik / (tahmini ? TAHMINI_KULCE_GUN : kulceGun)));
  return { kademe: k, kulce: m.kulce, iscilik: m.iscilik, gun, tahmini, hazir: false, ustalikEksik: null, metin: `CRAFT: ${m.kulce} ${ad} · ~${gun} GÜN${tahmini ? " (TAHMİN)" : ""}` };
}

export function marketGorunumu(d: Depo, id: number, simdi: number) {
  const tamam = tamamlananlar(d, id);
  const U = seviye(d.ustaliklar(id).isleme);
  const kulce = d.cevherler(id).kulce;
  const kulceGun = d.sonKulceUretimi(id, simdi - 7 * 86_400_000) / 7;
  const ilerleme = ilerlemeler(d, id);
  const sahip = sahipSayilari(d, id);
  const gp = bugununParcasi(simdi);
  let gizliSira = 0;
  const raflar = RAFLAR.map((r) => ({
    ...r,
    urunler: rafUrunleri(r.tur).map((p) => {
      const fiyat = satisFiyati(p, gp);
      const m = marketDurumu(p, { sahipAdet: sahip.get(p.id) ?? 0, tamamlanan: tamam, ilerleme }, fiyat);
      // gizli ürünün kimliği/adı/fiyatı istemciye gitmez (ipucu yok)
      if (m.durum === "gizli") return { id: `gizli-${++gizliSira}`, durum: "gizli" as const, ad: "???", etiket: m.etiket, okunan: m.okunan, tur: p.tur };
      return {
        id: p.id, durum: m.durum, ad: p.ad, tur: p.tur, element: p.element, koken: p.tur === "cekirdek" ? p.koken : null,
        tipEgilimi: p.tipEgilimi, katman: p.katman, katmanAd: KATMAN_AD[p.katman] ?? p.katman, fiyat: marketFiyati(p), satisFiyati: fiyat,
        craft: craftBilgisi(p, U, kulce, kulceGun),
        gununParcasi: p.id === gp, etiket: m.etiket, okunan: m.okunan, basarim: m.basarim, basarimlaAcildi: m.basarimlaAcildi,
        sahip: sahip.get(p.id) ?? 0, aciklama: p.aciklama,
      };
    }),
  }));
  const asinmis = tamam.has("asinmis");
  const yenileme = d.cekirdekler(id).filter((c) => c.omur !== null).map((c) => {
    const t = cekirdekBul(c.tanim_id);
    return { cekirdekId: c.id, tanimId: c.tanim_id, ad: t.ad, omur: c.omur, tavan: ILERLEME.yapayOmur, fiyat: yenilemeFiyati(t.fiyat, asinmis), tamFiyat: yenilemeFiyati(t.fiyat, false), asinmisIndirimi: asinmis, yenilenebilir: yenilenebilir(c.omur) };
  });
  const gpParca = gp ? parcaBul(gp) : null;
  return {
    acik: tamam.has(ILK_DEVIR),
    bakiye: d.bakiye(id),
    gun: gunNo(simdi),
    gununParcasi: gpParca ? { id: gpParca.id, ad: gpParca.ad, tur: gpParca.tur, element: gpParca.element, fiyat: marketFiyati(gpParca), satisFiyati: satisFiyati(gpParca, gp) } : null,
    raflar,
    yenileme,
    referans: referansTopac(d, id),
  };
}

export function basarimlarGorunumu(d: Depo, id: number) {
  const satirlar = new Map(d.basarimSatirlari(id).map((b) => [b.basarim_id, b]));
  return {
    kategoriler: KATEGORI_SIRASI,
    basarimlar: BASARIMLAR.map((b, k) => {
      const s = satirlar.get(b.id);
      const tamam = s?.tamam === 1;
      const gorunur = !b.gizli || tamam;
      return {
        id: gorunur ? b.id : `gizli-${k}`, kategori: b.kategori, gizli: b.gizli, gorunur, ilkSurum: b.ilkSurum,
        ad: gorunur ? b.ad : "???", aciklama: gorunur ? basarimAciklama(b) : "Gizli başarım.",
        sayi: gorunur ? b.sart.sayi : 0, ilerleme: gorunur ? Math.min(b.sart.sayi, s?.ilerleme ?? 0) : 0,
        tamam, tamamTarihi: s?.tamam_tarihi ?? null,
        odulAltin: gorunur ? b.odulAltin : 0, zorluk: zorluk(b.odulAltin),
        acilanParcalar: gorunur ? b.acilanParcalar.map((p) => ({ id: p, ad: parcaBul(p).ad })) : [],
        acilanGorunum: gorunur ? b.acilanGorunum : [], acilanOzellik: gorunur ? b.acilanOzellik : [],
      };
    }),
  };
}

export type SatinSonucu = { ok: true; tur: string; id: number; fiyat: number; bakiye: number } | { ok: false; hata: string; eksik?: number };

/** Satın alma: tek işlem (BEGIN IMMEDIATE). Aynı parça ikinci kez alınamaz (`ref = satin:<oyuncu>:<parça>` UNIQUE). */
export function satinAl(d: Depo, id: number, tanim: string, simdi: number): SatinSonucu {
  return d.islem((): SatinSonucu => {
    const p = PARCALAR.parcalar.find((x) => x.id === tanim);
    const tamam = tamamlananlar(d, id);
    const gp = bugununParcasi(simdi);
    const fiyat = p ? satisFiyati(p, gp) : 0;
    const bakiye = d.bakiye(id);
    const red = satinAlmaDenetle(p, { sahipAdet: sahipSayilari(d, id).get(tanim) ?? 0, tamamlanan: tamam, ilerleme: ilerlemeler(d, id), bakiye, marketAcik: tamam.has(ILK_DEVIR) }, fiyat);
    if (red) return { ok: false, hata: red, ...(red === "yetersiz" ? { eksik: fiyat - bakiye } : {}) };
    if (!d.altinYaz(id, -fiyat, "satin", `satin:${id}:${p!.id}`, simdi)) return { ok: false, hata: "sahip" };
    const v = d.parcaVer(id, p!.id, simdi);
    basarimOlayiIsle(d, id, { durum: { parcaCesidi: d.parcaCesidi(id) } }, simdi);
    return { ok: true, tur: v.tur, id: v.id, fiyat, bakiye: d.bakiye(id) };
  });
}

export type YenileSonucu = { ok: true; omur: number; fiyat: number; bakiye: number } | { ok: false; hata: string; eksik?: number };

/** Yapay yenileme (Dökümhane, § 17): fiyatın %40'ı (`asinmis` ile %50 indirim), ömür 30'a döner; tek işlem. */
export function yapayYenile(d: Depo, id: number, cekirdekId: number, simdi: number): YenileSonucu {
  return d.islem((): YenileSonucu => {
    const c = d.cekirdek(id, cekirdekId);
    if (!c) return { ok: false, hata: "yok" };
    if (!yenilenebilir(c.omur)) return { ok: false, hata: c.omur === null ? "yapayDegil" : "tam" };
    const tamam = tamamlananlar(d, id);
    if (!tamam.has(ILK_DEVIR)) return { ok: false, hata: "marketKapali" };
    const fiyat = yenilemeFiyati(cekirdekBul(c.tanim_id).fiyat, tamam.has("asinmis"));
    const bakiye = d.bakiye(id);
    if (bakiye < fiyat) return { ok: false, hata: "yetersiz", eksik: fiyat - bakiye };
    // aynı ömür dönemi bir kez yenilenir (çift istek): ref maç sayısına bağlı
    if (!d.altinYaz(id, -fiyat, "yenile", `yenile:${id}:${cekirdekId}:${c.mac_sayisi}`, simdi)) return { ok: false, hata: "tam" };
    d.yapayYenile(id, cekirdekId, ILERLEME.yapayOmur);
    basarimOlayiIsle(d, id, { olay: { yapayYenileme: 1 } }, simdi);
    return { ok: true, omur: ILERLEME.yapayOmur, fiyat, bakiye: d.bakiye(id) };
  });
}

function gelistirmeIzinli(a: string | undefined): boolean {
  const yerel = a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
  return process.env.NODE_ENV !== "production" && yerel;
}

export function marketRotalariKur(app: Uygulama): void {
  app.get("/api/market", (q, r) => {
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    yaz(r, 200, marketGorunumu(d, id, Date.now()));
  });

  app.post("/api/market/satin-al", async (q, r) => {
    const g = await yazimGirisi(q, r, SatinSema);
    if (!g) return;
    const s = satinAl(g.d, g.id, g.b.parca, Date.now());
    if (!s.ok) {
      const kod = s.hata === "yok" ? 404 : s.hata === "yetersiz" ? 402 : s.hata === "kilitli" || s.hata === "marketKapali" ? 403 : 409;
      yaz(r, kod, s);
      return;
    }
    console.log(`[market] satın alma: oyuncu ${g.id} ${g.b.parca} −${s.fiyat} → ${s.bakiye}`);
    yaz(r, 201, { ...s, market: marketGorunumu(g.d, g.id, Date.now()) });
  });

  app.post("/api/market/yenile", async (q, r) => {
    const g = await yazimGirisi(q, r, YenileSema);
    if (!g) return;
    const s = yapayYenile(g.d, g.id, g.b.cekirdekId, Date.now());
    if (!s.ok) { yaz(r, s.hata === "yok" ? 404 : s.hata === "yetersiz" ? 402 : s.hata === "marketKapali" ? 403 : 409, s); return; }
    console.log(`[market] Yapay yenileme: oyuncu ${g.id} çekirdek ${g.b.cekirdekId} −${s.fiyat}`);
    yaz(r, 200, { ...s, market: marketGorunumu(g.d, g.id, Date.now()) });
  });

  app.get("/api/basarimlar", (q, r) => {
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    yaz(r, 200, basarimlarGorunumu(d, id));
  });

  app.get("/api/defter", (q, r) => {
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    yaz(r, 200, { bakiye: d.bakiye(id), satirlar: d.defter(id, 50) });
  });

  // ---- geliştirme (yalnız yerel, NODE_ENV != production): uçtan uca ekran görüntüsü için ----
  app.post("/api/gelistirme/altin-ver", async (q, r) => {
    if (!gelistirmeIzinli(q.socket.remoteAddress)) { yaz(r, 404, { hata: "yok" }); return; }
    const g = await yazimGirisi(q, r, AltinVerSema);
    if (!g) return;
    g.d.altinYaz(g.id, g.b.miktar, "gelistirme", `gelistirme:${randomUUID()}`, Date.now());
    console.log(`[gelistirme] altın: oyuncu ${g.id} ${g.b.miktar}`);
    yaz(r, 200, { ok: true, bakiye: g.d.bakiye(g.id) });
  });

  /** Harita akışı (yalnız geliştirme, yerel): cevher/külçe ver (`h:akis` hazırlığı; üretimde yok). */
  app.post("/api/gelistirme/cevher", async (q, r) => {
    if (!gelistirmeIzinli(q.socket.remoteAddress)) { yaz(r, 404, { hata: "yok" }); return; }
    const g = await yazimGirisi(q, r, CevherVerSema);
    if (!g) return;
    g.d.cevherEkle(g.id, g.b.kademe, g.b.cevher, g.b.kulce);
    console.log(`[gelistirme] cevher: oyuncu ${g.id} K${g.b.kademe} +${g.b.cevher}/${g.b.kulce}`);
    yaz(r, 200, { ok: true, ...g.d.cevherler(g.id) });
  });

  /** Sayaç doldurma (yalnız geliştirme): ilerlemeyi yazar; tamamlanırsa ödül normal yoldan (defter). */
  app.post("/api/gelistirme/basarim", async (q, r) => {
    if (!gelistirmeIzinli(q.socket.remoteAddress)) { yaz(r, 404, { hata: "yok" }); return; }
    const g = await yazimGirisi(q, r, BasarimVerSema);
    if (!g) return;
    const b = BASARIMLAR.find((x) => x.id === g.b.basarim);
    if (!b) { yaz(r, 400, { hata: "tanim" }); return; }
    const simdi = Date.now();
    const ilerleme = Math.min(b.sart.sayi, g.b.ilerleme);
    g.d.islem(() => {
      const tamam = g.d.basarimYaz(g.id, b.id, ilerleme, ilerleme >= b.sart.sayi, simdi);
      if (tamam && b.odulAltin > 0) g.d.altinYaz(g.id, b.odulAltin, "basarim", `basarim:${b.id}:${g.id}`, simdi);
    });
    console.log(`[gelistirme] başarım: oyuncu ${g.id} ${b.id} ${ilerleme}/${b.sart.sayi}`);
    yaz(r, 200, { ok: true, ilerleme, sayi: b.sart.sayi });
  });
}

