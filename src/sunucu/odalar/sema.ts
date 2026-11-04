import { type ArraySchema, schema, t } from "@colyseus/schema";
import {
  ALAN_TURLERI, type AlanTuru, DUNYA_TURLERI, ENGEL_TURLERI, MAC_TURLERI, TAKIM_TURLERI, TOPAC_TURLERI, UYE_TURLERI,
} from "../../ag/durum.ts";

// @colyseus/schema 5 sınıfları, ortak tür tablolarından (src/ag/durum.ts) kurulur: alan adı ve wire türü tek yerde.
// İstemci bu sınıfları import ETMEZ; SDK el sıkışmadaki yansıtmadan (reflection) aynı alanlarla çözer.

function alan(tur: AlanTuru) {
  switch (tur) {
    case "f32": return t.float32().default(0);
    case "u8": return t.uint8().default(0);
    case "u16": return t.uint16().default(0);
    case "u32": return t.uint32().default(0);
    case "i8": return t.int8().default(0);
    case "i16": return t.int16().default(0);
  }
}

function alanlar(turler: Record<string, AlanTuru>): Record<string, ReturnType<typeof alan>> {
  const s: Record<string, ReturnType<typeof alan>> = {};
  for (const [k, v] of Object.entries(turler)) s[k] = alan(v);
  return s;
}

type Sayisal = Record<string, number>;
type Sinif<T> = new () => T;

export type TopacS = Sayisal;
export type UyeS = Sayisal;
export type TakimS = Sayisal & { uyeler: ArraySchema<UyeS> };
export type AlanS = Sayisal;
export type EngelS = Sayisal;
export type MacS = Sayisal;
export type DunyaS = Sayisal & { mac: MacS; topaclar: ArraySchema<TopacS>; takimlar: ArraySchema<TakimS>; alanlar: ArraySchema<AlanS>; engeller: ArraySchema<EngelS> };
export interface OyuncuS { oturum: string; ad: string; takimId: string; takimNo: string; bagli: boolean; hazir: boolean; rovans: boolean; bot: boolean; ack: number; ackTick: number; dondurmaHakki: number }
export interface OdaS {
  faz: number; kod: string; mod: string; macNo: number; secimKalan: number; beklemeKalan: number;
  donma: number; donmaKalan: number; kopan: number; dunyaVar: boolean;
  oyuncular: ArraySchema<OyuncuS>; dunya: DunyaS;
}

// programatik şema: tür tablolardan, alanlar çalışma anında (any kaçınılmaz)
export const TopacSema = schema({ ...alanlar(TOPAC_TURLERI), uye: t.uint8().default(0), yon: t.int8().default(1) } as any, "Topac") as unknown as Sinif<TopacS>;
export const UyeSema = schema(alanlar(UYE_TURLERI) as any, "Uye") as unknown as Sinif<UyeS>;
export const TakimSema = schema({ ...alanlar(TAKIM_TURLERI), uyeler: t.array(UyeSema as any) } as any, "Takim") as unknown as Sinif<TakimS>;
export const AlanSema = schema(alanlar(ALAN_TURLERI) as any, "Alan") as unknown as Sinif<AlanS>;
export const EngelSema = schema(alanlar(ENGEL_TURLERI) as any, "Engel") as unknown as Sinif<EngelS>;
export const MacSema = schema(alanlar(MAC_TURLERI) as any, "MacDurumu") as unknown as Sinif<MacS>;
export const DunyaSema = schema({
  ...alanlar(DUNYA_TURLERI),
  mac: t.ref(MacSema as any),
  topaclar: t.array(TopacSema as any),
  takimlar: t.array(TakimSema as any),
  alanlar: t.array(AlanSema as any),
  engeller: t.array(EngelSema as any),
} as any, "Dunya") as unknown as Sinif<DunyaS>;
export const OyuncuSema = schema({
  /** Colyseus sessionId (istemci kendi indeksini bulur; yeniden bağlanmada aynı kalır) */
  oturum: t.string().default(""),
  ad: t.string().default(""),
  /** takım: başlangıç takımı kimliği ya da kayıtlı takım kodu (sunucu üretir; istemci profilleri bundan kurar) */
  takimId: t.string().default(""),
  /** D5: kayıtlı takım numarası (seçim arayüzü) */
  takimNo: t.string().default(""),
  bagli: t.boolean().default(false),
  hazir: t.boolean().default(false),
  rovans: t.boolean().default(false),
  bot: t.boolean().default(false),
  /** son tüketilen girdinin sırası (reconcile ack) ve uygulandığı sunucu adımı */
  ack: t.uint32().default(0),
  ackTick: t.uint32().default(0),
  dondurmaHakki: t.uint8().default(0),
} as any, "Oyuncu") as unknown as Sinif<OyuncuS>;
export const OdaSema = schema({
  faz: t.uint8().default(0),
  kod: t.string().default(""),
  mod: t.string().default("oda"),
  macNo: t.uint8().default(0),
  secimKalan: t.uint8().default(0),
  beklemeKalan: t.uint16().default(0),
  donma: t.uint8().default(0),
  donmaKalan: t.uint8().default(0),
  kopan: t.int8().default(-1),
  dunyaVar: t.boolean().default(false),
  oyuncular: t.array(OyuncuSema as any),
  dunya: t.ref(DunyaSema as any),
} as any, "Oda") as unknown as Sinif<OdaS>;

/**
 * Girdi şeması (defineInput, 60 Hz): ağ biçimi `agAlanlarindanGirdi` ile sim girdisine döner. `seq` istemcinin
 * yerel adım sırası (tahmin tamponu anahtarı, ack). Eksenler int8 (±127), nişan int16 (dünya birimi, yuvarlanmış).
 */
export const GirdiSema = schema({
  seq: t.uint32().default(0),
  yonX: t.int8().default(0),
  yonZ: t.int8().default(0),
  nisanX: t.int16().default(0),
  nisanZ: t.int16().default(0),
  yuva: t.uint8().default(0),
  tuslar: t.uint8().default(0),
  degistir: t.int8().default(-1),
} as any, "Girdi") as unknown as Sinif<{ seq: number; yonX: number; yonZ: number; nisanX: number; nisanZ: number; yuva: number; tuslar: number; degistir: number }>;

