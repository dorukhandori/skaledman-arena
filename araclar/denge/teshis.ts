// Teşhis: kart başına stat, hamle, hasar dökümü ve kazanma oranıyla korelasyon.
//   npx tsx araclar/denge/teshis.ts [--yama=ad] [--n=40] [--album=60] [--kartlar=20]
import { albumKartlari, labKartlari, profilleriKur, turnuva, yamaUygula, type Yama } from "./cekirdek.ts";
import { yamaCoz } from "./yamalar.ts";
import { rastgele } from "../../src/paylasilan/sim/rastgele.ts";
import type { DovuscuProfili } from "../../src/paylasilan/dovuscu.ts";

const arg = (ad: string): string | undefined => process.argv.find((a) => a.startsWith(`--${ad}=`))?.slice(ad.length + 3);
const n = Number(arg("n") ?? 40);
const albumN = Number(arg("album") ?? 0);
const yama: Yama = yamaCoz(arg("yama"));

let kartlar = labKartlari(Number(arg("kartlar") ?? 20));
if (albumN) {
  const h = albumKartlari();
  const idx = h.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rastgele(77, i) * (i + 1)); [idx[i], idx[j]] = [idx[j]!, idx[i]!]; }
  kartlar = idx.slice(0, albumN).map((i) => h[i]!);
}

const s = turnuva(kartlar, yama, n);
const geri = yamaUygula(yama);
const profiller: DovuscuProfili[] = profilleriKur(kartlar, yama);
geri();

function korelasyon(x: number[], y: number[]): number {
  const m = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const mx = m(x), my = m(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i]! - mx) * (y[i]! - my); sxx += (x[i]! - mx) ** 2; syy += (y[i]! - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}

const oran = s.kartlar.map((k) => k.puan / k.mac);
const sirali = s.kartlar.map((k, i) => ({ k, p: profiller[i]!, o: oran[i]! })).sort((a, b) => b.o - a.o);
console.log("kart            win%  HP   atk def spa spd hız  tipler          yuva1 / yuva2 / temel  (aile guc cd)   hasar/maç(y1,y2,y3) yanık");
for (const { k, p, o } of sirali) {
  const y = p.yuvalar.slice(0, 3).map((h) => (h ? `${h.tip.slice(0, 4)} ${h.aile.slice(0, 4)} ${h.guc} cd${h.cooldown}` : "-"));
  const hm = k.hasarYuva.slice(0, 3).map((v) => (v / k.mac).toFixed(1)).join(",");
  console.log(
    `${k.ad.padEnd(14)} ${(o * 100).toFixed(0).padStart(4)} ${String(p.maxHp).padStart(4)} ${String(p.atk).padStart(4)} ${String(p.def).padStart(3)} ${String(p.spa).padStart(3)} ${String(p.spd).padStart(3)} ${p.hiz.toFixed(0).padStart(4)}  ${p.tipler.join("/").padEnd(15)} ${y.join(" | ")}   ${hm}  ${(k.yanik / k.mac).toFixed(1)}`,
  );
}
const f = (g: (p: DovuscuProfili) => number): string => korelasyon(profiller.map(g), oran).toFixed(2);
console.log("\nKorelasyon (kazanma oranı ile):");
console.log(`  maxHp ${f((p) => p.maxHp)} | atk ${f((p) => p.atk)} | spa ${f((p) => p.spa)} | def ${f((p) => p.def)} | spd ${f((p) => p.spd)} | hız ${f((p) => p.hiz)}`);
console.log(`  maxHp·(def+spd)/2 ${f((p) => p.maxHp * (p.def + p.spd) / 2)} | toplam stat ${f((p) => p.maxHp + p.atk + p.def + p.spa + p.spd)}`);
console.log(`  en yüksek hamle gücü ${f((p) => Math.max(...p.yuvalar.slice(0, 2).map((h) => h?.guc ?? 0)))}`);
console.log(`  hasar/maç toplam ${korelasyon(s.kartlar.map((k) => k.hasarYuva.reduce((a, b) => a + b, 0) / k.mac), oran).toFixed(2)}`);
