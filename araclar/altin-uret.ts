// Altın senaryo üretici: test/altin/<ad>.json (girdi akışı) + <ad>.hash (FNV-1a 64).
// Bilinçli sim değişikliğinde yeniden üret ve PR'da gerekçeyi yaz (flint § 2 test 2).
// Çalıştır: npm run altin:uret
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
const KARANLIK: AltinParca = { cekirdek: "kul-cekirdegi", govde: "ok-govde", disk: "hafif-disk", uc: "duz-uc" };
const SIMSEK: AltinParca = { cekirdek: "simsek-goktasi", govde: "ok-govde", disk: "alcak-disk", uc: "kusak-ucu" };
const DON: AltinParca = { cekirdek: "sabir-tasi", govde: "ayaz-govde", disk: "denge-disk", uc: "duz-uc" };
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

/** `--yeniden` verilmezse var olan senaryonun girdi akışı korunur (bot kodu değişse de kayıt aynı kalır; D3). */
const YENIDEN = process.argv.includes("--yeniden");

/** Girdi üreticisiyle akış kaydı (RLE). */
function kaydet(s: Omit<AltinSenaryo, "girdiler"> & Partial<Pick<AltinSenaryo, "takimlar" | "mac">>, uret: (tick: number, d: ReturnType<typeof senaryoDunyasi>) => [Girdi, Girdi]): AltinSenaryo {
  const yol = `test/altin/${s.senaryo}.json`;
  if (!YENIDEN && existsSync(yol)) {
    const eski = JSON.parse(readFileSync(yol, "utf8")) as AltinSenaryo;
    return { ...s, girdiler: eski.girdiler };
  }
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
  // ---- D3: her kademeden yetenek, alan yetenekleri, Ulti (aynı adımda iki Ulti + ikinci Ulti reddi) ----
  kaydet({ surum: 1, senaryo: "yetenek-kademeler", aciklama: "Tek tur, iki taraf 300 Enerji: Karanlık (Kor Atılışı → Karanlık Yağmuru, Kararma) ve Şimşek (Zincir Kıvılcım, Çatırtı Kırması kontra, Ata Çakımı); reddedilen istekler (bekleme, Enerji).", tohum: 31,
    profiller: [KARANLIK, SIMSEK], adim: 900, baslangic: [{ enerji: 300, x: -110 }, { enerji: 300, x: 110 }] },
    (t, d) => {
      const a = bosGirdi();
      const b = bosGirdi();
      const [ta, tb] = d.topaclar;
      a.nisanX = tb.x; a.nisanZ = tb.z; b.nisanX = ta.x; b.nisanZ = ta.z;
      const ux = ta.x - tb.x;
      const uz = ta.z - tb.z;
      const u = Math.hypot(ux, uz) || 1;
      b.yonX = yuvarla((ux / u) * 0.7); b.yonZ = yuvarla((uz / u) * 0.7);
      a.yonX = yuvarla((-ux / u) * 0.4); a.yonZ = yuvarla((-uz / u) * 0.4);
      if (t === 203) { a.dash = true; } // kontra penceresine dash: Çatırtı Kırması tutar
      if (t === 20) { a.atesle = true; a.secilenYuva = 0; }
      if (t === 40) { a.atesle = true; a.secilenYuva = 0; } // bekleme: ret
      if (t === 60) { b.atesle = true; b.secilenYuva = 0; }
      if (t === 200) { b.atesle = true; b.secilenYuva = 1; }
      if (t === 120) { a.atesle = true; a.secilenYuva = 1; } // Karanlık Yağmuru (Kara: Kararma +25)
      if (t === 500) { b.atesle = true; b.secilenYuva = 2; } // Enerji yetmez: ret
      if (t === 520) { a.atesle = true; a.secilenYuva = 1; } // Enerji yetmez: ret
      return [a, b];
    }),
  kaydet({ surum: 1, senaryo: "alan-yetenegi", aciklama: "Tek tur, alan ve engel: Dip Girdabı (çekim + emiş), Yontu Siperi (engel), Kırağı Çemberi (kaygan zemin), Kor Çukuru; sürüş alanların içinden geçer.", tohum: 32,
    profiller: [DAYANIKLI, MADEN], adim: 1100, baslangic: [{ enerji: 300, x: -120 }, { enerji: 300, x: 120 }] },
    (t, d) => {
      const a = bosGirdi();
      const b = bosGirdi();
      const [ta, tb] = d.topaclar;
      a.nisanX = tb.x; a.nisanZ = tb.z; b.nisanX = ta.x - 40; b.nisanZ = ta.z;
      const blok = Math.floor(t / 90);
      a.yonX = yuvarla(rastgele(71, blok * 2) * 2 - 1); a.yonZ = yuvarla(rastgele(71, blok * 2 + 1) * 2 - 1);
      b.yonX = yuvarla(rastgele(72, blok * 2) * 2 - 1); b.yonZ = yuvarla(rastgele(72, blok * 2 + 1) * 2 - 1);
      if (t === 30) { a.atesle = true; a.secilenYuva = 1; }
      if (t === 50) { b.atesle = true; b.secilenYuva = 1; }
      if (t === 400) { b.atesle = true; b.secilenYuva = 0; }
      if (t === 700) { a.atesle = true; a.secilenYuva = 0; }
      return [a, b];
    }),
  kaydet({ surum: 1, senaryo: "ulti", aciklama: "Tam maç kipi: iki taraf aynı adımda Ulti (Ata Közü + Ata Girdabı, ikisi de çalışır), ulti süresince Enerji dolmaz, ikinci Ulti reddedilir; alan hasarı ve çekim.", tohum: 33,
    profiller: [GOKTASI, DAYANIKLI], takimlar: [TAKIM_1, [DAYANIKLI, MADEN, GOKTASI]], mac: TURDAN, adim: 900, baslangic: [{ enerji: 300, x: -100 }, { enerji: 300, x: 100 }] },
    (t, d) => {
      const a = bosGirdi();
      const b = bosGirdi();
      const [ta, tb] = d.topaclar;
      a.nisanX = tb.x; a.nisanZ = tb.z; b.nisanX = ta.x; b.nisanZ = ta.z;
      if (t === 30) { a.atesle = true; a.secilenYuva = 2; b.atesle = true; b.secilenYuva = 2; }
      if (t === 120) { a.atesle = true; a.secilenYuva = 2; } // ikinci Ulti: ret
      if (t > 200) { const g = botGirdisi(d, 0, "kenar", 81); a.yonX = g.yonX; a.yonZ = g.yonZ; a.dash = g.dash; }
      if (t > 200) { const g = botGirdisi(d, 1, "dolas", 82); b.yonX = g.yonX; b.yonZ = g.yonZ; b.dash = g.dash; }
      return [a, b];
    }),
  kaydet({ surum: 1, senaryo: "tam-bot-yetenek", aciklama: "Tam maç: kademe botları yetenekleriyle (D3: Enerji dolumu, bot yetenek kararları, telegraftan kaçış), 7800 adım.", tohum: 34,
    profiller: [GOKTASI, DENGE], takimlar: [TAKIM_1, [DENGE, SIMSEK, DON]], adim: 7800, baslangic: null },
    (_t, d) => [botGirdisi(d, 0, "kenar", 91), botGirdisi(d, 1, "dolas", 92)]),
  kaydet({ surum: 1, senaryo: "takim-ultisi", aciklama: "D8 Takım Ultisi: A'nın Takım Enerjisi dolu, basış (yuva 4) kabul, telegraf 1 s + 3,5 s alan; B'nin Ulti'si ve Takım Ultisi bu sırada reddedilir (rakipUlti), ikinci basış ret (ultiKullanildi), B'nin yarım Takım Enerjisi bot oyunuyla dolar ve kullanılır.", tohum: 35,
    profiller: [GOKTASI, DAYANIKLI], takimlar: [TAKIM_1, [DAYANIKLI, MADEN, GOKTASI]], mac: TURDAN, adim: 2400, takimEnerji: [100, 70], baslangic: [{ x: -90 }, { enerji: 300, x: 90 }] },
    (t, d) => {
      const a = bosGirdi();
      const b = bosGirdi();
      const [ta, tb] = d.topaclar;
      a.nisanX = tb.x; a.nisanZ = tb.z; b.nisanX = ta.x; b.nisanZ = ta.z;
      if (t === 30) { a.atesle = true; a.secilenYuva = 3; }
      if (t === 60) { b.atesle = true; b.secilenYuva = 2; } // rakipUlti
      if (t === 90) { b.atesle = true; b.secilenYuva = 3; } // rakipUlti
      if (t === 400) { a.atesle = true; a.secilenYuva = 3; } // ultiKullanildi
      if (t > 420) { const g = botGirdisi(d, 0, "kenar", 83); Object.assign(a, g); }
      if (t > 420) { const g = botGirdisi(d, 1, "dolas", 84); Object.assign(b, g); }
      return [a, b];
    }),
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
