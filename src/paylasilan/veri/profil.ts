import { AYAR, ELEMENT_CARKI, ELEMENT_EGILIM, KOKEN_PASIF, type ElementAdi, type KokenAdi } from "../kurallar/ayar.ts";
import { DERECE_BASINA_BIRIM, cosT } from "../kurallar/sinTablo.ts";
import { cekirdekBul, diskBul, govdeBul, ucBul } from "./katalog.ts";
import type { Cekirdek, Desen, Disk, Govde, Tip, Uc } from "./semalar.ts";
import { ruhYuvalari } from "./yetenekSablon.ts";

// Parçalardan topaç profili (tuning.md § 13). Saf fonksiyon: aynı dört parça → aynı profil, her ortamda.

/** 00 § 5.2'nin sekiz parametresi. */
export interface SekizParametre {
  kutle: number;
  saldiri: number;
  savunma: number;
  staminaHavuzu: number;
  erime: number;
  desen: Desen;
  burstEsik: number;
  yon: "sag" | "sol" | "cift";
}

/** Sim'in her adımda okuduğu türetilmiş sayılar (element/köken/gimmick çarpanları uygulanmış). */
export interface SimParametreleri {
  ivme: number;
  vSurus: number;
  surtunme: number;
  esneklik: number;
  kCakilma: number;
  /** kutle · kCakilma · element kütle çarpanı */
  etkinKutle: number;
  dashMaliyet: number;
  dashEki: number;
  /** adım */
  dashBekleme: number;
  sikiDonusCarpani: number;
  ringOutHizi: number;
  kusakHizCarpani: number;
  kbAlinanCarpani: number;
  /** erime · element · köken (Kök hariç; o konuma bağlı, adımda uygulanır) */
  erime: number;
  tikCarpani: number;
  geriGimmick: number;
  vurusItmeCarpani: number;
  /** cos²(alfaOn) */
  onCos2: number;
  onCarpani: number;
  desenAd: number;
  desenOmega: number;
  desenKMerkez: number;
  kok: boolean;
  emis: boolean;
}

export interface TopacProfili {
  id: string;
  parcalar: { cekirdek: string; govde: string; disk: string; uc: string };
  parametreler: SekizParametre;
  /** Çift yönlü çekirdekte maç öncesi seçilen yön; diğerlerinde parametreler.yon. */
  donus: "sag" | "sol";
  tip: Tip;
  element: ElementAdi;
  koken: KokenAdi;
  govdeElement: ElementAdi;
  kanat: number;
  maxStamina: number;
  sim: SimParametreleri;
  /** Çekirdek ruhunun yuvaları (yetenek numarası, −1 = yok): Yetenek, Özel Yetenek, Ulti (D3). */
  yetenekler: [number, number, number];
  /** Enerji dolum çarpanı (tuning § 8 uyum + § 11): Gövde elementi Çekirdeğinkine aynı 1,10 / komşu 1,00 / diğer 0,80; Yapay'da ceza yok. */
  uyumCarpani: number;
  /** Göktaşı Kriz Alevi (stamina < %30): Enerji ve telegraf çarpanı (Kor Kalbi 1,75 / 0,80). 1 = yok. */
  krizEnerji: number;
  krizTelegraf: number;
  /** Göktaşı: giriş başına ilk 12 s Enerji dolumu × 0,8 (Kor Kalbi'nde yok). */
  girisYavas: boolean;
}

export interface ProfilSecenekleri {
  /** Yalnız `cift` yönlü (Yapay) çekirdekte geçerli. Varsayılan sag. */
  yon?: "sag" | "sol";
}

/** § 13 tip etiketi: yalnız etiket, mekanik tipe bakmaz. */
export function tipBul(p: Pick<SekizParametre, "kutle" | "saldiri" | "savunma" | "staminaHavuzu" | "erime">): Tip {
  const T = TIP_SKOR;
  const skorlar: [Tip, number][] = [
    ["saldirgan", p.saldiri / T.saldiriRef],
    ["kale", (p.savunma / T.savunmaRef + p.kutle / T.kutleRef) / 2],
    ["dayanikli", (p.staminaHavuzu / T.havuzRef) * Math.sqrt(T.erimeRef / p.erime)],
  ];
  // kararlı sıralama: büyükten küçüğe, eşitlikte tablo sırası
  skorlar.sort((a, b) => b[1] - a[1]);
  const [ilk, ikinci] = skorlar as [[Tip, number], [Tip, number], [Tip, number]];
  if ((ilk[1] - ikinci[1]) / ilk[1] < T.dengeFarki) return "denge";
  return ilk[0];
}

/** § 13 tip skoru referansları. */
export const TIP_SKOR = { saldiriRef: 50, savunmaRef: 50, kutleRef: 40, havuzRef: 430, erimeRef: 5.5, dengeFarki: 0.12 } as const;

function alfaOnCos2(kanat: number): number {
  const derece = Math.min(AYAR.alfaOnEnFazla, AYAR.alfaOnTaban + AYAR.alfaOnKanat * kanat);
  const c = cosT(derece * DERECE_BASINA_BIRIM);
  return c * c;
}

export function topacProfiliKurParcalarla(c: Cekirdek, g: Govde, d: Disk, u: Uc, sec: ProfilSecenekleri = {}): TopacProfili {
  const parcalar = [c, g, d, u] as const;
  const top = (k: "kutle" | "saldiri" | "savunma" | "staminaHavuzu" | "erime" | "burstEsik") => {
    let s = 0;
    for (const p of parcalar) s += p.katki[k];
    return s;
  };
  const desen = u.katki.desen ?? "cakili";
  const yon = c.katki.yon ?? "sag";
  const parametreler: SekizParametre = {
    kutle: top("kutle"),
    saldiri: top("saldiri"),
    savunma: top("savunma"),
    staminaHavuzu: AYAR.staminaTaban + top("staminaHavuzu"),
    erime: top("erime"),
    desen,
    burstEsik: top("burstEsik"),
    yon,
  };
  const el = ELEMENT_EGILIM[c.element];
  const koken = c.koken;
  const madenIvme = koken === "maden" ? KOKEN_PASIF.maden.ivme : 1;
  const kokenErime = koken === "yapay" ? KOKEN_PASIF.yapay.erime : koken === "karanlik" ? KOKEN_PASIF.karanlik.erime : 1;
  const ds = AYAR.desen[desen];
  const kanatBonus = AYAR.kanatOnBonusu;
  const sim: SimParametreleri = {
    ivme: u.uc.ivme * el.ivme * madenIvme,
    vSurus: u.uc.vSurus,
    surtunme: u.uc.surtunme * el.surtunme,
    esneklik: u.uc.esneklik,
    kCakilma: u.uc.kCakilma,
    etkinKutle: parametreler.kutle * u.uc.kCakilma * el.kutle,
    dashMaliyet: u.uc.dashMaliyet,
    dashEki: AYAR.dashHiziEki * el.dashEki,
    dashBekleme: Math.round(AYAR.dashBekleme * el.dashBekleme * AYAR.adimHz),
    sikiDonusCarpani: u.uc.sikiDonusCarpani,
    ringOutHizi: u.uc.ringOutHizi,
    kusakHizCarpani: (u.gimmick?.kusakHizCarpani ?? AYAR.kusakHizCarpani) + el.kusakEk,
    kbAlinanCarpani: el.kbAlinan,
    erime: parametreler.erime * el.erime * kokenErime,
    tikCarpani: g.gimmick?.tikCarpani ?? 1,
    geriGimmick: g.gimmick?.geriTepmeCarpani ?? 1,
    vurusItmeCarpani: g.gimmick?.vurusItmeCarpani ?? 1,
    onCos2: alfaOnCos2(g.kanat),
    onCarpani: kanatBonus.acik ? kanatBonus.taban - kanatBonus.kanatBasina * g.kanat : AYAR.fOn,
    desenAd: ds.Ad,
    desenOmega: ds.omegaD,
    desenKMerkez: ds.kMerkez,
    kok: koken === "maden",
    emis: koken === "karanlik",
  };
  const donus = yon === "cift" ? (sec.yon ?? "sag") : yon;
  const Y = AYAR.yetenek;
  const E = AYAR.enerji;
  const ci = ELEMENT_CARKI.indexOf(c.element);
  const gi = ELEMENT_CARKI.indexOf(g.element);
  const fark = (gi - ci + 6) % 6;
  let uyum = fark === 0 ? E.uyumAyni : fark === 1 || fark === 5 ? E.uyumKomsu : E.uyumDiger;
  if (koken === "yapay" && uyum < 1) uyum = 1;
  const goktasi = koken === "goktasi";
  const korKalbi = c.gimmick?.krizEnerjiCarpani !== undefined;
  return {
    id: `${c.id}+${g.id}+${d.id}+${u.id}`,
    parcalar: { cekirdek: c.id, govde: g.id, disk: d.id, uc: u.id },
    parametreler,
    donus,
    tip: tipBul(parametreler),
    element: c.element,
    koken,
    govdeElement: g.element,
    kanat: g.kanat,
    maxStamina: parametreler.staminaHavuzu,
    sim,
    yetenekler: ruhYuvalari(c.ruh),
    uyumCarpani: uyum,
    krizEnerji: goktasi ? (c.gimmick?.krizEnerjiCarpani ?? Y.krizEnerji) : 1,
    krizTelegraf: goktasi ? (korKalbi ? Y.korKalbiTelegraf : Y.krizTelegraf) : 1,
    girisYavas: goktasi && c.gimmick?.baslangicYavasligi !== false,
  };
}

/** Kimliklerle: `topacProfiliKur("kor-goktasi", "ok-govde", "hafif-disk", "duz-uc")`. */
export function topacProfiliKur(cekirdek: string, govde: string, disk: string, uc: string, sec: ProfilSecenekleri = {}): TopacProfili {
  return topacProfiliKurParcalarla(cekirdekBul(cekirdek), govdeBul(govde), diskBul(disk), ucBul(uc), sec);
}

/** Başlangıç seti kimliğiyle (veri/parcalar.json baslangicSetleri). */
export function setProfili(set: { cekirdek: string; govde: string; disk: string; uc: string }, sec: ProfilSecenekleri = {}): TopacProfili {
  return topacProfiliKur(set.cekirdek, set.govde, set.disk, set.uc, sec);
}
