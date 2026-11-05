import type { Olay } from "./sim/durum.ts";

// Antrenman eğitimi adım makinesi (ux § 4.2, tide G-22). Saf: süre adım sayısıyla (dt) ilerler, duvar saati yok.
// Bir adım eylem YAPILINCA biter; 12 sn ilerleme yoksa ilgili tuş nabız atar; 25 sn'de adım kendiliğinden geçer.

export const EGITIM = {
  nabizSn: 12,
  gecisSn: 25,
  /** adım 1: toplam hareket süresi */
  surusSn: 1.5,
  /** adım 3: dash'ten sonra çarpmanın sayıldığı pencere */
  dashPencereSn: 1.5,
} as const;

export type EgitimVurgu = "oklar" | "stamina" | "dash" | "yuva1" | "telegraf" | "kenar";

export interface EgitimAdimTanimi {
  /** ux § 4.2 şerit metni (birebir; ** kalın) */
  metin: string;
  /** şeritte çizilen tuş */
  tus: string;
  vurgu: EgitimVurgu;
  /** vurgulanan HUD'un yanındaki not (varsa) */
  not?: string;
}

export const EGITIM_ADIMLARI: readonly EgitimAdimTanimi[] = [
  { metin: "**W A S D** ile topacını sür.", tus: "WASD", vurgu: "oklar" },
  { metin: "Rakibe çarp. Hızlı çarparsan daha sert vurursun.", tus: "WASD", vurgu: "stamina", not: "Çarpınca ikiniz de stamina kaybedersiniz." },
  { metin: "**Shift** ile hızlan, sonra çarp.", tus: "Shift", vurgu: "dash" },
  { metin: "Fareyi rakibe tut, **1**'e bas ve bırak: Yetenek.", tus: "1", vurgu: "yuva1" },
  { metin: "Kırmızı taralı alana girme. **Space** ile sekip kaç.", tus: "Space", vurgu: "telegraf" },
  { metin: "Rakibi çanağın kenarından dışarı it.", tus: "WASD", vurgu: "kenar" },
];

/** Kapanış (3 sn): ux § 4.2. */
export const EGITIM_KAPANIS = [
  "Üç bitiş var: **Durma** (1 puan), **Ring Out** (2), **Parçalanma** (2). İlk 3 puanı alan kazanır.",
  "**İlk Devir** başarımı: Market açıldı.",
] as const;

export interface EgitimDurumu {
  /** 0..5; 6 = bitti */
  adim: number;
  /** bu adımda geçen süre (sn) */
  adimSure: number;
  hareketSure: number;
  /** dash sonrası kalan pencere (sn), 0 = yok */
  dashPencere: number;
  /** rakibin yeteneği etkin mi (adım 5: telegraf → etki) */
  rakipYetenegi: boolean;
  /** her adımın nasıl geçtiği: eylem ya da süre */
  gecisler: ("eylem" | "sure")[];
}

export interface EgitimKaresi {
  dt: number;
  /** yerel oyuncu bu adımda sürüş girdisi verdi mi */
  hareket: boolean;
  /** bu adımın sim olayları */
  olaylar: readonly Olay[];
  yerel: number;
  /**
   * yerel topacın Yetenek'i rakibe vurmayan türdeyse (savunma/alan; ör. Kaya Soğuğu) 4. adımda isabet aranmaz,
   * yeteneği atmak yeter (VARSAYIM: "Yetenek isabet" vuruşsuz yetenekte imkânsız).
   */
  vurussuzYetenek?: boolean;
}

export function egitimKur(): EgitimDurumu {
  return { adim: 0, adimSure: 0, hareketSure: 0, dashPencere: 0, rakipYetenegi: false, gecisler: [] };
}

export function egitimBitti(e: EgitimDurumu): boolean {
  return e.adim >= EGITIM_ADIMLARI.length;
}

/** 12 sn ilerleme yoksa tuş nabız atar. */
export function egitimNabiz(e: EgitimDurumu): boolean {
  return !egitimBitti(e) && e.adimSure >= EGITIM.nabizSn - 1e-9;
}

/** Bu karede adımın tamamlanma koşulu sağlandı mı (saf; durumu yalnız sayaçlar için günceller). */
function kosul(e: EgitimDurumu, k: EgitimKaresi): boolean {
  const ben = k.yerel;
  const rakip = 1 - ben;
  const carpti = k.olaylar.some((o) => o.tur === "carpisma");
  switch (e.adim) {
    case 0:
      if (k.hareket) e.hareketSure += k.dt;
      return e.hareketSure >= EGITIM.surusSn - 1e-9;
    case 1:
      return carpti;
    case 2: {
      let tamam = false;
      for (const o of k.olaylar) {
        if (o.tur === "dash" && o.i === ben) e.dashPencere = EGITIM.dashPencereSn;
        else if (o.tur === "carpisma" && e.dashPencere > 0) tamam = true;
      }
      e.dashPencere = Math.max(0, e.dashPencere - k.dt);
      return tamam;
    }
    case 3:
      if (k.vurussuzYetenek && k.olaylar.some((o) => o.tur === "yetenekBasladi" && o.i === ben && o.yuva === 0)) return true;
      return k.olaylar.some((o) => (o.tur === "yetenekVurus" || o.tur === "zincir") && o.i === ben && o.hedef === rakip);
    case 4: {
      let tamam = false;
      for (const o of k.olaylar) {
        if (o.tur === "yetenekBasladi" && o.i === rakip) e.rakipYetenegi = true;
        else if (o.tur === "sekme" && o.i === ben && e.rakipYetenegi) tamam = true; // sekip kaçış
        else if ((o.tur === "yetenekVurus" || o.tur === "zincir") && o.i === rakip && o.hedef === ben) tamam = true; // isabet de geçer
        else if (o.tur === "yetenekBitti" && o.i === rakip) e.rakipYetenegi = false;
      }
      return tamam;
    }
    case 5:
      return k.olaylar.some((o) => o.tur === "turBitti" && o.sonuc.tur === "ringOut" && o.sonuc.kazanan === ben);
    default:
      return false;
  }
}

/** Bir kare ilerlet. Dönen: bu karede adım geçti mi (ve nasıl). */
export function egitimIlerlet(e: EgitimDurumu, k: EgitimKaresi): "eylem" | "sure" | null {
  if (egitimBitti(e)) return null;
  e.adimSure += k.dt;
  let gecis: "eylem" | "sure" | null = null;
  if (kosul(e, k)) gecis = "eylem";
  else if (e.adimSure >= EGITIM.gecisSn - 1e-9) gecis = "sure";
  if (gecis) {
    e.gecisler.push(gecis);
    e.adim++;
    e.adimSure = 0;
    e.hareketSure = 0;
    e.dashPencere = 0;
    e.rakipYetenegi = false;
  }
  return gecis;
}
