// Denge turnuvası çekirdeği: bot - bot maçı, geçersiz kılma (override) yamaları, istatistik toplama.
// Sunucusuz çalışır (src/paylasilan/sim + Bot). Kural dosyalarına YAZILMAZ: yamalar çalışma anında
// AYAR / AILE_VARSAYILAN nesnelerine uygulanır ve geri alınır (src/ ana oturumda ayrı işlenir).
// Sahibi: economy-designer (@ledger). Kullanım: araclar/denge/turnuva.ts
import { readFileSync } from "node:fs";
import { fusionKayitlari, type FusionKaydi } from "../../src/paylasilan/kart.ts";
import { profilKur, type DovuscuProfili } from "../../src/paylasilan/dovuscu.ts";
import { AYAR } from "../../src/paylasilan/kurallar/ayar.ts";
import { BOT_PROFILLERI } from "../../src/paylasilan/kurallar/botlar.ts";
import { AGIR_BANT, AILE_VARSAYILAN, GUC_BANDI, type Aile, type AileKurali } from "../../src/paylasilan/kurallar/hamleler.ts";
import { adim, dunyaKur } from "../../src/paylasilan/sim/Dunya.ts";
import { type Arena, varsayilanArena } from "../../src/paylasilan/sim/Arena.ts";
import { Bot } from "../../src/istemci/oyun/Bot.ts";

const KOK = new URL("../../", import.meta.url);
const oku = (yol: string): unknown => JSON.parse(readFileSync(new URL(yol, KOK), "utf8"));

export const TUM_KAYITLAR: FusionKaydi[] = fusionKayitlari(oku("veri/gecmis.json"), oku("veri/kartlar.json"));

/** Lab listesi (public/fusion/liste.json) sırasıyla ilk `n` fusionId; her id için ilk açılış kaydı. */
export function labKartlari(n: number): FusionKaydi[] {
  const liste = oku("public/fusion/liste.json") as { fusionId: string }[];
  const sonuc: FusionKaydi[] = [];
  for (const { fusionId } of liste) {
    const k = TUM_KAYITLAR.find((x) => x.acilis.fusionId === fusionId);
    if (k) sonuc.push(k);
    if (sonuc.length >= n) break;
  }
  return sonuc;
}

/** Tüm albüm: fusionId başına tek kayıt (shiny/yinelenen açılışlar aynı karttır). */
export function albumKartlari(): FusionKaydi[] {
  const goruldu = new Set<string>();
  return TUM_KAYITLAR.filter((k) => (goruldu.has(k.acilis.fusionId) ? false : (goruldu.add(k.acilis.fusionId), true)));
}

/** Geçersiz kılma yaması. Tanımsız alan = değişiklik yok. */
export interface Yama {
  ad: string;
  hasarCarpani?: number;
  /** maxHp bu çarpanla ölçeklenir (profil üstünde) */
  hpOlcek?: number;
  hitKeser?: boolean;
  /** durumSansi olasılıkları bu çarpanla; 0 = Ateş/Elektrik durumu kapalı */
  durumCarpani?: number;
  stab?: number;
  /** aile varsayılanlarına üstüne yazılır (profil kurulmadan önce) */
  aile?: Partial<Record<Aile, Partial<AileKurali>>>;
  /** yuva 3 temel vuruş gücü yerine (TEMEL_POKE const; yalnız dokümante, bkz. gucBiciligi) */
  hizCarpani?: number;
  /** dash bekleme (s) */
  dashBekleme?: number;
  /**
   * Base stat sıkıştırma: taban' = ort + (taban - ort)·k (altı stat da, ort = albüm ortalaması).
   * 1 = değişiklik yok, 0 = herkes ortalama kart.
   */
  statSikistirma?: number;
  /** true: F0'ın ilk iki duvarlı arenası (karşılaştırma için); varsayılan = AYAR.saha (İskeletler Diyarı) */
  eskiArena?: boolean;
  /** AYAR'a derin birleştirilen serbest yama, ör. { telegraf: { uzun: 0.3 }, knockback: 30 } */
  ayar?: Record<string, unknown>;
  /** AGIR_BANT (>= 130) ve GUC_BANDI üstüne yazılır */
  agirBant?: Partial<typeof AGIR_BANT>;
  /** Profil kurulduktan sonra çalışan kanca (hamle başına cooldown vb. kural değişikliklerini simüle eder) */
  profil?: (p: DovuscuProfili) => void;
  gucBandi?: Partial<typeof GUC_BANDI>;
}

/** F0'ın ilk arenası (2026-11-01 öğleden önce): doğum hattını kesen dikey duvar + alt yarıda yatay duvar. */
export function eskiArena(): Arena {
  const a = varsayilanArena();
  return { ...a, id: "iki-duvar", ad: "Eski iki duvarlı", engeller: [
    { tur: "dikdortgen", x: 0, z: 130, yariGenislik: 14, yariDerinlik: 44 },
    { tur: "dikdortgen", x: 0, z: 340, yariGenislik: 44, yariDerinlik: 14 },
  ] };
}

function derinAta(hedef: any, kaynak: any): void {
  for (const k of Object.keys(kaynak)) {
    const v = kaynak[k];
    if (v && typeof v === "object" && !Array.isArray(v) && hedef[k] && typeof hedef[k] === "object") derinAta(hedef[k], v);
    else hedef[k] = Array.isArray(v) ? structuredClone(v) : v;
  }
}

/** Albümdeki benzersiz fusionId'ler üstünden stat ortalamaları (sıkıştırma merkezi). */
export function albumStatOrtalamasi(): Record<string, number> {
  const kartlar = albumKartlari();
  const sonuc: Record<string, number> = {};
  for (const ad of ["hp", "atk", "def", "spa", "spd", "spe"] as const) {
    sonuc[ad] = kartlar.reduce((t, k) => t + k.kart.stats[ad], 0) / kartlar.length;
  }
  return sonuc;
}

type Yazilabilir<T> = { -readonly [K in keyof T]: T[K] };

/** Yamayı uygular, geri alma fonksiyonu döner. */
export function yamaUygula(y: Yama): () => void {
  const a = AYAR as unknown as Yazilabilir<Record<string, any>>;
  const yedek = {
    hasarCarpani: a.hasarCarpani, hitKeser: a.hitKeser, stab: a.stab, dash: { ...a.dash },
    hiz: { ...a.hiz }, durumSansi: JSON.parse(JSON.stringify(a.durumSansi)),
    aile: JSON.parse(JSON.stringify(AILE_VARSAYILAN)),
    tum: structuredClone(AYAR), agir: { ...AGIR_BANT }, bant: { ...GUC_BANDI },
  };
  if (y.hasarCarpani !== undefined) a.hasarCarpani = y.hasarCarpani;
  if (y.hitKeser !== undefined) a.hitKeser = y.hitKeser;
  if (y.stab !== undefined) a.stab = y.stab;
  if (y.dashBekleme !== undefined) a.dash.bekleme = y.dashBekleme;
  if (y.hizCarpani !== undefined) a.hiz.taban = yedek.hiz.taban * y.hizCarpani;
  if (y.durumCarpani !== undefined) {
    for (const k of Object.keys(a.durumSansi)) a.durumSansi[k].olasilik = yedek.durumSansi[k].olasilik * y.durumCarpani;
  }
  if (y.aile) {
    for (const [ad, deger] of Object.entries(y.aile)) Object.assign(AILE_VARSAYILAN[ad as Aile], deger);
  }
  if (y.ayar) derinAta(AYAR, y.ayar);
  if (y.agirBant) Object.assign(AGIR_BANT, y.agirBant);
  if (y.gucBandi) Object.assign(GUC_BANDI, y.gucBandi);
  return () => {
    derinAta(AYAR, yedek.tum); Object.assign(AGIR_BANT, yedek.agir); Object.assign(GUC_BANDI, yedek.bant);
    a.hasarCarpani = yedek.hasarCarpani; a.hitKeser = yedek.hitKeser; a.stab = yedek.stab;
    Object.assign(a.dash, yedek.dash); Object.assign(a.hiz, yedek.hiz);
    for (const k of Object.keys(yedek.durumSansi)) a.durumSansi[k].olasilik = yedek.durumSansi[k].olasilik;
    for (const ad of Object.keys(yedek.aile)) Object.assign(AILE_VARSAYILAN[ad as Aile], yedek.aile[ad]);
  };
}

/** Yama aktifken profilleri kurar (hpOlcek burada uygulanır). */
export function profilleriKur(kayitlar: readonly FusionKaydi[], y: Yama): DovuscuProfili[] {
  const ort = y.statSikistirma !== undefined && y.statSikistirma !== 1 ? albumStatOrtalamasi() : null;
  return kayitlar.map((k0) => {
    let k = k0;
    if (ort && y.statSikistirma !== undefined) {
      const kk = y.statSikistirma;
      const st = { ...k0.kart.stats };
      for (const ad of Object.keys(st) as (keyof typeof st)[]) st[ad] = Math.max(1, Math.round(ort[ad]! + (st[ad] - ort[ad]!) * kk));
      k = { ...k0, kart: { ...k0.kart, stats: st } };
    }
    const p = profilKur(k);
    if (y.hpOlcek !== undefined && y.hpOlcek !== 1) p.maxHp = Math.max(1, Math.round(p.maxHp * y.hpOlcek));
    y.profil?.(p);
    return p;
  });
}

export interface MacSonucu {
  /** 0 = ilk parametre (a), 1 = ikinci (b), null = berabere */
  kazanan: 0 | 1 | null;
  neden: "ko" | "sure";
  sure: number;
  /** a, b için son HP oranı */
  hpOran: [number, number];
  /** a, b için yuva başına toplam hasar ve vuruş sayısı (yuva 0..3; yanık hasarı -1 yuvası dışarıda) */
  hasarYuva: [number[], number[]];
  vurusYuva: [number[], number[]];
  /** yuva başına başlatılan hamle (telegraf başı) */
  baslaYuva: [number[], number[]];
  yanikHasar: [number, number];
  dash: [number, number];
  iptal: [number, number];
}

const ENFAZLA_ADIM = 60 * 100;

/**
 * a, b profilleriyle bir maç. `aSol` true: a doğum noktası 0'da (sol), false: 1'de.
 * Tohum botları ve durum rastgeleliğini belirler.
 */
export function macOyna(a: DovuscuProfili, b: DovuscuProfili, aSol: boolean, tohum: number, hasarCarpani: number = AYAR.hasarCarpani, arena?: Arena): MacSonucu {
  const profiller = aSol ? [a, b] : [b, a];
  const d = dunyaKur(profiller, tohum, arena, hasarCarpani);
  const bot = [new Bot(BOT_PROFILLERI.normal, 0, tohum), new Bot(BOT_PROFILLERI.normal, 1, tohum + 1)];
  const ai = aSol ? 0 : 1;
  const hasarYuva: [number[], number[]] = [[0, 0, 0, 0], [0, 0, 0, 0]];
  const vurusYuva: [number[], number[]] = [[0, 0, 0, 0], [0, 0, 0, 0]];
  const baslaYuva: [number[], number[]] = [[0, 0, 0, 0], [0, 0, 0, 0]];
  const yanikHasar: [number, number] = [0, 0];
  const dash: [number, number] = [0, 0];
  const iptal: [number, number] = [0, 0];
  const kim = (i: number): 0 | 1 => (i === ai ? 0 : 1);
  let n = 0;
  while (!d.sonuc && n < ENFAZLA_ADIM) {
    adim(d, [bot[0]!.girdiUret(d, AYAR.dt), bot[1]!.girdiUret(d, AYAR.dt)], AYAR.dt);
    n++;
    for (const o of d.olaylar) {
      if (o.tur === "vurdu") {
        if (o.yuva >= 0) { hasarYuva[kim(o.kimden)]![o.yuva]! += o.hasar; vurusYuva[kim(o.kimden)]![o.yuva]!++; }
        else yanikHasar[kim(o.kime)] += o.hasar;
      } else if (o.tur === "hamleBasladi") baslaYuva[kim(o.kim)]![o.yuva]!++;
      else if (o.tur === "dash") dash[kim(o.kim)]++;
      else if (o.tur === "hamleIptal") iptal[kim(o.kim)]++;
    }
  }
  const s = d.sonuc;
  const oran = (i: number): number => d.dovusculer[i]!.hp / d.dovusculer[i]!.maxHp;
  let kazanan: 0 | 1 | null = null;
  if (s && s.kazanan !== null) kazanan = kim(s.kazanan);
  return {
    kazanan, neden: s?.neden === "ko" ? "ko" : "sure", sure: n * AYAR.dt,
    hpOran: [oran(ai), oran(1 - ai)], hasarYuva, vurusYuva, baslaYuva, yanikHasar, dash, iptal,
  };
}

export interface KartOzeti {
  fusionId: string;
  ad: string;
  /** galibiyet + 0,5·beraberlik */
  puan: number;
  mac: number;
  koGalibiyet: number;
  sureGalibiyet: number;
  beraberlik: number;
  /** soldan / sağdan başlarken galibiyet oranı, taraf yanlılığı için */
  solPuan: number; solMac: number;
  hasarYuva: number[];
  vurusYuva: number[];
  baslaYuva: number[];
  yanik: number;
}

export interface TurnuvaSonucu {
  yama: string;
  arena: string;
  n: number;
  kartlar: KartOzeti[];
  sureler: number[];
  koPay: number;
  /** a'nın b'ye karşı puan oranı matrisi [i][j] */
  matris: number[][];
  toplamMac: number;
  solPay: number;
}

/** Çift başına `n` maç: yarısı a solda, yarısı a sağda; tohumlar çiftten ve sıradan türer. */
export function turnuva(kayitlar: readonly FusionKaydi[], y: Yama, n: number, tohumTabani = 1000): TurnuvaSonucu {
  const geri = yamaUygula(y);
  try {
    const profiller = profilleriKur(kayitlar, y);
    const hc = y.hasarCarpani ?? AYAR.hasarCarpani;
    const arena = y.eskiArena ? eskiArena() : varsayilanArena();
    const K = kayitlar.length;
    const kart: KartOzeti[] = kayitlar.map((k) => ({
      fusionId: k.acilis.fusionId, ad: k.acilis.name, puan: 0, mac: 0, koGalibiyet: 0, sureGalibiyet: 0, beraberlik: 0,
      solPuan: 0, solMac: 0, hasarYuva: [0, 0, 0, 0], vurusYuva: [0, 0, 0, 0], baslaYuva: [0, 0, 0, 0], yanik: 0,
    }));
    const puanM = Array.from({ length: K }, () => new Array<number>(K).fill(0));
    const macM = Array.from({ length: K }, () => new Array<number>(K).fill(0));
    const sureler: number[] = [];
    let ko = 0, toplam = 0, solKazanan = 0, kararli = 0;
    for (let i = 0; i < K; i++) for (let j = i + 1; j < K; j++) {
      for (let m = 0; m < n; m++) {
        const aSol = m % 2 === 0;
        const tohum = tohumTabani + (i * K + j) * 997 + m * 31;
        const r = macOyna(profiller[i]!, profiller[j]!, aSol, tohum, hc, arena);
        toplam++;
        sureler.push(r.sure);
        if (r.neden === "ko") ko++;
        const pa = r.kazanan === 0 ? 1 : r.kazanan === 1 ? 0 : 0.5;
        if (r.kazanan !== null) { kararli++; if ((r.kazanan === 0) === aSol) solKazanan++; }
        const ka = kart[i]!, kb = kart[j]!;
        ka.puan += pa; kb.puan += 1 - pa; ka.mac++; kb.mac++;
        puanM[i]![j]! += pa; puanM[j]![i]! += 1 - pa; macM[i]![j]!++; macM[j]![i]!++;
        if (aSol) { ka.solPuan += pa; ka.solMac++; } else { kb.solPuan += 1 - pa; kb.solMac++; }
        if (r.kazanan === null) { ka.beraberlik++; kb.beraberlik++; }
        else {
          const w = r.kazanan === 0 ? ka : kb;
          if (r.neden === "ko") w.koGalibiyet++; else w.sureGalibiyet++;
        }
        for (let s = 0; s < 4; s++) {
          ka.hasarYuva[s]! += r.hasarYuva[0][s]!; ka.vurusYuva[s]! += r.vurusYuva[0][s]!;
          kb.hasarYuva[s]! += r.hasarYuva[1][s]!; kb.vurusYuva[s]! += r.vurusYuva[1][s]!;
          ka.baslaYuva[s]! += r.baslaYuva[0][s]!; kb.baslaYuva[s]! += r.baslaYuva[1][s]!;
        }
        ka.yanik += r.yanikHasar[0]; kb.yanik += r.yanikHasar[1];
      }
    }
    const matris = puanM.map((satir, i) => satir.map((v, j) => (macM[i]![j]! > 0 ? v / macM[i]![j]! : 0.5)));
    return { yama: y.ad, arena: arena.id, n, kartlar: kart, sureler, koPay: ko / toplam, matris, toplamMac: toplam, solPay: kararli ? solKazanan / kararli : 0.5 };
  } finally {
    geri();
  }
}

export function medyan(v: readonly number[]): number {
  const s = [...v].sort((x, y) => x - y);
  return s.length === 0 ? 0 : s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
}
export function yuzdelik(v: readonly number[], p: number): number {
  const s = [...v].sort((x, y) => x - y);
  return s.length === 0 ? 0 : s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
}
