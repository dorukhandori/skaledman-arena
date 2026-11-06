import { z } from "zod";
import haritaHam from "../../../veri/harita.json";
import madenlerHam from "../../../veri/madenler.json";
import ustalikHam from "../../../veri/ustalik.json";
import tariflerHam from "../../../veri/tarifler.json";
import marketFiyatHam from "../../../veri/market-fiyat.json";
import { ElementSema, KatmanSema } from "./semalar.ts";

// Harita / Maden / Ocak veri şemaları (docs/design/harita/08 § 4, § 7; 12; 13). Bu dosyalar sim'i ETKİLEMEZ:
// KATALOG_OZETI'ne girmez (src/ag/katalog.ts), `src/paylasilan/sim/**` buraya bağımlı olamaz (lint kapısı). Sayı otoritesi
// `veri/*.json` (tuning.md § 22 özet). İstemci ve sunucu aynı dosyayı paketler.

const sayi = z.number().finite();

export const DugumKimlik = z.string().regex(/^b[1-9]-(0[1-9]|1[0-2])$/);
export const BotKipSema = z.enum(["kukla", "dolas", "kenar", "dayaniklilik"]);
export const YildizSart = z.enum(["kazan", "temiz", "hizli", "ringOut", "durma", "parcalanma", "yetenekBitis"]);
export type YildizSartKodu = z.infer<typeof YildizSart>;
const Kademe = z.number().int().min(1).max(8);
const Adet = z.object({ kademe: Kademe, adet: z.number().int().min(1).max(50) });
const Konum = z.tuple([sayi, sayi]);
const Takim = z.array(z.tuple([z.string(), z.string(), z.string(), z.string()])).length(3);

const DusmanSema = z.object({
  id: DugumKimlik, tur: z.literal("dusman"), konum: Konum, komsu: z.array(DugumKimlik),
  zorluk: z.number().int().min(1).max(5), botKip: BotKipSema, botSeviye: z.number().int().min(1).max(3),
  takim: Takim, yildiz: z.array(YildizSart).length(3),
  odul: z.object({ altinYildiz: z.number().int().nonnegative(), cevherYildiz: Adet, tekrar: z.object({ cevher: Adet }) }),
});
const PatronSema = DusmanSema.extend({
  tur: z.literal("patron"), ad: z.string().min(1), sonrakiBolge: z.string().optional(),
  odul: z.object({
    altinIlk: z.number().int().nonnegative(), kulceIlk: Adet, altinYildiz: z.number().int().nonnegative(), cevherYildiz: Adet,
    tekrar: z.object({ cevher: Adet }),
  }),
});
const MadenSema = z.object({
  id: DugumKimlik, tur: z.literal("maden"), konum: Konum, komsu: z.array(DugumKimlik), ad: z.string().optional(),
  kademe: Kademe, kapasite: z.number().int().min(1).max(8), nadir: z.object({ kademe: Kademe, olasilik: sayi.min(0).max(1) }),
});
const SandikSema = z.object({
  id: DugumKimlik, tur: z.literal("sandik"), konum: Konum, komsu: z.array(DugumKimlik),
  odul: z.object({ altin: z.number().int().nonnegative(), cevher: Adet }),
});
export const DugumSema = z.discriminatedUnion("tur", [DusmanSema, PatronSema, MadenSema, SandikSema]);
export type Dugum = z.infer<typeof DugumSema>;
export type DovusDugumu = z.infer<typeof DusmanSema> | z.infer<typeof PatronSema>;
export type MadenDugumu = z.infer<typeof MadenSema>;
export type SandikDugumu = z.infer<typeof SandikSema>;

export const BolgeSema = z.object({
  id: z.string().min(1), no: z.number().int().min(1).max(9), ad: z.string().min(1), element: ElementSema, ilkSurum: z.boolean(),
  dugumler: z.array(DugumSema).length(12),
});
export type Bolge = z.infer<typeof BolgeSema>;
export const HaritaDosyaSema = z.object({ surum: z.number().int(), gun: z.string(), bolgeler: z.array(BolgeSema).min(1) });

export const MadenlerDosyaSema = z.object({
  surum: z.number().int(),
  kademeler: z.array(z.object({
    kademe: Kademe, id: z.string().min(1), ad: z.string().min(1), loreAd: z.string(), element: ElementSema.nullable(),
    esik: z.number().int().min(0).max(100), verim: z.number().int().min(1), nadirlik: z.string(),
    renk: z.object({ ana: z.string().regex(/^#[0-9A-Fa-f]{6}$/), koyu: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }),
    aciklama: z.string(), ilkSurum: z.boolean(),
  })).length(8),
});
export type MadenKademesi = z.infer<typeof MadenlerDosyaSema>["kademeler"][number];

export const UstalikDosyaSema = z.object({
  surum: z.number().int(),
  turler: z.array(z.object({ id: z.enum(["madencilik", "isleme"]), ad: z.string() })).length(2),
  seviyeTavan: z.literal(100),
  kumulatif: z.array(z.number().int().nonnegative()).length(101),
  ogrenmeBandi: z.array(z.object({ farkMax: z.number().int(), carpan: sayi.positive() })).min(1),
  basari: z.object({ taban: sayi, egim: sayi, tavan: sayi }),
  madencilik: z.object({ xpBasari: sayi, xpBasarisiz: sayi }),
  isleme: z.object({ xpEritme: sayi, xpDovme: z.record(z.string(), sayi) }),
  gunluk: z.object({
    vurusTam: z.number().int(), vurusYarim: z.number().int(), tavanSonrasiTecrube: sayi, tavanSonrasiCevher: sayi,
    dugumGunlukTavan: z.number().int(), haritaMaciSayilan: z.number().int(), ad: z.string(),
  }),
  isabet: z.object({ periyotMs: z.number().int().positive(), pencereOran: sayi.positive(), toleransMs: z.number().int().positive(), verimEk: z.number().int() }),
  sanssizlikKorumasi: z.object({ ardisikIska: z.number().int().positive() }),
  vurusAraligiMs: z.number().int().positive(),
});

const KatmanSayi = z.object({ baslangic: sayi, standart: sayi, nadir: sayi, hizip: sayi, karanlik: sayi });
export const TariflerDosyaSema = z.object({
  surum: z.number().int(),
  eritme: z.object({ oranTaban: z.number().int(), oranUsta: z.number().int(), ustaFarki: z.number().int(), basarisizKayip: z.number().int() }),
  ustaIsi: z.object({ farkTaban: sayi, bolen: sayi, tavan: sayi }),
  yenidenDov: z.object({ kulceOran: sayi, altinOran: sayi, tecrube: sayi }),
  parcaUretim: z.object({
    katmanMinKademe: KatmanSayi, katmanKulce: KatmanSayi, turCarpan: z.object({ uc: sayi, disk: sayi, govde: sayi, cekirdek: sayi }),
    katmanIscilik: KatmanSayi, katmanEsikEk: KatmanSayi, xpParca: KatmanSayi, kademeDeger: z.array(z.number().int()).length(8),
    eritmeGeriOran: sayi, takimdaAyniTanimTek: z.boolean(),
  }),
  tarifler: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]{3,40}$/), tur: z.enum(["arma", "cerceve", "parca"]), kademe: Kademe,
    girdi: z.array(z.object({ kademe: Kademe, kulce: z.number().int().positive() })).min(1),
    altin: z.number().int().nonnegative(), esik: z.number().int().min(0).max(100),
    cikti: z.object({ gorunum: z.string().optional(), parca: z.string().optional() }), ilkSurum: z.boolean(), bayrak: z.string().optional(),
  })),
});
export type Tarif = z.infer<typeof TariflerDosyaSema>["tarifler"][number];

export const MarketFiyatDosyaSema = z.object({
  surum: z.number().int(), kilitsizUcretsiz: z.boolean(), katman: z.record(KatmanSema, z.number().int().nonnegative()),
});

export const HARITA = HaritaDosyaSema.parse(haritaHam);
export const MADENLER = MadenlerDosyaSema.parse(madenlerHam).kademeler;
export const USTALIK = UstalikDosyaSema.parse(ustalikHam);
export const TARIFLER = TariflerDosyaSema.parse(tariflerHam);
export const MARKET_FIYAT = MarketFiyatDosyaSema.parse(marketFiyatHam);

/** İlk sürümün kademe tavanı: `ilkSurum` olan en yüksek kademe (K4 Kor). */
export const SURUM_KADEME_TAVANI = Math.max(...MADENLER.filter((k) => k.ilkSurum).map((k) => k.kademe));

export function kademeBul(k: number): MadenKademesi {
  const m = MADENLER.find((x) => x.kademe === k);
  if (!m) throw new Error(`Bilinmeyen kademe: ${k}`);
  return m;
}

// ---- istek şemaları (REST; 08 § 4) ----
export const GitSema = z.object({ dugum: DugumKimlik });
export const SandikAcSema = z.object({ dugum: DugumKimlik });
export const MadenBaslaSema = z.object({ dugum: DugumKimlik });
export const KazSema = z.object({ seans: z.string().uuid(), sira: z.number().int().min(0).max(8), isabetMs: z.number().int().min(0).max(5000).nullable() });
export const MadenBitirSema = z.object({ seans: z.string().uuid() });
export const EritSema = z.object({ kademe: Kademe, parti: z.number().int().min(1).max(20), ref: z.string().uuid() });
export const DovSema = z.object({ tarif: z.string().regex(/^[a-z0-9-]{3,40}$/), ref: z.string().uuid(), yeniden: z.boolean().optional() });
export const ParcaUretSema = z.object({ tanim: z.string().regex(/^[a-z0-9-]{2,40}$/), kademe: Kademe, ref: z.string().uuid() });
export const ParcaEritSema = z.object({ parcaId: z.number().int().positive(), tur: z.enum(["parca", "cekirdek"]).optional(), ref: z.string().uuid() });
/** Vitrin: örnek anahtarları "p<id>" (parça) ya da "c<id>" (Çekirdek), en çok 3. */
export const VitrinSema = z.object({ parcalar: z.array(z.string().regex(/^[pc][0-9]{1,9}$/)).max(3) });
