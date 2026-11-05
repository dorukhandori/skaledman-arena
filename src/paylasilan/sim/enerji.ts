import { AYAR } from "../kurallar/ayar.ts";
import type { TopacProfili } from "../veri/profil.ts";
import type { Dunya, Topac } from "./durum.ts";
import { kok2, kusakta } from "./fizik.ts";
import { aktifMi, staminaOrani } from "./topac.ts";

// Enerji (tuning § 8, § 11; 01 § 4.1). Tek kapı `enerjiKazan`: dolum çarpanı (uyum × Kriz Alevi × Göktaşı girişi),
// Ulti kilidi (flint #14: ulti süresince ve +1 s hiçbir topaçta dolmaz), tavan 3 dilim (taşan kaybolur), dilim olayı.
// Kaynaklar: pasif (Sıkı Dönüş'te durur), risk (kuşak / kenar, büyüğü), yakın geçiş (iki tarafa, bekleme 2 s),
// çarpışma (vuran ve vurulan ayrı, zıt element × 1,25), hasar alma (50 · H / maxStamina). Komşu devralma +40 mac.ts'te.
// D8: aynı kapıdan Takım Enerjisi (4. dilim) %25 dolar; ulti kilidi ona da uygulanır.

const E = AYAR.enerji;
const Y = AYAR.yetenek;
const dt = AYAR.dt;
const r = AYAR.topacYaricap;
export const ENERJI_TAVAN = E.dilim * E.metreDilim;
/** D8: Takım Enerjisi tavanı (paylaşılan 4. dilim). */
export const TAKIM_ENERJI_TAVAN = E.takimDilim;
const GIRIS_YAVAS_ADIM = Math.round(Y.girisYavasSn * AYAR.adimHz);
const YAKIN_BEKLEME_ADIM = Math.round(E.yakinGecisBekleme * AYAR.adimHz);

/** Bu topacın şu anki dolum çarpanı. */
export function dolumCarpani(t: Topac, p: TopacProfili): number {
  let c = p.uyumCarpani;
  if (p.krizEnerji !== 1 && staminaOrani(t, p) < Y.krizEsik) c *= p.krizEnerji;
  if (p.girisYavas && t.sahadaTick < GIRIS_YAVAS_ADIM) c *= Y.girisYavasCarpan;
  return c;
}

/** Ham kazanımı çarpanla ekler; ulti kilidinde ya da topaç sahada değilken etkisiz. */
export function enerjiKazan(d: Dunya, i: number, ham: number): void {
  if (ham <= 0 || d.ultiKilit > 0) return;
  const t = d.topaclar[i]!;
  if (!aktifMi(t)) return;
  const once = t.enerji;
  const kazanc = ham * dolumCarpani(t, d.profiller[i]!);
  let yeni = once + kazanc;
  if (yeni > ENERJI_TAVAN) yeni = ENERJI_TAVAN;
  // D8 Takım Enerjisi: topacın (çarpanlı, tavan öncesi) kazancının %25'i takıma; Takım Ultisi kullanıldıysa dolmaz
  if (d.takimlar && !d.takimUltiKullanildi[i]) {
    const te = d.takimEnerji[i]!;
    if (te < TAKIM_ENERJI_TAVAN) {
      let ty = te + kazanc * E.takimOran;
      if (ty >= TAKIM_ENERJI_TAVAN) { ty = TAKIM_ENERJI_TAVAN; d.olaylar.push({ tur: "takimEnerjiDoldu", tick: d.tick, i }); }
      d.takimEnerji[i] = ty;
    }
  }
  t.enerji = yeni;
  const a = Math.floor(once / E.dilim);
  const b = Math.floor(yeni / E.dilim);
  if (b > a) d.olaylar.push({ tur: "enerjiDoldu", tick: d.tick, i, dilim: b });
}

/** Çarpışma kazanımı (bir tarafın), Ş = μ·vn. */
export function carpismaEnerjisi(S: number, zitElement: boolean): number {
  let k = (E.carpismaKatsayi * S) / E.carpismaBolen;
  if (k < E.carpismaEnAz) k = E.carpismaEnAz;
  if (k > E.carpismaEnCok) k = E.carpismaEnCok;
  return zitElement ? k * E.zitElementCarpani : k;
}

export const hasarEnerjisi = (H: number, p: TopacProfili): number => (E.hasarKatsayi * H) / p.maxStamina;

/**
 * Adım sonu Enerji (çarpışma ve duvardan sonra, bitiş kararından önce): pasif, risk, yakın geçiş, bu adımın
 * çarpışma olayları. Yetenek hasarlarının Enerjisi verildikleri anda `enerjiKazan` ile eklenir.
 */
export function enerjiAdimi(d: Dunya): void {
  if (d.yakinGecisBekleme > 0) d.yakinGecisBekleme--;
  const R = d.arenaYaricap;
  const ham = [0, 0];
  let temas = false;
  for (const o of d.olaylar) {
    if (o.tur !== "carpisma") continue;
    temas = true;
    for (let k = 0; k < 2; k++) {
      ham[k]! += carpismaEnerjisi(o.s, o.zitElement);
      if (o.taraflar[k]!.hasar > 0) ham[k]! += hasarEnerjisi(o.taraflar[k]!.hasar, d.profiller[k]!);
    }
  }
  const [t0, t1] = d.topaclar;
  // yakın geçiş: boşluk < 20 br, bağıl hız > 150 br/s, temas yok (iki tarafa 3, bekleme 2 s)
  if (!temas && d.yakinGecisBekleme === 0 && aktifMi(t0) && aktifMi(t1) && t0.sekmeKalan === 0 && t1.sekmeKalan === 0) {
    const bosluk = kok2(t1.x - t0.x, t1.z - t0.z) - 2 * r;
    if (bosluk >= 0 && bosluk < E.yakinGecisBosluk && kok2(t1.vx - t0.vx, t1.vz - t0.vz) > E.yakinGecisBagilHiz) {
      ham[0]! += E.yakinGecis;
      ham[1]! += E.yakinGecis;
      d.yakinGecisBekleme = YAKIN_BEKLEME_ADIM;
    }
  }
  for (let i = 0; i < 2; i++) {
    const t = d.topaclar[i]!;
    if (!aktifMi(t)) continue;
    let h = ham[i]!;
    if (!t.sikiDonus) h += E.pasifDolum * dt;
    const kus = kusakta(t, R) ? E.kusakDolum : 0;
    const ken = kok2(t.x, t.z) > E.kenarOran * R ? E.kenarDolum : 0;
    h += (kus > ken ? kus : ken) * dt;
    enerjiKazan(d, i, h);
  }
}
