import { type Girdi, bosGirdi } from "../../src/paylasilan/sim/Girdi.ts";
import { adim, dunyaKur, macDunyasiKur, type TakimProfilleri } from "../../src/paylasilan/sim/Dunya.ts";
import type { Dunya, MacDurumu, Topac } from "../../src/paylasilan/sim/durum.ts";
import { Fnv64, dunyaHash } from "../../src/paylasilan/sim/hash.ts";
import { topacProfiliKur } from "../../src/paylasilan/veri/profil.ts";

// Altın tekrar senaryosu koşucusu (flint § 2 test 2-3). Saf: Node'da (vitest) ve tarayıcıda (esbuild paketi,
// araclar/altin-tarayici.ts) AYNI kod koşar; hash eşitliği = bit bit aynı sim.
// Hash: her adımdan sonra tüm durumun Float64 baytları (sabit alan sırası) tek FNV-1a 64 akışına girer.

export interface AltinParca { cekirdek: string; govde: string; disk: string; uc: string; yon?: "sag" | "sol" }
/** Varsayılandan farklı alanlar; eksik alan = bosGirdi değeri. */
export type SikiGirdi = Partial<Girdi>;
export interface AltinSenaryo {
  surum: 1;
  senaryo: string;
  aciklama: string;
  tohum: number;
  profiller: [AltinParca, AltinParca];
  adim: number;
  /** başlangıç durumu üzerine yazılan alanlar (bitiş senaryoları için kurulum) */
  baslangic: [Partial<Topac>, Partial<Topac>] | null;
  /** girdi akışı, tekrar sayısıyla sıkıştırılmış: [kaç adım, girdi0, girdi1] */
  girdiler: [number, SikiGirdi, SikiGirdi][];
  /** D2: verilirse tam maç kipi (3'lü takımlar); `profiller` yok sayılır. */
  takimlar?: [AltinParca[], AltinParca[]];
  /** D2: maç durumu üzerine yazılan alanlar (ör. geri sayımı atla, saati 90 s'ye yaklaştır). */
  mac?: Partial<MacDurumu>;
  /** D8: başlangıç Takım Enerjisi (maç kipi). */
  takimEnerji?: [number, number];
}

export interface AltinSonuc { hash: string; sonHash: string; tick: number; sonuc: Dunya["mac"]["sonuc"]; macSonucu: Dunya["mac"]["macSonucu"]; carpisma: number; olaylar: Record<string, number> }

const prof = (x: AltinParca) => topacProfiliKur(x.cekirdek, x.govde, x.disk, x.uc, { yon: x.yon });

export function senaryoDunyasi(s: AltinSenaryo): Dunya {
  let d: Dunya;
  if (s.takimlar) {
    d = macDunyasiKur([s.takimlar[0].map(prof) as unknown as TakimProfilleri, s.takimlar[1].map(prof) as unknown as TakimProfilleri], s.tohum);
    if (s.mac) Object.assign(d.mac, s.mac);
    if (s.takimEnerji) d.takimEnerji = [s.takimEnerji[0], s.takimEnerji[1]];
  } else {
    d = dunyaKur([prof(s.profiller[0]), prof(s.profiller[1])], s.tohum);
  }
  if (s.baslangic) s.baslangic.forEach((b, i) => Object.assign(d.topaclar[i]!, b));
  return d;
}

export function altinCalistir(s: AltinSenaryo): AltinSonuc {
  const d = senaryoDunyasi(s);
  const h = new Fnv64();
  h.dunya(d);
  const olaylar: Record<string, number> = {};
  let n = 0;
  outer: for (const [tekrar, a, b] of s.girdiler) {
    const g0 = { ...bosGirdi(), ...a };
    const g1 = { ...bosGirdi(), ...b };
    for (let k = 0; k < tekrar; k++) {
      if (n >= s.adim) break outer;
      adim(d, [g0, g1]);
      for (const o of d.olaylar) olaylar[o.tur] = (olaylar[o.tur] ?? 0) + 1;
      h.dunya(d);
      n++;
    }
  }
  while (n < s.adim) {
    adim(d, [bosGirdi(), bosGirdi()]);
    for (const o of d.olaylar) olaylar[o.tur] = (olaylar[o.tur] ?? 0) + 1;
    h.dunya(d);
    n++;
  }
  return { hash: h.hex(), sonHash: dunyaHash(d), tick: d.tick, sonuc: d.mac.sonuc, macSonucu: d.mac.macSonucu, carpisma: olaylar["carpisma"] ?? 0, olaylar };
}
