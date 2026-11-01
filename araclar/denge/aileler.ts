// Aile analizi: hamle ailesi başına kullanım, isabet oranı, vuruş başı hasar ve maç başına hasar payı.
// Yuva 3 (temel vuruş) ayrı satır: "temel". Bir ailenin "güç" ve "cd" ortalamaları kart verisinden gelir.
//   npx tsx araclar/denge/aileler.ts [--yama=ad] [--album=80] [--n=6]
import { albumKartlari, profilleriKur, turnuva, yamaUygula, type Yama } from "./cekirdek.ts";
import { yamaCoz } from "./yamalar.ts";
import { rastgele } from "../../src/paylasilan/sim/rastgele.ts";

const arg = (ad: string): string | undefined => process.argv.find((a) => a.startsWith(`--${ad}=`))?.slice(ad.length + 3);
const n = Number(arg("n") ?? 6);
const albumN = Number(arg("album") ?? 80);
const yama: Yama = yamaCoz(arg("yama"));

const hepsi = albumKartlari();
const idx = hepsi.map((_, i) => i);
for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rastgele(77, i) * (i + 1)); [idx[i], idx[j]] = [idx[j]!, idx[i]!]; }
const kartlar = idx.slice(0, albumN).map((i) => hepsi[i]!);

const s = turnuva(kartlar, yama, n);
const geri = yamaUygula(yama);
const profiller = profilleriKur(kartlar, yama);
geri();

interface Toplam { yuvaSayisi: number; basla: number; vurus: number; hasar: number; guc: number; cd: number }
const tablo = new Map<string, Toplam>();
s.kartlar.forEach((k, i) => {
  for (let y = 0; y < 3; y++) {
    const h = profiller[i]!.yuvalar[y];
    if (!h) continue;
    const ad = y === 2 ? "temel" : h.aile;
    const t = tablo.get(ad) ?? { yuvaSayisi: 0, basla: 0, vurus: 0, hasar: 0, guc: 0, cd: 0 };
    t.yuvaSayisi++; t.basla += k.baslaYuva[y]!; t.vurus += k.vurusYuva[y]!; t.hasar += k.hasarYuva[y]!; t.guc += h.guc; t.cd += h.cooldown;
    tablo.set(ad, t);
  }
});
const toplamHasar = [...tablo.values()].reduce((a, t) => a + t.hasar, 0);
console.log(`[${yama.ad}] kart=${kartlar.length} maç=${s.toplamMac}  (kart-maç başına yuva kullanımı; isabet = vuruş/başlatma)`);
console.log("aile       yuva#  ort.güç ort.cd  başlat/yuva-maç  isabet%  hasar/vuruş  hasar payı%  hasar/yuva-maç");
for (const [ad, t] of [...tablo.entries()].sort((a, b) => b[1].hasar - a[1].hasar)) {
  const yuvaMac = t.yuvaSayisi * (s.toplamMac * 2 / kartlar.length) / 1; // yaklaşık: her kart ~ toplamMac*2/K maç oynar
  console.log(
    `${ad.padEnd(10)} ${String(t.yuvaSayisi).padStart(4)}  ${(t.guc / t.yuvaSayisi).toFixed(0).padStart(6)} ${(t.cd / t.yuvaSayisi).toFixed(1).padStart(6)}  ${(t.basla / yuvaMac).toFixed(1).padStart(15)}  ${((t.vurus / Math.max(1, t.basla)) * 100).toFixed(0).padStart(7)}  ${(t.hasar / Math.max(1, t.vurus)).toFixed(1).padStart(11)}  ${((t.hasar / toplamHasar) * 100).toFixed(0).padStart(11)}  ${(t.hasar / yuvaMac).toFixed(1).padStart(14)}`,
  );
}
