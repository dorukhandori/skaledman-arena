import type { DovuscuProfili } from "../dovuscu.ts";
import { AYAR } from "../kurallar/ayar.ts";
import { YUVA_SAYISI } from "../kurallar/hamleler.ts";
import { konumCoz } from "./carpisma.ts";
import type { Girdi } from "./Girdi.ts";
import type { Dovuscu, Dunya, Takim, UyeDurumu } from "./durum.ts";
import { hamleIptal } from "./hamle.ts";
import { bosKademe } from "./kademe.ts";

// Takım geçişi (PokeRivals `capas`: geri 0,4 + boşluk 0,5 + çıkış 0,25 s; sonra 2 s bekleme; KO sonrası 5 s seçim).
// Aktif üyenin canlı değerleri Dovuscu'da durur; yedekler UyeDurumu'nda bekler.

function uyeKur(p: DovuscuProfili): UyeDurumu {
  return { hp: p.maxHp, maxHp: p.maxHp, cooldown: new Array<number>(YUVA_SAYISI).fill(0), yanik: 0, felc: 0, ko: false };
}

export function takimKur(profiller: readonly DovuscuProfili[]): Takim {
  const liste = profiller.slice(0, AYAR.takim.boyut);
  return { profiller: [...liste], uyeler: liste.map(uyeKur), aktif: 0, bekleme: 0, secimKalan: 0 };
}

export function yasayanUyeVar(t: Takim): boolean {
  return t.uyeler.some((u) => !u.ko);
}

/** Takımın kalan HP oranı (süre bitiminde kazananı belirler). */
export function takimHpOrani(d: Dunya, i: number): number {
  const t = d.takimlar[i]!;
  const dv = d.dovusculer[i]!;
  let hp = 0;
  let max = 0;
  t.uyeler.forEach((u, k) => {
    hp += k === t.aktif ? dv.hp : u.hp;
    max += u.maxHp;
  });
  return max > 0 ? hp / max : 0;
}

function geciseUygun(d: Dunya, i: number, hedef: number): boolean {
  const t = d.takimlar[i]!;
  const u = t.uyeler[hedef];
  return !!u && !u.ko && hedef !== t.aktif;
}

/** Düşüş noktası: nişan (Tab) ya da olduğu yer; mevcut konumdan en çok `dususMenzili`. */
function dususNoktasi(d: Dunya, dv: Dovuscu, g: Girdi): { x: number; z: number } {
  let x = dv.x;
  let z = dv.z;
  if (g.dusus) {
    const dx = g.nisanX - dv.x;
    const dz = g.nisanZ - dv.z;
    const u = Math.hypot(dx, dz);
    const k = u > AYAR.takim.dususMenzili ? AYAR.takim.dususMenzili / u : 1;
    x += dx * k;
    z += dz * k;
  }
  return konumCoz(d.arena, x, z, d.arena.govdeYaricap);
}

/** Girdideki geçiş isteği. Canlıyken geri çekilme başlar; KO seçimindeyken yeni üye hemen iner. */
export function degisimIste(d: Dunya, i: number, g: Girdi): void {
  if (g.degistir < 0 || !geciseUygun(d, i, g.degistir)) return;
  const t = d.takimlar[i]!;
  const dv = d.dovusculer[i]!;
  if (dv.olu) {
    if (t.secimKalan <= 0) return;
    const p = dususNoktasi(d, dv, g);
    t.secimKalan = 0;
    uyeyiCikar(d, i, g.degistir, p.x, p.z);
    return;
  }
  if (t.bekleme > 0 || dv.gecis || dv.hitStun > 0 || dv.takilma > 0 || dv.dashKalan > 0 || dv.ziplaKalan > 0) return;
  if (dv.hamle && dv.hamle.evre !== "aviso") return;
  hamleIptal(d, i);
  const p = dususNoktasi(d, dv, g);
  dv.dinleniyor = false;
  dv.gecis = { evre: "geri", kalan: AYAR.takim.geri, hedef: g.degistir, x: p.x, z: p.z };
  d.olaylar.push({ tur: "gecisBasladi", kim: i, hedef: g.degistir });
}

function aktifiKaydet(t: Takim, dv: Dovuscu): void {
  const u = t.uyeler[t.aktif]!;
  u.hp = dv.hp;
  u.cooldown = [...dv.cooldown];
  u.yanik = dv.yanik;
  u.felc = dv.felc;
}

/** Yeni üyeyi (x,z)'ye indirir: profil, HP, cooldown ve durumlar üyeden; kademeler sıfır. */
function uyeyiCikar(d: Dunya, i: number, hedef: number, x: number, z: number): void {
  const t = d.takimlar[i]!;
  const dv = d.dovusculer[i]!;
  if (!dv.olu) aktifiKaydet(t, dv);
  const u = t.uyeler[hedef]!;
  t.aktif = hedef;
  d.profiller[i] = t.profiller[hedef]!;
  Object.assign(dv, {
    x, z, hp: u.hp, maxHp: u.maxHp, cooldown: [...u.cooldown], yanik: u.yanik, felc: u.felc,
    yanikSayac: AYAR.yanik.aralik, felcSayac: AYAR.felc.aralik, olu: false, sahaDisi: false, hamle: null,
    hitStun: 0, takilma: 0, itKalan: 0, itX: 0, itZ: 0, dashKalan: 0, ziplaKalan: 0, yukseklik: 0,
    dinleniyor: false, kademe: bosKademe(), kademeKalan: bosKademe(), dokunulmaz: AYAR.takim.cikis,
    gecis: { evre: "cikis", kalan: AYAR.takim.cikis, hedef, x, z },
  });
  cikisItmesi(d, i);
  d.olaylar.push({ tur: "degisti", kim: i, uye: hedef, x, z });
}

/** İnişte yakındaki rakibi `cikisItme` kadar dışarı iter. */
function cikisItmesi(d: Dunya, i: number): void {
  const dv = d.dovusculer[i]!;
  const r = d.arena.govdeYaricap;
  for (const e of d.dovusculer) {
    if (e.indeks === i || e.olu || e.sahaDisi) continue;
    const dx = e.x - dv.x;
    const dz = e.z - dv.z;
    const u = Math.hypot(dx, dz);
    if (u >= 2 * r + AYAR.takim.cikisItme) continue;
    const nx = u < 1e-6 ? 1 : dx / u;
    const nz = u < 1e-6 ? 0 : dz / u;
    const c = konumCoz(d.arena, dv.x + nx * (2 * r + AYAR.takim.cikisItme), dv.z + nz * (2 * r + AYAR.takim.cikisItme), r);
    e.x = c.x;
    e.z = c.z;
  }
}

/** Sersemleten vuruş geri çekilmeyi bozar (hitKeser ile aynı ilke). */
export function gecisiBoz(d: Dunya, i: number): void {
  const dv = d.dovusculer[i]!;
  if (dv.gecis?.evre !== "geri") return;
  dv.gecis = null;
  d.olaylar.push({ tur: "hamleIptal", kim: i });
}

/** Her adım: geçiş evreleri, bekleme ve KO seçim süresi (dolarsa sıradaki yaşayan üye otomatik iner). */
export function takimIlerlet(d: Dunya, i: number, dt: number): void {
  const t = d.takimlar[i]!;
  const dv = d.dovusculer[i]!;
  if (t.bekleme > 0) t.bekleme = Math.max(0, t.bekleme - dt);
  if (t.secimKalan > 0) {
    t.secimKalan -= dt;
    if (t.secimKalan <= 0) {
      t.secimKalan = 0;
      const n = t.uyeler.length;
      for (let k = 1; k <= n; k++) {
        const aday = (t.aktif + k) % n;
        if (!t.uyeler[aday]!.ko) { uyeyiCikar(d, i, aday, dv.x, dv.z); break; }
      }
    }
    return;
  }
  const gc = dv.gecis;
  if (!gc) return;
  gc.kalan -= dt;
  if (gc.kalan > 0) return;
  if (gc.evre === "geri") {
    gc.evre = "bosluk";
    gc.kalan = AYAR.takim.bosluk;
    dv.sahaDisi = true;
  } else if (gc.evre === "bosluk") {
    uyeyiCikar(d, i, gc.hedef, gc.x, gc.z);
  } else {
    dv.gecis = null;
    t.bekleme = AYAR.takim.bekleme;
  }
}

/** Aktif üye KO oldu: işaretle; yedek varsa seçim süresi başlar. */
export function uyeKo(d: Dunya, i: number): void {
  const t = d.takimlar[i]!;
  const u = t.uyeler[t.aktif]!;
  u.ko = true;
  u.hp = 0;
  if (yasayanUyeVar(t)) {
    t.secimKalan = AYAR.takim.koSecim;
    d.olaylar.push({ tur: "secimBekliyor", kim: i, sure: t.secimKalan });
  }
}
