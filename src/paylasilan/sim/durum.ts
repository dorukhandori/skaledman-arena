import type { Yon } from "../atlas.ts";
import type { DovuscuProfili } from "../dovuscu.ts";
import type { DurumTuru } from "../kurallar/ayar.ts";
import type { Aile } from "../kurallar/hamleler.ts";
import type { Tip } from "../kart.ts";
import type { Arena } from "./Arena.ts";

// Simülasyon durumu: düz, JSON'a çevrilebilir veri (determinizm testi bunu karşılaştırır).
// Render bu yapıyı yalnız okur.

export interface HamleDurumu {
  yuva: number;
  /** aviso: hazırlık (telegraf); atilis: embestida ilerliyor; toparlan: vuruş sonrası */
  evre: "aviso" | "atilis" | "toparlan";
  /** aviso/toparlan: kalan süre; atilis: kalan mesafe */
  kalan: number;
  /** birim yön */
  yonX: number;
  yonZ: number;
  hedefX: number;
  hedefZ: number;
  vurdu: boolean;
}

export interface Dovuscu {
  indeks: number;
  x: number;
  z: number;
  /** bakış yönü (birim vektör) ve 8 yönlü karşılığı */
  yonX: number;
  yonZ: number;
  yon: Yon;
  /** son adımda gerçekleşen hız (birim/s), animasyon seçimi için */
  hizX: number;
  hizZ: number;
  hp: number;
  maxHp: number;
  itX: number;
  itZ: number;
  itKalan: number;
  dashKalan: number;
  dashX: number;
  dashZ: number;
  dashBekleme: number;
  dokunulmaz: number;
  hitStun: number;
  /** felçte rastgele takılma süresi */
  takilma: number;
  cooldown: number[];
  hamle: HamleDurumu | null;
  yanik: number;
  yanikSayac: number;
  felc: number;
  felcSayac: number;
  olu: boolean;
  /** zıplama: kalan havada kalma süresi (0 = yerde); `yukseklik` ondan türetilir (render ve "yer hamlesi" için) */
  ziplaKalan: number;
  yukseklik: number;
  ziplaBekleme: number;
  /** 0..1; zıplama harcar */
  enerji: number;
  dinleniyor: boolean;
  /** stat kademeleri, KADEME_STATLARI sırasıyla; her biri kendi süresiyle düşer */
  kademe: number[];
  kademeKalan: number[];
  /** takım geçişi sürüyor */
  gecis: GecisDurumu | null;
  /** boşlukta ya da KO sonrası seçimde: sahada yok, hedef alınmaz */
  sahaDisi: boolean;
}

export interface GecisDurumu {
  /** geri: çekiliyor (vurulabilir); bosluk: sahada yok; cikis: yeni üye iniyor (dokunulmaz) */
  evre: "geri" | "bosluk" | "cikis";
  kalan: number;
  hedef: number;
  x: number;
  z: number;
}

/** Yedekteki (ya da sahadaki) takım üyesinin kalıcı hâli; aktif üyenin canlı değerleri Dovuscu'dadır. */
export interface UyeDurumu {
  hp: number;
  maxHp: number;
  cooldown: number[];
  yanik: number;
  felc: number;
  ko: boolean;
}

export interface Takim {
  /** sabit üye profilleri; aktif olanı `Dunya.profiller[oyuncu]` ile aynıdır */
  profiller: DovuscuProfili[];
  uyeler: UyeDurumu[];
  aktif: number;
  /** geçişten sonra bekleme */
  bekleme: number;
  /** aktif üye KO: seçim için kalan süre (0 = seçim yok) */
  secimKalan: number;
}

export interface Mermi {
  id: number;
  sahip: number;
  yuva: number;
  tip: Tip;
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaricap: number;
  kalanMenzil: number;
}

export interface Alan {
  id: number;
  sahip: number;
  yuva: number;
  tip: Tip;
  x: number;
  z: number;
  yaricap: number;
  kalan: number;
  toplam: number;
}

export type Olay =
  | { tur: "hamleBasladi"; kim: number; yuva: number; aile: Aile; tip: Tip; aviso: number; x: number; z: number; yonX: number; yonZ: number; hedefX: number; hedefZ: number; menzil: number; yaricap: number; yay: number; kalinlik: number; mesafe: number }
  | { tur: "hamleIptal"; kim: number }
  | { tur: "hamleCikti"; kim: number; yuva: number; aile: Aile; tip: Tip; x: number; z: number; yonX: number; yonZ: number; menzil: number; yay: number; kalinlik: number; yaricap: number }
  | { tur: "vurdu"; kime: number; kimden: number; hasar: number; etkinlik: number; tip: Tip; yuva: number; x: number; z: number; durum?: DurumTuru }
  | { tur: "kacildi"; kime: number; x: number; z: number }
  | { tur: "durum"; kime: number; durum: DurumTuru }
  | { tur: "dash"; kim: number }
  | { tur: "zipla"; kim: number }
  | { tur: "indi"; kim: number }
  | { tur: "kademe"; kime: number; stat: number; degisim: number; yeni: number }
  | { tur: "gecisBasladi"; kim: number; hedef: number }
  | { tur: "degisti"; kim: number; uye: number; x: number; z: number }
  | { tur: "secimBekliyor"; kim: number; sure: number }
  | { tur: "alanPatladi"; id: number; kim: number; tip: Tip; x: number; z: number; yaricap: number }
  | { tur: "mermiBitti"; id: number; x: number; z: number; tip: Tip; vurdu: boolean }
  | { tur: "ko"; kim: number }
  | { tur: "fin"; kazanan: number | null; neden: "ko" | "sure" };

export interface MacSonucu { kazanan: number | null; neden: "ko" | "sure" }

export interface Dunya {
  tick: number;
  tohum: number;
  /** PRNG sırası: her çekimde bir artar */
  rngSira: number;
  sonrakiId: number;
  kalanSure: number;
  /** Genel hasar çarpanı; varsayılan AYAR.hasarCarpani, dunyaKur ile geçersiz kılınabilir (deneme/denge) */
  hasarCarpani: number;
  arena: Arena;
  /** oyuncu başına aktif üyenin profili (takım geçişinde değişir) */
  profiller: DovuscuProfili[];
  takimlar: Takim[];
  dovusculer: Dovuscu[];
  mermiler: Mermi[];
  alanlar: Alan[];
  /** Bu adımda olanlar; her `adim` başında yenilenir */
  olaylar: Olay[];
  sonuc: MacSonucu | null;
}
