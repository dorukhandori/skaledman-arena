import { SIM_HZ } from "../../ag/protokol.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";

// Çekirdek Günlüğü defteri (US-2.2, D6): maç içinde yuva başına en uzun kesintisiz dönüş. Saf sayaç; oda her sim
// adımından sonra çağırır. Dönüş = tur fazında sahada geçen kesintisiz süre (değişim, eleme ya da tur sonu keser).

export class DonusSayaci {
  private seri: [number[], number[]] = [[0, 0, 0], [0, 0, 0]];
  private enUzun: [number[], number[]] = [[0, 0, 0], [0, 0, 0]];

  adim(d: Dunya): void {
    if (!d.takimlar) return;
    if (d.mac.faz !== "tur") {
      for (const s of this.seri) s.fill(0);
      return;
    }
    for (let i = 0; i < 2; i++) {
      const aktif = d.takimlar[i]!.aktif;
      for (let k = 0; k < 3; k++) {
        if (k === aktif) {
          this.seri[i]![k]!++;
          if (this.seri[i]![k]! > this.enUzun[i]![k]!) this.enUzun[i]![k] = this.seri[i]![k]!;
        } else this.seri[i]![k] = 0;
      }
    }
  }

  /** Oyuncu × yuva: en uzun dönüş (sn). */
  saniye(): [number[], number[]] {
    return [this.enUzun[0].map((t) => t / SIM_HZ), this.enUzun[1].map((t) => t / SIM_HZ)];
  }
}
