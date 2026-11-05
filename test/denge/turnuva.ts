import { botGirdisi, botKademesiSec, type BotKipi } from "../../src/paylasilan/bot/bot.ts";
import { AYAR } from "../../src/paylasilan/kurallar/ayar.ts";
import { adim, dunyaKur, macDunyasiKur, type TakimProfilleri } from "../../src/paylasilan/sim/Dunya.ts";
import type { Dunya, MacSonucu, TurSonucu } from "../../src/paylasilan/sim/durum.ts";
import { rastgele, rastgeleTamsayi } from "../../src/paylasilan/sim/rastgele.ts";
import { CEKIRDEKLER, DISKLER, GOVDELER, UCLAR } from "../../src/paylasilan/veri/katalog.ts";
import { type TopacProfili, topacProfiliKur } from "../../src/paylasilan/veri/profil.ts";

// Bot turnuvası kütüphanesi (tuning § 20 H1-H5). Saf ve tohumlu: aynı ayar → aynı tablo. CLI: botTurnuvasi.ts,
// duman testi: test/denge.test.ts. Sim'in kendisi değişmez; deney ayarları `ayarUygula` ile çalışma anında yamanır.

export interface ParcaSecimi { cekirdek: string; govde: string; disk: string; uc: string }

/** tuning § 13 referans build'leri. */
export const REFERANS: Record<"S" | "K" | "D" | "B", ParcaSecimi> = {
  S: { cekirdek: "kor-goktasi", govde: "ok-govde", disk: "hafif-disk", uc: "duz-uc" },
  K: { cekirdek: "kaya-maden", govde: "kalkan-govde", disk: "agir-disk", uc: "igne-uc" },
  D: { cekirdek: "girdap-maden", govde: "halka-govde", disk: "parlak-disk", uc: "top-uc" },
  B: { cekirdek: "kasirga-yapay", govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc" },
};

/** Deney ayarları (tuning § 20 hipotez aralıkları). Boş alan = ayar.ts / veri değeri. */
export interface DeneyAyari {
  vRO?: number;
  kEgim?: number;
  kH?: number;
  tikTavan?: number;
  iyilesme?: number;
  duvarOlayHizi?: number;
}

type Yazilabilir = { kEgim: number; kH: number; tikTavan: number; duvarOlayHizi: number; mac: { kazananIyilesme: number } };
const VARSAYILAN = { kEgim: AYAR.kEgim, kH: AYAR.kH, tikTavan: AYAR.tikTavan, iyilesme: AYAR.mac.kazananIyilesme, duvarOlayHizi: AYAR.duvarOlayHizi };

/** AYAR'ı çalışma anında yamar (yalnız deney betiği; oyun kodu bunu çağırmaz). */
export function ayarUygula(a: DeneyAyari): void {
  const y = AYAR as unknown as Yazilabilir;
  y.kEgim = a.kEgim ?? VARSAYILAN.kEgim;
  y.kH = a.kH ?? VARSAYILAN.kH;
  y.tikTavan = a.tikTavan ?? VARSAYILAN.tikTavan;
  y.duvarOlayHizi = a.duvarOlayHizi ?? VARSAYILAN.duvarOlayHizi;
  y.mac.kazananIyilesme = a.iyilesme ?? VARSAYILAN.iyilesme;
}

export function profil(s: ParcaSecimi, a: DeneyAyari): TopacProfili {
  const p = topacProfiliKur(s.cekirdek, s.govde, s.disk, s.uc);
  if (a.vRO !== undefined) p.sim.ringOutHizi = a.vRO;
  return p;
}

export const kipSec = (p: TopacProfili): BotKipi => botKademesiSec(p.tip);

export interface TurKaydi { tur: TurSonucu["tur"] | "sure"; kazanan: number; sureSn: number }

/** Tek tur düellosu (tekTur kipi), üst sınır `sinirSn`. */
export function duello(a: TopacProfili, b: TopacProfili, tohum: number, sinirSn = 90): TurKaydi {
  const d = dunyaKur([a, b], tohum);
  const kip: [BotKipi, BotKipi] = [kipSec(a), kipSec(b)];
  const sinir = sinirSn * AYAR.adimHz;
  for (let t = 0; t < sinir; t++) {
    adim(d, [botGirdisi(d, 0, kip[0], tohum * 31 + 1), botGirdisi(d, 1, kip[1], tohum * 31 + 2)]);
    const s = d.mac.sonuc;
    if (s) return { tur: s.tur, kazanan: s.kazanan, sureSn: d.tick / AYAR.adimHz };
  }
  return { tur: "sure", kazanan: -1, sureSn: sinirSn };
}

export interface MacKaydi { sonuc: MacSonucu; sureSn: number; turlar: TurKaydi[]; geriCek: number; degisim: number; adim: number; yetenek: [number, number, number, number] }

/** Tam maç (bot karşı bot); `kipler` verilmezse her topaç kendi tipine göre kademe kullanır. */
export function tamMac(t0: TakimProfilleri, t1: TakimProfilleri, tohum: number, kipler?: [BotKipi, BotKipi]): MacKaydi {
  const d: Dunya = macDunyasiKur([t0, t1], tohum);
  const turlar: TurKaydi[] = [];
  let turBasi = 0;
  let geriCek = 0;
  let degisim = 0;
  const yetenek: [number, number, number, number] = [0, 0, 0, 0];
  const azami = 200 * AYAR.adimHz; // güvenlik: sonsuz maç yok (mutlak sınır 120 s + geri sayım)
  for (let n = 0; n < azami; n++) {
    const k0 = kipler?.[0] ?? kipSec(d.profiller[0]);
    const k1 = kipler?.[1] ?? kipSec(d.profiller[1]);
    adim(d, [botGirdisi(d, 0, k0, tohum * 17 + 3), botGirdisi(d, 1, k1, tohum * 17 + 4)]);
    for (const o of d.olaylar) {
      if (o.tur === "turBasladi") turBasi = d.mac.saat;
      else if (o.tur === "turBitti") turlar.push({ tur: o.sonuc.tur, kazanan: o.sonuc.kazanan, sureSn: (d.mac.saat - turBasi) / AYAR.adimHz });
      else if (o.tur === "geriCek") geriCek++;
      else if (o.tur === "degisim") degisim++;
      else if (o.tur === "yetenekBasladi") yetenek[o.yuva]!++;
    }
    if (d.mac.macSonucu) return { sonuc: d.mac.macSonucu, sureSn: d.mac.saat / AYAR.adimHz, turlar, geriCek, degisim, adim: d.tick, yetenek };
  }
  throw new Error(`maç ${azami} adımda bitmedi (tohum ${tohum})`);
}

/** Tohumlu rastgele build (katalogdaki tüm parçalar). */
export function rastgeleBuild(tohum: number, k: number): ParcaSecimi {
  const sec = <T extends { id: string }>(l: readonly T[], j: number) => l[rastgeleTamsayi(tohum, k * 8 + j, l.length)]!.id;
  return { cekirdek: sec(CEKIRDEKLER, 0), govde: sec(GOVDELER, 1), disk: sec(DISKLER, 2), uc: sec(UCLAR, 3) };
}

/** Havuzdan 3 farklı Çekirdekli takım (tohumlu). */
export function takimSec(havuz: readonly ParcaSecimi[], tohum: number, sira: number): number[] {
  const secilen: number[] = [];
  let j = 0;
  while (secilen.length < 3) {
    const k = rastgeleTamsayi(tohum, sira * 97 + j++, havuz.length);
    if (secilen.includes(k)) continue;
    if (secilen.some((x) => havuz[x]!.cekirdek === havuz[k]!.cekirdek)) continue;
    secilen.push(k);
    if (j > 500) throw new Error("takım kurulamadı");
  }
  return secilen;
}

export function yuzdelik(dizi: readonly number[], q: number): number {
  if (!dizi.length) return Number.NaN;
  const s = [...dizi].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1));
  return s[i]!;
}

export interface TurnuvaSecenekleri { nDuello: number; nRastgeleMac: number; nReferansMac: number; tohum: number; ayar: DeneyAyari }

export interface TurnuvaRaporu {
  ayar: DeneyAyari;
  duelloMatrisi: { satir: string; sutun: string; kazanma: number; n: number; ortSure: number; sure: number }[];
  referansMacMatrisi: { satir: string; sutun: string; kazanma: number; n: number }[];
  bitis: { durma: number; ringOut: number; parcalanma: number; berabere: number; sure: number; toplam: number };
  duelloBitis: { durma: number; ringOut: number; parcalanma: number; berabere: number; sure: number; toplam: number };
  turSuresi: { medyan: number; p90: number; p99: number };
  macSuresi: { medyan: number; p90: number; p99: number; enFazla: number };
  macNedeni: Record<string, number>;
  rastgeleBuildKazanma: { build: string; tip: string; kazanma: number; n: number }[];
  bandIci: number;
  maclar: number;
  geriCekOrt: number;
  /** maç başına yetenek kullanımı (iki oyuncu toplamı): Yetenek, Özel, Ulti; Ulti görülen maç oranı */
  yetenekMac: [number, number, number, number];
  ultiMacOrani: number;
  /** D8: Takım Ultisi görülen maç oranı */
  takimUltiMacOrani: number;
}

const bosBitis = () => ({ durma: 0, ringOut: 0, parcalanma: 0, berabere: 0, sure: 0, toplam: 0 });

export function turnuva(o: TurnuvaSecenekleri): TurnuvaRaporu {
  ayarUygula(o.ayar);
  const adlar = ["S", "K", "D", "B"] as const;
  const prof = (k: (typeof adlar)[number]) => profil(REFERANS[k], o.ayar);
  const duelloMatrisi: TurnuvaRaporu["duelloMatrisi"] = [];
  const duelloBitis = bosBitis();
  for (const a of adlar) for (const b of adlar) {
    let kaz = 0;
    let sure = 0;
    let ss = 0;
    for (let k = 0; k < o.nDuello; k++) {
      const tohum = o.tohum + k * 7 + adlar.indexOf(a) * 1000 + adlar.indexOf(b) * 100;
      // yarısında taraflar yer değiştirir
      const ters = k % 2 === 1;
      const r = ters ? duello(prof(b), prof(a), tohum) : duello(prof(a), prof(b), tohum);
      const aKazandi = ters ? r.kazanan === 1 : r.kazanan === 0;
      if (aKazandi) kaz++;
      else if (r.kazanan === -1) kaz += 0.5;
      if (r.tur === "sure") sure++;
      ss += r.sureSn;
      duelloBitis[r.tur]++;
      duelloBitis.toplam++;
    }
    duelloMatrisi.push({ satir: a, sutun: b, kazanma: kaz / o.nDuello, n: o.nDuello, ortSure: ss / o.nDuello, sure });
  }

  const bitis = bosBitis();
  const turSureleri: number[] = [];
  const macSureleri: number[] = [];
  const macNedeni: Record<string, number> = {};
  let geriCek = 0;
  const yet = [0, 0, 0, 0];
  let ultiMac = 0;
  let takimMac = 0;
  const macKaydet = (m: MacKaydi) => {
    macSureleri.push(m.sureSn);
    for (let k = 0; k < 4; k++) yet[k]! += m.yetenek[k]!;
    if (m.yetenek[2] > 0) ultiMac++;
    if (m.yetenek[3] > 0) takimMac++;
    macNedeni[m.sonuc.neden] = (macNedeni[m.sonuc.neden] ?? 0) + 1;
    geriCek += m.geriCek;
    for (const t of m.turlar) { bitis[t.tur]++; bitis.toplam++; turSureleri.push(t.sureSn); }
  };

  // referans takımlar: 4 build'den 3'lü (dışarıda kalanın adıyla "-S" gibi)
  const takimlar = adlar.map((dis) => ({ ad: `-${dis}`, uyeler: adlar.filter((x) => x !== dis) }));
  const referansMacMatrisi: TurnuvaRaporu["referansMacMatrisi"] = [];
  for (const a of takimlar) for (const b of takimlar) {
    let kaz = 0;
    for (let k = 0; k < o.nReferansMac; k++) {
      const tohum = o.tohum + 50000 + k * 13 + takimlar.indexOf(a) * 997 + takimlar.indexOf(b) * 101;
      const ta = a.uyeler.map(prof) as unknown as TakimProfilleri;
      const tb = b.uyeler.map(prof) as unknown as TakimProfilleri;
      const ters = k % 2 === 1;
      const m = ters ? tamMac(tb, ta, tohum) : tamMac(ta, tb, tohum);
      macKaydet(m);
      if ((m.sonuc.kazanan === 0) !== ters) kaz++;
    }
    referansMacMatrisi.push({ satir: a.ad, sutun: b.ad, kazanma: kaz / o.nReferansMac, n: o.nReferansMac });
  }

  // 20 rastgele build, 200 maç
  const havuz = Array.from({ length: 20 }, (_, k) => rastgeleBuild(o.tohum + 777, k));
  const kayit = havuz.map(() => ({ kaz: 0, n: 0 }));
  for (let m = 0; m < o.nRastgeleMac; m++) {
    const a = takimSec(havuz, o.tohum + 3, m * 2);
    let b = takimSec(havuz, o.tohum + 3, m * 2 + 1);
    let deneme = 0;
    while (b.some((x) => a.includes(x)) && deneme < 50) b = takimSec(havuz, o.tohum + 3, 100000 + m * 64 + deneme++);
    const ta = a.map((x) => profil(havuz[x]!, o.ayar)) as unknown as TakimProfilleri;
    const tb = b.map((x) => profil(havuz[x]!, o.ayar)) as unknown as TakimProfilleri;
    const sonuc = tamMac(ta, tb, o.tohum + 90000 + m);
    macKaydet(sonuc);
    for (const x of a) { kayit[x]!.n++; if (sonuc.sonuc.kazanan === 0) kayit[x]!.kaz++; }
    for (const x of b) { kayit[x]!.n++; if (sonuc.sonuc.kazanan === 1) kayit[x]!.kaz++; }
  }
  const rastgeleBuildKazanma = havuz.map((h, k) => {
    const p = profil(h, o.ayar);
    return { build: `${h.cekirdek}+${h.govde}+${h.disk}+${h.uc}`, tip: p.tip, kazanma: kayit[k]!.n ? kayit[k]!.kaz / kayit[k]!.n : Number.NaN, n: kayit[k]!.n };
  });
  const bandIci = rastgeleBuildKazanma.filter((x) => x.kazanma >= 0.35 && x.kazanma <= 0.65).length;
  ayarUygula({});
  return {
    ayar: o.ayar,
    duelloMatrisi,
    referansMacMatrisi,
    bitis,
    duelloBitis,
    turSuresi: { medyan: yuzdelik(turSureleri, 0.5), p90: yuzdelik(turSureleri, 0.9), p99: yuzdelik(turSureleri, 0.99) },
    macSuresi: { medyan: yuzdelik(macSureleri, 0.5), p90: yuzdelik(macSureleri, 0.9), p99: yuzdelik(macSureleri, 0.99), enFazla: Math.max(...macSureleri) },
    macNedeni,
    rastgeleBuildKazanma,
    bandIci,
    maclar: macSureleri.length,
    geriCekOrt: geriCek / Math.max(1, macSureleri.length),
    yetenekMac: [0, 1, 2, 3].map((k) => yet[k]! / Math.max(1, macSureleri.length)) as [number, number, number, number],
    ultiMacOrani: ultiMac / Math.max(1, macSureleri.length),
    takimUltiMacOrani: takimMac / Math.max(1, macSureleri.length),
  };
}

/** Kısa özet satırı (deney karşılaştırması). */
export function ozet(r: TurnuvaRaporu): string {
  const b = r.bitis;
  const y = (x: number) => `${((100 * x) / Math.max(1, b.toplam)).toFixed(1)}%`;
  return `maç ${r.maclar} · süre med ${r.macSuresi.medyan.toFixed(1)} p90 ${r.macSuresi.p90.toFixed(1)} p99 ${r.macSuresi.p99.toFixed(1)} · tur med ${r.turSuresi.medyan.toFixed(1)} · `
    + `Durma ${y(b.durma)} RO ${y(b.ringOut)} Parç ${y(b.parcalanma)} Ber ${y(b.berabere)} · band ${r.bandIci}/20 · neden ${JSON.stringify(r.macNedeni)}`
    + ` · yetenek/maç ${r.yetenekMac.map((x) => x.toFixed(2)).join("/")} · Ulti maç %${(100 * r.ultiMacOrani).toFixed(0)} · Takım Ultisi maç %${(100 * r.takimUltiMacOrani).toFixed(0)}`;
}

export { rastgele };
