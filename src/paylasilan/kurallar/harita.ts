import { HARITA, type Bolge, type Dugum, type YildizSartKodu } from "../veri/harita.ts";

// Harita kuralları (docs/design/harita/01, 13): düğüm aşamaları KEŞFET → TEMİZLE → USTALAŞ, kilit (komşu açma), en kısa
// yürüme yolu (BFS, yalnız açık/geçilmiş düğümler, yönsüz), bölge ilerlemesi (34 puan), rozetler, yıldız değerlendirmesi,
// düğüm ödülleri. SAF; sunucu yazar, istemci gösterir. G-0: hiçbiri maç gücüne girmez.

/** `harita_dugum.durum` (13 § 4.1). Kayıt yoksa KILITLI. */
export const DURUM = { kilitli: 0, acik: 1, kesfet: 2, temizle: 3, ustalas: 4 } as const;
export type DugumDurumu = (typeof DURUM)[keyof typeof DURUM];
export const ASAMA_AD: Record<number, string> = { 0: "KİLİTLİ", 1: "AÇIK", 2: "KEŞFET", 3: "TEMİZLE", 4: "USTALAŞ" };

export type Durumlar = Readonly<Record<string, number>>;

/** İlk sürüm bölgeleri (sezon 2 `ilkSurum:false` filtrelenir). */
export const ILK_BOLGELER: readonly Bolge[] = HARITA.bolgeler.filter((b) => b.ilkSurum);
export const BASLANGIC_DUGUMU = `b${ILK_BOLGELER[0]!.no}-01`;

export function bolgeBul(id: string): Bolge | undefined {
  return HARITA.bolgeler.find((b) => b.id === id);
}
/** Düğümün bölgesi ("b2-07" → bölge no 2). */
export function dugumBolgesi(dugumId: string): Bolge | undefined {
  const no = Number(dugumId.slice(1, dugumId.indexOf("-")));
  return HARITA.bolgeler.find((b) => b.no === no);
}
export function dugumBul(id: string): Dugum | undefined {
  return dugumBolgesi(id)?.dugumler.find((d) => d.id === id);
}
export function girisDugumu(b: Bolge): string {
  return `b${b.no}-01`;
}

/** Bu tür, bu durumda komşularını açar mı: maden/sandık KEŞFET ile, düşman/patron TEMİZLE ile (13 § 3.1). */
export function acarMi(tur: Dugum["tur"], durum: number): boolean {
  return tur === "maden" || tur === "sandik" ? durum >= DURUM.kesfet : durum >= DURUM.temizle;
}

/** Düğümün en yüksek aşaması: sandık 3 (TEMİZLE = açıldı), diğerleri 4. */
export function enYuksekAsama(tur: Dugum["tur"]): number {
  return tur === "sandik" ? DURUM.temizle : DURUM.ustalas;
}

export type AsamaOlayi =
  | { tur: "varis" }
  | { tur: "galibiyet"; yildizMaske: number }
  | { tur: "vurus"; basariliToplam: number }
  | { tur: "sandik" };

/** Aşama hesabı: yalnız yükselir; kilitli düğüm olayla açılmaz. */
export function asamaHesapla(d: Dugum, durum: number, o: AsamaOlayi, ustaDamarVurus = 30): number {
  if (durum < DURUM.acik) return durum;
  let yeni = Math.max(durum, DURUM.kesfet);
  if (o.tur === "galibiyet" && (d.tur === "dusman" || d.tur === "patron")) {
    yeni = Math.max(yeni, DURUM.temizle);
    if ((o.yildizMaske & 7) === 7) yeni = DURUM.ustalas;
  } else if (o.tur === "vurus" && d.tur === "maden") {
    if (o.basariliToplam >= 1) yeni = Math.max(yeni, DURUM.temizle);
    if (o.basariliToplam >= ustaDamarVurus) yeni = DURUM.ustalas;
  } else if (o.tur === "sandik" && d.tur === "sandik") {
    yeni = Math.max(yeni, DURUM.temizle);
  }
  return Math.min(yeni, enYuksekAsama(d.tur));
}

/**
 * Bu düğümün yeni durumunda açılacak düğümler (kilitliyken AÇIK yazılacaklar): komşular + patron TEMİZLE'de sonraki
 * bölgenin girişi (ilk sürümde değilse yok).
 */
export function acilacaklar(d: Dugum, durum: number, durumlar: Durumlar): string[] {
  if (!acarMi(d.tur, durum)) return [];
  const aday = [...d.komsu];
  if (d.tur === "patron" && d.sonrakiBolge) {
    const s = bolgeBul(d.sonrakiBolge);
    if (s?.ilkSurum) aday.push(girisDugumu(s));
  }
  return aday.filter((id) => (durumlar[id] ?? DURUM.kilitli) === DURUM.kilitli);
}

/** Bölge içi yönsüz komşuluk (yürüme geri de olur). */
export function yonsuzKomsular(b: Bolge): Map<string, string[]> {
  const m = new Map<string, string[]>(b.dugumler.map((d) => [d.id, []]));
  for (const d of b.dugumler) {
    for (const k of d.komsu) {
      if (!m.has(k)) continue; // bölge dışı kenar (sonraki bölge) yürünmez
      m.get(d.id)!.push(k);
      m.get(k)!.push(d.id);
    }
  }
  return m;
}

/** En kısa yürüme yolu (BFS; yalnız durum ≥ AÇIK düğümler). Başlangıç dahil düğüm listesi ya da null. */
export function enKisaYol(b: Bolge, durumlar: Durumlar, from: string, to: string): string[] | null {
  const gecer = (id: string) => (durumlar[id] ?? DURUM.kilitli) >= DURUM.acik;
  if (!gecer(from) || !gecer(to)) return null;
  if (from === to) return [from];
  const kom = yonsuzKomsular(b);
  const once = new Map<string, string>([[from, ""]]);
  const kuyruk = [from];
  while (kuyruk.length) {
    const x = kuyruk.shift()!;
    for (const y of kom.get(x) ?? []) {
      if (once.has(y) || !gecer(y)) continue;
      once.set(y, x);
      if (y === to) {
        const yol = [y];
        let z = x;
        while (z) { yol.push(z); z = once.get(z)!; }
        return yol.reverse();
      }
      kuyruk.push(y);
    }
  }
  return null;
}

/** Aşama puanı: KEŞFET 1, TEMİZLE 2, USTALAŞ 3 (sandık en çok 2). */
export function asamaPuani(tur: Dugum["tur"], durum: number): number {
  return Math.max(0, Math.min(durum, enYuksekAsama(tur)) - DURUM.acik);
}

export interface BolgeIlerlemesi { puan: number; enCok: number; yuzde: number }
export function bolgeIlerlemesi(b: Bolge, durumlar: Durumlar): BolgeIlerlemesi {
  let puan = 0;
  let enCok = 0;
  for (const d of b.dugumler) {
    puan += asamaPuani(d.tur, durumlar[d.id] ?? 0);
    enCok += asamaPuani(d.tur, DURUM.ustalas);
  }
  return { puan, enCok, yuzde: enCok ? Math.floor((puan * 100) / enCok) : 0 };
}

/** Bölge rozetleri (13 § 3.3; birikimli): 1 BRONZ, 2 GÜMÜŞ, 3 ALTIN; 0 yok. */
export const ROZET = { yok: 0, bronz: 1, gumus: 2, altin: 3 } as const;
export const ROZET_AD: Record<number, string> = { 0: "", 1: "BRONZ", 2: "GÜMÜŞ", 3: "ALTIN" };
export const ROZET_ODUL: Record<number, { altin: number; gorunum: string | null }> = {
  1: { altin: 300, gorunum: null }, 2: { altin: 500, gorunum: "cerceve-" }, 3: { altin: 800, gorunum: null },
};

export function rozetHesapla(b: Bolge, durumlar: Durumlar): number {
  const d = (x: Dugum) => durumlar[x.id] ?? 0;
  const bronz = b.dugumler.every((x) => d(x) >= DURUM.temizle);
  if (!bronz) return ROZET.yok;
  const patron = b.dugumler.find((x) => x.tur === "patron");
  const gumus = !!patron && d(patron) >= DURUM.ustalas;
  if (!gumus) return ROZET.bronz;
  return b.dugumler.every((x) => d(x) >= enYuksekAsama(x.tur)) ? ROZET.altin : ROZET.gumus;
}

// ---- yıldızlar (01 § 3.2) ----
export interface YildizOzeti {
  kazandi: boolean;
  sureSn: number;
  kalanStaminaOrani: number;
  bitisler: readonly { tur: string; yetenekGecenSn: number | null; alanNo: number | null }[];
}
export const YILDIZ_AD: Record<YildizSartKodu, string> = {
  kazan: "KAZAN", temiz: "TEMİZ KAZAN", hizli: "60 SN'DE KAZAN", ringOut: "RING OUT İLE PUAN", durma: "DURMA İLE PUAN",
  parcalanma: "PARÇALANMA İLE PUAN", yetenekBitis: "YETENEKLE BİTİR",
};

export function yildizSartiTamam(s: YildizSartKodu, o: YildizOzeti): boolean {
  if (!o.kazandi) return false;
  switch (s) {
    case "kazan": return true;
    case "temiz": return o.kalanStaminaOrani >= 0.5;
    case "hizli": return o.sureSn <= 60;
    case "ringOut": case "durma": case "parcalanma": return o.bitisler.some((b) => b.tur === s);
    case "yetenekBitis": return o.bitisler.some((b) => b.alanNo !== null || (b.yetenekGecenSn !== null && b.yetenekGecenSn <= 3));
  }
  return false;
}

/** Bu maçta sağlanan yıldızların bit maskesi (bit i = şart i). */
export function yildizlar(o: YildizOzeti, sartlar: readonly YildizSartKodu[]): number {
  let m = 0;
  sartlar.forEach((s, i) => { if (yildizSartiTamam(s, o)) m |= 1 << i; });
  return m;
}

export function yildizSayisi(maske: number): number {
  return (maske & 1) + ((maske >> 1) & 1) + ((maske >> 2) & 1);
}

// ---- ödüller (01 § 4–5, 13 § 3.2) ----
export interface Kalem { kademe: number; adet: number }
export interface DugumOdulu { altin: number; cevher: Kalem[]; kulce: Kalem[]; gorunum: string[] }
const bos = (): DugumOdulu => ({ altin: 0, cevher: [], kulce: [], gorunum: [] });

/** Sayılan tekrar maçının sabit ödülü (01 § 5). */
export const TEKRAR = { galibiyetAltin: 50, maglubiyetAltin: 30 } as const;

export interface MacOdulGirdisi {
  bolge: Bolge;
  dugum: Dugum;
  /** maçtan önceki durum ve yıldız maskesi */
  durumOnce: number;
  maskeOnce: number;
  /** bu maçın yıldızları */
  maske: number;
  kazandi: boolean;
  /** günün ilk 10 harita maçından biri */
  sayilan: boolean;
}

/**
 * Harita maçı ödülü: yeni yıldızlar (bir kez, 10 sınırına takılmaz), patron ilk galibiyet, USTALAŞ eki; düğüm zaten
 * TEMİZLE ise sayılan galibiyet tekrar ödülü; sayılan mağlubiyet 30 Altın.
 */
export function macOdulu(g: MacOdulGirdisi): DugumOdulu & { yeniMaske: number; durum: number } {
  const o = bos();
  const d = g.dugum;
  if (d.tur !== "dusman" && d.tur !== "patron") return { ...o, yeniMaske: g.maskeOnce, durum: g.durumOnce };
  const yeniMaske = g.maskeOnce | g.maske;
  const yeniYildiz = yildizSayisi(yeniMaske) - yildizSayisi(g.maskeOnce);
  const durum = g.kazandi ? asamaHesapla(d, g.durumOnce, { tur: "galibiyet", yildizMaske: yeniMaske }) : asamaHesapla(d, g.durumOnce, { tur: "varis" });
  if (yeniYildiz > 0) {
    o.altin += d.odul.altinYildiz * yeniYildiz;
    o.cevher.push({ kademe: d.odul.cevherYildiz.kademe, adet: d.odul.cevherYildiz.adet * yeniYildiz });
  }
  const ilkTemizle = g.kazandi && g.durumOnce < DURUM.temizle;
  if (ilkTemizle && d.tur === "patron") {
    o.altin += d.odul.altinIlk;
    o.kulce.push({ ...d.odul.kulceIlk });
  }
  if (g.kazandi && !ilkTemizle && g.sayilan) {
    o.altin += TEKRAR.galibiyetAltin;
    o.cevher.push({ ...d.odul.tekrar.cevher });
  }
  if (!g.kazandi && g.sayilan) o.altin += TEKRAR.maglubiyetAltin;
  if (durum === DURUM.ustalas && g.durumOnce < DURUM.ustalas) {
    if (d.tur === "dusman") o.kulce.push({ kademe: g.bolge.no, adet: 1 });
    else o.gorunum.push(`arma-${g.bolge.id}`);
  }
  return { ...o, yeniMaske, durum };
}

/** Bu oyuncunun düğüm durumlarından tüm ilk sürüm yıldız toplamı. */
export function yildizToplami(maskeler: Readonly<Record<string, number>>): number {
  let t = 0;
  for (const b of ILK_BOLGELER) for (const d of b.dugumler) t += yildizSayisi(maskeler[d.id] ?? 0);
  return t;
}

/** Bölgenin açık olup olmadığı: girişi en az AÇIK. Kilitliyse neden (önceki bölgenin patronu). */
export function bolgeKilidi(b: Bolge, durumlar: Durumlar): { acik: boolean; kilitNedeni: string | null } {
  if ((durumlar[girisDugumu(b)] ?? 0) >= DURUM.acik) return { acik: true, kilitNedeni: null };
  const onceki = HARITA.bolgeler.find((x) => x.no === b.no - 1);
  return { acik: false, kilitNedeni: onceki ? `BÖLGE ${onceki.no} PATRONU` : "İLK DEVİR" };
}

/** Kilitli düğüm için "ÖNCE: …" bilgisi: gelen kenarlı düğümler. */
export function onKosullar(b: Bolge, dugumId: string): string[] {
  return b.dugumler.filter((d) => d.komsu.includes(dugumId)).map((d) => d.id);
}
