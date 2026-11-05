// FIZIK-1 ölçümü: girdisiz (bosGirdi) iki topaç, çarpışma sayısı ve ilk çarpışma süresi. Çalıştır:
//   npx tsx araclar/fizik-olc.ts [--sn=90] [--tohum=20] [--mac]
// Varsayılan: tek tur (tekTur kipi), 6×6 Uç eşleşmesi × referans gövde/disk/çekirdek, her hücrede `tohum` tohum (desen
// fazı tohumdan). --mac: tam maç dünyası (geri sayım + giriş koruması), referans takımlar, sıfır girdi.
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { adim, dunyaKur, macDunyasiKur, type TakimProfilleri } from "../src/paylasilan/sim/Dunya.ts";
import { bosGirdi } from "../src/paylasilan/sim/Girdi.ts";
import { UCLAR } from "../src/paylasilan/veri/katalog.ts";
import { topacProfiliKur } from "../src/paylasilan/veri/profil.ts";

const arg = (ad: string): string | undefined => process.argv.find((a) => a.startsWith(`--${ad}=`))?.split("=")[1];
const SN = Number(arg("sn") ?? 90);
const NT = Number(arg("tohum") ?? 20);
const MAC = process.argv.includes("--mac");
const G = [bosGirdi(), bosGirdi()] as const;
// deney: AYAR'ı çalışma anında yamar (yalnız bu araç)
const yama = AYAR as unknown as Record<string, number>;
for (const [k, a] of [["canakEgimi", "canak"], ["canakYumusak", "yum"], ["ayrilmaHizi", "ayr"]] as const) if (arg(a)) yama[k] = Number(arg(a));

interface Sonuc { carpisma: number; ilk: number; bitis: string; ayrilma: number; sure: number }

function kos(d: ReturnType<typeof dunyaKur>, sinir: number): Sonuc {
  let carpisma = 0;
  let ilk = Number.NaN;
  let bitis = "-";
  let sure = sinir;
  let ayrilma = 0; // çarpışmadan sonra merkezler arası > 2r + 10 olduğu adım sayısı (sekme kanıtı) – ilk ayrılma sayısı
  let sonCarp = -1;
  let ayrildi = true;
  for (let n = 0; n < sinir; n++) {
    adim(d, G);
    for (const o of d.olaylar) {
      if (o.tur === "carpisma") {
        carpisma++;
        if (Number.isNaN(ilk)) ilk = d.tick / AYAR.adimHz;
        sonCarp = d.tick;
        ayrildi = false;
      }
      if (o.tur === "turBitti" && bitis === "-") bitis = o.sonuc.tur;
    }
    const [a, b] = d.topaclar;
    if (!ayrildi && sonCarp >= 0) {
      const dx = a.x - b.x; const dz = a.z - b.z;
      if (dx * dx + dz * dz > (2 * AYAR.topacYaricap + 10) ** 2) { ayrildi = true; ayrilma++; }
    }
    if ((!MAC && d.mac.sonuc) || (MAC && d.mac.macSonucu)) { sure = n + 1; break; }
  }
  return { carpisma, ilk, bitis, ayrilma, sure: sure / AYAR.adimHz };
}

const ozetle = (ad: string, s: Sonuc[]) => {
  const c = s.map((x) => x.carpisma);
  const ilk = s.map((x) => x.ilk).filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
  const hic = s.filter((x) => x.carpisma === 0).length;
  const ort = c.reduce((a, b) => a + b, 0) / s.length;
  const med = ilk.length ? ilk[Math.floor(ilk.length / 2)]! : Number.NaN;
  const p90 = ilk.length ? ilk[Math.min(ilk.length - 1, Math.ceil(0.9 * ilk.length) - 1)]! : Number.NaN;
  const le15 = s.filter((x) => !Number.isNaN(x.ilk) && x.ilk <= 15).length;
  const ayr = s.reduce((a, b) => a + b.ayrilma, 0) / s.length;
  const dk = (60 * c.reduce((a, b) => a + b, 0)) / s.reduce((a, b) => a + b.sure, 0);
  const sureMed = [...s.map((x) => x.sure)].sort((a, b) => a - b)[Math.floor(s.length / 2)]!;
  return `${ad.padEnd(26)} çarpışma/dk ${dk.toFixed(1).padStart(6)} · süre med ${sureMed.toFixed(0)} s · çarpışma/koşu ${ort.toFixed(1).padStart(6)} · hiç ${String(hic).padStart(3)}/${s.length} · ilk med ${med.toFixed(1)} p90 ${p90.toFixed(1)} s · ≤15 s ${le15}/${s.length} · ayrılma ${ayr.toFixed(1)}`;
};

if (!MAC) {
  const tum: Sonuc[] = [];
  for (const a of UCLAR) for (const b of UCLAR) {
    const s: Sonuc[] = [];
    for (let k = 0; k < NT; k++) {
      const pa = topacProfiliKur("kor-goktasi", "ok-govde", "hafif-disk", a.id);
      const pb = topacProfiliKur("kaya-maden", "kalkan-govde", "agir-disk", b.id);
      s.push(kos(dunyaKur([pa, pb], 1000 + k), SN * AYAR.adimHz));
    }
    tum.push(...s);
    if (process.argv.includes("--ayrinti")) console.log(ozetle(`${a.id}×${b.id}`, s));
  }
  console.log(`# canakEgimi ${AYAR.canakEgimi} canakYumusak ${AYAR.canakYumusak} ayrilmaHizi ${AYAR.ayrilmaHizi}`);
  console.log(`# girdisiz tek tur, ${SN} s, ${UCLAR.length}×${UCLAR.length} Uç × ${NT} tohum`);
  console.log(ozetle("TOPLAM", tum));
  const bit: Record<string, number> = {};
  for (const x of tum) bit[x.bitis] = (bit[x.bitis] ?? 0) + 1;
  console.log("bitiş:", JSON.stringify(bit));
} else {
  const P = (c: string, g: string, d: string, u: string) => topacProfiliKur(c, g, d, u);
  const T0: TakimProfilleri = [P("kor-goktasi", "ok-govde", "hafif-disk", "duz-uc"), P("kaya-maden", "kalkan-govde", "agir-disk", "igne-uc"), P("girdap-maden", "halka-govde", "parlak-disk", "top-uc")];
  const T1: TakimProfilleri = [P("kasirga-yapay", "savrulan-govde", "denge-disk", "dengeli-uc"), P("kor-goktasi", "ok-govde", "hafif-disk", "kusak-ucu"), P("kaya-maden", "kalkan-govde", "agir-disk", "igne-uc")];
  const s: Sonuc[] = [];
  for (let k = 0; k < NT; k++) s.push(kos(macDunyasiKur([T0, T1], 2000 + k), (SN + 5) * AYAR.adimHz));
  console.log(`# girdisiz tam maç (${SN}+5 s), ${NT} tohum`);
  console.log(ozetle("MAÇ", s));
}
