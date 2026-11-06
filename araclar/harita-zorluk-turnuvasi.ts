// H-H4 (docs/design/harita/06 § 5): harita düğüm zorluğu bot turnuvası. Oyuncunun yerine `kenar` kademe bot +
// başlangıç takımı oynar. İki vekil takım:
//   hazir (varsayılan, kapı): `BASLANGIC_TAKIMLARI` (takim-1..3, oyuncu seviyesi Lv.3; çevrimdışı/hızlı maçın hazır takımları)
//   yeni  (bilgi): yeni hesabın gerçek takımı (yuva 0 seçilen başlangıç seti Lv.2, yuva 1-2 ödünç Lv.1; sunucu `oduncDoldur`)
// Üç takım/set maçlar arasında dönüşümlü. Düşman tarafı sunucunun harita odasıyla aynı kurulur (`haritaBotTakimi` + düğümün `botKip`'i). Maç sunucunun
// `MacYonetimi`'nde koşar (bot: [true, true]); sim değişmez. Tohumlar deterministik.
//
// Çalıştır:
//   npm run harita:zorluk -- [--n=200] [--tohum=1] [--bolge=1,2] [--json=docs/production/raporlar/HARITA-DENGE-zorluk.json]
//     [--vekil=hazir|yeni] [--is=6]   (paralel alt süreç sayısı; bölge başına bir süreç)
// Çıktı: düğüm başına oyuncu (vekil bot) kazanma %, bitiş dağılımı, maç süresi; bölge ortalaması; bant karşılaştırması.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MacYonetimi } from "../src/sunucu/mac/MacYonetimi.ts";
import { haritaBotTakimi } from "../src/sunucu/oyuncu/harita.ts";
import { oduncDoldur } from "../src/sunucu/oyuncu/kurallar.ts";
import { HARITA, type DovusDugumu } from "../src/paylasilan/veri/harita.ts";
import { BASLANGIC_SETLERI } from "../src/paylasilan/veri/katalog.ts";
import { BASLANGIC_TAKIMLARI, takimKoduYaz } from "../src/paylasilan/veri/takimlar.ts";

/** 06 § 5 H-H4 kabul bandı (oyuncu kazanımı) ve 01 § 3.1 zorluk başına insan hedefi (bilgi). */
export const BANT = { dusman: [0.55, 0.8], patron: [0.4, 0.6] } as const;
export const ZORLUK_HEDEF: Record<number, [number, number]> = { 1: [0.85, 1], 2: [0.7, 0.8], 3: [0.6, 0.7], 4: [0.5, 0.6], 5: [0.4, 0.55] };
const VEKIL_KIP = "kenar" as const;
const AZAMI_ADIM = 200 * 60;

export interface DugumSonucu {
  id: string; bolge: number; tur: "dusman" | "patron"; zorluk: number; botKip: string; botSeviye: number;
  n: number; oyuncuKazanma: number; puanFarki: number; sureMedyan: number;
  bitis: { durma: number; ringOut: number; parcalanma: number; berabere: number; toplam: number };
  setBasina: Record<string, number>;
}

export type Vekil = "hazir" | "yeni";
const VEKIL_ADLARI: Record<Vekil, readonly string[]> = { hazir: BASLANGIC_TAKIMLARI.map((t) => t.id), yeni: BASLANGIC_SETLERI.map((s) => s.id) };

/** Vekil takım kodu/kimliği. hazir: başlangıç takımı kimliği (MacYonetimi oyuncu seviyesi Lv.3). yeni: yeni hesap. */
export function vekilTakimi(v: Vekil, no: number): string {
  if (v === "hazir") return BASLANGIC_TAKIMLARI[no]!.id;
  const s = BASLANGIC_SETLERI[no]!;
  return takimKoduYaz(oduncDoldur([{ cekirdek: s.cekirdek, govde: s.govde, disk: s.disk, uc: s.uc, seviye: s.cekirdekSeviyesi, yon: "sag" }, null, null]));
}

function dugumTohumu(id: string, taban: number): number {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) * 1000 + taban;
}

export function dugumTurnuvasi(d: DovusDugumu, bolge: number, n: number, taban: number, vekil: Vekil = "hazir"): DugumSonucu {
  const adlar = VEKIL_ADLARI[vekil];
  const bot = haritaBotTakimi(d);
  const t0 = dugumTohumu(d.id, taban);
  const bitis = { durma: 0, ringOut: 0, parcalanma: 0, berabere: 0, toplam: 0 };
  const setKaz: number[] = adlar.map(() => 0);
  const setN: number[] = adlar.map(() => 0);
  const sureler: number[] = [];
  let kaz = 0;
  let puanFarki = 0;
  for (let k = 0; k < n; k++) {
    const setNo = k % adlar.length;
    const y = new MacYonetimi({ takimlar: [vekilTakimi(vekil, setNo), bot], tohum: t0 + k, bot: [true, true], botKipleri: [VEKIL_KIP, d.botKip] });
    let a = 0;
    while (!y.bitti && a++ < AZAMI_ADIM) {
      const s = y.adimla([null, null]);
      for (const o of s.olaylar) if (o.tur === "turBitti") { bitis[o.sonuc.tur]++; bitis.toplam++; }
      if (y.kayit.girdiler.length > 600) y.kayit.girdiler.length = 0; // bellek: kayıt gerekmez
    }
    const m = y.dunya.mac.macSonucu;
    if (!m) throw new Error(`${d.id} maç ${k} bitmedi`);
    setN[setNo]!++;
    if (m.kazanan === 0) { kaz++; setKaz[setNo]!++; }
    puanFarki += m.puan[0] - m.puan[1];
    sureler.push(m.tick / 60);
  }
  sureler.sort((x, z) => x - z);
  return {
    id: d.id, bolge, tur: d.tur, zorluk: d.zorluk, botKip: d.botKip, botSeviye: d.botSeviye, n, oyuncuKazanma: kaz / n,
    puanFarki: puanFarki / n, sureMedyan: sureler[Math.floor(sureler.length / 2)]!, bitis,
    setBasina: Object.fromEntries(adlar.map((s, i) => [s, setKaz[i]! / Math.max(1, setN[i]!)])),
  };
}

export function bolgeTurnuvasi(no: number, n: number, taban: number, vekil: Vekil = "hazir"): DugumSonucu[] {
  const b = HARITA.bolgeler.find((x) => x.no === no);
  if (!b) throw new Error(`bölge ${no} yok`);
  const r: DugumSonucu[] = [];
  for (const d of b.dugumler) if (d.tur === "dusman" || d.tur === "patron") r.push(dugumTurnuvasi(d, no, n, taban, vekil));
  return r;
}

const yuzde = (x: number) => `${(100 * x).toFixed(1).padStart(5)}%`;

export function degerlendir(r: readonly DugumSonucu[]) {
  const bolgeler = [...new Set(r.map((x) => x.bolge))].sort();
  return bolgeler.map((no) => {
    const b = HARITA.bolgeler.find((x) => x.no === no)!;
    const dus = r.filter((x) => x.bolge === no && x.tur === "dusman");
    const pat = r.filter((x) => x.bolge === no && x.tur === "patron");
    const dusOrt = dus.reduce((s, x) => s + x.oyuncuKazanma, 0) / Math.max(1, dus.length);
    const patOrt = pat.reduce((s, x) => s + x.oyuncuKazanma, 0) / Math.max(1, pat.length);
    return {
      bolge: no, ad: b.ad, ilkSurum: b.ilkSurum, dusmanOrt: dusOrt, patron: patOrt,
      dusmanBantta: dusOrt >= BANT.dusman[0] && dusOrt <= BANT.dusman[1],
      patronBantta: patOrt >= BANT.patron[0] && patOrt <= BANT.patron[1],
    };
  });
}

function yazdir(r: readonly DugumSonucu[]): void {
  console.log("düğüm  tür     z kip           Lv  n    oyuncu%  z-hedef     Durma  RO    Parç  süre med");
  for (const x of r) {
    const h = ZORLUK_HEDEF[x.zorluk]!;
    const tamam = x.oyuncuKazanma >= h[0] && x.oyuncuKazanma <= h[1] ? " " : "*";
    const b = x.bitis;
    const p = (v: number) => `${((100 * v) / Math.max(1, b.toplam)).toFixed(0).padStart(3)}%`;
    console.log(`${x.id}  ${x.tur.padEnd(6)}  ${x.zorluk} ${x.botKip.padEnd(13)} ${x.botSeviye}  ${String(x.n).padEnd(4)} ${yuzde(x.oyuncuKazanma)}${tamam} ${(`${Math.round(h[0] * 100)}-${Math.round(h[1] * 100)}`).padEnd(10)}  ${p(b.durma)}  ${p(b.ringOut)}  ${p(b.parcalanma)}  ${x.sureMedyan.toFixed(0)} s`);
  }
  console.log("\nbölge                 ilk  düşman ort (55-80)   patron (40-60)");
  for (const g of degerlendir(r)) {
    console.log(`${String(g.bolge)} ${g.ad.padEnd(18)} ${g.ilkSurum ? "E" : "H"}    ${yuzde(g.dusmanOrt)} ${g.dusmanBantta ? "TUTUYOR " : "TUTMUYOR"}   ${yuzde(g.patron)} ${g.patronBantta ? "TUTUYOR" : "TUTMUYOR"}`);
  }
}

const arg = (ad: string): string | undefined => process.argv.find((a) => a.startsWith(`--${ad}=`))?.split("=")[1];

async function ana(): Promise<void> {
  const n = Number(arg("n") ?? 200);
  const taban = Number(arg("tohum") ?? 1);
  const bolgeler = (arg("bolge") ?? HARITA.bolgeler.map((b) => b.no).join(",")).split(",").map(Number);
  const is = Number(arg("is") ?? 1);
  const json = arg("json");
  const vekil: Vekil = arg("vekil") === "yeni" ? "yeni" : "hazir";
  const bas = Date.now();
  let sonuc: DugumSonucu[] = [];
  if (is > 1 && bolgeler.length > 1) {
    // bölge başına alt süreç (CPU çekirdekleri); sonuçlar geçici JSON'dan birleşir
    const kuyruk = [...bolgeler];
    const calistir = (no: number) => new Promise<DugumSonucu[]>((coz, red) => {
      const gecici = `${process.env["TMPDIR"] ?? "/tmp"}/harita-zorluk-${process.pid}-${no}.json`;
      import("node:child_process").then(({ spawn }) => {
        const c = spawn(process.execPath, [...process.execArgv, process.argv[1]!, `--n=${n}`, `--tohum=${taban}`, `--bolge=${no}`, `--vekil=${vekil}`, `--json=${gecici}`, "--sessiz=1"], { stdio: "inherit" });
        c.on("exit", (kod) => (kod === 0 ? coz(JSON.parse(readFileSync(gecici, "utf8")).dugumler as DugumSonucu[]) : red(new Error(`bölge ${no} çıkış ${kod}`))));
      }, red);
    });
    const sonuclar: DugumSonucu[][] = [];
    await Promise.all(Array.from({ length: Math.min(is, kuyruk.length) }, async () => {
      for (let no = kuyruk.shift(); no !== undefined; no = kuyruk.shift()) sonuclar.push(await calistir(no));
    }));
    sonuc = sonuclar.flat().sort((a, b) => a.id.localeCompare(b.id));
  } else {
    for (const no of bolgeler) {
      sonuc.push(...bolgeTurnuvasi(no, n, taban, vekil));
      if (!arg("sessiz")) console.error(`bölge ${no} bitti (${((Date.now() - bas) / 1000).toFixed(0)} s)`);
    }
  }
  if (!arg("sessiz")) {
    console.log(`# H-H4 harita zorluk turnuvası · n=${n}/düğüm · tohum tabanı ${taban} · vekil: ${VEKIL_KIP} + ${vekil === "hazir" ? "BASLANGIC_TAKIMLARI (Lv.3)" : "yeni hesap takımı (Lv.2 + 2 ödünç Lv.1)"} · ${((Date.now() - bas) / 1000).toFixed(0)} s`);
    yazdir(sonuc);
  }
  if (json) writeFileSync(json, JSON.stringify({ n, tohumTabani: taban, vekilKip: VEKIL_KIP, vekilTakim: vekil, bant: BANT, zorlukHedef: ZORLUK_HEDEF, bolgeler: degerlendir(sonuc), dugumler: sonuc }, null, 1));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) void ana();
