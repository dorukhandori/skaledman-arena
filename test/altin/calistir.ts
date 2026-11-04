import { type Girdi, bosGirdi } from "../../src/paylasilan/sim/Girdi.ts";
import { adim, dunyaKur } from "../../src/paylasilan/sim/Dunya.ts";
import type { Dunya, Topac } from "../../src/paylasilan/sim/durum.ts";
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
}

export interface AltinSonuc { hash: string; sonHash: string; tick: number; sonuc: Dunya["mac"]["sonuc"]; carpisma: number; olaylar: Record<string, number> }

export function senaryoDunyasi(s: AltinSenaryo): Dunya {
  const p = s.profiller.map((x) => topacProfiliKur(x.cekirdek, x.govde, x.disk, x.uc, { yon: x.yon })) as [ReturnType<typeof topacProfiliKur>, ReturnType<typeof topacProfiliKur>];
  const d = dunyaKur(p, s.tohum);
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
  return { hash: h.hex(), sonHash: dunyaHash(d), tick: d.tick, sonuc: d.mac.sonuc, carpisma: olaylar["carpisma"] ?? 0, olaylar };
}
