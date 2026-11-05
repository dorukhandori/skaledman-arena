import { z } from "zod";
import { AYAR } from "../paylasilan/kurallar/ayar.ts";
import type { Olay } from "../paylasilan/sim/durum.ts";
import type { AltinKalemi, AltinSifirNedeni } from "../paylasilan/kurallar/ekonomi.ts";

// Ağ katmanı: istemci ve sunucunun ORTAK sözleşmesi (docs/tech/netcode.md). Simülasyon değil: src/paylasilan
// Colyseus'a bağımlı olamaz (eslint kapısı), şemalar ve mesajlar bu klasörde durur. Colyseus import ETMEZ
// (eslint yalıtımı: yalnız src/istemci/ag/** @colyseus/sdk, yalnız src/sunucu/** colyseus).

/**
 * Her mesaj ve katılma seçeneği bu sürümü taşır; uyuşmazsa sunucu reddeder, istemci "yenile" bandı gösterir.
 * v3: maç durumu şeması. v4 (D5): katılmada oda bileti (ad yok), kayıtlı takım kodu, maç sonu ödül bilgisi.
 * v5 (D7): maç sonu ödülüne Altın (kalemler, çarpanlar, bakiye) + başarım ilerlemesi; hızlı maçta `botIste`.
 * v6 (D8): Takım Enerjisi + Takım Ultisi (dünya şeması), seyirci odası `izle` (`IzleKatilmaSema`), oda şemasında `izleKod`.
 */
export const PROTOKOL_SURUMU = 6;

export const ODA_ADI = "mac";
/** Sabit adım (K-6) ve yama yayını (ADR-002). Yama elle, her `YAMA_ADIMI` sim adımında bir (adım hizalı). */
export const SIM_HZ = Math.round(1 / AYAR.dt);
export const YAMA_HZ = 20;
export const YAMA_ADIMI = SIM_HZ / YAMA_HZ;
/** Sunucu tam durum hash'ini (ve wire hash'ini) bu aralıkla olay paketine koyar (flint § 2 madde 6). */
export const HASH_ARALIGI = 60;
/** Kopan oyuncunun koltuğu bu kadar tutulur (flint #10: 20 sn toplam bekleme). */
export const YENIDEN_BAGLANMA_SN = 20;
/** Kopmadan sonra sim bu kadar akar (girdi nötr), sonra donar (flint #10). */
export const KOPMA_AKIS_SN = 3;
/** Oyuncu başına maçta en çok bu kadar dondurma; sonra ilk kopma 3 sn sonunda hükmen (flint #10). */
export const DONDURMA_HAKKI = 2;
/** Girdisiz (sekme gizli) oyuncu: uyarı ve terk (ux § 1.4). */
export const AFK_UYARI_SN = 10;
export const AFK_TERK_SN = 30;
/** Oda açan katıldıktan sonra rakip bu sürede gelmezse oda kapanır (flint #19). */
export const RAKIP_BEKLEME_SN = 60;
/** Maç oynanmayan (bekleme, seçim, sonuç/rövanş) oda en çok bu kadar yaşar (B-20). */
export const ODA_BOS_DK = 10;
/** Takım seçimi (ux § 3.3: 20 sn; süre dolunca son takım, B-21). */
export const SECIM_SN = 20;
/** Uzak topaç bu kadar geriden ara değerlenir (tahmin modeli A). */
export const ARA_DEGER_GECIKMESI_MS = 100;
/** Sunucu girdi tamponu bundan uzunsa bir adımda iki girdi birleştirerek tüketir (gecikme birikmesin). */
export const BIRIKME_ESIGI = 4;
/**
 * Paket boşluğunda son hareket en çok bu kadar adım sürdürülür, sonra girdi nötr olur. 30 adım = 0,5 sn: WebSocket
 * (TCP) kayıpta düşmez, yeniden iletimi bekler (RTO ≈ 200 ms + tek yön 150 ms ≈ 21 adım, N3). Basılı tutulan tuş
 * boşlukta da basılıdır; erken nötrleme sunucu ile tahmini ayırıyordu (D4 matrisi: 6 adımla N3'te 10 çarpışmada
 * ~50 sıçrama). Daha uzun boşluk (≥ 1 sn) duraklama sayılır.
 */
export const BOSTA_TASIMA_ADIMI = 30;

/** Reconcile eşikleri (flint § 2: nicemleme hatasından büyük). Birim: sim birimi (1 br = 1 mantıksal px). */
export const UZLASMA = {
  /** bu kadarın altındaki konum farkı yok sayılır (görsel konum korunur, fark birkaç adımda erir) */
  yokSay: 0.5,
  /** bu kadarın üstü atlama (sıçrama); arası yumuşak düzeltme */
  sicrama: 8,
  /** yumuşak düzeltme süresi (adım; 05 § 4: 3-5) */
  yumusakAdim: 4,
} as const;

// ---- oda kodu (ux § 3.3, G-19): 8 harf ABCD-EFGH, 0/O/1/I yok, büyük-küçük duyarsız, tire isteğe bağlı ----

export const ODA_KODU_HARFLERI = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ODA_KODU_UZUNLUGU = 8;
const KOD_DESENI = new RegExp(`^[${ODA_KODU_HARFLERI}]{${ODA_KODU_UZUNLUGU}}$`);

/** Kullanıcı yazısından kod: boşluk/tire atılır, büyük harfe çevrilir; `#oda=` bağlantısı da kabul edilir. Geçersizse null. */
export function odaKoduCoz(girdi: string): string | null {
  let s = girdi.trim();
  const i = s.indexOf("#oda=");
  if (i >= 0) s = s.slice(i + 5);
  s = s.toUpperCase().replace(/[\s-]/g, "");
  return KOD_DESENI.test(s) ? s : null;
}

export function odaKoduMu(s: string): boolean {
  return KOD_DESENI.test(s);
}

/** ABCDEFGH → ABCD-EFGH (gösterim). */
export function odaKoduBicimle(k: string): string {
  return k.length === ODA_KODU_UZUNLUGU ? `${k.slice(0, 4)}-${k.slice(4)}` : k;
}

/** `rastgele` [0,1) üretir; sunucu crypto'dan verir (paylaşılan sim dışında). */
export function odaKoduUret(rastgele: () => number): string {
  let kod = "";
  for (let i = 0; i < ODA_KODU_UZUNLUGU; i++) kod += ODA_KODU_HARFLERI[Math.floor(rastgele() * ODA_KODU_HARFLERI.length)]!;
  return kod;
}

export const MESAJ = {
  /** sunucu → istemci: bir adımın sim olayları (+ her 60 adımda hash), patch beklemez */
  olaylar: "olaylar",
  /** sunucu → istemci: oda bilgisi (rakip bulundu, uyarı, kapanış nedeni) */
  bilgi: "bilgi",
  /** istemci → sunucu: maç bitti, yeniden oynamak istiyorum (iki taraf → aynı oda yeni maç) */
  rovans: "rovans",
  /** istemci → sunucu: teslim (UI iki adım + 2 sn basılı tutma) → 0-3 */
  teslim: "teslim",
  /** istemci → sunucu: seçim fazında takım */
  takimSec: "takimSec",
  /** istemci → sunucu: seçim fazında hazırım */
  hazir: "hazir",
  /** istemci → sunucu (yalnız geliştirme): maç girdi kaydını iste (tarayıcıda yeniden oynatma testi) */
  kayitIste: "kayitIste",
  /** sunucu → istemci: maç kaydı */
  kayit: "kayit",
  /** D7 istemci → sunucu: hızlı maç kuyruğunda 30 sn doldu, bot ile oyna (nile B-19; sunucu süreyi kendisi denetler) */
  botIste: "botIste",
} as const;

// ---- D8 seyirci (ux § 5, `#izle=ABCDEFGH`) ----
export const IZLE_ODA_ADI = "izle";
/** Oda (yayın) başı seyirci sınırı. */
export const SEYIRCI_SINIRI = 50;
/** Seyirci katılması: yalnız sürüm + yayın kodu (giriş yok, bilet yok; misafir serbest). */
export const IzleKatilmaSema = z.object({ v: z.literal(PROTOKOL_SURUMU), kod: z.string().regex(/^[A-HJ-NP-Z]{8}$/) });

export const MOD = ["oda", "hizli", "antrenman"] as const;
export type OdaModu = (typeof MOD)[number];

/**
 * Katılma (axiom § 2 #6, #22): parça listesi istemciden ALINMAZ; sunucu takımı oturumun oyuncusundan (SQLite) okur.
 * `bilet`: `/api/bilet`'ten 60 s ömürlü, tek kullanımlık HMAC bileti (oda/hızlı için zorunlu; antrenman misafire
 * açık). `takimId`: oyuncunun kayıtlı takım numarası (yoksa ilk takım). `katalog`: istemcinin `katalogOzeti`.
 */
export const KatilmaSema = z.object({
  v: z.literal(PROTOKOL_SURUMU),
  mod: z.enum(MOD),
  katalog: z.string().min(1).max(32),
  bilet: z.string().min(1).max(512).optional(),
  takimId: z.string().min(1).max(64).optional(),
});
export type KatilmaSecenekleri = z.infer<typeof KatilmaSema>;

export const TakimSecSema = z.object({ v: z.literal(PROTOKOL_SURUMU), takimId: z.string().min(1).max(64) });
export const BosMesajSema = z.object({ v: z.literal(PROTOKOL_SURUMU) });

export interface OlayPaketi {
  v: number;
  /** sunucu adımı (Dunya.tick) */
  t: number;
  /** sunucu duvar saati (ms, gönderim anı): tepki gecikmesi ölçümü (aynı makinede anlamlı) */
  ms: number;
  o: Olay[];
  /** her HASH_ARALIGI adımda: sunucu tam (float64) durum hash'i */
  h?: string;
  /** her HASH_ARALIGI adımda: sunucunun kendi şemasından (f32) kurduğu dünyanın hash'i = istemcinin hesaplaması gereken */
  hw?: string;
}

export type BilgiMesaji =
  | { v: number; tur: "rakipBulundu"; ad: string }
  | { v: number; tur: "afkUyari"; kalanSn: number }
  | { v: number; tur: "kapandi"; neden: KapanisNedeni }
  | { v: number; tur: "katalogUyusmuyor" }
  /** D5: maç sonu Çekirdek kartı (yalnız o oyuncuya; sunucu hesaplar). D7: + Altın + başarım ilerlemesi */
  | {
    v: number; tur: "odul"; cekirdekler: OdulBilgisi[]; sayilmadi?: string;
    altin?: AltinBilgisi; basarimlar?: BasarimBilgisi[]; basarimAltini?: number;
    /** başarım sayacı işlemedi: teslim · hukmen · iptal · ciftTavani */
    basarimSayilmadi?: string | null;
    /** hizli · oda · bot */
    mod?: string;
  };

/** D7 sonuç ekranı Altın satırı (sunucu `macAltini`). */
export interface AltinBilgisi {
  kalemler: AltinKalemi[];
  carpanlar: { ad: string; deger: number }[];
  toplam: number;
  sifirNedeni: AltinSifirNedeni | null;
  bakiye: number;
}

/** D7 sonuç ekranı başarım satırı ("+1 Kor Ustası 4/10"; tamamlanınca "Market'te açıldı: <parça>"). */
export interface BasarimBilgisi {
  id: string; ad: string; gizli: boolean; onceki: number; ilerleme: number; sayi: number; tamamlandi: boolean; odulAltin: number;
  acilanParcalar: { id: string; ad: string }[]; acilanOzellik: string[];
}

/** Sonuç ekranı Çekirdek kartı satırı (sunucunun OdulSatiri'nin ağ biçimi). */
export interface OdulBilgisi {
  tanimId: string; ad: string; seviyeOnce: number; seviye: number; xpOnce: number; xp: number; kazanc: number;
  alt: number; ust: number; yeniYetenek: string | null; omur: number | null;
}

export type KapanisNedeni = "rakipGelmedi" | "sureDoldu" | "rakipAyrildi" | "sunucu";

/** Oda fazı (şemada u8). */
export const ODA_FAZI = { bekliyor: 0, secim: 1, mac: 2, bitti: 3, kapandi: 4 } as const;

/** Maç kaydı (yalnız geliştirme): sunucu sim'inin kurulumu + tüketilen girdiler + sim dışı eylemler + hash'ler. */
export interface MacKaydi {
  v: number;
  takimlar: [string, string];
  tohum: number;
  seviye: [number, number];
  /** adım başına iki girdi, düz sayı dizisi: [yonX, yonZ, nisanX, nisanZ, yuva, tuslar, degistir] × 2 (ağ biçimi) */
  girdiler: number[][];
  /** sim dışı eylemler: adımdan SONRA uygulanır (`tick` = o adımın Dunya.tick'i) */
  eylemler: { tick: number; tur: "teslim" | "hukmen" | "iptal"; i: number }[];
  /** her HASH_ARALIGI adımda sunucu tam hash'i */
  hashler: { t: number; h: string }[];
  sonHash: string;
  sonTick: number;
}

/** Oda kodu durumu (HTTP `/api/oda/:kod`): lobi hata metinleri için. */
export type OdaKoduDurumu = "acik" | "dolu" | "suresiDoldu" | "yok";
