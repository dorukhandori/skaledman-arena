// Devran sim sabitleri. TEK OTORİTE: docs/design/tuning.md (anahtar adları oradaki gibi).
// Parça başına sayılar burada DEĞİL, veri/parcalar.json'dadır (src/paylasilan/veri/). Kodda sihirli sayı yok:
// yeni bir sabit gerekirse önce tuning.md'ye, sonra buraya girer. Paylaşılan kod: DOM yok, Node yok.
// Birimler: uzunluk = birim (1 birim = 1 mantıksal piksel, 960×540), hız = birim/s, süre = s.

export type ElementAdi = "kor" | "kasirga" | "simsek" | "girdap" | "kaya" | "don";
export type KokenAdi = "goktasi" | "maden" | "yapay" | "karanlik";

export const AYAR = {
  // ---- § 1 sabit adım ve genel ----
  /** Sabit simülasyon adımı (K-6: 60 Hz). */
  dt: 1 / 60,
  adimHz: 60,
  /** Render karesi başına en çok simülasyon adımı (spiral of death koruması; istemci). */
  enFazlaAdimKare: 6,
  vMutlak: 700,
  /** Coulomb sürtünmesi, br/s². */
  sabitSurtunme: 20,
  /** yorgunlukCarpani = taban + egim · stamina/max */
  yorgunluk: { taban: 0.5, egim: 0.5 },
  /** Aynı çiftte darbe kilidi (adım). 0,10 s. */
  temasKilidi: 6,

  // ---- § 2 arena ----
  topacYaricap: 30,
  arenaYaricap: 240,
  /** Maden "Kök" için merkez: d < oran · R. */
  merkezKucukAlan: 0.35,
  kusakIc: 0.6,
  kusakDis: 0.85,
  kusakHizCarpani: 1.25,
  egimBaslangic: 0.7,
  kEgim: 700,
  eDuvar: 0.5,
  kDuvar: 0.08,
  duvarTik: 0.15,
  /** duvarTik yalnız dışa hız bundan büyükse. */
  duvarTikHizi: 120,
  /** VARSAYIM (tuning'de yok): dışa hız bunun altındaysa sekme/bedel/olay yok, topaç duvar boyunca kayar.
   *  Gerekçe: kenara doğru sürmeye devam eden topaç her adım "çarpıp" saniyede ~90 stamina kaybediyordu. */
  duvarOlayHizi: 40,
  /** Varsayılan vRO; Uç verisi kendi `ringOutHizi`nı taşır. */
  ringOutHizi: 200,
  dogum: [
    { x: -130, z: 0 },
    { x: 130, z: 0 },
  ],

  // ---- § 3 Uç desenleri ----
  desen: {
    cicek: { Ad: 250, omegaD: 2.0, kMerkez: 0 },
    merkezci: { Ad: 0, omegaD: 0, kMerkez: 2.0 },
    dengeli: { Ad: 100, omegaD: 1.5, kMerkez: 0.8 },
    kusak: { Ad: 100, omegaD: 1.5, kMerkez: 0.8 },
    cakili: { Ad: 0, omegaD: 0, kMerkez: 0 },
  },

  // ---- § 4 dash, sekme, sıkı dönüş ----
  dashHiziEki: 300,
  dashPenceresi: 0.25,
  kDash: 1.3,
  dashBekleme: 4.0,
  sekmeSure: 0.3,
  sekmeBekleme: 2.5,
  sekmeStamina: 8,
  /** Eylem stamina'yı 0'a indiremez: bedel > stamina − pay ise reddedilir (flint #20). */
  eylemStaminaPayi: 5,

  // ---- § 5 çarpışma ----
  kKb: 1.2,
  fOn: 1.0,
  fYan: 0.6,
  fArka: 0.3,
  /** Bundan yavaş topaç "hızsız" sayılır (f = fArka). */
  hizsizEsik: 1,
  alfaOnTaban: 30,
  alfaOnKanat: 10,
  alfaOnEnFazla: 80,
  /** Kanat bonusu (ön çarpanı 1,5 − 0,1·kanat). tuning § 5: sim'de test edilmedi, varsayılan KAPALI. */
  kanatOnBonusu: { acik: false, taban: 1.5, kanatBasina: 0.1 },
  /** s = saldiri/ref, sv = savunma/ref. */
  statReferans: 50,
  kH: 0.006,
  kGeriOran: 0.25,
  tekVurusTavani: 0.3,
  /** Temas eşikleri (yalnız his; sim'e etkisi yok), vn br/s. */
  temasEsik: { hafif: 80, agir: 260, kritik: 420 },
  kEsit: 0.06,
  kEsitEnFazla: 20,
  /** Kütle referansı (05/flint): oranlar 10 birim kütleye göre okunur. Formüllerde doğrudan kullanılmaz. */
  kutleReferans: 10,

  // ---- § 6 stamina ----
  staminaTaban: 300,
  kHiz: 2.0,
  vRef: 260,
  kritikEsik: 0.25,
  /** Yalpa (salt görsel) başlangıcı. */
  yalpaBaslangic: 0.4,

  // ---- § 7 tık ----
  kTik: 1 / 5000,
  tikTavan: 1.2,
  tikKutleBoleni: 40,
  tikGeriDonus: 0,

  // ---- § 10 maç ----
  puan: { durma: 1, ringOut: 2, parcalanma: 2 },
  /** Durma kararından sonra hız sönümü (adım). Salt süs: karar o anda verilmiştir. */
  durmaSonumu: 40,
  mac: {
    kazanmaPuani: 3,
    /** Maç saati, s (puan aralarında durmaz). */
    macSuresi: 90,
    /** ux § 3.4: "Hazır" 2 s, sonra 3-2-1 (tuning: geri sayım 3 s). */
    hazirSure: 2,
    geriSayim: 3,
    /** Bitiş sonrası kutlama, s. */
    kutlama: 1.2,
    /** Kaybedenin topaç seçim penceresi, s (dolunca sıradaki otomatik). */
    secimSure: 4,
    /** Yeni topacın giriş koruması, s (çarpışmaz, hasar almaz; flint #13'ün 24 adımı yerine tuning § 10). */
    girisKorumasi: 1.0,
    /** Kazanana + oran · maxStamina (tuning § 6, § 18; H5'te %0/20/40 denenir). */
    kazananIyilesme: 0.2,
    /** Ani ölüm: R `aniOlumDaralma` s içinde doğrusal 1,0 → `aniOlumTabanR`; erime × (1 + egim · t). */
    aniOlumSure: 30,
    aniOlumDaralma: 20,
    aniOlumTabanR: 0.6,
    aniOlumErimeEgim: 0.05,
    /** Mutlak sınır, s (maç saati). */
    mutlakSinir: 120,
    /** Geri çek: stamina < eşik · max, 2,0 s savunmasız (kb × 1,5), bekleme 20 s (tuning § 6, 01 § 2.3). */
    geriCekEsik: 0.25,
    geriCekSure: 2.0,
    geriCekKb: 1.5,
    geriCekBekleme: 20,
    /** § 8 uyum: komşu elementten devralan yeni topaç + bu kadar Enerji ile başlar; tavan 3 dilim. */
    enerjiKomsuDevir: 40,
    enerjiTavan: 300,
    /** VARSAYIM (flint #13 "iniş noktası rakipten uzak değilse kaydır"): geri çekte iniş rakipten en az bu kadar uzak. */
    inisMesafesi: 120,
  },

  // ---- girdi ----
  /** Nişan noktası çanaktan en çok bu kadar taşabilir. */
  nisanTasma: 120,
  yuvaSayisi: 4,
  takimBoyutu: 3,
} as const;

/** § 12 element eğilim çarpanları (her zaman biner; tipe güç vermez). */
export const ELEMENT_EGILIM: Record<ElementAdi, {
  ivme: number; kusakEk: number; surtunme: number; dashEki: number; dashBekleme: number; erime: number; kutle: number; kbAlinan: number;
}> = {
  kor: { ivme: 1.08, kusakEk: 0.1, surtunme: 1, dashEki: 1, dashBekleme: 1, erime: 1, kutle: 1, kbAlinan: 1 },
  kasirga: { ivme: 1, kusakEk: 0, surtunme: 0.9, dashEki: 1.05, dashBekleme: 1, erime: 1, kutle: 1, kbAlinan: 1 },
  simsek: { ivme: 1.04, kusakEk: 0, surtunme: 1, dashEki: 1, dashBekleme: 0.8, erime: 1, kutle: 1, kbAlinan: 1 },
  girdap: { ivme: 1, kusakEk: 0, surtunme: 1, dashEki: 1, dashBekleme: 1, erime: 0.92, kutle: 1, kbAlinan: 1 },
  kaya: { ivme: 0.92, kusakEk: 0, surtunme: 1, dashEki: 1, dashBekleme: 1, erime: 1, kutle: 1.06, kbAlinan: 0.92 },
  don: { ivme: 0.95, kusakEk: 0, surtunme: 0.8, dashEki: 1, dashBekleme: 1, erime: 0.96, kutle: 1, kbAlinan: 1 },
};

/** Çark sırası (§ 12): komşu = ±1, karşıt = +3. */
export const ELEMENT_CARKI: readonly ElementAdi[] = ["kor", "kasirga", "simsek", "girdap", "kaya", "don"];

/** § 11 köken pasiflerinin sim'deki kısmı (Kriz Alevi Enerji'ye ait, D3). */
export const KOKEN_PASIF = {
  maden: { kokErimeCarpani: 0.8, kokHizEsigi: 40, ivme: 0.9 },
  yapay: { erime: 1.1 },
  karanlik: { erime: 1.35, emisOran: 0.2, emisEnFazla: 12, emisZitOran: 0.4, emisZitEnFazla: 20 },
} as const;
