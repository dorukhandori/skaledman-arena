import type { Dunya } from "../paylasilan/sim/durum.ts";

// D8 seyirci yayın defteri (süreç içi; tek VPS süreci, odaKayit gibi globalThis'te): bir ev sahibinin (oda modunda
// odayı açan kayıtlı oyuncu) "yayın kodu" ilk odasının kodudur ve sonraki odalarına taşınır. Böylece OBS'teki
// `#izle=ABCDEFGH` bağlantısı maçtan maça değişmez; maç arasında seyirci "Sıradaki maç bekleniyor" + son skoru görür.
// Kaynak (maç odası) yayına görünüm verir, seyirci odası (Colyseus "izle") onu yansıtır. Kimlik / oturum bilgisi yok.

/** Seyirciye giden görünüm (oyuncu oturum kimliği, ack, Altın/başarım yok). */
export interface IzleGorunumu {
  faz: number;
  /** katılma kodu (yalnız bekleme fazında dolu) */
  kod: string;
  macNo: number;
  kopan: number;
  donma: number;
  donmaKalan: number;
  oyuncular: { ad: string; takimId: string; bagli: boolean; bot: boolean }[];
  dunya: Dunya | null;
}

/** Seyirci odası arayüzü (IzleOdasi uygular). */
export interface IzleHedefi {
  yansit(g: IzleGorunumu | null, son: SonMac | null): void;
  olaylar(paket: unknown): void;
}

export interface SonMac { puan: [number, number]; adlar: [string, string]; kazanan: number }

export interface Yayin {
  /** yayın (seyirci) kodu: ev sahibinin ilk oda kodu */
  kod: string;
  hostId: number;
  /** şu anki maç odasının kodu (yoksa boş) */
  macKodu: string;
  kaynak: (() => IzleGorunumu) | null;
  hedef: IzleHedefi | null;
  son: SonMac | null;
  guncel: number;
}

const g = globalThis as unknown as { __devranYayin?: { kodla: Map<string, Yayin>; hosta: Map<number, string> } };
g.__devranYayin ??= { kodla: new Map(), hosta: new Map() };
const { kodla, hosta } = g.__devranYayin;
/** Kaynağı olmayan yayın bu kadar hatırlanır (yayıncı test gecesi boyunca aynı bağlantı). */
const YAYIN_OMRU_MS = 6 * 60 * 60 * 1000;

function temizle(simdi: number): void {
  for (const [k, y] of kodla) {
    if (!y.kaynak && !y.hedef && simdi - y.guncel > YAYIN_OMRU_MS) { kodla.delete(k); if (hosta.get(y.hostId) === k) hosta.delete(y.hostId); }
  }
}

/** Maç odası ev sahibi için yayını bağlar (varsa eski yayını yeni odaya taşır). Dönen: yayın kodu. */
export function yayinBagla(macKodu: string, hostId: number, kaynak: () => IzleGorunumu, simdi = Date.now()): Yayin {
  temizle(simdi);
  const eski = hosta.get(hostId);
  let y = eski ? kodla.get(eski) : undefined;
  if (!y) {
    y = { kod: macKodu, hostId, macKodu, kaynak, hedef: null, son: null, guncel: simdi };
    kodla.set(macKodu, y);
    hosta.set(hostId, macKodu);
  } else {
    y.macKodu = macKodu;
    y.kaynak = kaynak;
    y.guncel = simdi;
  }
  y.hedef?.yansit(kaynak(), y.son);
  return y;
}

/** Maç odası kapandı: yayın kaynaksız kalır (seyirci bekleme ekranında). */
export function yayinCoz(y: Yayin, kaynak: () => IzleGorunumu, simdi = Date.now()): void {
  if (y.kaynak !== kaynak) return;
  y.kaynak = null;
  y.macKodu = "";
  y.guncel = simdi;
  y.hedef?.yansit(null, y.son);
}

/** Yayın kodu ya da yayının şu anki maç kodu ile ara. */
export function yayinBul(kod: string): Yayin | null {
  const y = kodla.get(kod);
  if (y) return y;
  for (const x of kodla.values()) if (x.macKodu === kod) return x;
  return null;
}

/** Oda kodu üreticisi yayın kodlarını yeniden vermesin. */
export function yayinKoduMu(kod: string): boolean {
  return kodla.has(kod);
}

/** Test yardımcısı. */
export function yayinlariSifirla(): void {
  kodla.clear();
  hosta.clear();
}
