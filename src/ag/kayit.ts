import { HASH_ARALIGI, type MacKaydi } from "./protokol.ts";
import { adim, macDunyasiKur, type TakimProfilleri } from "../paylasilan/sim/Dunya.ts";
import { type Girdi, agAlanlarindanGirdi, tusMaskesi } from "../paylasilan/sim/Girdi.ts";
import { dunyaHash } from "../paylasilan/sim/hash.ts";
import { hukmenBitir, macIptal, teslimEt } from "../paylasilan/sim/mac.ts";
import { takimProfilleriKimlikten } from "../paylasilan/veri/takimlar.ts";

// Maç kaydı (ortak, Colyseus'suz): sunucu tükettiği girdileri ve sim dışı eylemleri yazar; aynı kayıt Node'da
// (vitest) ve tarayıcıda (?debug, ağ matrisi) yeniden oynatılır → her HASH_ARALIGI adımda aynı hash (flint § 2 m. 6).

export function girdiDiziye(g: Girdi): number[] {
  return [g.yonX, g.yonZ, g.nisanX, g.nisanZ, g.secilenYuva, tusMaskesi(g), g.degistir];
}

export function diziGirdiye(a: readonly number[]): Girdi {
  // ağ biçimi değil: sim girdisi (yonX/Z zaten −1..1); agAlanlarindanGirdi'nin ölçeksiz hâli
  return { ...agAlanlarindanGirdi({ yonX: 0, yonZ: 0, nisanX: a[2]!, nisanZ: a[3]!, yuva: a[4]!, tuslar: a[5]!, degistir: a[6]! }), yonX: a[0]!, yonZ: a[1]! };
}

/**
 * Kayıttan yeniden oynatma (Node testi ve tarayıcı): aynı kurulum + aynı girdiler + aynı sim dışı eylemler →
 * her HASH_ARALIGI adımda aynı hash. Dönen: karşılaştırma listesi ve son hash.
 */
export function kaydiOynat(k: MacKaydi): { hashler: { t: number; h: string }[]; sonHash: string; sonTick: number } {
  const profiller: [TakimProfilleri, TakimProfilleri] = [takimProfilleriKimlikten(k.takimlar[0]), takimProfilleriKimlikten(k.takimlar[1])];
  const d = macDunyasiKur(profiller, k.tohum, { seviye: k.seviye });
  const hashler: { t: number; h: string }[] = [];
  const eylem = (t: number) => {
    for (const e of k.eylemler) {
      if (e.tick !== t) continue;
      if (e.tur === "teslim") teslimEt(d, e.i);
      else if (e.tur === "hukmen") hukmenBitir(d, e.i);
      else macIptal(d);
    }
  };
  eylem(0);
  for (const satir of k.girdiler) {
    adim(d, [diziGirdiye(satir.slice(0, 7)), diziGirdiye(satir.slice(7, 14))]);
    if (d.tick % HASH_ARALIGI === 0) hashler.push({ t: d.tick, h: dunyaHash(d) });
    eylem(d.tick);
  }
  return { hashler, sonHash: dunyaHash(d), sonTick: d.tick };
}
