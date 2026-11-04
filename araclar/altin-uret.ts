// Altın senaryo üretici: test/altin/<ad>.json (girdi akışı) + <ad>.hash (FNV-1a 64).
// Bilinçli sim değişikliğinde yeniden üret ve PR'da gerekçeyi yaz (flint § 2 test 2).
// Çalıştır: npm run altin:uret
import { writeFileSync } from "node:fs";
import { botGirdisi } from "../src/paylasilan/bot/bot.ts";
import { type Girdi, bosGirdi } from "../src/paylasilan/sim/Girdi.ts";
import { adim } from "../src/paylasilan/sim/Dunya.ts";
import { rastgele } from "../src/paylasilan/sim/rastgele.ts";
import { type AltinParca, type AltinSenaryo, type SikiGirdi, altinCalistir, senaryoDunyasi } from "../test/altin/calistir.ts";

const GOKTASI: AltinParca = { cekirdek: "kor-goktasi", govde: "ok-govde", disk: "hafif-disk", uc: "duz-uc" };
const MADEN: AltinParca = { cekirdek: "kaya-maden", govde: "kalkan-govde", disk: "agir-disk", uc: "igne-uc" };
const YAPAY_SOL: AltinParca = { cekirdek: "kasirga-yapay", govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc", yon: "sol" };
const DAYANIKLI: AltinParca = { cekirdek: "girdap-maden", govde: "halka-govde", disk: "parlak-disk", uc: "top-uc" };
const DENGE: AltinParca = { cekirdek: "kasirga-yapay", govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc" };
const TAKIM_1: AltinParca[] = [GOKTASI, MADEN, DAYANIKLI];
const TAKIM_2: AltinParca[] = [DENGE, DAYANIKLI, GOKTASI];
/** Tur fazından başla (geri sayım atlanmış). */
const TURDAN = { faz: "tur", kalanTick: 0, turNo: 1 } as const;

function sikistir(g: Girdi): SikiGirdi {
  const b = bosGirdi() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(g)) if (b[k] !== v) out[k] = v;
  return out as SikiGirdi;
}

const esit = (a: SikiGirdi, b: SikiGirdi): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Girdi üreticisiyle akış kaydı (RLE). */
function kaydet(s: Omit<AltinSenaryo, "girdiler"> & Partial<Pick<AltinSenaryo, "takimlar" | "mac">>, uret: (tick: number, d: ReturnType<typeof senaryoDunyasi>) => [Girdi, Girdi]): AltinSenaryo {
  const d = senaryoDunyasi({ ...s, girdiler: [] });
  const akis: [number, SikiGirdi, SikiGirdi][] = [];
  for (let t = 0; t < s.adim; t++) {
    const [a, b] = uret(t, d);
    const sa = sikistir(a);
    const sb = sikistir(b);
    const son = akis[akis.length - 1];
    if (son && esit(son[1], sa) && esit(son[2], sb)) son[0]++;
    else akis.push([1, sa, sb]);
    adim(d, [a, b]);
  }
  return { ...s, girdiler: akis };
}

const yuvarla = (x: number) => Math.round(x * 1000) / 1000;
/** Blok başına tohumlu hedef: yarı olasılıkla rakip, yoksa iç çemberde rastgele nokta; ara sıra dash / Sıkı Dönüş. */
function rastgeleGirdi(tohum: number, blok: number, i: number, d: ReturnType<typeof senaryoDunyasi>): Girdi {
  const g = bosGirdi();
  const k = blok * 16 + i * 8;
  const ben = d.topaclar[i]!;
  const rakip = d.topaclar[1 - i]!;
  const rakibe = rastgele(tohum, k) < 0.5;
  const hx = rakibe ? rakip.x : (rastgele(tohum, k + 1) * 2 - 1) * 110;
  const hz = rakibe ? rakip.z : (rastgele(tohum, k + 2) * 2 - 1) * 110;
  const dx = hx - ben.x;
  const dz = hz - ben.z;
  const u = Math.hypot(dx, dz) || 1;
  g.yonX = yuvarla(dx / u);
  g.yonZ = yuvarla(dz / u);
  g.dash = rakibe && rastgele(tohum, k + 3) < 0.25;
  g.dinlen = !rakibe && rastgele(tohum, k + 4) < 0.15;
  g.zipla = rastgele(tohum, k + 5) < 0.05;
  return g;
}

const senaryolar: AltinSenaryo[] = [
  kaydet({ surum: 1, senaryo: "bos-girdi", aciklama: "İki başlangıç seti, hiç girdi yok: yalnız Uç deseni + eğim + erime, 600 adım.", tohum: 11, profiller: [GOKTASI, MADEN], adim: 600, baslangic: null },
    () => [bosGirdi(), bosGirdi()]),
  kaydet({ surum: 1, senaryo: "rastgele-girdi", aciklama: "Tohumlu rastgele girdi (20 adımlık bloklar, dash ve Sıkı Dönüş dahil), zıt yön (Yapay sol), 3600 adım.", tohum: 23, profiller: [YAPAY_SOL, DAYANIKLI], adim: 3600, baslangic: null },
    (t, d) => {
      const blok = Math.floor(t / 20);
      const a = rastgeleGirdi(99, blok, 0, d);
      const b = rastgeleGirdi(99, blok, 1, d);
      if (t % 20 !== 0) { a.dash = false; b.dash = false; a.zipla = false; b.zipla = false; }
      return [a, b];
    }),
  kaydet({ surum: 1, senaryo: "bot-mac", aciklama: "İki saldırgan bot (paylaşılan bot), kayıtlı girdi akışı, 3600 adım.", tohum: 5, profiller: [GOKTASI, YAPAY_SOL], adim: 3600, baslangic: null },
    (_t, d) => [botGirdisi(d, 0, "saldirgan", 101), botGirdisi(d, 1, "saldirgan", 202)]),
  kaydet({ surum: 1, senaryo: "ring-out", aciklama: "Rakip kenara yakın, oyuncu dash ile arkadan vurur: Ring Out.", tohum: 3, profiller: [GOKTASI, DAYANIKLI], adim: 240,
    baslangic: [{ x: 20, z: 0, vx: 260 }, { x: 130, z: 0 }] },
    (t) => { const a = bosGirdi(); a.yonX = t < 6 ? 1 : 0; a.dash = t === 0; return [a, bosGirdi()]; }),
  kaydet({ surum: 1, senaryo: "parcalanma", aciklama: "Rakibin tık sayacı eşiğe yakın, oyuncu dash çarpışması: Parçalanma.", tohum: 4, profiller: [GOKTASI, YAPAY_SOL], adim: 240,
    baslangic: [{ x: -60, z: 0 }, { x: 20, z: 0, tik: 7.6 }] },
    (t) => { const a = bosGirdi(); a.yonX = 1; a.dash = t === 1; return [a, bosGirdi()]; }),
  kaydet({ surum: 1, senaryo: "durma", aciklama: "Rakip az staminayla Sıkı Dönüş'te; erime Durma'ya götürür, ardından 40 adım sönüm.", tohum: 6, profiller: [MADEN, DAYANIKLI], adim: 300,
    baslangic: [{}, { stamina: 3 }] },
    () => { const b = bosGirdi(); b.dinlen = true; return [bosGirdi(), b]; }),
  // ---- D2 (flint § 2 test 2: ani ölüm, geri çek, dash-çarpışma; tam bot maçı) ----
  kaydet({ surum: 1, senaryo: "ani-olum", aciklama: "Tam maç kipi, 0-0 iken saat 89 s'den: 90 s'de ani ölüm (R daralır, erime artar), iki kenar botu; ilk bitiş maçı bitirir.", tohum: 12,
    profiller: [GOKTASI, DENGE], takimlar: [TAKIM_1, TAKIM_2], mac: { ...TURDAN, saat: 5340 }, adim: 2400, baslangic: null },
    (_t, d) => [botGirdisi(d, 0, "kenar", 31), botGirdisi(d, 1, "dolas", 32)]),
  kaydet({ surum: 1, senaryo: "geri-cek", aciklama: "Tam maç kipi: oyuncu %20 staminada Tab (degistir 2), 2 s savunmasızken rakip çarpar (kb × 1,5), sonra swap + iniş + giriş koruması.", tohum: 13,
    profiller: [GOKTASI, DENGE], takimlar: [TAKIM_1, TAKIM_2], mac: TURDAN, adim: 420, baslangic: [{ stamina: 80, x: 0, z: 0 }, { x: 100, z: 10 }] },
    (t, d) => {
      const a = bosGirdi();
      if (t === 0) a.degistir = 2;
      const b = t < 200 ? bosGirdi() : botGirdisi(d, 1, "dolas", 41);
      if (t < 30) { b.yonX = -1; b.yonZ = 0; }
      return [a, b];
    }),
  kaydet({ surum: 1, senaryo: "dash-carpisma", aciklama: "Karşılıklı dash çarpışması (iki taraf dash penceresinde, f × kDash), sonra serbest akış.", tohum: 14, profiller: [GOKTASI, DENGE], adim: 300,
    baslangic: [{ x: -70, z: 0 }, { x: 70, z: 4 }] },
    (t) => { const a = bosGirdi(); const b = bosGirdi(); a.yonX = 1; b.yonX = -1; a.dash = t === 2; b.dash = t === 2; return [a, b]; }),
  kaydet({ surum: 1, senaryo: "tam-bot-maci", aciklama: "Tam maç: geri sayım dahil, kademe botları (kenar / dayaniklilik), tur arası seçimleri ve bitti fazı, 7800 adım.", tohum: 15,
    profiller: [GOKTASI, DENGE], takimlar: [TAKIM_1, TAKIM_2], adim: 7800, baslangic: null },
    (_t, d) => [botGirdisi(d, 0, "kenar", 51), botGirdisi(d, 1, "dayaniklilik", 52)]),
  kaydet({ surum: 1, senaryo: "berabere", aciklama: "İki aynı topaç aynı adımda Durma: berabere, puan yok.", tohum: 8, profiller: [MADEN, MADEN], adim: 120,
    baslangic: [{ stamina: 1 }, { stamina: 1 }] },
    () => [bosGirdi(), bosGirdi()]),
];

for (const s of senaryolar) {
  const r = altinCalistir(s);
  writeFileSync(`test/altin/${s.senaryo}.json`, JSON.stringify(s) + "\n");
  writeFileSync(`test/altin/${s.senaryo}.hash`, r.hash + "\n");
  console.log(s.senaryo.padEnd(15), r.hash, "tick", r.tick, "sonuç", r.sonuc ? `${r.sonuc.tur}/${r.sonuc.kazanan}@${r.sonuc.tick}` : "-",
    r.macSonucu ? `maç ${r.macSonucu.neden}/${r.macSonucu.kazanan} ${r.macSonucu.puan.join("-")}@${r.macSonucu.tick}` : "", JSON.stringify(r.olaylar));
}
