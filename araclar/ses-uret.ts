// Ses efektlerini SENTEZLER (jsfxr tarzı: osilatör + gürültü + zarf + perde kayması + tek kutuplu süzgeç), WAV yazar.
// İndirme ya da ücretli kaynak yok; çıktı kendi üretimimiz, CC0 (veri/manifest-ses.json). Tohumlu gürültü: aynı
// komut aynı baytları üretir. Çalıştır: npm run ses:uret   → public/ses/*.wav (toplam ≤ 500 KB, axiom § 3)
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";

const HZ = 22050;
const KLASOR = "public/ses";

type Dalga = "sinus" | "kare" | "testere" | "ucgen" | "gurultu";
interface Katman {
  dalga: Dalga;
  /** başlangıç / bitiş frekansı (Hz); gürültüde süzgeç kesimi gibi davranır */
  f0: number;
  f1: number;
  /** saldırı, tutuş, sönüm (s) */
  a: number;
  h: number;
  s: number;
  hacim: number;
  /** tek kutuplu alçak geçiren süzgeç (0..1; 1 = süzgeçsiz) */
  suz?: number;
  /** başlangıç gecikmesi (s) */
  gec?: number;
  /** titreşim (vibrato) Hz / derinlik oranı */
  vib?: [number, number];
  /** kare dalga görev oranı */
  gorev?: number;
}
interface Efekt { ad: string; olay: string; katmanlar: Katman[] }

let tohum = 0x9e3779b9;
function rastgele(): number {
  tohum = (Math.imul(tohum, 1664525) + 1013904223) >>> 0;
  return tohum / 4294967296;
}

function sentezle(e: Efekt): Float32Array {
  const sure = Math.max(...e.katmanlar.map((k) => (k.gec ?? 0) + k.a + k.h + k.s));
  const n = Math.ceil(sure * HZ) + 1;
  const out = new Float32Array(n);
  for (const k of e.katmanlar) {
    tohum = 0x9e3779b9 ^ (e.ad.length * 2654435761);
    let faz = 0;
    let suzulmus = 0;
    let gurultu = 0;
    let gurultuSayac = 0;
    const bas = Math.floor((k.gec ?? 0) * HZ);
    const top = k.a + k.h + k.s;
    for (let i = 0; i < Math.ceil(top * HZ); i++) {
      const t = i / HZ;
      const u = t / top;
      // üstel perde kayması
      let f = k.f0 * Math.pow(k.f1 / k.f0, u);
      if (k.vib) f *= 1 + Math.sin(2 * Math.PI * k.vib[0] * t) * k.vib[1];
      faz += f / HZ;
      faz -= Math.floor(faz);
      let v: number;
      switch (k.dalga) {
        case "sinus": v = Math.sin(2 * Math.PI * faz); break;
        case "kare": v = faz < (k.gorev ?? 0.5) ? 1 : -1; break;
        case "testere": v = 2 * faz - 1; break;
        case "ucgen": v = 1 - 4 * Math.abs(faz - 0.5); break;
        case "gurultu": {
          // örnek-tut gürültü: frekans "renk" verir
          gurultuSayac += f / HZ;
          if (gurultuSayac >= 1) { gurultuSayac -= Math.floor(gurultuSayac); gurultu = rastgele() * 2 - 1; }
          v = gurultu;
          break;
        }
      }
      if (k.suz !== undefined && k.suz < 1) { suzulmus += (v - suzulmus) * k.suz; v = suzulmus; }
      const zarf = t < k.a ? t / k.a : t < k.a + k.h ? 1 : Math.max(0, 1 - (t - k.a - k.h) / k.s);
      const j = bas + i;
      if (j < n) out[j]! += v * zarf * zarf * k.hacim;
    }
  }
  // tepe normalleştirme (en çok 0,9) + 4 ms yumuşak bitiş
  let tepe = 0;
  for (const x of out) tepe = Math.max(tepe, Math.abs(x));
  const kazanc = tepe > 0.9 ? 0.9 / tepe : 1;
  const son = Math.floor(0.004 * HZ);
  for (let i = 0; i < n; i++) out[i]! *= kazanc * (i > n - son ? (n - i) / son : 1);
  return out;
}

function wav(ornekler: Float32Array): Buffer {
  const veri = Buffer.alloc(ornekler.length * 2);
  for (let i = 0; i < ornekler.length; i++) veri.writeInt16LE(Math.round(Math.max(-1, Math.min(1, ornekler[i]!)) * 32767), i * 2);
  const b = Buffer.alloc(44);
  b.write("RIFF", 0); b.writeUInt32LE(36 + veri.length, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(HZ, 24); b.writeUInt32LE(HZ * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(veri.length, 40);
  return Buffer.concat([b, veri]);
}

// 05 § 3.2 ses sütunu + nile B-35 asgari seti (16 efekt; satın alma/başarım D7'de, müzik yer tutucu)
const EFEKTLER: Efekt[] = [
  { ad: "carpisma-hafif", olay: "çarpışma hafif: metal tık", katmanlar: [
    { dalga: "kare", f0: 1800, f1: 900, a: 0.002, h: 0.01, s: 0.06, hacim: 0.5, gorev: 0.3 },
    { dalga: "gurultu", f0: 9000, f1: 4000, a: 0.001, h: 0.005, s: 0.03, hacim: 0.4 }] },
  { ad: "carpisma-agir", olay: "çarpışma ağır: metal çın + alt vuruş", katmanlar: [
    { dalga: "kare", f0: 1300, f1: 700, a: 0.002, h: 0.02, s: 0.16, hacim: 0.45, gorev: 0.25, vib: [38, 0.02] },
    { dalga: "sinus", f0: 160, f1: 70, a: 0.002, h: 0.03, s: 0.12, hacim: 0.7 },
    { dalga: "gurultu", f0: 7000, f1: 2000, a: 0.001, h: 0.01, s: 0.06, hacim: 0.4 }] },
  { ad: "carpisma-kritik", olay: "çarpışma kritik: çın + bas thud", katmanlar: [
    { dalga: "testere", f0: 1100, f1: 500, a: 0.002, h: 0.03, s: 0.25, hacim: 0.35, suz: 0.5 },
    { dalga: "sinus", f0: 120, f1: 45, a: 0.003, h: 0.05, s: 0.2, hacim: 0.9 },
    { dalga: "gurultu", f0: 6000, f1: 800, a: 0.001, h: 0.02, s: 0.12, hacim: 0.5 }] },
  { ad: "duvar", olay: "duvar/kenar: alçak metal tonk", katmanlar: [
    { dalga: "ucgen", f0: 320, f1: 180, a: 0.002, h: 0.02, s: 0.12, hacim: 0.7 },
    { dalga: "gurultu", f0: 2500, f1: 800, a: 0.001, h: 0.005, s: 0.04, hacim: 0.3 }] },
  { ad: "dash", olay: "dash: swoosh", katmanlar: [
    { dalga: "gurultu", f0: 1500, f1: 7000, a: 0.03, h: 0.03, s: 0.12, hacim: 0.6, suz: 0.35 }] },
  { ad: "sekme", olay: "sekme: kısa sıçrama", katmanlar: [
    { dalga: "kare", f0: 300, f1: 900, a: 0.005, h: 0.03, s: 0.09, hacim: 0.35, gorev: 0.4 }] },
  { ad: "ring-out", olay: "Ring Out: swoosh + düşen ıslık", katmanlar: [
    { dalga: "gurultu", f0: 2000, f1: 6000, a: 0.02, h: 0.05, s: 0.15, hacim: 0.45, suz: 0.4 },
    { dalga: "sinus", f0: 1400, f1: 300, a: 0.02, h: 0.1, s: 0.45, hacim: 0.45, gec: 0.08 }] },
  { ad: "parcalanma", olay: "Parçalanma: kırılma + bas patlama", katmanlar: [
    { dalga: "gurultu", f0: 11000, f1: 3000, a: 0.001, h: 0.04, s: 0.35, hacim: 0.6 },
    { dalga: "sinus", f0: 90, f1: 35, a: 0.003, h: 0.08, s: 0.35, hacim: 0.9 },
    { dalga: "kare", f0: 2200, f1: 1400, a: 0.001, h: 0.01, s: 0.08, hacim: 0.25, gec: 0.04, gorev: 0.2 }] },
  { ad: "durma", olay: "Durma: vızıltı düşer + tıkırtı", katmanlar: [
    { dalga: "testere", f0: 420, f1: 60, a: 0.01, h: 0.1, s: 0.5, hacim: 0.3, suz: 0.25 },
    { dalga: "kare", f0: 900, f1: 600, a: 0.001, h: 0.01, s: 0.04, hacim: 0.3, gec: 0.45 },
    { dalga: "kare", f0: 800, f1: 500, a: 0.001, h: 0.01, s: 0.04, hacim: 0.22, gec: 0.55 }] },
  { ad: "telegraf", olay: "yetenek telegrafı: yükselen ton", katmanlar: [
    { dalga: "kare", f0: 280, f1: 760, a: 0.02, h: 0.18, s: 0.08, hacim: 0.25, gorev: 0.35, vib: [14, 0.03] }] },
  { ad: "ulti", olay: "Ulti vuruşu: katmanlı patlama", katmanlar: [
    { dalga: "testere", f0: 220, f1: 880, a: 0.01, h: 0.08, s: 0.3, hacim: 0.3, suz: 0.45 },
    { dalga: "sinus", f0: 110, f1: 40, a: 0.005, h: 0.1, s: 0.4, hacim: 0.8 },
    { dalga: "gurultu", f0: 5000, f1: 900, a: 0.002, h: 0.05, s: 0.35, hacim: 0.45 }] },
  { ad: "geri-sayim", olay: "geri sayım / süre tık", katmanlar: [
    { dalga: "kare", f0: 880, f1: 880, a: 0.002, h: 0.05, s: 0.05, hacim: 0.35, gorev: 0.5 }] },
  { ad: "mac-sonu", olay: "maç sonu: üç notalı fanfar", katmanlar: [
    { dalga: "kare", f0: 523, f1: 523, a: 0.005, h: 0.1, s: 0.05, hacim: 0.3, gorev: 0.4 },
    { dalga: "kare", f0: 659, f1: 659, a: 0.005, h: 0.1, s: 0.05, hacim: 0.3, gorev: 0.4, gec: 0.15 },
    { dalga: "kare", f0: 784, f1: 784, a: 0.005, h: 0.25, s: 0.2, hacim: 0.3, gorev: 0.4, gec: 0.3 }] },
  { ad: "ui-tik", olay: "arayüz tıkı", katmanlar: [
    { dalga: "sinus", f0: 1500, f1: 1100, a: 0.001, h: 0.01, s: 0.025, hacim: 0.45 }] },
  { ad: "enerji-doldu", olay: "Enerji dilimi doldu: kısa ding", katmanlar: [
    { dalga: "sinus", f0: 1320, f1: 1320, a: 0.002, h: 0.04, s: 0.2, hacim: 0.45 },
    { dalga: "sinus", f0: 1980, f1: 1980, a: 0.002, h: 0.02, s: 0.15, hacim: 0.2 }] },
  { ad: "kenar-uyari", olay: "kenar uyarısı tık (≤ 2 Hz)", katmanlar: [
    { dalga: "kare", f0: 2400, f1: 2000, a: 0.001, h: 0.008, s: 0.02, hacim: 0.3, gorev: 0.25 }] },
  // Harita H8 yer tutucuları (docs/design/harita/10 § 4): kazı tıkı, isabet çınlaması, eritme cızırtısı, dövme çekici
  { ad: "kazi-tik", olay: "kazı vuruşu: taşa kazma tıkı", katmanlar: [
    { dalga: "gurultu", f0: 5000, f1: 1500, a: 0.001, h: 0.01, s: 0.07, hacim: 0.55 },
    { dalga: "ucgen", f0: 520, f1: 260, a: 0.001, h: 0.015, s: 0.08, hacim: 0.5 }] },
  { ad: "isabet", olay: "kazı isabeti: parlak çınlama", katmanlar: [
    { dalga: "sinus", f0: 1760, f1: 1760, a: 0.002, h: 0.03, s: 0.22, hacim: 0.4 },
    { dalga: "sinus", f0: 2640, f1: 2640, a: 0.002, h: 0.02, s: 0.18, hacim: 0.2, gec: 0.03 }] },
  { ad: "eritme", olay: "Ocak eritme: cızırtı", katmanlar: [
    { dalga: "gurultu", f0: 3000, f1: 1200, a: 0.05, h: 0.25, s: 0.3, hacim: 0.35, suz: 0.3 }] },
  { ad: "dovme", olay: "Ocak dövme: çekiç (iki vuruş)", katmanlar: [
    { dalga: "kare", f0: 1000, f1: 600, a: 0.001, h: 0.015, s: 0.12, hacim: 0.4, gorev: 0.3 },
    { dalga: "sinus", f0: 140, f1: 70, a: 0.002, h: 0.02, s: 0.1, hacim: 0.6 },
    { dalga: "kare", f0: 950, f1: 550, a: 0.001, h: 0.015, s: 0.12, hacim: 0.35, gorev: 0.3, gec: 0.22 }] },
];

mkdirSync(KLASOR, { recursive: true });
let toplam = 0;
const manifest = {
  surum: 1,
  aciklama: "Devran ses efektleri: araclar/ses-uret.ts ile sentezlendi (osilatör + gürültü zarfları). Dış kaynak yok.",
  kaynak: "sentez",
  lisans: "CC0-1.0",
  ornekleme: HZ,
  bicim: "WAV PCM 16-bit mono",
  dosyalar: [] as { ad: string; dosya: string; olay: string; sureSn: number; bayt: number; kaynak: string; lisans: string }[],
};
for (const e of EFEKTLER) {
  const ornek = sentezle(e);
  const yol = `${KLASOR}/${e.ad}.wav`;
  writeFileSync(yol, wav(ornek));
  const bayt = statSync(yol).size;
  toplam += bayt;
  manifest.dosyalar.push({ ad: e.ad, dosya: `ses/${e.ad}.wav`, olay: e.olay, sureSn: Math.round((ornek.length / HZ) * 1000) / 1000, bayt, kaynak: "sentez (araclar/ses-uret.ts)", lisans: "CC0-1.0" });
  console.log(e.ad.padEnd(16), String(bayt).padStart(7), "bayt", (ornek.length / HZ).toFixed(3), "s");
}
// mevcut dosyadaki elle yazılmış bloklar (ör. `kayitAdaylari`, GU-B) korunur; yalnız sentez alanları yenilenir
let eski: Record<string, unknown> = {};
try { eski = JSON.parse(readFileSync("veri/manifest-ses.json", "utf8")) as Record<string, unknown>; } catch { eski = {}; }
writeFileSync("veri/manifest-ses.json", JSON.stringify({ ...eski, ...manifest, toplamBayt: toplam }, null, 1) + "\n");
console.log(`toplam ${toplam} bayt (${(toplam / 1024).toFixed(1)} KB) · ${EFEKTLER.length} efekt`);
if (toplam > 500 * 1024) { console.error("Ses bütçesi aşıldı (> 500 KB)"); process.exit(1); }
