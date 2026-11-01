// Bot turnuvası CLI. Çalıştır:
//   npx tsx araclar/denge/turnuva.ts                      # 20 Lab kartı, çift başına 10 maç, varsayılan yama
//   npx tsx araclar/denge/turnuva.ts --n=6 --yama=hasar0.3
//   npx tsx araclar/denge/turnuva.ts --tara=hasar            # hasar çarpanı süpürmesi
//   npx tsx araclar/denge/turnuva.ts --album=60 --n=2        # albümden rastgele (tohumlu) 60 kart
// Çıktı: konsol özeti + --json=<yol> ile ham sonuç.
import { writeFileSync } from "node:fs";
import { albumKartlari, labKartlari, medyan, turnuva, yuzdelik, type TurnuvaSonucu, type Yama } from "./cekirdek.ts";
import { SUPURMELER, yamaCoz } from "./yamalar.ts";
import { rastgele } from "../../src/paylasilan/sim/rastgele.ts";

const arg = (ad: string): string | undefined => process.argv.find((a) => a.startsWith(`--${ad}=`))?.slice(ad.length + 3);
const kartSayisi = Number(arg("kartlar") ?? 20);
const n = Number(arg("n") ?? 10);
const albumN = arg("album") ? Number(arg("album")) : 0;
const yamaAdi = arg("yama");
const tara = arg("tara");
const jsonYol = arg("json");
const BAND: [number, number] = [0.35, 0.65];

function kartListesi() {
  if (!albumN) return labKartlari(kartSayisi);
  const hepsi = albumKartlari();
  // tohumlu Fisher-Yates
  const idx = hepsi.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rastgele(77, i) * (i + 1)); [idx[i], idx[j]] = [idx[j]!, idx[i]!]; }
  return idx.slice(0, albumN).map((i) => hepsi[i]!);
}

function ozet(s: TurnuvaSonucu): string {
  const oranlar = s.kartlar.map((k) => k.puan / k.mac);
  const disarda = s.kartlar.filter((k) => k.puan / k.mac < BAND[0] || k.puan / k.mac > BAND[1]);
  const sure = s.sureler;
  const ort = oranlar.reduce((a, b) => a + b, 0) / oranlar.length;
  const sd = Math.sqrt(oranlar.reduce((a, b) => a + (b - ort) ** 2, 0) / oranlar.length);
  return [
    `[${s.yama}] arena=${s.arena} kart=${s.kartlar.length} maç=${s.toplamMac} (çift başına ${s.n})`,
    `  süre medyan ${medyan(sure).toFixed(1)} s | p10 ${yuzdelik(sure, 0.1).toFixed(1)} | p90 ${yuzdelik(sure, 0.9).toFixed(1)} | KO payı ${(s.koPay * 100).toFixed(0)}% | süre dolumu ${((1 - s.koPay) * 100).toFixed(0)}%`,
    `  kazanma oranı min ${(Math.min(...oranlar) * 100).toFixed(1)}% maks ${(Math.max(...oranlar) * 100).toFixed(1)}% | bant dışı ${disarda.length}/${s.kartlar.length} | sd ${(sd * 100).toFixed(1)} | sol doğum kazanma payı ${(s.solPay * 100).toFixed(1)}%`,
  ].join("\n");
}

function tablo(s: TurnuvaSonucu): string {
  const sirali = [...s.kartlar].sort((a, b) => b.puan / b.mac - a.puan / a.mac);
  const satirlar = sirali.map((k) => {
    const o = (k.puan / k.mac) * 100;
    const isaret = o < BAND[0] * 100 || o > BAND[1] * 100 ? " <-- BANT DIŞI" : "";
    return `  ${k.fusionId.padEnd(8)} ${k.ad.padEnd(14)} ${o.toFixed(1).padStart(5)}%  maç ${k.mac}  KO-gal ${k.koGalibiyet}  süre-gal ${k.sureGalibiyet}  ber ${k.beraberlik}${isaret}`;
  });
  return satirlar.join("\n");
}

function calistir(yama: Yama, kartlar: ReturnType<typeof kartListesi>): TurnuvaSonucu {
  const t0 = Date.now();
  const s = turnuva(kartlar, yama, n);
  console.log(ozet(s), `\n  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  return s;
}

const kartlar = kartListesi();
const sonuclar: TurnuvaSonucu[] = [];
if (tara) {
  const liste = SUPURMELER[tara];
  if (!liste) throw new Error(`bilinmeyen süpürme: ${tara}; var olanlar: ${Object.keys(SUPURMELER).join(", ")}`);
  for (const y of liste) sonuclar.push(calistir(y, kartlar));
} else {
  const s = calistir(yamaCoz(yamaAdi), kartlar);
  console.log(tablo(s));
  sonuclar.push(s);
}
if (jsonYol) writeFileSync(jsonYol, JSON.stringify(sonuclar));
