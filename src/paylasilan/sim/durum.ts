import type { ElementAdi } from "../kurallar/ayar.ts";
import type { TopacProfili } from "../veri/profil.ts";

// Sim durumu ve olay tipleri (05 § 2.1, axiom § 1). Tüm süreler TAMSAYI ADIM; tüm sayılar float64.
// Alan sırası hash için sabittir (hash.ts `durumBaytlari`); alan eklerken oraya da ekle.

/** Topaç sahadaki durumu. Sayı olarak tutulur (hash ve ağ için). */
export const TOPAC_DURUM = { aktif: 0, ringOut: 1, parcalandi: 2, durma: 3 } as const;
export type TopacDurumKodu = (typeof TOPAC_DURUM)[keyof typeof TOPAC_DURUM];

export interface Topac {
  x: number;
  z: number;
  vx: number;
  vz: number;
  stamina: number;
  tik: number;
  durum: TopacDurumKodu;
  /** Dash vuruş penceresi, kalan adım. */
  dashKalan: number;
  dashBekleme: number;
  /** Sekme: havada kalan adım (çarpışma geçirmez). */
  sekmeKalan: number;
  sekmeBekleme: number;
  /** Bu adımda Sıkı Dönüş basılı (1/0). */
  sikiDonus: number;
  /** Durma sonrası sönüm, kalan adım (salt süs; karar verilmiştir). */
  sonumKalan: number;
  /** Uç deseni fazı, tablo biriminde (256 = 2π). Maç başında tohumdan. */
  desenFaz: number;
}

export type BitisTuru = "durma" | "ringOut" | "parcalanma";

export interface TurSonucu {
  /** "berabere": aynı adımda iki topaç da bitti (flint #1, #2): puan yok, ikisi de elenir. */
  tur: BitisTuru | "berabere";
  /** Kazanan oyuncu indeksi; berabere = −1. */
  kazanan: number;
  /** Biten topacın indeksi; berabere = −1. */
  kaybeden: number;
  puan: number;
  tick: number;
}

export interface MacDurumu {
  faz: "tur" | "turBitti";
  puan: [number, number];
  sonuc: TurSonucu | null;
}

/** Çarpışmada bir tarafın özeti (his için). */
export interface CarpismaTarafi {
  f: number;
  element: ElementAdi;
  dash: boolean;
  hasar: number;
  dTik: number;
  tikSonrasi: number;
  staminaSonrasi: number;
}

export type Olay =
  | {
      tur: "carpisma";
      tick: number;
      /** Darbe şiddeti Ş = μ·vn */
      s: number;
      vn: number;
      x: number;
      z: number;
      /** 0'dan 1'e birim normal */
      nx: number;
      nz: number;
      taraflar: [CarpismaTarafi, CarpismaTarafi];
      zitElement: boolean;
      zitYon: boolean;
      /** zıt yön eşitlemesinde 0'dan 1'e aktarılan stamina (negatif = 1'den 0'a) */
      esitleme: number;
    }
  | { tur: "duvar"; tick: number; i: number; vd: number; x: number; z: number; nx: number; nz: number }
  | { tur: "dash"; tick: number; i: number; dx: number; dz: number }
  | { tur: "sekme"; tick: number; i: number }
  | { tur: "ringOut"; tick: number; i: number; x: number; z: number; vx: number; vz: number }
  | { tur: "parcalandi"; tick: number; i: number; x: number; z: number; vx: number; vz: number }
  | { tur: "durma"; tick: number; i: number; x: number; z: number }
  | { tur: "turBitti"; tick: number; sonuc: TurSonucu };

export interface Dunya {
  tick: number;
  tohum: number;
  profiller: [TopacProfili, TopacProfili];
  topaclar: [Topac, Topac];
  /** Çift darbe kilidi, kalan adım. */
  temasKilidi: number;
  mac: MacDurumu;
  /** Son `adim`'ın olayları (her adımda sıfırlanır). */
  olaylar: Olay[];
}
