import { AYAR } from "../kurallar/ayar.ts";
import { DERECE_BASINA_BIRIM, cosT, sinT } from "../kurallar/sinTablo.ts";
import type { Dunya } from "../sim/durum.ts";
import { kok2 } from "../sim/fizik.ts";
import { type Girdi, bosGirdi } from "../sim/Girdi.ts";
import { rastgele } from "../sim/rastgele.ts";
import { aktifMi, staminaOrani } from "../sim/topac.ts";
import { geriCekAcik } from "../sim/mac.ts";
import type { Tip } from "../veri/semalar.ts";
import { YETENEK_SIM } from "../veri/yetenekSablon.ts";
import { TAKIM_YUVA, ULTI_YUVA, yuvaDurumu, yuvaYetenegi } from "../sim/yetenek.ts";

// Paylaşılan bot (axiom § 2 #12): yalnız `Girdi` üretir, durumu yalnız okur; tohumlu ve saf:
// aynı (dünya, tohum) → aynı girdi. Sunucu botu, Antrenman, Topaç Lab ve bot turnuvası aynı kodu koşar.
// D1 kipleri: pasif / rota / saldirgan (Lab). D2 kademeleri (nile B-39): dolas (dolaş-çarp), kenar (kenara it,
// Ring Out hedefler; tuning H1), dayaniklilik (Sıkı Dönüş / stamina oyunu), kukla (Antrenman Kuklası: hareketsiz →
// yavaş). Maç kipinde tüm kademeler tur arası seçimini ve geri çeki de girdiyle yapar.

export type BotKipi = "pasif" | "rota" | "saldirgan" | "dolas" | "kenar" | "dayaniklilik" | "kukla";
export const BOT_KADEMELERI = ["dolas", "kenar", "dayaniklilik", "kukla"] as const satisfies readonly BotKipi[];

export const BOT_AYAR = {
  /** rota: merkez etrafında sabit yarıçaplı daire (birim), tur başına derece/s */
  rotaYaricap: 110,
  rotaHizi: 40,
  /** saldırgan: bu mesafede ve bu kosinüsle hizalıysa dash atar */
  dashMesafe: 150,
  dashCos: 0.9,
  /** saldırgan: kenara bu kadar yaklaşınca merkeze döner (oran · R) */
  kenarKorku: 0.78,
  /** adım başına dash denemesi olasılığı (insan gibi her fırsatta değil) */
  dashOlasilik: 0.08,
  /** hedefe yaklaşırken rastgele sapma (birim) */
  sapma: 40,
} as const;

export function botGirdisi(d: Dunya, i: number, kip: BotKipi, tohum: number): Girdi {
  if (kip === "dolas" || kip === "kenar" || kip === "dayaniklilik" || kip === "kukla") {
    const g = kademeGirdisi(d, i, kip, tohum);
    if (kip !== "kukla" && d.mac.faz === "tur" && aktifMi(d.topaclar[i]!)) {
      telegraftanKac(d, i, g, tohum);
      yetenekKarari(d, i, g, kip, tohum);
    }
    return g;
  }
  const g = bosGirdi();
  const ben = d.topaclar[i]!;
  const rakip = d.topaclar[1 - i]!;
  if (!aktifMi(ben) || kip === "pasif") return g;
  let hx: number;
  let hz: number;
  if (kip === "rota" || !aktifMi(rakip)) {
    const aci = d.tick * AYAR.dt * BOT_AYAR.rotaHizi * DERECE_BASINA_BIRIM + (i === 0 ? 0 : 128);
    hx = BOT_AYAR.rotaYaricap * cosT(aci);
    hz = BOT_AYAR.rotaYaricap * sinT(aci);
  } else {
    const sira = d.tick * 4 + i;
    hx = rakip.x + (rastgele(tohum, sira) * 2 - 1) * BOT_AYAR.sapma;
    hz = rakip.z + (rastgele(tohum, sira + 1) * 2 - 1) * BOT_AYAR.sapma;
    const dm = kok2(ben.x, ben.z);
    if (dm > BOT_AYAR.kenarKorku * AYAR.arenaYaricap) { hx = 0; hz = 0; }
  }
  let dx = hx - ben.x;
  let dz = hz - ben.z;
  const u = kok2(dx, dz);
  if (u > 1e-6) { dx /= u; dz /= u; g.yonX = dx; g.yonZ = dz; }
  if (kip === "saldirgan" && aktifMi(rakip)) {
    const rx = rakip.x - ben.x;
    const rz = rakip.z - ben.z;
    const rm = kok2(rx, rz);
    const hiz = kok2(ben.vx, ben.vz);
    const hizali = hiz > 1 && (ben.vx * rx + ben.vz * rz) / (hiz * rm) > BOT_AYAR.dashCos;
    if (rm < BOT_AYAR.dashMesafe && hizali && rastgele(tohum, d.tick * 4 + i + 2) < BOT_AYAR.dashOlasilik) {
      g.dash = true;
      g.yonX = rx / rm;
      g.yonZ = rz / rm;
    }
  }
  g.nisanX = rakip.x;
  g.nisanZ = rakip.z;
  return g;
}

// ---------------------------------------------------------------------------------------------
// D2 kademeleri

/** Kademe sayıları (birim, br/s, olasılık/adım). Bot davranışı: denge değil, sim'e girdi; tuning.md'de yok. */
export const KADEME_AYAR = {
  /** kenar: rakibin merkez tarafında bu kadar gerisine yerleşir */
  arkaMesafe: 75,
  /** kenar: yerleşme toleransı */
  yerlesme: 34,
  /** kenar: rakip merkezden en az bu oranda uzaktaysa itmeye girer (· R) */
  itmeEsigi: 0.3,
  /** dash mesafesi ve hizası */
  dashMesafe: 135,
  dashCos: 0.88,
  dashOlasilik: 0.12,
  /** kendini düşürmemek için: bu oranın dışında ve dışa gidiyorsa merkeze dön (· R) */
  kenarKorku: 0.72,
  /** dolaş: merkez etrafı yarıçap, açısal hız (derece/s), saldırı menzili */
  dolasYaricap: 70,
  dolasHizi: 50,
  dolasMenzil: 170,
  /** dayanıklılık: merkezde tutunma yarıçapı, Sıkı Dönüş mesafesi, kaçış ve karşı vuruş */
  tutunma: 55,
  sikiDonusMesafe: 165,
  kacisHizi: 140,
  kacisMesafe: 125,
  sekmeOlasilik: 0.35,
  saldiriOrani: 0.35,
  /** kukla: hareketsiz süre (s), sonra yavaş daire */
  kuklaBekle: 10,
  kuklaYaricap: 80,
  kuklaGuc: 0.4,
  /** dash beklemedeyken (vuruştan sonra) rakipten bu mesafede, merkez tarafında dolaşır */
  mesafeTut: 115,
  /** dash hazırken bir saldırı bloğunda saldırıya geçme olasılığı (insan gibi bekleme); blok adım */
  saldiriBaslat: 0.5,
  saldiriBlok: 45,
  /** geri çek: adım başına deneme olasılığı; yedek en az bu oranda olmalı */
  geriCekOlasilik: 0.03,
  geriCekYedekOrani: 0.5,
} as const;

/** Tip etiketine göre kademe (yalnız etiket; nile B-39, tuning § 13). */
export function botKademesiSec(tip: Tip): BotKipi {
  return tip === "dayanikli" ? "dayaniklilik" : tip === "kale" ? "dolas" : "kenar";
}

function yonVer(g: Girdi, dx: number, dz: number, guc = 1): void {
  const u = kok2(dx, dz);
  if (u > 1e-6) { g.yonX = (dx / u) * guc; g.yonZ = (dz / u) * guc; }
}

/** Tur arası seçim / geri çek hedefi: en yüksek stamina oranlı elenmemiş yedek (eşitlikte takım sırası). */
function enIyiYedek(d: Dunya, i: number): { uye: number; oran: number } {
  const tk = d.takimlar![i]!;
  let uye = -1;
  let oran = -1;
  for (let j = 0; j < 3; j++) {
    const u = tk.uyeler[j]!;
    if (j === tk.aktif || u.elendi) continue;
    const o = u.stamina / u.profil.maxStamina;
    if (o > oran) { oran = o; uye = j; }
  }
  return { uye, oran };
}

/** Rakipten `mesafe` uzakta, rakibin merkez tarafında, teğet kayarak bekle (vuruş sonrası yeniden konumlan). */
function mesafeTut(g: Girdi, ben: { x: number; z: number }, rakip: { x: number; z: number }, mesafe: number, isaret: number): void {
  let ux = ben.x - rakip.x;
  let uz = ben.z - rakip.z;
  const u = kok2(ux, uz) || 1;
  ux /= u; uz /= u;
  // merkeze doğru eğilim: hedef nokta rakip + u·mesafe, merkez tarafına çekilmiş, teğet kaydırılmış
  let hx = rakip.x + ux * mesafe - rakip.x * 0.35 - uz * 45 * isaret;
  let hz = rakip.z + uz * mesafe - rakip.z * 0.35 + ux * 45 * isaret;
  const hm = kok2(hx, hz);
  const sinir = 0.55 * AYAR.arenaYaricap;
  if (hm > sinir) { hx *= sinir / hm; hz *= sinir / hm; }
  yonVer(g, hx - ben.x, hz - ben.z);
}

function kademeGirdisi(d: Dunya, i: number, kip: "dolas" | "kenar" | "dayaniklilik" | "kukla", tohum: number): Girdi {
  const g = bosGirdi();
  const K = KADEME_AYAR;
  const ben = d.topaclar[i]!;
  const rakip = d.topaclar[1 - i]!;
  const p = d.profiller[i]!;
  const R = d.arenaYaricap;
  const sira = d.tick * 8 + i * 4;
  const zar = (k: number) => rastgele(tohum, sira + k);
  g.nisanX = rakip.x;
  g.nisanZ = rakip.z;

  // tur arası: seçim (kukla dahil; kukla sıradakini bekler)
  if (d.takimlar && d.mac.faz === "turArasi") {
    if (kip !== "kukla" && d.takimlar[i]!.secim === -2) g.degistir = enIyiYedek(d, i).uye;
    return g;
  }
  if (d.mac.faz !== "tur" || !aktifMi(ben)) return g;

  const dm = kok2(ben.x, ben.z);
  const vDisa = dm > 1e-6 ? (ben.vx * ben.x + ben.vz * ben.z) / dm : 0;
  const rx = rakip.x - ben.x;
  const rz = rakip.z - ben.z;
  const rm = kok2(rx, rz) || 1;
  const hiz = kok2(ben.vx, ben.vz);
  const hizali = hiz > 1 && (ben.vx * rx + ben.vz * rz) / (hiz * rm) > K.dashCos;
  const rakipAktif = aktifMi(rakip);

  // geri çek: stamina < %25 ve iyi bir yedek varsa, rakip yakında değilken
  if (d.takimlar && kip !== "kukla" && geriCekAcik(d, i) && rm > 100 && zar(0) < K.geriCekOlasilik) {
    const y = enIyiYedek(d, i);
    if (y.uye >= 0 && y.oran >= K.geriCekYedekOrani) g.degistir = y.uye;
  }

  if (kip === "kukla") {
    if (d.tick < K.kuklaBekle * AYAR.adimHz) return g;
    const aci = d.tick * AYAR.dt * 30 * DERECE_BASINA_BIRIM + (i === 0 ? 0 : 128);
    yonVer(g, K.kuklaYaricap * cosT(aci) - ben.x, K.kuklaYaricap * sinT(aci) - ben.z, K.kuklaGuc);
    return g;
  }

  // ortak kenar korkusu (dayanıklılık ve dolaş; kenar kademesi itme sırasında biraz daha cesur)
  const korku = kip === "kenar" ? K.kenarKorku + 0.06 : K.kenarKorku;
  if (dm > korku * R && vDisa > 0) { yonVer(g, -ben.x, -ben.z); return g; }
  if (!rakipAktif) { yonVer(g, -ben.x, -ben.z, 0.5); return g; }

  const dash = (olasilik: number) => {
    if (rm < K.dashMesafe && hizali && zar(1) < olasilik) { g.dash = true; g.yonX = rx / rm; g.yonZ = rz / rm; }
  };

  // saldırı izni: dash hazır ve (önceki adımda saldırıdaysa ya da zar tutarsa); yoksa yeniden konumlan
  const isaret = i === 0 ? 1 : -1;
  // saldırı pencereleri: 0,75 s'lik bloklar, her blokta tohumlu zar (hafızasız ama sürekli karar)
  const blok = Math.floor(d.tick / K.saldiriBlok);
  const saldiriyor = ben.dashBekleme === 0 && rastgele(tohum, blok * 16 + i + 7) < K.saldiriBaslat;

  if (kip === "dolas") {
    if (!saldiriyor && rm < K.dolasMenzil) { mesafeTut(g, ben, rakip, K.mesafeTut, isaret); return g; }
    if (rm < K.dolasMenzil) {
      yonVer(g, rx + (zar(2) * 2 - 1) * 30, rz + (zar(3) * 2 - 1) * 30);
      dash(K.dashOlasilik * 0.6);
    } else {
      const aci = d.tick * AYAR.dt * K.dolasHizi * DERECE_BASINA_BIRIM + (i === 0 ? 0 : 128);
      yonVer(g, K.dolasYaricap * cosT(aci) - ben.x, K.dolasYaricap * sinT(aci) - ben.z);
    }
    return g;
  }

  if (kip === "kenar") {
    // rakibin merkez tarafına geç, sonra dışa doğru it (dash ile)
    const rd = kok2(rakip.x, rakip.z);
    const ux = rd > 1e-6 ? rakip.x / rd : -(ben.x / (dm || 1));
    const uz = rd > 1e-6 ? rakip.z / rd : -(ben.z / (dm || 1));
    if (rd < K.itmeEsigi * R && saldiriyor) {
      // rakip merkezde: önce çarp, kenara yolla
      yonVer(g, rx, rz);
      dash(K.dashOlasilik * 0.5);
      return g;
    }
    if (!saldiriyor) { mesafeTut(g, ben, rakip, K.mesafeTut, isaret); return g; }
    const px = rakip.x - ux * K.arkaMesafe;
    const pz = rakip.z - uz * K.arkaMesafe;
    const icerde = ben.x * ux + ben.z * uz < rd - K.arkaMesafe * 0.5; // ben rakibin merkez tarafındayım
    const yerde = kok2(px - ben.x, pz - ben.z) < K.yerlesme;
    if (icerde && (yerde || rm < K.arkaMesafe * 1.3)) {
      yonVer(g, rx + ux * 40, rz + uz * 40);
      dash(K.dashOlasilik * 2);
    } else {
      // yerleşme noktasına git; rakibin yanından dolaş (teğet sapma)
      let hx = px - ben.x;
      let hz = pz - ben.z;
      if (rm < K.arkaMesafe * 1.2 && !icerde) { const t = (i === 0 ? 1 : -1) * 60; hx += -uz * t; hz += ux * t; }
      yonVer(g, hx, hz);
    }
    return g;
  }

  // dayanıklılık: merkezde Sıkı Dönüş, gelen saldırıdan kaç, yorgun rakibe karşı vur
  const rakipOran = staminaOrani(rakip, d.profiller[1 - i]!);
  const benOran = staminaOrani(ben, p);
  const yaklasma = -((rakip.vx - ben.vx) * rx + (rakip.vz - ben.vz) * rz) / rm; // rakip bana doğru hız
  if (rakipOran < K.saldiriOrani && benOran > rakipOran + 0.1) {
    yonVer(g, rx, rz);
    dash(K.dashOlasilik);
    return g;
  }
  if (yaklasma > K.kacisHizi && rm < K.kacisMesafe) {
    const t = zar(4) < 0.5 ? 1 : -1;
    yonVer(g, -rz * t - ben.x * 0.3, rx * t - ben.z * 0.3);
    if (rakip.dashKalan > 0 && rm < 90 && zar(5) < K.sekmeOlasilik) g.zipla = true;
    return g;
  }
  if (dm > K.tutunma) { yonVer(g, -ben.x, -ben.z, 0.7); return g; }
  if (rm > K.sikiDonusMesafe) { g.dinlen = true; return g; }
  if (rm < 80) { yonVer(g, rx, rz, 0.8); return g; }
  g.dinlen = hiz < 30;
  return g;
}

// ---------------------------------------------------------------------------------------------
// D3: yetenek kullanımı ve telegraftan kaçış (bot hile yapmaz: yalnız görünen durumu okur, telegraf rakibe de görünür)

/** Bot yetenek sayıları (davranış; tuning değil). */
export const BOT_YETENEK = {
  /** uygun anda adım başına kullanma olasılığı */
  olasilik: 0.08,
  /**
   * Ulti'ye adanmamış üyede tur başına hedef kademe (birikimli): < hedefYetenek → Yetenek, < hedefOzel → Özel
   * (Enerji yetene dek biriktirir), yoksa hedefsiz (Özel → Yetenek, hangisi hazırsa).
   */
  hedefYetenek: 0.4,
  hedefOzel: 0.75,
  /**
   * DENGE-1: takım üyesi başına (maç boyu tek zar) Ulti'ye adanma olasılığı, kademeye göre. Zorluk sırası nile B-39
   * kademelerinden (varsaydım): dolaş-çarp en kolay (az), kenara it ve dayanıklılık daha usta. Kukla hiç.
   */
  ultiHedef: { dolas: 0.35, kenar: 0.6, dayaniklilik: 0.6 } as Readonly<Record<string, number>>,
  /** DENGE-1: Ulti biriktiren bot stamina bu oranın (kritik eşik, tuning § 6) altına düşerse biriktirmeyi bırakır, eldekini harcar. */
  ultiVazgec: 0.25,
  /** atılış menzili (br) */
  atilisMenzil: 230,
  /** telegraf son bu kadar adımında içerideysek Sekme dene */
  sekmeAdim: 14,
  sekmeOlasilik: 0.5,
} as const;

/** Rakibin telegrafının tehlike bölgesinde miyim (ux § 2.2 şekilleri). */
export function telegrafTehlikesi(d: Dunya, i: number): { icinde: boolean; kacX: number; kacZ: number } {
  const ben = d.topaclar[i]!;
  const rk = d.topaclar[1 - i]!;
  const yok = { icinde: false, kacX: 0, kacZ: 0 };
  if (rk.yetenekFaz !== 1 || rk.etkinNo < 0) return yok;
  const y = YETENEK_SIM[rk.etkinNo]!;
  if (!y.kacilabilir) return yok;
  const r = AYAR.topacYaricap;
  if (y.sekil === "serit") {
    const bx = ben.x - rk.x;
    const bz = ben.z - rk.z;
    const boy = bx * rk.yetenekDx + bz * rk.yetenekDz;
    const yan = -bx * rk.yetenekDz + bz * rk.yetenekDx;
    const L = y.sablon === "dalga" ? y.dalgaMenzil : 260;
    const gen = y.sablon === "dalga" ? y.yaricap / 2 : r;
    if (boy < -r || boy > L + r || (yan < 0 ? -yan : yan) > gen + r) return yok;
    const s = yan >= 0 ? 1 : -1;
    return { icinde: true, kacX: -rk.yetenekDz * s, kacZ: rk.yetenekDx * s };
  }
  const cx = y.sekil === "daire" ? rk.yetenekHx : rk.x;
  const cz = y.sekil === "daire" ? rk.yetenekHz : rk.z;
  const R = y.sekil === "daire" ? y.yaricap + r : y.yaricap + 2 * r;
  const dx = ben.x - cx;
  const dz = ben.z - cz;
  const m = kok2(dx, dz);
  if (m > R) return yok;
  if (m < 1e-6) return { icinde: true, kacX: -ben.x || 1, kacZ: -ben.z };
  return { icinde: true, kacX: dx / m, kacZ: dz / m };
}

function telegraftanKac(d: Dunya, i: number, g: Girdi, tohum: number): void {
  const t = telegrafTehlikesi(d, i);
  if (!t.icinde) return;
  const ben = d.topaclar[i]!;
  // kaçış yönü, ama çanağın dışına değil: merkeze doğru eğilim
  const dm = kok2(ben.x, ben.z);
  let kx = t.kacX;
  let kz = t.kacZ;
  if (dm > 0.6 * d.arenaYaricap) { kx -= (ben.x / dm) * 0.8; kz -= (ben.z / dm) * 0.8; }
  yonVer(g, kx, kz);
  g.dinlen = false;
  const rk = d.topaclar[1 - i]!;
  if (rk.yetenekKalan <= BOT_YETENEK.sekmeAdim && ben.sekmeBekleme === 0 && rastgele(tohum, d.tick * 8 + i * 4 + 5000) < BOT_YETENEK.sekmeOlasilik) g.zipla = true;
}

/** Bu yetenek şu an rakibe karşı uygun mu (menzil / tehdit; tohumsuz, yalnız görünen durum). */
function yetenekUygun(d: Dunya, i: number, no: number, kip: BotKipi): boolean {
  const ben = d.topaclar[i]!;
  const rk = d.topaclar[1 - i]!;
  const y = YETENEK_SIM[no]!;
  const e = y.sablon === "taklit" && d.sonYetenek[1 - i]! >= 0 ? YETENEK_SIM[d.sonYetenek[1 - i]!]! : y;
  const rx = rk.x - ben.x;
  const rz = rk.z - ben.z;
  const rm = kok2(rx, rz) || 1;
  const yaklasma = -((rk.vx - ben.vx) * rx + (rk.vz - ben.vz) * rz) / rm;
  const r = AYAR.topacYaricap;
  switch (e.sablon) {
    case "atilis": case "kavis": case "taklit": return rm > 60 && rm < BOT_YETENEK.atilisMenzil;
    case "dalga": return rm < e.dalgaMenzil + r;
    case "zincir": return rm < e.yaricap + 3 * r;
    case "sok": case "cekim": case "emis": return rm < e.yaricap + r + 15;
    case "alan": case "takim": return e.yaricap >= AYAR.yetenek.tumCanakYaricap || rm < AYAR.yetenek.alanMenzil + 30;
    case "engel": return rm < AYAR.yetenek.alanMenzil;
    case "zirh": return rm < 150 && (yaklasma > 120 || rk.dashKalan > 0 || (kip === "dayaniklilik" && rm < 90));
    case "kontra": return rm < 130 && (yaklasma > 140 || rk.dashKalan > 0);
  }
  return false;
}

/**
 * D8 karar sırası: Takım Ultisi (hazırsa ve rakip menzildeyse) → Ulti → hedef kademe → daha ucuz yuva. Hepsi aynı
 * `yuvaDurumu` kurallarıyla. DENGE-1: Ulti hedefi sahadaki üye başına maç boyu tek zar (`ultiHedef[kip]`, kademeye göre);
 * Ulti'ye adanan üye Ulti hazır olana dek hiçbir şey harcamaz (300'e biriktirir), stamina `ultiVazgec` altına inerse
 * vazgeçip eldekini harcar. Adanmayan üye tur başına tohumlu Yetenek / Özel hedefiyle oynar (D3 davranışı).
 */
function yetenekKarari(d: Dunya, i: number, g: Girdi, kip: BotKipi, tohum: number): void {
  const ben = d.topaclar[i]!;
  const rk = d.topaclar[1 - i]!;
  if (ben.yetenekFaz !== 0 || !aktifMi(rk) || rk.koruma > 0) return;
  const B = BOT_YETENEK;
  if (rastgele(tohum, d.tick * 8 + i * 4 + 7000) >= B.olasilik) return;
  const at = (yuva: number): boolean => {
    if (yuvaDurumu(d, i, yuva) !== null) return false;
    const no = yuvaYetenegi(d, i, yuva);
    if (no < 0 || !yetenekUygun(d, i, no, kip)) return false;
    g.atesle = true;
    g.secilenYuva = yuva;
    g.nisanX = rk.x;
    g.nisanZ = rk.z;
    return true;
  };
  if (at(TAKIM_YUVA) || at(ULTI_YUVA)) return;
  const tk = d.takimlar?.[i];
  const uye = tk ? tk.aktif : 0;
  // Ulti adanması: üye başına maç boyu (tur numarasından bağımsız) zar
  if (rastgele(tohum, uye * 4 + i + 9500) < (B.ultiHedef[kip] ?? 0)) {
    const ud = yuvaDurumu(d, i, ULTI_YUVA);
    const bekler = ud !== "kilitli" && ud !== "ultiKullanildi" && ud !== "yok";
    if (bekler && staminaOrani(ben, d.profiller[i]!) >= B.ultiVazgec) return;
  }
  const zar = rastgele(tohum, d.mac.turNo * 16 + uye * 4 + i + 9000);
  const hedef = zar < B.hedefYetenek ? 0 : zar < B.hedefOzel ? 1 : 2;
  // Özel hedefliyse Enerjisi yetene dek biriktirir (D3 davranışı)
  if (hedef === 1 && yuvaDurumu(d, i, 1) === "enerji") return;
  for (let yuva = hedef > 1 ? 1 : hedef; yuva >= 0; yuva--) if (at(yuva)) return;
}
