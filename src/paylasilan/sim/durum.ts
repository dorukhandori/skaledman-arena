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
  /** Enerji puanı 0..300 (tuning § 8; 3 dilim × 100). */
  enerji: number;
  // ---- D3: yetenek durumu (tüm süreler adım) ----
  /** Sahadaki süre, adım (Göktaşı giriş başına ilk 12 s dolum × 0,8). */
  sahadaTick: number;
  /** Yuva 1 / 2 bekleme, kalan adım. */
  bekleme1: number;
  bekleme2: number;
  /** Yapay Uyum: ilk yetenek indirimi kullanılmadıysa 1. */
  yapayIndirim: number;
  /** Etkin yetenek: kullanılan yuvanın yetenek numarası (−1 = yok), yuva (0..2), kademe. */
  yetenekNo: number;
  yetenekYuva: number;
  /** Davranışı çalışan yetenek (Taklit'te kopyalanan), etki ölçeği (Taklit 0,6). */
  etkinNo: number;
  etkiOlcek: number;
  /** 0 yok · 1 telegraf · 2 etki. */
  yetenekFaz: number;
  yetenekKalan: number;
  /** Bırakma anında kilitlenen yön (birim) ve hedef nokta. */
  yetenekDx: number;
  yetenekDz: number;
  yetenekHx: number;
  yetenekHz: number;
  /** Telegraf süresi (adım; HUD dolan halkası için). */
  telegrafToplam: number;
  /** Hareket kilidi (sürüş, dash, sekme yok), kalan adım. */
  kilitKalan: number;
  /** Kontra kaçırıldı: sersem, kalan adım (hareket kilidi gibi). */
  sersemKalan: number;
  /** Atılış/kavis: temas itmesi uygulandıysa 1 (yetenek başına bir kez). */
  vurdu: number;
  /** Kavis yönü (+1 / −1). */
  kavisIsaret: number;
  /** Zincir: kalan sıçrama, sıçrama arası bekleme; emiş yakınlık beklemesi. */
  zincirKalan: number;
  zincirBekleme: number;
  emisBekleme: number;
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
  /** D3: yetenek beklemeleri ve Yapay indirimi sahadan çıkınca saklanır. */
  bekleme1: number;
  bekleme2: number;
  yapayIndirim: number;
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

/** Zemin alanı (00 § 4.5; bir oyuncunun bir seferde tek alanı). */
export interface Alan {
  /** Davranışı çalışan yetenek numarası. */
  no: number;
  olcek: number;
  sahip: number;
  x: number;
  z: number;
  yaricap: number;
  kalan: number;
  toplam: number;
  /** Yan kayma yönü (+1 / −1: sahibin dönüş yönü). */
  isaret: number;
}

/** Geçici engel (Yontu Siperi, Ata Dağı): duvar gibi sektirir, dayanıklılığı darbeyle düşer. */
export interface Engel {
  x: number;
  z: number;
  r: number;
  can: number;
  sahip: number;
  kalan: number;
}

export type YetenekReddi = "faz" | "mesgul" | "yok" | "kilitli" | "bekleme" | "enerji" | "stamina" | "ultiKullanildi" | "rakipUlti";

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
  // ---- D3 ----
  /** yetenek bırakıldı: telegraf başladı (hedef nokta, yön, telegraf adımı) */
  | { tur: "yetenekBasladi"; tick: number; i: number; no: number; etkinNo: number; yuva: number; kademe: number; x: number; z: number; dx: number; dz: number; telegraf: number }
  /** telegraf bitti, etki başladı */
  | { tur: "yetenekEtki"; tick: number; i: number; no: number; etkinNo: number; yuva: number; kademe: number; x: number; z: number }
  | { tur: "yetenekBitti"; tick: number; i: number; no: number; kesildi: boolean }
  | { tur: "yetenekReddi"; tick: number; i: number; yuva: number; neden: YetenekReddi }
  /** yetenek isabeti (sanal darbe, alan hasarı değil): hasar ve itme */
  | { tur: "yetenekVurus"; tick: number; i: number; hedef: number; no: number; hasar: number; x: number; z: number; nx: number; nz: number }
  | { tur: "zincir"; tick: number; i: number; hedef: number; x1: number; z1: number; x2: number; z2: number; hasar: number }
  | { tur: "kontra"; tick: number; i: number; hedef: number; x: number; z: number }
  | { tur: "engelCarpma"; tick: number; i: number; x: number; z: number; kirildi: boolean }
  /** Enerji yeni bir dilime ulaştı (1..3) */
  | { tur: "enerjiDoldu"; tick: number; i: number; dilim: number }
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
  // ---- D3 ----
  /** Oyuncu başına tek zemin alanı (yeni gelen eskiyi siler). */
  alanlar: [Alan | null, Alan | null];
  engeller: Engel[];
  /** Ulti maç başına bir kez (oyuncu başına). */
  ultiKullanildi: [number, number];
  /** Ulti süresince ve +1 s hiçbir topaçta Enerji dolmaz (flint #14), kalan adım. */
  ultiKilit: number;
  /** Yakın geçiş Enerjisi beklemesi (çift için), kalan adım. */
  yakinGecisBekleme: number;
  /** Kararma sayacı (Karanlık Kara yetenek +25; maç sonu raporu, Çekirdek sönmesi D7). */
  kararma: [number, number];
  /** Çekirdek seviyesi (oyuncu başına; yuva kapıları). */
  seviye: [number, number];
  /** Oyuncunun son kullandığı kademe 1-2 yetenek (Taklit Sıçrayış kopyası), −1 = yok. */
  sonYetenek: [number, number];
  /** İstatistik (hash dışı değil, ama davranışa etkisi yok): oyuncu × kademe kullanım sayısı. */
  yetenekSayisi: [[number, number, number], [number, number, number]];
}
