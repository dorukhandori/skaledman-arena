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
  /** Giriş koruması, kalan adım (tuning § 10: yeni topaç 1,0 s çarpışmaz, hasar almaz). */
  koruma: number;
  /** Geri çek: kalan savunmasız adım (2,0 s, kb × 1,5); 0 = yok. */
  geriCekKalan: number;
  /** Enerji puanı 0..300 (D2: yalnız komşu devralma +40; sistem D3'te açılır). */
  enerji: number;
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

/**
 * Maç fazı. `tekTur` kipinde (Topaç Lab, D1 altın senaryoları) yalnız `tur` → `turBitti`.
 * `mac` kipinde (axiom § 4 karar 5): `geriSayim` → `tur` → `turArasi` → `tur` … → `bitti`.
 */
export type MacFazi = "geriSayim" | "tur" | "turArasi" | "turBitti" | "bitti";

export type MacBitisNedeni =
  | "puan" | "tukenme" | "aniOlum" | "surePuan" | "sureStamina" | "surePuanEsitlik" | "yaziTura" | "teslim";

export interface MacSonucu {
  /** Kazanan takım; −1 yalnız iki takım birden iptal edilirse (D2'de üretilmez). */
  kazanan: number;
  neden: MacBitisNedeni;
  puan: [number, number];
  tick: number;
}

export interface MacDurumu {
  mod: "tekTur" | "mac";
  faz: MacFazi;
  /** Fazın kalan adımı (geriSayim, turArasi). */
  kalanTick: number;
  /** turArasi içinde kutlamanın kalan adımı (kutlama bitmeden yeni tur başlamaz). */
  kutlamaKalan: number;
  /** Maç saati: geçen adım (geri sayım hariç; puan aralarında durmaz, tuning § 10). */
  saat: number;
  /** Ani ölüm başladıysa 1. */
  aniOlum: number;
  /** Ani ölümün geçen adımı. */
  aniOlumTick: number;
  /** Başlanan tur sayısı (1'den). */
  turNo: number;
  puan: [number, number];
  /** Son tur sonucu. */
  sonuc: TurSonucu | null;
  /** Maç bittiyse sonucu. */
  macSonucu: MacSonucu | null;
}

/** Takım üyesi: sahada değilken durumu saklanır (geri çekilen: stamina ve tık korunur, iyileşme yok). */
export interface TakimUyesi {
  profil: TopacProfili;
  stamina: number;
  tik: number;
  enerji: number;
  /** 1 = elendi (bu maçta geri dönmez). */
  elendi: number;
}

export interface Takim {
  uyeler: [TakimUyesi, TakimUyesi, TakimUyesi];
  /** Sahadaki üye. */
  aktif: number;
  /** Geri çek hedef üyesi; −1 = yok. */
  geriCekHedef: number;
  /** Geri çek bekleme, kalan adım (20 s). */
  geriCekBekleme: number;
  /** Tur arası seçim: −1 = seçim gerekmiyor, −2 = bekleniyor, ≥0 = seçilen üye. */
  secim: number;
  elenen: number;
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
  | { tur: "turBitti"; tick: number; sonuc: TurSonucu }
  /** geri sayım bitti ya da tur arası bitti: yeni tur başladı */
  | { tur: "turBasladi"; tick: number; turNo: number }
  /** geri çek başladı (2 s savunmasız) */
  | { tur: "geriCek"; tick: number; i: number; hedef: number }
  /** sahaya yeni üye girdi (tur arası seçimi ya da geri çek sonu) */
  | { tur: "degisim"; tick: number; i: number; uye: number; x: number; z: number; enerjiDevri: number }
  /** tur arası seçim yapıldı (otomatik ya da girdiyle) */
  | { tur: "secim"; tick: number; i: number; uye: number; otomatik: boolean }
  | { tur: "aniOlum"; tick: number }
  | { tur: "macBitti"; tick: number; sonuc: MacSonucu };

export interface Dunya {
  tick: number;
  tohum: number;
  profiller: [TopacProfili, TopacProfili];
  topaclar: [Topac, Topac];
  /** Çift darbe kilidi, kalan adım. */
  temasKilidi: number;
  mac: MacDurumu;
  /** Çanağın şu anki yarıçapı (ani ölümde daralır). */
  arenaYaricap: number;
  /** `mac` kipinde iki takım; `tekTur` kipinde null. */
  takimlar: [Takim, Takim] | null;
  /** Son `adim`'ın olayları (her adımda sıfırlanır). */
  olaylar: Olay[];
}
