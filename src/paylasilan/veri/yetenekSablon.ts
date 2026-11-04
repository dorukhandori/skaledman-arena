import { AYAR } from "../kurallar/ayar.ts";
import { RUHLAR, YETENEKLER } from "./katalog.ts";
import type { Yetenek } from "./semalar.ts";

// Yetenek = davranış şablonu + sayı (nile B-32). veri/yetenekler.json'daki her yetenek `tur` ve etki alanlarına göre
// tek bir şablona düşer; sim (sim/yetenek.ts) yalnız bu tabloyu okur. Saf: aynı veri → aynı tablo, her ortamda.
// Süreler TAMSAYI ADIM (60 Hz). Sayılar veriden; kural sabitleri AYAR.yetenek'ten.

/**
 * Şablonlar: atilis (düz hat atılışı), kavis (kavisli atılış), zincir (yakındaki rakibe sıçrayan şimşek),
 * zirh (alınan itme/hasar azalır, sabit), kontra (karşı pencere), alan (zemin etkisi: sürtünme, ivme, erime, çekim,
 * yan kayma, alan hasarı, emiş), dalga (yönlü itiş şeridi), sok (çevresel itiş), cekim (çekim darbesi),
 * engel (geçici duvar), emis (temasta güçlü emiş), taklit (rakibin son yeteneğinin zayıf kopyası), takim (D8).
 */
export type Sablon = "atilis" | "kavis" | "zincir" | "zirh" | "kontra" | "alan" | "dalga" | "sok" | "cekim" | "engel" | "emis" | "taklit" | "takim";

/** Telegraf şekli (ux § 2.2 madde 3): daire = alan (nişan noktası), cevre = kullananın çevresi, serit = yönlü. */
export type TelegrafSekli = "serit" | "daire" | "cevre" | "kendi";

export interface YetenekSim {
  no: number;
  id: string;
  ad: string;
  kademe: number;
  element: Yetenek["element"];
  tur: Yetenek["tur"];
  sablon: Sablon;
  sekil: TelegrafSekli;
  /** Kaçılabilir (rakibi etkiler): telegraf alt sınırı 0,3 s uygulanır (axiom #35). */
  kacilabilir: boolean;
  /** Veri telegrafı (s); çalışma anında Kriz Alevi çarpanı ve alt sınır uygulanır. */
  telegrafSn: number;
  sureAdim: number;
  beklemeAdim: number;
  enerjiBedel: number;
  staminaYuzde: number;
  kilitAdim: number;
  kendiHiz: number;
  hizCarpani: number;
  itme: number;
  hasarKatsayisi: number;
  yaricap: number;
  atilisHizi: number;
  cekim: number;
  kbCarpani: number;
  hasarAlmaCarpani: number;
  surtunmeCarpani: number;
  ivmeCarpani: number;
  erimeCarpani: number;
  yanKaymaItme: number;
  alanHasarYuzdeSn: number;
  staminaEmisYuzdeSn: number;
  emisYuzde: number;
  zincirSayisi: number;
  zincirStaminaYuzde: number;
  engelSayisi: number;
  engelYaricap: number;
  engelDayanikliligi: number;
  karsiPencereAdim: number;
  kavisYaricap: number;
  kendineDeEtki: number;
  dalgaMenzil: number;
  kopyaZayiflama: number;
  /** Kara yetenek (Karanlık): Kararma +25. */
  kara: boolean;
  /** `bedel.ek` "havada darbe alma x1.3": kilit süresince alınan hasar çarpanı. */
  kilitHasarAlma: number;
  /** Kontra kaçırılırsa sersem (adım); yalnız kontra. */
  sersemAdim: number;
}

const adim = (s: number): number => Math.round(s * AYAR.adimHz);

function sayiAl(e: Record<string, unknown>, ...adlar: string[]): number {
  for (const a of adlar) { const v = e[a]; if (typeof v === "number" && Number.isFinite(v)) return v; }
  return 0;
}

/** Şablon kuralı (sıra önemli): veri alanlarından tek şablon. Eşleşmeyen yetenek hata verir (test bunu yakalar). */
export function sablonBul(y: Yetenek): Sablon {
  const e = y.etki as Record<string, unknown>;
  const n = (a: string) => sayiAl(e, a);
  if (y.kademe === 4) return "takim";
  if (n("kopyaZayiflama") > 0) return "taklit";
  if (y.tur === "savunma") return "zirh";
  if (y.tur === "sayac") return "kontra";
  if (n("engelSayisi") > 0) return "engel";
  if (n("zincirSayisi") > 0) return "zincir";
  if (y.tur === "alan" && n("dalgaMenzil") > 0) return "dalga";
  if (y.tur === "alan") return "alan";
  if (n("emisYuzde") > 0) return "emis";
  if (n("kavisYaricap") > 0) return "kavis";
  if (n("atilisHizi") > 0) return "atilis";
  if (n("cekim") > 0) return "cekim";
  if (y.etki.yaricap > 0 && y.etki.itme > 0) return "sok";
  throw new Error(`Yetenek şablonu bulunamadı: ${y.id}`);
}

const SEKIL: Record<Sablon, TelegrafSekli> = {
  atilis: "serit", kavis: "serit", dalga: "serit", alan: "daire", engel: "daire", taklit: "serit", takim: "daire",
  zincir: "cevre", sok: "cevre", cekim: "cevre", emis: "cevre", kontra: "cevre", zirh: "kendi",
};

function ekCarpan(ek: string | null): number {
  const m = ek ? /x\s*(\d+(?:[.,]\d+)?)/i.exec(ek) : null;
  return m ? Number(m[1]!.replace(",", ".")) : 1;
}

export function yetenekSimKur(y: Yetenek, no: number): YetenekSim {
  const e = y.etki as Record<string, unknown>;
  const n = (...a: string[]) => sayiAl(e, ...a);
  const sablon = sablonBul(y);
  const kacilabilir = (y.tur === "hucum" || y.tur === "alan") && sablon !== "zirh";
  return {
    no,
    id: y.id,
    ad: y.ad,
    kademe: y.kademe,
    element: y.element,
    tur: y.tur,
    sablon,
    sekil: SEKIL[sablon],
    kacilabilir,
    telegrafSn: y.telegrafSn,
    sureAdim: adim(y.sureSn),
    beklemeAdim: adim(y.beklemeSn),
    enerjiBedel: y.enerjiDilimi * AYAR.enerji.dilim,
    staminaYuzde: y.bedel.staminaYuzde,
    kilitAdim: sablon === "kontra" ? 0 : adim(y.bedel.kilitSn),
    kendiHiz: y.bedel.kendiHizCarpani,
    hizCarpani: y.etki.hizCarpani,
    itme: y.etki.itme,
    hasarKatsayisi: y.etki.hasarKatsayisi,
    yaricap: y.etki.yaricap,
    atilisHizi: n("atilisHizi"),
    cekim: n("cekim"),
    kbCarpani: e["kbCarpani"] === undefined ? 1 : n("kbCarpani"),
    hasarAlmaCarpani: e["hasarAlmaCarpani"] === undefined ? 1 : n("hasarAlmaCarpani"),
    surtunmeCarpani: e["surtunmeCarpani"] === undefined ? 1 : n("surtunmeCarpani"),
    ivmeCarpani: e["ivmeCarpani"] === undefined ? 1 : n("ivmeCarpani"),
    // veri yazımı "eremeCarpani" (Kor Çukuru): erime çarpanı olarak okunur (D3 raporu, varsayım)
    erimeCarpani: e["erimeCarpani"] === undefined && e["eremeCarpani"] === undefined ? 1 : n("erimeCarpani", "eremeCarpani"),
    yanKaymaItme: n("yanKaymaItme"),
    alanHasarYuzdeSn: n("alanHasarYuzdeSn"),
    staminaEmisYuzdeSn: n("staminaEmisYuzdeSn"),
    emisYuzde: n("emisYuzde"),
    zincirSayisi: n("zincirSayisi"),
    zincirStaminaYuzde: n("zincirStaminaYuzde"),
    engelSayisi: n("engelSayisi"),
    engelYaricap: n("engelYaricap") || y.etki.yaricap,
    engelDayanikliligi: n("engelDayanikliligi") || 1,
    karsiPencereAdim: adim(n("karsiPencereSn")),
    kavisYaricap: n("kavisYaricap"),
    kendineDeEtki: n("kendineDeEtki"),
    dalgaMenzil: n("dalgaMenzil"),
    kopyaZayiflama: n("kopyaZayiflama"),
    kara: y.element === "karanlik",
    kilitHasarAlma: ekCarpan(y.bedel.ek),
    sersemAdim: sablon === "kontra" ? adim(y.bedel.kilitSn || AYAR.yetenek.sersemSn) : 0,
  };
}

/** Dosya sırasıyla (deterministik): indeks = `no`. */
export const YETENEK_SIM: readonly YetenekSim[] = YETENEKLER.map((y, k) => yetenekSimKur(y, k));

export function yetenekNo(id: string): number {
  const k = YETENEK_SIM.findIndex((y) => y.id === id);
  if (k < 0) throw new Error(`Bilinmeyen yetenek: ${id}`);
  return k;
}

/**
 * Ruhun üç yuvası (yetenek numarası, −1 = yok): 1 Yetenek (kademe 1), 2 Özel Yetenek (kademe 2), 3 Ulti.
 * VARSAYIM: ruhun `yetenekAilesi` kademe 2 değilse (veride Çakmakçakal/Ata Şimşek → Zincir Kıvılcım, Yapay → Taklit
 * Sıçrayış) yuva 2, ruhun elementindeki ilk kademe-2 ilk sürüm yeteneğidir.
 */
export function ruhYuvalari(ruhId: string): [number, number, number] {
  const r = RUHLAR.find((x) => x.id === ruhId);
  if (!r) throw new Error(`Bilinmeyen ruh: ${ruhId}`);
  const y1 = yetenekNo(r.yetenek);
  let y2 = yetenekNo(r.yetenekAilesi);
  if (YETENEK_SIM[y2]!.kademe !== 2) {
    const yedek = YETENEK_SIM.find((y) => y.kademe === 2 && y.element === r.element && YETENEKLER[y.no]!.ilkSurum);
    y2 = yedek ? yedek.no : -1;
  }
  const y3 = r.ulti ? yetenekNo(r.ulti) : -1;
  return [y1, y2, y3];
}
