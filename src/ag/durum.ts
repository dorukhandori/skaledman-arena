import type { TakimProfilleri } from "../paylasilan/sim/Dunya.ts";
import type {
  Alan, BitisTuru, Dunya, Engel, MacBitisNedeni, MacFazi, MacSonucu, Takim, Topac, TopacDurumKodu, TurSonucu,
} from "../paylasilan/sim/durum.ts";
import { TOPAC_ALANLARI } from "../paylasilan/sim/hash.ts";

// Maç durumu ağ şeması (protokol 3, docs/tech/netcode.md § 3). Ortak sözleşme: Colyseus'suz. Sunucu bu tablolardan
// `@colyseus/schema` sınıflarını kurar (src/sunucu/odalar/sema.ts), istemci SDK'nın çözdüğü durumu aynı alan
// adlarıyla okur. float32 YALNIZ wire biçimidir: sunucu sim'i float64 tam sürer (ADR-004, fround yok); istemcinin
// gördüğü değer f32'ye yuvarlanmıştır. `gorunumdenDunya(g, p, f32)` iki tarafta aynı f32 yuvarlamasıyla aynı Dunya'yı
// kurar → "wire hash" eşitliği (sunucu kendi şemasından, istemci aldığı durumdan; her 60 adımda).

export type AlanTuru = "f32" | "u8" | "u16" | "u32" | "i8" | "i16";

/** Topaç alanlarının wire türü. Hash'teki TÜM alanlar burada (test: TOPAC_ALANLARI ile birebir). */
export const TOPAC_TURLERI = {
  x: "f32", z: "f32", vx: "f32", vz: "f32", stamina: "f32", tik: "f32", durum: "u8",
  dashKalan: "u16", dashBekleme: "u16", sekmeKalan: "u16", sekmeBekleme: "u16", sikiDonus: "u8", sonumKalan: "u16",
  desenFaz: "f32", koruma: "u16", geriCekKalan: "u16", enerji: "f32",
  sahadaTick: "u32", bekleme1: "u16", bekleme2: "u16", yapayIndirim: "u8", yetenekNo: "i16", yetenekYuva: "i8", etkinNo: "i16",
  etkiOlcek: "f32", yetenekFaz: "u8", yetenekKalan: "u16", yetenekDx: "f32", yetenekDz: "f32", yetenekHx: "f32", yetenekHz: "f32",
  telegrafToplam: "u16", kilitKalan: "u16", sersemKalan: "u16", vurdu: "u8", kavisIsaret: "i8", zincirKalan: "u8",
  zincirBekleme: "u16", emisBekleme: "u16",
} as const satisfies Record<(typeof TOPAC_ALANLARI)[number], AlanTuru>;

export const UYE_TURLERI = {
  stamina: "f32", tik: "f32", enerji: "f32", elendi: "u8", bekleme1: "u16", bekleme2: "u16", yapayIndirim: "u8",
} as const;

export const TAKIM_TURLERI = { aktif: "u8", geriCekHedef: "i8", geriCekBekleme: "u16", secim: "i8", elenen: "u8" } as const;

export const ALAN_TURLERI = {
  var: "u8", no: "i16", olcek: "f32", sahip: "u8", x: "f32", z: "f32", yaricap: "f32", kalan: "u16", toplam: "u16", isaret: "i8",
} as const;

export const ENGEL_TURLERI = { x: "f32", z: "f32", r: "f32", can: "f32", sahip: "u8", kalan: "u16" } as const;

/** Maç fazı ve tur sonucu (düz sayılar). */
export const MAC_TURLERI = {
  faz: "u8", kalanTick: "u32", kutlamaKalan: "u16", saat: "u32", aniOlum: "u8", aniOlumTick: "u32", turNo: "u8",
  puan0: "u8", puan1: "u8",
  sonucVar: "u8", sonucTur: "u8", sonucKazanan: "i8", sonucKaybeden: "i8", sonucPuan: "u8", sonucTick: "u32",
  macSonucuVar: "u8", macKazanan: "i8", macNeden: "u8", macPuan0: "u8", macPuan1: "u8", macTick: "u32",
} as const;

/** Dünya kökü (diziler hariç). D8 (protokol 6): `takimEnerjisi` (4. dilim) ve `takimUlti` (maç başına bir kez). */
export const DUNYA_TURLERI = {
  tick: "u32", tohum: "u32", temasKilidi: "u16", arenaYaricap: "f32",
  ultiKullanildi0: "u8", ultiKullanildi1: "u8", ultiKilit: "u16", yakinGecisBekleme: "u16",
  kararma0: "u16", kararma1: "u16", seviye0: "u8", seviye1: "u8", sonYetenek0: "i16", sonYetenek1: "i16",
  ys00: "u16", ys01: "u16", ys02: "u16", ys10: "u16", ys11: "u16", ys12: "u16",
  takimEnerjisi0: "f32", takimEnerjisi1: "f32", takimUlti0: "u8", takimUlti1: "u8",
} as const;

export const FAZ_KODLARI: readonly MacFazi[] = ["geriSayim", "tur", "turArasi", "turBitti", "bitti"];
export const SONUC_KODLARI: readonly (BitisTuru | "berabere")[] = ["durma", "ringOut", "parcalanma", "berabere"];
export const NEDEN_KODLARI: readonly MacBitisNedeni[] = [
  "puan", "tukenme", "aniOlum", "surePuan", "sureStamina", "surePuanEsitlik", "yaziTura", "teslim", "hukmen", "iptal",
];

type Sayisal<T> = { -readonly [K in keyof T]: number };
export type TopacGorunumu = Sayisal<typeof TOPAC_TURLERI> & { uye: number; yon: number };
export type UyeGorunumu = Sayisal<typeof UYE_TURLERI>;
export type TakimGorunumu = Sayisal<typeof TAKIM_TURLERI> & { uyeler: Dizi<UyeGorunumu> };
export type AlanGorunumu = Sayisal<typeof ALAN_TURLERI>;
export type EngelGorunumu = Sayisal<typeof ENGEL_TURLERI>;
export type MacGorunumu = Sayisal<typeof MAC_TURLERI>;
export type DunyaGorunumu = Sayisal<typeof DUNYA_TURLERI> & {
  mac: MacGorunumu;
  topaclar: Dizi<TopacGorunumu>;
  takimlar: Dizi<TakimGorunumu>;
  alanlar: Dizi<AlanGorunumu>;
  engeller: Dizi<EngelGorunumu>;
};

/** SDK'nın ArraySchema'sı da düz dizi de olur: yalnız uzunluk ve `at`. */
export interface Dizi<T> { readonly length: number; at(i: number): T | undefined }

const kimlik = (x: number): number => x;
/** f32 yuvarlaması: sunucu kendi şemasını istemcinin göreceği değere indirger (sim'e GİRMEZ). */
export const f32 = (x: number): number => Math.fround(x);

function oku<T extends Record<string, AlanTuru>>(kaynak: Record<keyof T, number>, turler: T, yuvarla: (x: number) => number): Record<keyof T, number> {
  const s = {} as Record<keyof T, number>;
  for (const k of Object.keys(turler) as (keyof T)[]) {
    const v = kaynak[k];
    s[k] = turler[k] === "f32" ? yuvarla(v) : v;
  }
  return s;
}

function al<T>(d: Dizi<T>, i: number): T {
  const v = d.at(i);
  if (v === undefined) throw new Error(`durum dizisinde ${i}. eleman yok`);
  return v;
}

/**
 * Ağ görünümünden sim dünyası. `takimlar`: iki oyuncunun takım profilleri (`takimId`'den); etkin profil takımın
 * `aktif` üyesidir. `yuvarla`: sunucuda `f32` (wire hash için), istemcide de `f32` (zaten f32, etkisiz).
 */
export function gorunumdenDunya(g: DunyaGorunumu, takimlar: readonly [TakimProfilleri, TakimProfilleri], yuvarla: (x: number) => number = kimlik): Dunya {
  const m = oku(g.mac, MAC_TURLERI, yuvarla);
  const k = oku(g, DUNYA_TURLERI, yuvarla);
  const tk: [Takim, Takim] = [0, 1].map((i) => {
    const t = al(g.takimlar, i);
    const s = oku(t, TAKIM_TURLERI, yuvarla);
    const uyeler = [0, 1, 2].map((j) => ({ profil: takimlar[i]![j]!, ...oku(al(t.uyeler, j), UYE_TURLERI, yuvarla) }));
    return { ...s, uyeler: uyeler as Takim["uyeler"] };
  }) as [Takim, Takim];
  const topaclar = [0, 1].map((i) => {
    const t = oku(al(g.topaclar, i), TOPAC_TURLERI, yuvarla) as unknown as Topac;
    t.durum = t.durum as TopacDurumKodu;
    return t;
  }) as [Topac, Topac];
  const alanlar = [0, 1].map((i): Alan | null => {
    const a = oku(al(g.alanlar, i), ALAN_TURLERI, yuvarla);
    if (!a.var) return null;
    return { no: a.no, olcek: a.olcek, sahip: a.sahip, x: a.x, z: a.z, yaricap: a.yaricap, kalan: a.kalan, toplam: a.toplam, isaret: a.isaret };
  }) as [Alan | null, Alan | null];
  const engeller: Engel[] = [];
  for (let i = 0; i < g.engeller.length; i++) engeller.push(oku(al(g.engeller, i), ENGEL_TURLERI, yuvarla) as Engel);
  const sonuc: TurSonucu | null = m.sonucVar
    ? { tur: SONUC_KODLARI[m.sonucTur]!, kazanan: m.sonucKazanan, kaybeden: m.sonucKaybeden, puan: m.sonucPuan, tick: m.sonucTick }
    : null;
  const macSonucu: MacSonucu | null = m.macSonucuVar
    ? { kazanan: m.macKazanan, neden: NEDEN_KODLARI[m.macNeden]!, puan: [m.macPuan0, m.macPuan1], tick: m.macTick }
    : null;
  return {
    tick: k.tick,
    tohum: k.tohum,
    profiller: [tk[0].uyeler[tk[0].aktif]!.profil, tk[1].uyeler[tk[1].aktif]!.profil],
    topaclar,
    temasKilidi: k.temasKilidi,
    mac: {
      mod: "mac",
      faz: FAZ_KODLARI[m.faz]!,
      kalanTick: m.kalanTick,
      kutlamaKalan: m.kutlamaKalan,
      saat: m.saat,
      aniOlum: m.aniOlum,
      aniOlumTick: m.aniOlumTick,
      turNo: m.turNo,
      puan: [m.puan0, m.puan1],
      sonuc,
      macSonucu,
    },
    arenaYaricap: k.arenaYaricap,
    takimlar: tk,
    olaylar: [],
    alanlar,
    engeller,
    ultiKullanildi: [k.ultiKullanildi0, k.ultiKullanildi1],
    ultiKilit: k.ultiKilit,
    yakinGecisBekleme: k.yakinGecisBekleme,
    kararma: [k.kararma0, k.kararma1],
    seviye: [k.seviye0, k.seviye1],
    sonYetenek: [k.sonYetenek0, k.sonYetenek1],
    yetenekSayisi: [[k.ys00, k.ys01, k.ys02], [k.ys10, k.ys11, k.ys12]],
    takimEnerji: [k.takimEnerjisi0, k.takimEnerjisi1],
    takimUltiKullanildi: [k.takimUlti0, k.takimUlti1],
  };
}

// ---- yazma (sunucu): Dunya → düz alan nesneleri. Sunucu bunları şema örneklerine kopyalar. ----

export function topacAlanlari(t: Topac): Sayisal<typeof TOPAC_TURLERI> {
  const s = {} as Sayisal<typeof TOPAC_TURLERI>;
  for (const k of Object.keys(TOPAC_TURLERI) as (keyof typeof TOPAC_TURLERI)[]) s[k] = t[k];
  return s;
}

export function macAlanlari(d: Dunya): MacGorunumu {
  const m = d.mac;
  const so = m.sonuc;
  const ms = m.macSonucu;
  return {
    faz: FAZ_KODLARI.indexOf(m.faz), kalanTick: m.kalanTick, kutlamaKalan: m.kutlamaKalan, saat: m.saat, aniOlum: m.aniOlum,
    aniOlumTick: m.aniOlumTick, turNo: m.turNo, puan0: m.puan[0], puan1: m.puan[1],
    sonucVar: so ? 1 : 0, sonucTur: so ? SONUC_KODLARI.indexOf(so.tur) : 0, sonucKazanan: so ? so.kazanan : -1,
    sonucKaybeden: so ? so.kaybeden : -1, sonucPuan: so ? so.puan : 0, sonucTick: so ? so.tick : 0,
    macSonucuVar: ms ? 1 : 0, macKazanan: ms ? ms.kazanan : -1, macNeden: ms ? NEDEN_KODLARI.indexOf(ms.neden) : 0,
    macPuan0: ms ? ms.puan[0] : 0, macPuan1: ms ? ms.puan[1] : 0, macTick: ms ? ms.tick : 0,
  };
}

export function dunyaKokAlanlari(d: Dunya): Sayisal<typeof DUNYA_TURLERI> {
  const ys = d.yetenekSayisi;
  return {
    tick: d.tick, tohum: d.tohum, temasKilidi: d.temasKilidi, arenaYaricap: d.arenaYaricap,
    ultiKullanildi0: d.ultiKullanildi[0], ultiKullanildi1: d.ultiKullanildi[1], ultiKilit: d.ultiKilit,
    yakinGecisBekleme: d.yakinGecisBekleme, kararma0: d.kararma[0], kararma1: d.kararma[1], seviye0: d.seviye[0],
    seviye1: d.seviye[1], sonYetenek0: d.sonYetenek[0], sonYetenek1: d.sonYetenek[1],
    ys00: ys[0][0], ys01: ys[0][1], ys02: ys[0][2], ys10: ys[1][0], ys11: ys[1][1], ys12: ys[1][2],
    takimEnerjisi0: d.takimEnerji[0], takimEnerjisi1: d.takimEnerji[1],
    takimUlti0: d.takimUltiKullanildi[0], takimUlti1: d.takimUltiKullanildi[1],
  };
}

export function alanAlanlari(a: Alan | null): AlanGorunumu {
  if (!a) return { var: 0, no: -1, olcek: 0, sahip: 0, x: 0, z: 0, yaricap: 0, kalan: 0, toplam: 0, isaret: 0 };
  return { var: 1, no: a.no, olcek: a.olcek, sahip: a.sahip, x: a.x, z: a.z, yaricap: a.yaricap, kalan: a.kalan, toplam: a.toplam, isaret: a.isaret };
}

/** Dunya'nın düz (dizi = JS dizisi) görünümü: test ve sunucu için tek kaynak. */
export function dunyaGorunumu(d: Dunya): DunyaGorunumu {
  if (!d.takimlar) throw new Error("ağ durumu yalnız maç kipinde (takımlar var)");
  const tk = d.takimlar;
  return {
    ...dunyaKokAlanlari(d),
    mac: macAlanlari(d),
    topaclar: d.topaclar.map((t, i) => ({ ...topacAlanlari(t), uye: tk[i]!.aktif, yon: d.profiller[i]!.donus === "sol" ? -1 : 1 })),
    takimlar: tk.map((t) => ({
      aktif: t.aktif, geriCekHedef: t.geriCekHedef, geriCekBekleme: t.geriCekBekleme, secim: t.secim, elenen: t.elenen,
      uyeler: t.uyeler.map((u) => ({ stamina: u.stamina, tik: u.tik, enerji: u.enerji, elendi: u.elendi, bekleme1: u.bekleme1, bekleme2: u.bekleme2, yapayIndirim: u.yapayIndirim })),
    })),
    alanlar: d.alanlar.map(alanAlanlari),
    engeller: d.engeller.map((e) => ({ x: e.x, z: e.z, r: e.r, can: e.can, sahip: e.sahip, kalan: e.kalan })),
  };
}

/** Oda kökü (sunucu `OdaSema`): istemci SDK'nın çözdüğü durumu bu alan adlarıyla okur. */
export interface OyuncuGorunumu {
  oturum: string; ad: string; takimId: string; takimNo: string; bagli: boolean; hazir: boolean; rovans: boolean; bot: boolean;
  ack: number; ackTick: number; dondurmaHakki: number;
  /** v7: kozmetik malzeme (12 hane; sim dışı) */
  malzeme?: string;
}
export interface OdaGorunumu {
  faz: number; kod: string; izleKod: string; mod: string; macNo: number; secimKalan: number; beklemeKalan: number;
  donma: number; donmaKalan: number; kopan: number; dunyaVar: boolean;
  /** v7: harita maçının düğümü */
  dugum?: string;
  oyuncular: Dizi<OyuncuGorunumu>;
  dunya: DunyaGorunumu;
}
