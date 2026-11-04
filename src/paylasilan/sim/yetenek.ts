import { AYAR } from "../kurallar/ayar.ts";
import type { TopacProfili } from "../veri/profil.ts";
import { YETENEK_SIM, type YetenekSim } from "../veri/yetenekSablon.ts";
import { hasarHesapla, kbCarpani, tikHesapla } from "./carpisma.ts";
import type { Alan, Dunya, Olay, Topac, YetenekReddi } from "./durum.ts";
import { enerjiKazan, hasarEnerjisi } from "./enerji.ts";
import { kok2 } from "./fizik.ts";
import type { Girdi } from "./Girdi.ts";
import { aktifMi, bedelOdenir, staminaOrani } from "./topac.ts";

// Yetenek / Özel Yetenek / Ulti (tuning § 8-9, § 21; flint #14-15; axiom #35). Paylaşılan sim: yalnız + - * /, sqrt.
// Akış: girdi `atesle` (bırakma anı) + `secilenYuva` → istek (iki oyuncu aynı ön-durumdan değerlendirilir: aynı adımda
// iki Ulti ikisi de çalışır) → telegraf (kalan adım) → etki (şablon) → bitiş. Hasar telegrafı kesmez; topaç biterse
// (Parçalanma / Ring Out / Durma) yeteneği ve alanı söner; tur kararından sonra hiçbir alan / engel kalmaz.

const Y = AYAR.yetenek;
const dt = AYAR.dt;
const r = AYAR.topacYaricap;
const ADIM = (s: number) => Math.round(s * AYAR.adimHz);
const ZINCIR_ARALIK = ADIM(Y.zincirAralik);
const EMIS_ARALIK = ADIM(Y.emisAralik);
const ULTI_SONRASI = ADIM(AYAR.enerji.ultiSonrasiKilit);
const KUCUK = 1e-9;
/** Ulti yuvası (0 tabanlı). */
export const ULTI_YUVA = 2;

/** Hareket çarpanları (1 / 0 = etkisiz); fizik bunları yalnız etkin değilse uygular (D2 float'ları korunur). */
export interface HareketEtkisi {
  ivme: number;
  tavan: number;
  surtunme: number;
  erime: number;
  ax: number;
  az: number;
  /** sürüş, dash, sekme kapalı */
  kilit: boolean;
  dashYok: boolean;
}

export const NOTR_HAREKET: Readonly<HareketEtkisi> = { ivme: 1, tavan: 1, surtunme: 1, erime: 1, ax: 0, az: 0, kilit: false, dashYok: false };

export function yetenekBilgisi(no: number): YetenekSim | null {
  return no >= 0 && no < YETENEK_SIM.length ? YETENEK_SIM[no]! : null;
}

/** Yuvanın Enerji bedeli (Yapay Uyum: ilk yetenek −100, alt sınır 50). */
export function yuvaBedeli(t: Topac, p: TopacProfili, yuva: number): number {
  const y = yetenekBilgisi(p.yetenekler[yuva] ?? -1);
  if (!y) return 0;
  let b = y.enerjiBedel;
  if (t.yapayIndirim && b > 0) { b -= Y.yapayIndirim; if (b < Y.yapayAltSinir) b = Y.yapayAltSinir; }
  return b;
}

/** Bir yuvanın şu anki durumu (sim kuralları; HUD da aynısını okur). null = kullanılabilir. */
export function yuvaDurumu(d: Dunya, i: number, yuva: number): YetenekReddi | null {
  const t = d.topaclar[i]!;
  const p = d.profiller[i]!;
  if (d.mac.faz !== "tur") return "faz";
  if (yuva < 0 || yuva > ULTI_YUVA) return "yok";
  const no = p.yetenekler[yuva]!;
  const y = yetenekBilgisi(no);
  if (!y) return "yok";
  if ((d.seviye[i] ?? 0) < Y.seviyeYuva[yuva]!) return "kilitli";
  if (yuva === ULTI_YUVA && d.ultiKullanildi[i]) return "ultiKullanildi";
  if (!aktifMi(t) || t.koruma > 0 || t.geriCekKalan > 0 || t.yetenekFaz !== 0 || t.kilitKalan > 0 || t.sersemKalan > 0) return "mesgul";
  if (yuva === ULTI_YUVA) {
    const rk = d.topaclar[1 - i]!;
    if (rk.yetenekFaz !== 0 && rk.yetenekYuva === ULTI_YUVA) return "rakipUlti";
  }
  if ((yuva === 0 ? t.bekleme1 : yuva === 1 ? t.bekleme2 : 0) > 0) return "bekleme";
  if (t.enerji < yuvaBedeli(t, p, yuva)) return "enerji";
  if (y.staminaYuzde > 0 && !bedelOdenir(t, (y.staminaYuzde / 100) * p.maxStamina)) return "stamina";
  return null;
}

/** Telegraf adımı: Kriz Alevi (kademe 1-2, stamina < %30) × çarpan, kaçılabilir yetenekte alt sınır 0,3 s. */
export function telegrafAdimi(y: YetenekSim, t: Topac, p: TopacProfili): number {
  let s = y.telegrafSn;
  if (y.kademe <= 2 && p.krizTelegraf !== 1 && staminaOrani(t, p) < Y.krizEsik) s *= p.krizTelegraf;
  if (y.kacilabilir && s < Y.telegrafAltSinir) s = Y.telegrafAltSinir;
  return ADIM(s);
}

/** Bir oyuncunun alanı ve engelleri söner (sahadan çıktı). */
export function sahipEtkileriniSil(d: Dunya, i: number): void {
  d.alanlar[i] = null;
  if (d.engeller.length) d.engeller = d.engeller.filter((e) => e.sahip !== i);
}

function yetenekSifirla(t: Topac): void {
  t.yetenekNo = -1; t.yetenekYuva = -1; t.etkinNo = -1; t.etkiOlcek = 1;
  t.yetenekFaz = 0; t.yetenekKalan = 0; t.telegrafToplam = 0;
  t.vurdu = 0; t.zincirKalan = 0; t.zincirBekleme = 0; t.emisBekleme = 0;
}

function yetenekKes(d: Dunya, i: number): void {
  const t = d.topaclar[i]!;
  if (t.yetenekFaz === 0) return;
  d.olaylar.push({ tur: "yetenekBitti", tick: d.tick, i, no: t.yetenekNo, kesildi: true });
  yetenekSifirla(t);
  t.kilitKalan = 0;
}

/** Tur kararı verildi: tüm yetenekler, alanlar ve engeller söner (flint #15). Beklemeler sürer. */
export function yetenekleriTemizle(d: Dunya): void {
  for (let i = 0; i < 2; i++) { yetenekKes(d, i); d.topaclar[i]!.sersemKalan = 0; }
  d.alanlar = [null, null];
  d.engeller = [];
}

/** Biten (Parçalanma / Ring Out / Durma) topacın yeteneği ve etkileri söner. */
export function bitenleriKes(d: Dunya): void {
  for (let i = 0; i < 2; i++) {
    if (aktifMi(d.topaclar[i]!)) continue;
    yetenekKes(d, i);
    sahipEtkileriniSil(d, i);
  }
}

/** Adım başı sayaçlar (yalnız tur içinde). */
export function yetenekSayaclari(d: Dunya): void {
  if (d.ultiKilit > 0) d.ultiKilit--;
  for (const t of d.topaclar) {
    if (!aktifMi(t)) continue;
    t.sahadaTick++;
    if (t.bekleme1 > 0) t.bekleme1--;
    if (t.bekleme2 > 0) t.bekleme2--;
    if (t.kilitKalan > 0) t.kilitKalan--;
    if (t.sersemKalan > 0) t.sersemKalan--;
    if (t.zincirBekleme > 0) t.zincirBekleme--;
    if (t.emisBekleme > 0) t.emisBekleme--;
  }
}

// ---------------------------------------------------------------------------------------------
// istekler

function yonBul(t: Topac, rakip: Topac, hx: number, hz: number): [number, number] {
  let dx = hx - t.x;
  let dz = hz - t.z;
  let u = kok2(dx, dz);
  if (u < 1) { dx = t.vx; dz = t.vz; u = kok2(dx, dz); }
  if (u < KUCUK) { dx = rakip.x - t.x; dz = rakip.z - t.z; u = kok2(dx, dz); }
  if (u < KUCUK) return [1, 0];
  return [dx / u, dz / u];
}

/** Alan / engel hedefi: nişan noktası, kullanandan en çok `alanMenzil`, çanağın içinde; tüm-çanak alanı merkezde. */
function hedefNokta(d: Dunya, t: Topac, y: YetenekSim, nx: number, nz: number): [number, number] {
  if (y.sablon !== "engel" && y.yaricap >= Y.tumCanakYaricap) return [0, 0];
  let hx = nx;
  let hz = nz;
  const ux = hx - t.x;
  const uz = hz - t.z;
  const u = kok2(ux, uz);
  if (u > Y.alanMenzil) { hx = t.x + (ux / u) * Y.alanMenzil; hz = t.z + (uz / u) * Y.alanMenzil; }
  const sinir = d.arenaYaricap - r;
  const m = kok2(hx, hz);
  if (m > sinir) { hx *= sinir / m; hz *= sinir / m; }
  return [hx, hz];
}

/** Önizleme (H9) için: yuvanın yeteneği bu nişanla nereye iner (sim ile aynı kırpma). */
export function yetenekHedefi(d: Dunya, i: number, no: number, nx: number, nz: number): [number, number] {
  const t = d.topaclar[i]!;
  const y = yetenekBilgisi(no);
  if (!y || y.sekil !== "daire") return [t.x, t.z];
  return hedefNokta(d, t, y, nx, nz);
}

/** Bu adımın yetenek istekleri. İki oyuncu ön-durumdan değerlendirilir, sonra birlikte başlatılır (sıra bağımsız). */
export function yetenekIstekleri(d: Dunya, g: readonly [Girdi, Girdi]): void {
  if (d.mac.faz !== "tur") return;
  const karar: (YetenekReddi | null | undefined)[] = [undefined, undefined];
  for (let i = 0; i < 2; i++) if (g[i]!.atesle) karar[i] = yuvaDurumu(d, i, g[i]!.secilenYuva);
  for (let i = 0; i < 2; i++) {
    const k = karar[i];
    if (k === undefined) continue;
    if (k !== null) { d.olaylar.push({ tur: "yetenekReddi", tick: d.tick, i, yuva: g[i]!.secilenYuva, neden: k }); continue; }
    yetenekBaslat(d, i, g[i]!);
  }
}

function yetenekBaslat(d: Dunya, i: number, g: Girdi): void {
  const t = d.topaclar[i]!;
  const p = d.profiller[i]!;
  const rakip = d.topaclar[1 - i]!;
  const yuva = g.secilenYuva;
  const no = p.yetenekler[yuva]!;
  const y = YETENEK_SIM[no]!;
  // bedel
  const bedel = yuvaBedeli(t, p, yuva);
  if (t.yapayIndirim && bedel > 0) t.yapayIndirim = 0;
  t.enerji -= bedel;
  if (y.staminaYuzde > 0) t.stamina -= (y.staminaYuzde / 100) * p.maxStamina;
  // Taklit: rakibin son kademe 1-2 yeteneğinin zayıf kopyası (yoksa kendi atılışı)
  let etkin = no;
  let olcek = 1;
  if (y.sablon === "taklit") {
    const k = d.sonYetenek[1 - i]!;
    if (k >= 0) { etkin = k; olcek = y.kopyaZayiflama; }
  }
  const e = YETENEK_SIM[etkin]!;
  const [dx, dz] = yonBul(t, rakip, g.nisanX, g.nisanZ);
  let hx = t.x;
  let hz = t.z;
  if (e.sekil === "daire") [hx, hz] = hedefNokta(d, t, e, g.nisanX, g.nisanZ);
  const tel = telegrafAdimi(y, t, p);
  t.yetenekNo = no;
  t.yetenekYuva = yuva;
  t.etkinNo = etkin;
  t.etkiOlcek = olcek;
  t.yetenekFaz = 1;
  t.yetenekKalan = tel;
  t.telegrafToplam = tel;
  t.yetenekDx = dx;
  t.yetenekDz = dz;
  t.yetenekHx = hx;
  t.yetenekHz = hz;
  t.vurdu = 0;
  t.kavisIsaret = p.donus === "sag" ? 1 : -1;
  if (e.kilitAdim > t.kilitKalan) t.kilitKalan = e.kilitAdim;
  if (yuva === 0) t.bekleme1 = y.beklemeAdim;
  else if (yuva === 1) t.bekleme2 = y.beklemeAdim;
  else {
    d.ultiKullanildi[i] = 1;
    const kilit = tel + e.sureAdim + ULTI_SONRASI;
    if (kilit > d.ultiKilit) d.ultiKilit = kilit;
  }
  if (y.kara && p.koken === "karanlik") d.kararma[i]! += Y.kararmaArtis;
  if (y.kademe <= 2 && y.sablon !== "taklit") d.sonYetenek[i] = no;
  d.yetenekSayisi[i]![yuva]!++;
  d.olaylar.push({ tur: "yetenekBasladi", tick: d.tick, i, no, etkinNo: etkin, yuva, kademe: y.kademe, x: hx, z: hz, dx, dz, telegraf: tel });
}

// ---------------------------------------------------------------------------------------------
// etki

/** Topaç i'nin alınan itme / hasar çarpanları ve vuruş f çarpanı (zırh, atılış penceresi, kilit). */
export function carpismaCarpanlari(d: Dunya, i: number): { f: number; kb: number; hasar: number } {
  const t = d.topaclar[i]!;
  let f = 1;
  let kb = 1;
  let hasar = 1;
  if (t.yetenekFaz === 0) return { f, kb, hasar };
  const y = YETENEK_SIM[t.etkinNo]!;
  const o = t.etkiOlcek;
  if (t.yetenekFaz === 2) {
    if (y.sablon === "zirh") { kb = y.kbCarpani; hasar = y.hasarAlmaCarpani; }
    else if (y.hasarKatsayisi > 0 && (y.sablon === "atilis" || y.sablon === "kavis" || y.sablon === "taklit" || y.sablon === "zincir" || y.sablon === "emis" || y.sablon === "cekim")) {
      f = o === 1 ? y.hasarKatsayisi : 1 + (y.hasarKatsayisi - 1) * o;
    }
  }
  if (t.kilitKalan > 0 && y.kilitHasarAlma !== 1) hasar *= y.kilitHasarAlma;
  return { f, kb, hasar };
}

/** Yetenek isabeti (temassız): Ş = μ·|itme| ile tuning § 5 hasar ve tık formülü, f_vuran = hasarKatsayisi. */
function sanalDarbe(d: Dunya, k: number, j: number, nx: number, nz: number, itme: number, hasarK: number, no: number): void {
  const tj = d.topaclar[j]!;
  if (!aktifMi(tj) || tj.koruma > 0 || tj.sekmeKalan > 0) return; // havadaki (Sekme) ve korunan topaç etkilenmez
  const pk = d.profiller[k]!;
  const pj = d.profiller[j]!;
  const mk = pk.sim.etkinKutle;
  const mj = pj.sim.etkinKutle;
  const S = ((mk * mj) / (mk + mj)) * (itme < 0 ? -itme : itme);
  const c = carpismaCarpanlari(d, j);
  let H = hasarK > 0 ? hasarHesapla(S, pj, 0, pk, hasarK) : 0;
  if (c.hasar !== 1) H *= c.hasar;
  const dTik = hasarK > 0 ? tikHesapla(S, pj, pk, hasarK) : 0;
  let kb = kbCarpani(tj, pj);
  if (c.kb !== 1) kb *= c.kb;
  tj.vx += nx * itme * kb;
  tj.vz += nz * itme * kb;
  tj.stamina -= H;
  tj.tik += dTik;
  d.olaylar.push({ tur: "yetenekVurus", tick: d.tick, i: k, hedef: j, no, hasar: H, x: tj.x, z: tj.z, nx, nz });
  if (H > 0) enerjiKazan(d, j, hasarEnerjisi(H, pj));
}

/** Yetenek kaynaklı doğrudan stamina hasarı (zincir, alan): zırh çarpanı, Sekme ve koruma muafiyeti. */
function dogrudanHasar(d: Dunya, j: number, miktar: number): number {
  const tj = d.topaclar[j]!;
  if (!aktifMi(tj) || tj.koruma > 0 || tj.sekmeKalan > 0) return 0;
  const c = carpismaCarpanlari(d, j);
  const H = c.hasar !== 1 ? miktar * c.hasar : miktar;
  tj.stamina -= H;
  enerjiKazan(d, j, hasarEnerjisi(H, d.profiller[j]!));
  return H;
}

/** Emiş: rakipten çal, kendine ekle (tavan max). */
function emisUygula(d: Dunya, i: number, miktar: number, no: number): void {
  const j = 1 - i;
  const H = dogrudanHasar(d, j, miktar);
  if (H <= 0) return;
  const t = d.topaclar[i]!;
  const p = d.profiller[i]!;
  t.stamina += H;
  if (t.stamina > p.maxStamina) t.stamina = p.maxStamina;
  const tj = d.topaclar[j]!;
  d.olaylar.push({ tur: "yetenekVurus", tick: d.tick, i, hedef: j, no, hasar: H, x: tj.x, z: tj.z, nx: 0, nz: 0 });
}

const KOK_YARIM = Math.sqrt(0.5);
/** Çoklu engel yerleşimi: hedefin çevresinde çapraz dört nokta (birim). */
const ENGEL_DIZILIM: readonly [number, number][] = [[KOK_YARIM, KOK_YARIM], [-KOK_YARIM, KOK_YARIM], [-KOK_YARIM, -KOK_YARIM], [KOK_YARIM, -KOK_YARIM]];
/** VARSAYIM: çoklu engelde hedef çevresindeki mesafe (br). */
const ENGEL_HALKA = 78;

function etkiBaslat(d: Dunya, i: number): void {
  const t = d.topaclar[i]!;
  const j = 1 - i;
  const rk = d.topaclar[j]!;
  const y = YETENEK_SIM[t.etkinNo]!;
  const o = t.etkiOlcek;
  t.yetenekFaz = 2;
  t.yetenekKalan = y.sablon === "kontra" ? y.karsiPencereAdim : y.sureAdim;
  if (t.yetenekKalan < 1) t.yetenekKalan = 1;
  const dx = t.yetenekDx;
  const dz = t.yetenekDz;
  const rx = rk.x - t.x;
  const rz = rk.z - t.z;
  const rm = kok2(rx, rz);
  const menzilde = (yc: number) => aktifMi(rk) && rm <= yc + r;
  switch (y.sablon) {
    case "atilis":
    case "taklit": {
      const v = (y.atilisHizi > 0 ? y.atilisHizi : Y.varsayilanAtilisHizi) * (y.sablon === "atilis" && y.hizCarpani !== 1 && y.hizCarpani > 0 ? y.hizCarpani : 1);
      t.vx = dx * v;
      t.vz = dz * v;
      break;
    }
    case "kavis": {
      // yay kirişi: hedefe Rk yarıçaplı yayla varmak için başlangıç yönü açısı α, sin α = L / (2 Rk)
      const v = (y.atilisHizi > 0 ? y.atilisHizi : Y.varsayilanAtilisHizi) * (y.hizCarpani > 0 ? y.hizCarpani : 1);
      const hx = aktifMi(rk) ? rk.x - t.x : dx * 150;
      const hz = aktifMi(rk) ? rk.z - t.z : dz * 150;
      const L = kok2(hx, hz);
      const ux = L > KUCUK ? hx / L : dx;
      const uz = L > KUCUK ? hz / L : dz;
      let sa = L / (2 * y.kavisYaricap);
      if (sa > 1) sa = 1;
      const ca = Math.sqrt(1 - sa * sa);
      const s = -t.kavisIsaret; // önce dışa aç, sonra içe kıvrıl
      const bx = ux * ca - s * uz * sa;
      const bz = uz * ca + s * ux * sa;
      t.vx = bx * v;
      t.vz = bz * v;
      t.yetenekDx = bx;
      t.yetenekDz = bz;
      break;
    }
    case "zincir":
      t.zincirKalan = y.zincirSayisi;
      t.zincirBekleme = 0;
      break;
    case "alan":
    case "takim": {
      const a: Alan = { no: y.no, olcek: o, sahip: i, x: t.yetenekHx, z: t.yetenekHz, yaricap: y.yaricap, kalan: y.sureAdim, toplam: y.sureAdim, isaret: t.kavisIsaret };
      d.alanlar[i] = a;
      if (y.itme !== 0 && menzilde(y.yaricap) && kok2(rk.x - a.x, rk.z - a.z) <= y.yaricap + r) {
        const ax = rk.x - a.x;
        const az = rk.z - a.z;
        const am = kok2(ax, az);
        sanalDarbe(d, i, j, am > KUCUK ? ax / am : dx, am > KUCUK ? az / am : dz, y.itme * o, y.hasarKatsayisi, y.no);
      }
      break;
    }
    case "dalga": {
      // yönlü şerit: kullanandan `dalgaMenzil` boyunca, genişlik `yaricap`
      const boy = rx * dx + rz * dz;
      const yan = rx * -dz + rz * dx;
      const yanMutlak = yan < 0 ? -yan : yan;
      if (aktifMi(rk) && boy >= 0 && boy <= y.dalgaMenzil + r && yanMutlak <= y.yaricap / 2 + r) sanalDarbe(d, i, j, dx, dz, y.itme * o, y.hasarKatsayisi, y.no);
      break;
    }
    case "sok":
      if (menzilde(y.yaricap)) sanalDarbe(d, i, j, rm > KUCUK ? rx / rm : dx, rm > KUCUK ? rz / rm : dz, y.itme * o, y.hasarKatsayisi, y.no);
      break;
    case "cekim":
      if (menzilde(y.yaricap)) sanalDarbe(d, i, j, rm > KUCUK ? rx / rm : dx, rm > KUCUK ? rz / rm : dz, y.itme * o, y.hasarKatsayisi, y.no);
      break;
    case "engel": {
      if (d.engeller.length) d.engeller = d.engeller.filter((e) => e.sahip !== i);
      const er = y.engelYaricap;
      const sinir = d.arenaYaricap - er - 4;
      for (let k = 0; k < y.engelSayisi; k++) {
        let ex = t.yetenekHx;
        let ez = t.yetenekHz;
        if (y.engelSayisi > 1) { const yon = ENGEL_DIZILIM[k % 4]!; ex += yon[0] * ENGEL_HALKA; ez += yon[1] * ENGEL_HALKA; }
        const m = kok2(ex, ez);
        if (m > sinir) { ex *= sinir / m; ez *= sinir / m; }
        d.engeller.push({ x: ex, z: ez, r: er, can: y.engelDayanikliligi, sahip: i, kalan: y.sureAdim });
      }
      break;
    }
    case "emis":
      if (menzilde(y.yaricap)) { emisUygula(d, i, (y.emisYuzde / 100) * d.profiller[j]!.maxStamina * o, y.no); t.emisBekleme = EMIS_ARALIK; }
      break;
    case "kontra":
    case "zirh":
      break;
  }
  d.olaylar.push({ tur: "yetenekEtki", tick: d.tick, i, no: t.yetenekNo, etkinNo: t.etkinNo, yuva: t.yetenekYuva, kademe: YETENEK_SIM[t.yetenekNo]!.kademe, x: t.yetenekHx, z: t.yetenekHz });
}

function etkiBitir(d: Dunya, i: number): void {
  const t = d.topaclar[i]!;
  const y = YETENEK_SIM[t.etkinNo]!;
  if (y.sablon === "kontra" && y.sersemAdim > 0) t.sersemKalan = y.sersemAdim; // kaçırdı: sersem
  d.olaylar.push({ tur: "yetenekBitti", tick: d.tick, i, no: t.yetenekNo, kesildi: false });
  yetenekSifirla(t);
}

/** Etki fazındaki adım başı davranış: kavis dümeni, zincir sıçraması, emiş yakınlığı. */
function etkiAdimi(d: Dunya, i: number): void {
  const t = d.topaclar[i]!;
  const j = 1 - i;
  const rk = d.topaclar[j]!;
  const y = YETENEK_SIM[t.etkinNo]!;
  const o = t.etkiOlcek;
  const rx = rk.x - t.x;
  const rz = rk.z - t.z;
  const rm = kok2(rx, rz);
  switch (y.sablon) {
    case "kavis": {
      if (t.vurdu) break;
      const v = kok2(t.vx, t.vz);
      if (v < KUCUK) break;
      const s = t.kavisIsaret;
      const ac = (v * v) / y.kavisYaricap;
      let nvx = t.vx + (-t.vz / v) * s * ac * dt;
      let nvz = t.vz + (t.vx / v) * s * ac * dt;
      const v2 = kok2(nvx, nvz);
      nvx *= v / v2;
      nvz *= v / v2;
      t.vx = nvx;
      t.vz = nvz;
      break;
    }
    case "zincir":
      if (t.zincirKalan > 0 && t.zincirBekleme === 0 && aktifMi(rk) && rk.sekmeKalan === 0 && rm <= y.yaricap + r) {
        const H = dogrudanHasar(d, j, (y.zincirStaminaYuzde / 100) * d.profiller[j]!.maxStamina * o);
        t.zincirKalan--;
        t.zincirBekleme = ZINCIR_ARALIK;
        d.olaylar.push({ tur: "zincir", tick: d.tick, i, hedef: j, x1: t.x, z1: t.z, x2: rk.x, z2: rk.z, hasar: H });
      }
      break;
    case "emis":
      if (t.emisBekleme === 0 && aktifMi(rk) && rm <= y.yaricap + r) { emisUygula(d, i, (y.emisYuzde / 100) * d.profiller[j]!.maxStamina * o, y.no); t.emisBekleme = EMIS_ARALIK; }
      break;
    default:
      break;
  }
}

/** Telegraf → etki → bitiş geçişleri ve etki adımı (hareketten önce). */
export function yetenekIlerlet(d: Dunya): void {
  for (let i = 0; i < 2; i++) {
    const t = d.topaclar[i]!;
    if (!aktifMi(t) || t.yetenekFaz === 0) continue;
    if (t.yetenekFaz === 1) {
      if (t.yetenekKalan > 0) t.yetenekKalan--;
      if (t.yetenekKalan > 0) continue;
      etkiBaslat(d, i);
      continue;
    }
    etkiAdimi(d, i);
    if (t.yetenekFaz !== 2) continue;
    t.yetenekKalan--;
    if (t.yetenekKalan <= 0) etkiBitir(d, i);
  }
}

/** Topaç i'nin bu adımdaki hareket çarpanları (kendi yeteneği, alanlar, rakibin çekimi). */
export function hareketEtkisi(d: Dunya, i: number): HareketEtkisi {
  const t = d.topaclar[i]!;
  let m: HareketEtkisi | null = null;
  const al = (): HareketEtkisi => (m ??= { ...NOTR_HAREKET });
  if (t.kilitKalan > 0 || t.sersemKalan > 0) { al().kilit = true; }
  if (t.yetenekFaz !== 0) {
    const y = YETENEK_SIM[t.etkinNo]!;
    const k = al();
    if (y.kendiHiz !== 1) { k.ivme *= y.kendiHiz; k.tavan *= y.kendiHiz; }
    const atilisli = y.sablon === "atilis" || y.sablon === "kavis" || y.sablon === "taklit";
    if (t.yetenekFaz === 2 && !atilisli && y.hizCarpani !== 1) { k.ivme *= y.hizCarpani; k.tavan *= y.hizCarpani; }
    if (t.yetenekFaz === 2 && atilisli && y.surtunmeCarpani !== 1) k.surtunme *= y.surtunmeCarpani;
    if (t.yetenekYuva === ULTI_YUVA) { k.dashYok = true; if (t.yetenekFaz === 1) k.ivme *= Y.ultiSurusCarpani; }
  }
  // zemin alanları (sahibine `kendineDeEtki` kadar)
  for (const a of d.alanlar) {
    if (!a) continue;
    const ax = t.x - a.x;
    const az = t.z - a.z;
    const am = kok2(ax, az);
    if (am > a.yaricap) continue;
    const y = YETENEK_SIM[a.no]!;
    const w = a.sahip === i ? y.kendineDeEtki : 1;
    if (w <= 0) continue;
    const k = al();
    const o = a.olcek;
    if (y.surtunmeCarpani !== 1) k.surtunme *= 1 + (y.surtunmeCarpani - 1) * w * o;
    if (y.ivmeCarpani !== 1) k.ivme *= 1 + (y.ivmeCarpani - 1) * w * o;
    if (y.erimeCarpani !== 1) k.erime *= 1 + (y.erimeCarpani - 1) * w * o;
    if (am > KUCUK && (y.cekim > 0 || y.yanKaymaItme > 0)) {
      const zc = carpismaCarpanlari(d, i).kb;
      if (y.cekim > 0) { k.ax -= (ax / am) * y.cekim * w * o * zc; k.az -= (az / am) * y.cekim * w * o * zc; }
      if (y.yanKaymaItme > 0) { k.ax += (-az / am) * a.isaret * y.yanKaymaItme * w * o * zc; k.az += (ax / am) * a.isaret * y.yanKaymaItme * w * o * zc; }
    }
  }
  // rakibin Çekim Darbesi: etki süresince 2 × yarıçap içinde kullanana doğru çekim
  const rk = d.topaclar[1 - i]!;
  if (rk.yetenekFaz === 2 && aktifMi(rk)) {
    const y = YETENEK_SIM[rk.etkinNo]!;
    if (y.sablon === "cekim" && y.cekim > 0) {
      const ax = rk.x - t.x;
      const az = rk.z - t.z;
      const am = kok2(ax, az);
      if (am > KUCUK && am <= 2 * y.yaricap + r) {
        const k = al();
        const zc = carpismaCarpanlari(d, i).kb;
        k.ax += (ax / am) * y.cekim * rk.etkiOlcek * zc;
        k.az += (az / am) * y.cekim * rk.etkiOlcek * zc;
      }
    }
  }
  return m ?? NOTR_HAREKET;
}

/** Çarpışma olayından sonra: atılış itmesi (bir kez), emiş çalması, kontra. */
export function temasSonrasi(d: Dunya, o: Extract<Olay, { tur: "carpisma" }>): void {
  for (let i = 0; i < 2; i++) {
    const t = d.topaclar[i]!;
    if (t.yetenekFaz !== 2 || !aktifMi(t)) continue;
    const y = YETENEK_SIM[t.etkinNo]!;
    const j = 1 - i;
    const nx = i === 0 ? o.nx : -o.nx;
    const nz = i === 0 ? o.nz : -o.nz;
    const s = t.etkiOlcek;
    if ((y.sablon === "atilis" || y.sablon === "kavis" || y.sablon === "taklit") && !t.vurdu && y.itme !== 0) {
      t.vurdu = 1;
      sanalDarbe(d, i, j, nx, nz, y.itme * s, 0, y.no);
    } else if (y.sablon === "emis") {
      emisUygula(d, i, (y.emisYuzde / 100) * d.profiller[j]!.maxStamina * s, y.no);
    } else if (y.sablon === "kontra") {
      const rk = d.topaclar[j]!;
      d.olaylar.push({ tur: "kontra", tick: d.tick, i, hedef: j, x: rk.x, z: rk.z });
      sanalDarbe(d, i, j, nx, nz, y.itme * s, y.hasarKatsayisi, y.no);
      d.olaylar.push({ tur: "yetenekBitti", tick: d.tick, i, no: t.yetenekNo, kesildi: false });
      yetenekSifirla(t); // tuttu: sersem yok
    }
  }
}

/** Engeller: statik daire, duvar gibi sektirir; sert darbede dayanıklılık düşer. Süre dolunca söner. */
export function engelAdimi(d: Dunya): void {
  if (!d.engeller.length) return;
  for (let i = 0; i < 2; i++) {
    const t = d.topaclar[i]!;
    if (!aktifMi(t) || t.sekmeKalan > 0) continue;
    for (const e of d.engeller) {
      if (e.can <= 0) continue;
      const dx = t.x - e.x;
      const dz = t.z - e.z;
      const min = r + e.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      let dist = Math.sqrt(d2);
      let nx = 1;
      let nz = 0;
      if (dist > KUCUK) { nx = dx / dist; nz = dz / dist; } else dist = 0;
      t.x = e.x + nx * min;
      t.z = e.z + nz * min;
      const vin = -(t.vx * nx + t.vz * nz);
      if (vin <= 0) continue;
      t.vx += (1 + AYAR.eDuvar) * vin * nx;
      t.vz += (1 + AYAR.eDuvar) * vin * nz;
      if (vin > Y.engelDarbeHizi && t.koruma <= 0) {
        t.stamina -= AYAR.kDuvar * vin;
        if (vin > AYAR.duvarTikHizi) t.tik += AYAR.duvarTik;
        e.can--;
        d.olaylar.push({ tur: "engelCarpma", tick: d.tick, i, x: e.x + nx * e.r, z: e.z + nz * e.r, kirildi: e.can <= 0 });
      }
    }
  }
}

/** Alan hasarı / emişi ve alan-engel süreleri (adım sonu, bitiş kararından önce). */
export function alanAdimi(d: Dunya): void {
  for (let s = 0; s < 2; s++) {
    const a = d.alanlar[s];
    if (!a) continue;
    const y = YETENEK_SIM[a.no]!;
    const j = 1 - a.sahip;
    const tj = d.topaclar[j]!;
    if ((y.alanHasarYuzdeSn > 0 || y.staminaEmisYuzdeSn > 0) && aktifMi(tj) && kok2(tj.x - a.x, tj.z - a.z) <= a.yaricap) {
      const max = d.profiller[j]!.maxStamina;
      if (y.alanHasarYuzdeSn > 0) dogrudanHasar(d, j, (y.alanHasarYuzdeSn / 100) * max * dt * a.olcek);
      if (y.staminaEmisYuzdeSn > 0) {
        const H = dogrudanHasar(d, j, (y.staminaEmisYuzdeSn / 100) * max * dt * a.olcek);
        const ts = d.topaclar[a.sahip]!;
        if (H > 0 && aktifMi(ts)) { ts.stamina += H; const m = d.profiller[a.sahip]!.maxStamina; if (ts.stamina > m) ts.stamina = m; }
      }
    }
    a.kalan--;
    if (a.kalan <= 0) d.alanlar[s] = null;
  }
  if (d.engeller.length) {
    for (const e of d.engeller) e.kalan--;
    d.engeller = d.engeller.filter((e) => e.kalan > 0 && e.can > 0);
  }
}
