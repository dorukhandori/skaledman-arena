import type { Yon } from "../atlas.ts";
import type { DovuscuProfili } from "../dovuscu.ts";
import { AYAR } from "../kurallar/ayar.ts";
import { YUVA_SAYISI } from "../kurallar/hamleler.ts";
import { type Arena, varsayilanArena } from "./Arena.ts";
import { dashBaslat, dovuscuAyir, hareketAdimla } from "./adim.ts";
import { type Girdi, girdiTemizle } from "./Girdi.ts";
import { hamleBaslat, hamleIlerlet } from "./hamle.ts";
import { alanlariIlerlet, mermileriIlerlet } from "./mermiler.ts";
import { durumlariIsle } from "./durumlar.ts";
import type { Dovuscu, Dunya } from "./durum.ts";
import { bosKademe, kademeleriIsle } from "./kademe.ts";
import { degisimIste, takimHpOrani, takimIlerlet, takimKur, uyeKo, yasayanUyeVar } from "./takim.ts";
import { dinlenmeGuncelle, ziplaBaslat, ziplaIsle } from "./zipla.ts";

export type { Dunya, Dovuscu } from "./durum.ts";

// Simülasyonun giriş noktası. Mutasyona açık tek durum nesnesi; render yalnız okur.
// Sıra: zamanlayıcılar → takım geçişi → eylemler → hareket → hamleler → mermi/alan → bitiş kontrolü.

const YON_VEKTORU: readonly (readonly [number, number])[] = [
  [0, 1], [Math.SQRT1_2, Math.SQRT1_2], [1, 0], [Math.SQRT1_2, -Math.SQRT1_2],
  [0, -1], [-Math.SQRT1_2, -Math.SQRT1_2], [-1, 0], [-Math.SQRT1_2, Math.SQRT1_2],
];

function dovuscuKur(indeks: number, profil: DovuscuProfili, arena: Arena): Dovuscu {
  const dogum = arena.dogum[indeks]!;
  const [yonX, yonZ] = YON_VEKTORU[dogum.yon]!;
  return {
    indeks, x: dogum.x, z: dogum.z, yonX, yonZ, yon: dogum.yon as Yon, hizX: 0, hizZ: 0,
    hp: profil.maxHp, maxHp: profil.maxHp, itX: 0, itZ: 0, itKalan: 0,
    dashKalan: 0, dashX: 0, dashZ: 0, dashBekleme: 0, dokunulmaz: 0, hitStun: 0, takilma: 0,
    cooldown: new Array<number>(YUVA_SAYISI).fill(0), hamle: null,
    yanik: 0, yanikSayac: 0, felc: 0, felcSayac: 0, olu: false,
    ziplaKalan: 0, yukseklik: 0, ziplaBekleme: 0, enerji: 1, dinleniyor: false,
    kademe: bosKademe(), kademeKalan: bosKademe(), gecis: null, sahaDisi: false,
  };
}

/** Oyuncu başına tek profil ya da en çok 3 kartlık takım (ilk kart sahaya çıkar). */
export type OyuncuKadrosu = DovuscuProfili | readonly DovuscuProfili[];

export function dunyaKur(
  kadrolar: readonly OyuncuKadrosu[], tohum: number, arena: Arena = varsayilanArena(), hasarCarpani: number = AYAR.hasarCarpani,
): Dunya {
  const takimlar = kadrolar.map((k) => takimKur(Array.isArray(k) ? k : [k as DovuscuProfili]));
  const profiller = takimlar.map((t) => t.profiller[0]!);
  return {
    tick: 0, tohum, rngSira: 0, sonrakiId: 1, kalanSure: AYAR.mac.sure, hasarCarpani, arena,
    profiller, takimlar, dovusculer: profiller.map((p, i) => dovuscuKur(i, p, arena)),
    mermiler: [], alanlar: [], olaylar: [], sonuc: null,
  };
}

function zamanlayicilar(d: Dunya, dv: Dovuscu, dt: number): void {
  const azalt = (v: number, h = dt) => (v > 0 ? Math.max(0, v - h) : 0);
  dv.dashBekleme = azalt(dv.dashBekleme);
  dv.dokunulmaz = azalt(dv.dokunulmaz);
  dv.hitStun = azalt(dv.hitStun);
  const cdAdim = dt * (dv.dinleniyor ? AYAR.dinlen.cooldownHizi : 1);
  for (let k = 0; k < dv.cooldown.length; k++) dv.cooldown[k] = azalt(dv.cooldown[k]!, cdAdim);
  kademeleriIsle(d, dv, dt);
  ziplaIsle(d, dv, dt);
}

function eylemler(d: Dunya, i: number, g: Girdi): void {
  const dv = d.dovusculer[i]!;
  degisimIste(d, i, g);
  if (dv.olu || dv.gecis || dv.hitStun > 0 || dv.takilma > 0) { dv.dinleniyor = false; return; }
  dinlenmeGuncelle(dv, g);
  const atilisYok = !dv.hamle || dv.hamle.evre === "aviso";
  if (g.dash && dv.dashBekleme <= 0 && dv.dashKalan <= 0 && atilisYok) dashBaslat(d, i, g);
  if (g.zipla) ziplaBaslat(d, i);
  if (g.atesle && dv.dashKalan <= 0 && !dv.hamle) hamleBaslat(d, i, g);
}

function bitisKontrolu(d: Dunya): void {
  for (const dv of d.dovusculer) {
    if (dv.hp > 0 || dv.olu) continue;
    Object.assign(dv, { olu: true, hamle: null, dashKalan: 0, gecis: null, dinleniyor: false, ziplaKalan: 0, yukseklik: 0 });
    d.olaylar.push({ tur: "ko", kim: dv.indeks });
    uyeKo(d, dv.indeks);
  }
  const kaybeden = d.takimlar.map((t, i) => (yasayanUyeVar(t) ? -1 : i)).filter((i) => i >= 0);
  if (kaybeden.length > 0) {
    const kazanan = kaybeden.length === 1 ? 1 - kaybeden[0]! : null;
    d.sonuc = { kazanan, neden: "ko" };
  } else if (d.kalanSure <= 0) {
    d.kalanSure = 0;
    const a = takimHpOrani(d, 0);
    const b = takimHpOrani(d, 1);
    d.sonuc = { kazanan: a === b ? null : a > b ? 0 : 1, neden: "sure" };
  }
  if (d.sonuc) d.olaylar.push({ tur: "fin", kazanan: d.sonuc.kazanan, neden: d.sonuc.neden });
}

/** Bir sabit adım. Maç bitmişse hiçbir şey yapmaz. */
export function adim(d: Dunya, girdiler: readonly Girdi[], dt: number = AYAR.dt): void {
  d.olaylar = [];
  if (d.sonuc) return;
  d.tick++;
  d.kalanSure -= dt;
  const g = d.dovusculer.map((_, i) => girdiTemizle(girdiler[i]!));

  // Eşzamanlı vuruşlarda ilk işlenen avantajlı olmasın: sıra her adımda dönüşümlü.
  const sira = d.dovusculer.map((dv) => dv.indeks);
  if (d.tick % 2 === 1) sira.reverse();

  for (const dv of d.dovusculer) { zamanlayicilar(d, dv, dt); durumlariIsle(d, dv, dt); }
  for (const i of sira) takimIlerlet(d, i, dt);
  for (const i of sira) eylemler(d, i, g[i]!);
  for (const i of sira) hareketAdimla(d, i, g[i]!, dt);
  dovuscuAyir(d);
  for (const i of sira) hamleIlerlet(d, i, dt);
  mermileriIlerlet(d, dt);
  alanlariIlerlet(d, dt);
  bitisKontrolu(d);
}
