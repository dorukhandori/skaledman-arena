// Dokunmatik maç girdisinin saf hesapları (MOBIL-1): sanal joystick → sürüş yönü, oto-nişan, nişan ezme, düğme yerleşimi.
// DOM ve Pixi yok: test/dokunmatik.test.ts sınar. Ağ protokolü ve paylaşılan sim değişmez; buradan çıkan değerler mevcut
// `Girdi` alanlarına (yonX/yonZ −1..1 analog, nisanX/Z dünya noktası, tek seferlik dash/zipla/atesle) yazılır.

/** Joystick sabitleri (CSS px). Varsaydım: 56 px yarıçap baş parmağın rahat açısı; ölü bölge %18. */
export const JOYSTICK = {
  /** taban halkasının yarıçapı (CSS px) */
  yaricap: 56,
  /** ölü bölge (yarıçap oranı): altında yön 0 (titreyen başparmak topacı sürüklemesin) */
  oluBolge: 0.18,
  /** dış eşik: bu oranın üstü tam hız (kenara kadar itmek zorunda kalmasın) */
  tamEsik: 0.9,
} as const;

/** Nişan ezme (sağ başparmak sürüklemesi) sabitleri. */
export const NISAN_EZME = {
  /** sürükleme bu kadar CSS px'i aşınca nişan ezilir (dokunma = oto-nişan) */
  esik: 14,
  /** ezilen nişan topaçtan bu kadar dünya px ötede */
  uzaklik: 150,
  /** parmak kalkınca ezme bu kadar ms daha sürer, sonra oto-nişana dönülür */
  surmeMs: 900,
} as const;

/**
 * Joystick parmak ofsetini (dx, dy; ekran CSS px, y aşağı) sim sürüş yönüne çevirir.
 * Ölü bölge altında 0; ölü bölge ile `tamEsik` arası doğrusal 0→1; üstü 1. Yön hibrit kameranın basıklığına göre
 * düzeltilir (`k` = zOrani): ekranda parmağın gösterdiği yöne giden sim yönü (dy / k). Sonuç uzunluğu ≤ 1.
 */
export function joystickYonu(dx: number, dy: number, yaricap: number = JOYSTICK.yaricap, oluBolge: number = JOYSTICK.oluBolge, k = 1): { x: number; z: number; guc: number } {
  const m = Math.hypot(dx, dy);
  const oran = yaricap > 0 ? m / yaricap : 0;
  if (oran <= oluBolge || m === 0) return { x: 0, z: 0, guc: 0 };
  const guc = Math.min(1, (oran - oluBolge) / (JOYSTICK.tamEsik - oluBolge));
  // ekran yönü → sim yönü: ekranda z, k ile basılır; ters dönüşüm dy / k
  const sx = dx;
  const sz = dy / (k > 0 ? k : 1);
  const u = Math.hypot(sx, sz);
  return { x: (sx / u) * guc, z: (sz / u) * guc, guc };
}

/** Joystick topuzunun ekran konumu: taban merkezinden en çok `yaricap` uzakta (görsel). */
export function topuzKonumu(dx: number, dy: number, yaricap: number = JOYSTICK.yaricap): { x: number; y: number } {
  const m = Math.hypot(dx, dy);
  if (m <= yaricap || m === 0) return { x: dx, y: dy };
  return { x: (dx / m) * yaricap, y: (dy / m) * yaricap };
}

export interface NisanAdayi { x: number; z: number; aktif: boolean }

/**
 * Oto-nişan: en yakın etkin rakip topacın konumu. Yoksa null (çağıran son yönü korur).
 * 1v1'de tek rakip vardır; liste genel tutuldu (Antrenman kuklası, ileride takım).
 */
export function otoNisanHedefi(ben: { x: number; z: number }, adaylar: readonly NisanAdayi[]): { x: number; z: number } | null {
  let en: NisanAdayi | null = null;
  let enD = Infinity;
  for (const a of adaylar) {
    if (!a.aktif) continue;
    const d = (a.x - ben.x) ** 2 + (a.z - ben.z) ** 2;
    if (d < enD) { enD = d; en = a; }
  }
  return en ? { x: en.x, z: en.z } : null;
}

/** Nişan ezme sürüklemesi (ekran dx, dy) → dünya nişan noktası (topaçtan `uzaklik` ötede, kamera basıklığı düzeltilmiş). */
export function nisanEzmeNoktasi(ben: { x: number; z: number }, dx: number, dy: number, k = 1, uzaklik: number = NISAN_EZME.uzaklik): { x: number; z: number } | null {
  const sz = dy / (k > 0 ? k : 1);
  const u = Math.hypot(dx, sz);
  if (u === 0) return null;
  return { x: ben.x + (dx / u) * uzaklik, z: ben.z + (sz / u) * uzaklik };
}

// ---- düğme yerleşimi ----

export type DugmeAdi = "dash" | "sekme" | "y1" | "y2" | "y3" | "y4";
export interface Daire { x: number; y: number; r: number }
export interface GuvenliAlan { sol: number; sag: number; ust: number; alt: number }

/** Dokunma hedefi alt sınırı (CSS px; Apple HIG / WCAG 2.5.5). */
export const EN_AZ_HEDEF = 44;

/**
 * Sağ alt baş parmak kavisi (CSS px, görünüm koordinatı). Dash köşede en büyük düğme (en sık eylem); Sekme solunda;
 * Yetenek 1-2 ve Ulti (3) Dash merkezli yay üstünde soldan yukarıya; Takım Ultisi (4) yayın dışında, Yetenek 2'nin
 * üst-solunda. Küçük ekranda (kısa kenar < 400) çaplar küçülür ama 44 px altına inmez. Çakışma ve taşma test edilir.
 */
export function dugmeYerlesimi(w: number, h: number, g: GuvenliAlan = { sol: 0, sag: 0, ust: 0, alt: 0 }): Record<DugmeAdi, Daire> {
  const kucuk = Math.min(w, h) < 400;
  const rD = kucuk ? 32 : 36; // dash
  const r = kucuk ? 25 : 28; // diğerleri (çap 50-56)
  const pay = 10;
  const cx = w - g.sag - pay - rD;
  const cy = h - g.alt - pay - rD;
  const bosluk = 8;
  // dört düğme (Sekme, Yetenek 1, 2, Ulti) Dash merkezli yayda eşit aralıklı (31°; Ulti Dash'in neredeyse tam üstünde):
  // komşu kiriş 2·ρ·sin(15,5°) ≥ 2r + 2 + boşluk
  const adim = 31;
  const der = Math.PI / 180;
  const rho = Math.max(rD + r + bosluk + 8, (2 * r + 2 + bosluk) / (2 * Math.sin((adim / 2) * der)));
  const yay = (aci: number, rr: number, p = rho): Daire => ({ x: cx + Math.cos(aci * der) * p, y: cy - Math.sin(aci * der) * p, r: rr });
  return {
    dash: { x: cx, y: cy, r: rD },
    sekme: yay(180, r),
    y1: yay(180 - adim, r),
    y2: yay(180 - 2 * adim, r),
    y3: yay(180 - 3 * adim, r + 2),
    // Takım Ultisi: yayın dışında (nadir eylem), Yetenek 1 ile 2'nin arkasında ikinci sırada
    y4: yay(180 - 1.5 * adim, r, rho + 2 * r + bosluk),
  };
}

/** Bir noktaya en yakın düğme (dokunma payı `ek` px ile). Yoksa null. Gizli düğmeler `gizli` kümesinde. */
export function dugmeBul(yer: Record<DugmeAdi, Daire>, x: number, y: number, ek = 6, gizli: ReadonlySet<DugmeAdi> = new Set()): DugmeAdi | null {
  let en: DugmeAdi | null = null;
  let enD = Infinity;
  for (const ad of Object.keys(yer) as DugmeAdi[]) {
    if (gizli.has(ad)) continue;
    const d = yer[ad];
    const m = Math.hypot(x - d.x, y - d.y);
    if (m <= d.r + ek && m < enD) { enD = m; en = ad; }
  }
  return en;
}

/** Dokunuş joystick bölgesinde mi (ekranın sol %45'i). */
export function joystickBolgesi(x: number, w: number): boolean {
  return x < w * 0.45;
}

/**
 * Yetenek düğmesinden sürükleyerek nişan + bırakma kararı: hiç ölü bölgeden çıkmadıysa dokunma = oto-nişanla at;
 * dışarı çıkıp geri düğmenin üstüne dönerek bırakmak = iptal (masaüstündeki iptal şeridinin karşılığı).
 */
export function birakmaKarari(cikti: boolean, dx: number, dy: number, dugmeR: number): "at" | "iptal" {
  if (!cikti) return "at";
  return Math.hypot(dx, dy) <= dugmeR ? "iptal" : "at";
}
