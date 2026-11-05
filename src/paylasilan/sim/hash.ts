import type { Dunya, Topac } from "./durum.ts";

// Altın tekrar hash'i (flint § 2 test 2): FNV-1a 64, sim durumunun Float64 baytları (küçük uçlu), SABİT alan sırası.
// Node ve tarayıcı aynı baytları üretir; hash eşitliği = bit bit aynı sim. Alan eklerken buraya da ekle.

const FNV_TABAN = 0xcbf29ce484222325n;
const FNV_ASAL = 0x100000001b3n;
const MASKE = 0xffffffffffffffffn;

const FAZ_KODU = { tur: 0, turBitti: 1, geriSayim: 2, turArasi: 3, bitti: 4 } as const;
const MOD_KODU = { tekTur: 0, mac: 1 } as const;
const SONUC_KODU = { durma: 0, ringOut: 1, parcalanma: 2, berabere: 3 } as const;
const NEDEN_KODU = { puan: 0, tukenme: 1, aniOlum: 2, surePuan: 3, sureStamina: 4, surePuanEsitlik: 5, yaziTura: 6, teslim: 7, hukmen: 8, iptal: 9 } as const;

/** Topaç alanları, hash sırası. */
export const TOPAC_ALANLARI = [
  "x", "z", "vx", "vz", "stamina", "tik", "durum", "dashKalan", "dashBekleme",
  "sekmeKalan", "sekmeBekleme", "sikiDonus", "sonumKalan", "desenFaz", "koruma", "geriCekKalan", "enerji",
  // D3
  "sahadaTick", "bekleme1", "bekleme2", "yapayIndirim", "yetenekNo", "yetenekYuva", "etkinNo", "etkiOlcek", "yetenekFaz",
  "yetenekKalan", "yetenekDx", "yetenekDz", "yetenekHx", "yetenekHz", "telegrafToplam", "kilitKalan", "sersemKalan", "vurdu",
  "kavisIsaret", "zincirKalan", "zincirBekleme", "emisBekleme",
] as const satisfies readonly (keyof Topac)[];

/** Durumun sayısal özeti (sabit sıra). */
export function durumSayilari(d: Dunya): number[] {
  const s: number[] = [d.tick, d.tohum, d.temasKilidi, FAZ_KODU[d.mac.faz], d.mac.puan[0], d.mac.puan[1]];
  const so = d.mac.sonuc;
  if (so) s.push(1, SONUC_KODU[so.tur], so.kazanan, so.kaybeden, so.puan, so.tick);
  else s.push(0, -1, -1, -1, 0, -1);
  for (const t of d.topaclar) for (const a of TOPAC_ALANLARI) s.push(t[a]);
  // D2: maç fazı, saat, ani ölüm, çanak, takımlar (sabit sıra)
  const m = d.mac;
  s.push(MOD_KODU[m.mod], m.kalanTick, m.kutlamaKalan, m.saat, m.aniOlum, m.aniOlumTick, m.turNo, d.arenaYaricap);
  const ms = m.macSonucu;
  if (ms) s.push(1, ms.kazanan, NEDEN_KODU[ms.neden], ms.tick);
  else s.push(0, -1, -1, -1);
  if (d.takimlar) {
    for (const tk of d.takimlar) {
      s.push(tk.aktif, tk.geriCekHedef, tk.geriCekBekleme, tk.secim, tk.elenen);
      for (const u of tk.uyeler) s.push(u.stamina, u.tik, u.enerji, u.elendi, u.bekleme1, u.bekleme2, u.yapayIndirim);
    }
  }
  // D3: alanlar, engeller, ulti, Enerji kilitleri, Kararma, seviye, Taklit kaynağı
  for (const a of d.alanlar) {
    if (a) s.push(1, a.no, a.olcek, a.sahip, a.x, a.z, a.yaricap, a.kalan, a.toplam, a.isaret);
    else s.push(0);
  }
  s.push(d.engeller.length);
  for (const e of d.engeller) s.push(e.x, e.z, e.r, e.can, e.sahip, e.kalan);
  s.push(d.ultiKullanildi[0], d.ultiKullanildi[1], d.ultiKilit, d.yakinGecisBekleme, d.kararma[0], d.kararma[1], d.seviye[0], d.seviye[1], d.sonYetenek[0], d.sonYetenek[1]);
  // D8: Takım Enerjisi ve Takım Ultisi yalnız maç kipinde (tek tur senaryolarının hash'i değişmez)
  if (d.takimlar) s.push(d.takimEnerji[0], d.takimEnerji[1], d.takimUltiKullanildi[0], d.takimUltiKullanildi[1]);
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
