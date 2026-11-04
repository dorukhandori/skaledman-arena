import type { Dunya, Topac } from "./durum.ts";

// Altın tekrar hash'i (flint § 2 test 2): FNV-1a 64, sim durumunun Float64 baytları (küçük uçlu), SABİT alan sırası.
// Node ve tarayıcı aynı baytları üretir; hash eşitliği = bit bit aynı sim. Alan eklerken buraya da ekle.

const FNV_TABAN = 0xcbf29ce484222325n;
const FNV_ASAL = 0x100000001b3n;
const MASKE = 0xffffffffffffffffn;

const FAZ_KODU = { tur: 0, turBitti: 1 } as const;
const SONUC_KODU = { durma: 0, ringOut: 1, parcalanma: 2, berabere: 3 } as const;

/** Topaç alanları, hash sırası. */
export const TOPAC_ALANLARI = [
  "x", "z", "vx", "vz", "stamina", "tik", "durum", "dashKalan", "dashBekleme",
  "sekmeKalan", "sekmeBekleme", "sikiDonus", "sonumKalan", "desenFaz",
] as const satisfies readonly (keyof Topac)[];

/** Durumun sayısal özeti (sabit sıra). */
export function durumSayilari(d: Dunya): number[] {
  const s: number[] = [d.tick, d.tohum, d.temasKilidi, FAZ_KODU[d.mac.faz], d.mac.puan[0], d.mac.puan[1]];
  const so = d.mac.sonuc;
  if (so) s.push(1, SONUC_KODU[so.tur], so.kazanan, so.kaybeden, so.puan, so.tick);
  else s.push(0, -1, -1, -1, 0, -1);
  for (const t of d.topaclar) for (const a of TOPAC_ALANLARI) s.push(t[a]);
  return s;
}

/** Artımlı FNV-1a 64. */
export class Fnv64 {
  private h = FNV_TABAN;
  private readonly tampon = new DataView(new ArrayBuffer(8));

  bayt(b: number): void {
    this.h = ((this.h ^ BigInt(b & 0xff)) * FNV_ASAL) & MASKE;
  }

  sayi(x: number): void {
    this.tampon.setFloat64(0, x, true);
    for (let i = 0; i < 8; i++) this.bayt(this.tampon.getUint8(i));
  }

  dunya(d: Dunya): void {
    for (const x of durumSayilari(d)) this.sayi(x);
  }

  /** 16 haneli onaltılık. */
  hex(): string {
    return this.h.toString(16).padStart(16, "0");
  }
}

export function dunyaHash(d: Dunya): string {
  const h = new Fnv64();
  h.dunya(d);
  return h.hex();
}
