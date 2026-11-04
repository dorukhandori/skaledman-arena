import { z } from "zod";

// veri/*.json şemaları (docs/design/tuning.md § 21). Veri dosyalarında yorum yok; anlamlar tuning.md'de.
// Bilinmeyen alanlar atılır (belge oturumu yeni alan ekleyebilir); zorunlu alan eksikse yükleme patlar.

export const ElementSema = z.enum(["kor", "kasirga", "simsek", "girdap", "kaya", "don"]);
export const KokenSema = z.enum(["goktasi", "maden", "yapay", "karanlik"]);
export const YonSema = z.enum(["sag", "sol", "cift"]);
export const DesenSema = z.enum(["cicek", "merkezci", "cakili", "dengeli", "kusak"]);
export const TipSema = z.enum(["saldirgan", "kale", "dayanikli", "denge"]);
export const KatmanSema = z.enum(["baslangic", "standart", "nadir", "hizip", "karanlik"]);
export const GorunumSema = z.enum(["acik", "kilitli-gorunur", "gizli"]);

const sayi = z.number().finite();

export const KatkiSema = z.object({
  kutle: sayi,
  saldiri: sayi,
  savunma: sayi,
  staminaHavuzu: sayi,
  erime: sayi,
  desen: DesenSema.nullable(),
  burstEsik: sayi,
  yon: YonSema.nullable(),
});

/** Gövde/Uç/Çekirdek gimmick'leri; hepsi isteğe bağlı çarpan. */
export const GimmickSema = z.object({
  geriTepmeCarpani: sayi.optional(),
  vurusItmeCarpani: sayi.optional(),
  tikCarpani: sayi.optional(),
  izEfekti: z.boolean().optional(),
  kusakHizCarpani: sayi.optional(),
  kararmaCarpani: sayi.optional(),
  krizEnerjiCarpani: sayi.optional(),
  baslangicYavasligi: z.boolean().optional(),
});

const ParcaTaban = z.object({
  id: z.string().min(1),
  ad: z.string().min(1),
  tipEgilimi: TipSema,
  katki: KatkiSema,
  katman: KatmanSema,
  fiyat: sayi.nonnegative(),
  kilit: z.string().min(1),
  gorunum: GorunumSema,
  set: z.string().nullable(),
  aciklama: z.string(),
  gimmick: GimmickSema.optional(),
});

export const UcSimSema = z.object({
  ivme: sayi.positive(),
  vSurus: sayi.positive(),
  surtunme: sayi.nonnegative(),
  esneklik: sayi.min(0).max(1),
  kCakilma: sayi.positive(),
  dashMaliyet: sayi.nonnegative(),
  sikiDonusCarpani: sayi.min(0),
  ringOutHizi: sayi.positive(),
});

export const GovdeSema = ParcaTaban.extend({ tur: z.literal("govde"), element: ElementSema, kanat: z.number().int().min(1).max(8) });
export const DiskSema = ParcaTaban.extend({ tur: z.literal("disk"), element: z.null(), yukseklik: sayi.positive() });
export const UcSema = ParcaTaban.extend({ tur: z.literal("uc"), element: z.null(), uc: UcSimSema });
export const CekirdekSema = ParcaTaban.extend({ tur: z.literal("cekirdek"), element: ElementSema, koken: KokenSema, ruh: z.string().min(1) });

export const ParcaSema = z.discriminatedUnion("tur", [GovdeSema, DiskSema, UcSema, CekirdekSema]);

export const BaslangicSetiSema = z.object({
  id: z.string(),
  ad: z.string(),
  cekirdek: z.string(),
  govde: z.string(),
  disk: z.string(),
  uc: z.string(),
  cekirdekSeviyesi: z.number().int(),
});

export const ParcalarDosyaSema = z.object({
  surum: z.literal(1),
  parcalar: z.array(ParcaSema),
  baslangicSetleri: z.array(BaslangicSetiSema),
});

export const RuhSema = z.object({
  id: z.string(),
  ad: z.string(),
  element: ElementSema,
  koken: KokenSema,
  tipEgilimi: TipSema,
  kisilik: z.string(),
  yetenek: z.string(),
  yetenekAilesi: z.string(),
  ozelYetenek: z.string(),
  ulti: z.string().nullable(),
  ata: z.boolean(),
});
export const RuhlarDosyaSema = z.object({ surum: z.literal(1), ruhlar: z.array(RuhSema) });

/** Yetenek elementi: altı element + köken yetenekleri (karanlik, yapay) + Takım Ultisi (uc-element). */
export const YetenekElementSema = z.union([ElementSema, z.enum(["karanlik", "yapay", "uc-element"])]);

const negatifOlmayan = sayi.nonnegative();

/** tuning § 21 etki sözlüğü. `itme` negatif olabilir (çekme). Çarpanlar 0..5 aralığında. */
export const EtkiSema = z.object({
  hizCarpani: sayi.min(0).max(5),
  itme: sayi.min(-1000).max(1000),
  hasarKatsayisi: sayi.min(0).max(5),
  yaricap: sayi.min(0).max(400),
  cekim: negatifOlmayan.max(2000).optional(),
  atilisHizi: negatifOlmayan.max(1000).optional(),
  kbCarpani: sayi.min(0).max(5).optional(),
  hasarAlmaCarpani: sayi.min(0).max(5).optional(),
  surtunmeCarpani: sayi.min(0).max(5).optional(),
  ivmeCarpani: sayi.min(0).max(5).optional(),
  yanKaymaItme: negatifOlmayan.max(2000).optional(),
  alanHasarYuzdeSn: negatifOlmayan.max(20).optional(),
  staminaEmisYuzdeSn: negatifOlmayan.max(20).optional(),
  emisYuzde: negatifOlmayan.max(30).optional(),
  zincirSayisi: z.number().int().min(0).max(10).optional(),
  zincirStaminaYuzde: negatifOlmayan.max(30).optional(),
  engelSayisi: z.number().int().min(0).max(8).optional(),
  engelYaricap: negatifOlmayan.max(120).optional(),
  engelDayanikliligi: z.number().int().min(1).max(20).optional(),
  karsiPencereSn: negatifOlmayan.max(3).optional(),
  kavisYaricap: negatifOlmayan.max(600).optional(),
  kendineDeEtki: sayi.min(0).max(1).optional(),
}).catchall(z.union([sayi, z.boolean()]));

export const YetenekSema = z.object({
  id: z.string(),
  ad: z.string(),
  kademe: z.number().int().min(1).max(4),
  element: YetenekElementSema,
  tur: z.enum(["hucum", "savunma", "alan", "sayac"]),
  tipUyumu: z.string(),
  telegrafSn: sayi.nonnegative(),
  sureSn: sayi.nonnegative(),
  beklemeSn: sayi.nonnegative(),
  enerjiDilimi: z.number().int().min(0),
  /** Etki parametre sözlüğü tuning § 21 (bilinen anahtarlar aralıklı); yeteneğe özel anahtarlar serbest (sayı ya da bayrak). */
  etki: EtkiSema,
  bedel: z.object({ staminaYuzde: sayi, kilitSn: sayi, kendiHizCarpani: sayi, ek: z.string().nullable() }),
  kaynak: z.string(),
  eksikTamamlama: z.boolean(),
  ilkSurum: z.boolean(),
});
export const YeteneklerDosyaSema = z.object({ surum: z.literal(1), yetenekler: z.array(YetenekSema) });

export const BasarimSema = z.object({
  id: z.string(),
  ad: z.string(),
  kategori: z.string(),
  sart: z.object({
    olay: z.string(),
    sayi: z.number().int().positive(),
    kosul: z.record(z.string(), z.union([sayi, z.string(), z.boolean(), z.array(z.union([sayi, z.string()]))])),
  }),
  odulAltin: z.number().int().nonnegative(),
  acilanParcalar: z.array(z.string()),
  acilanGorunum: z.array(z.string()),
  acilanOzellik: z.array(z.string()),
  gizli: z.boolean(),
  ilkSurum: z.boolean(),
});
export const BasarimlarDosyaSema = z.object({ surum: z.literal(1), basarimlar: z.array(BasarimSema) });

export type Govde = z.infer<typeof GovdeSema>;
export type Disk = z.infer<typeof DiskSema>;
export type Uc = z.infer<typeof UcSema>;
export type Cekirdek = z.infer<typeof CekirdekSema>;
export type Parca = z.infer<typeof ParcaSema>;
export type Katki = z.infer<typeof KatkiSema>;
export type Gimmick = z.infer<typeof GimmickSema>;
export type Desen = z.infer<typeof DesenSema>;
export type Yon = z.infer<typeof YonSema>;
export type Tip = z.infer<typeof TipSema>;
export type BaslangicSeti = z.infer<typeof BaslangicSetiSema>;
export type Ruh = z.infer<typeof RuhSema>;
export type Yetenek = z.infer<typeof YetenekSema>;
export type Basarim = z.infer<typeof BasarimSema>;
