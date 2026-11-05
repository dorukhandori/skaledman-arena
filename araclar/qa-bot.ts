// D8 QA kapısı madde 3-4 (flint § 7): bot-bot N maç (varsayılan 500) paylaşılan sim + paylaşılan bot ile (yetenek,
// Ulti, Takım Ultisi kullanır). Ölçülen: maç süresi medyan / p90 / p99 / en çok (hedef medyan 40-90 s, p99 ≤ 120 s),
// takılan maç (azami adımda bitmeyen), bitiş türleri (Durma / Ring Out / Parçalanma / berabere), maç bitiş nedenleri
// (ani ölüm dahil), yetenek kullanımı, Takım Ultisi görülen maç oranı. Takımlar tohumlu rastgele (tüm katalog),
// Çekirdekler Lv.3, kipler sırayla. Çalıştır: npx tsx araclar/qa-bot.ts [--n=500] [--json=yol]
import { writeFileSync } from "node:fs";
import { type BotKipi, botGirdisi } from "../src/paylasilan/bot/bot.ts";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { adim, macDunyasiKur, type TakimProfilleri } from "../src/paylasilan/sim/Dunya.ts";
import { rastgeleTamsayi } from "../src/paylasilan/sim/rastgele.ts";
import { CEKIRDEKLER, DISKLER, GOVDELER, UCLAR } from "../src/paylasilan/veri/katalog.ts";
import { topacProfiliKur } from "../src/paylasilan/veri/profil.ts";

const arg = (ad: string) => process.argv.find((a) => a.startsWith(`--${ad}=`))?.split("=")[1];
const N = Number(arg("n") ?? 500);
const KIPLER: BotKipi[] = ["dolas", "kenar", "dayaniklilik"];
const AZAMI = 200 * AYAR.adimHz;

function takim(tohum: number): TakimProfilleri {
  const kullanilan = new Set<string>();
  const uyeler = [];
  for (let k = 0; uyeler.length < 3 && k < 50; k++) {
    const sec = <T extends { id: string }>(l: readonly T[], j: number) => l[rastgeleTamsayi(tohum, k * 8 + j, l.length)]!.id;
    const c = sec(CEKIRDEKLER, 0);
    if (kullanilan.has(c)) continue;
    kullanilan.add(c);
    uyeler.push(topacProfiliKur(c, sec(GOVDELER, 1), sec(DISKLER, 2), sec(UCLAR, 3)));
  }
  return uyeler as unknown as TakimProfilleri;
}

const yuzdelik = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };
const sureler: number[] = [];
const bitis: Record<string, number> = { durma: 0, ringOut: 0, parcalanma: 0, berabere: 0 };
const neden: Record<string, number> = {};
const yetenek = [0, 0, 0, 0];
let takilan = 0;
let takimUltiMac = 0;
let takimEnerjiDolu = 0;
let takimDustuRet = 0;
const bas = Date.now();
for (let s = 0; s < N; s++) {
  const d = macDunyasiKur([takim(1000 + s * 2), takim(1001 + s * 2)], 7000 + s, { seviye: [3, 3] });
  const k0 = KIPLER[s % 3]!;
  const k1 = KIPLER[Math.floor(s / 3) % 3]!;
  let tu = false;
  let n = 0;
  for (; n < AZAMI && d.mac.faz !== "bitti"; n++) {
    adim(d, [botGirdisi(d, 0, k0, s * 17 + 3), botGirdisi(d, 1, k1, s * 17 + 4)]);
    for (const o of d.olaylar) {
      if (o.tur === "turBitti") bitis[o.sonuc.tur] = (bitis[o.sonuc.tur] ?? 0) + 1;
      else if (o.tur === "yetenekBasladi") { yetenek[o.yuva]!++; if (o.yuva === 3) tu = true; }
      else if (o.tur === "takimEnerjiDoldu") takimEnerjiDolu++;
      else if (o.tur === "yetenekReddi" && o.neden === "takimDustu") takimDustuRet++;
    }
  }
  if (d.mac.faz !== "bitti") { takilan++; continue; }
  sureler.push(d.mac.saat / AYAR.adimHz);
  const ne = d.mac.macSonucu!.neden;
  neden[ne] = (neden[ne] ?? 0) + 1;
  if (tu) takimUltiMac++;
}
const sonuc = {
  n: N, sn: (Date.now() - bas) / 1000, takilan,
  sure: { medyan: yuzdelik(sureler, 0.5), p90: yuzdelik(sureler, 0.9), p99: yuzdelik(sureler, 0.99), enCok: Math.max(...sureler) },
  bitis, neden, yetenekMac: yetenek.map((x) => +(x / N).toFixed(2)), takimUltiMacOrani: +(takimUltiMac / N).toFixed(3), takimEnerjiDolu, takimDustuRet,
  kapi: { medyan40_90: yuzdelik(sureler, 0.5) >= 40 && yuzdelik(sureler, 0.5) <= 90, p99_120: yuzdelik(sureler, 0.99) <= 120, takilanYok: takilan === 0 },
};
console.log(JSON.stringify(sonuc, null, 1));
const j = arg("json");
if (j) writeFileSync(j, JSON.stringify(sonuc, null, 1));
