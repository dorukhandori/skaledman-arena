// MOBIL-1 cihaz algılama ve ölçek hesapları (saf işlevler test/mobil.test.ts'te sınanır; DOM'a dokunanlar korumalı).

/**
 * Dokunmatik denetim gösterilsin mi: birincil işaretçi kaba ve üzerine gelme yok (telefon, tablet). `?dokunmatik=1|0`
 * ezer (test, melez dizüstü). Varsaydım: dokunmatik ekranlı fareli dizüstü (birincil işaretçi ince) klavye/fare düzeninde
 * kalır; `?dokunmatik=1` ile açılabilir.
 */
export function dokunmatikMi(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(location.search).get("dokunmatik");
  if (q === "1") return true;
  if (q === "0") return false;
  try {
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  } catch { return false; }
}

/** iOS / iPadOS Safari (Fullscreen API yok; "Ana Ekrana Ekle" ipucu). */
export function iosMu(ua = typeof navigator === "undefined" ? "" : navigator.userAgent, dokunNoktasi = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && dokunNoktasi > 1);
}

/** Bağımsız (ana ekrandan açılmış PWA) mı. */
export function bagimsizMi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch { return false; }
}

/**
 * Menü ölçeği (GU-A: 640×360 mantıksal, tam sayı `--o`). Masaüstü kuralı aynen: o = max(2, floor(min(W/640, H/360))).
 * Dokunmatikte alt sınır 1: telefon yatayda (844×390, 667×375, 915×412, 932×430) o = 1 → mantıksal alan = görünüm
 * (≥ 640×360, yerleşim sığar). Telefon yakından bakılır ve pixel yazı 1× (m5x7 16 px = 7 px büyük harf) okunmaz: yazı
 * ölçeği yo = 1,5 · metin ölçeği, CİHAZ pikseline yuvarlanır (yo·dpr tam sayı: DPR 2'de 1,5 → yazı tipi pikseli 3 cihaz
 * pikseli; DPR 3'te 5/3). Böylece glif ızgarası cihazda tam sayı kalır (kesirli yumuşama yok), yazı masaüstündeki
 * açısal boyuta yakın olur. o ≥ 2 olan büyük dokunmatik ekranlarda masaüstü kuralı geçerli.
 */
export function olcekHesapla(w: number, h: number, metin = 1, dokunmatik = false, dpr = 1): { o: number; yo: number; yaziOrani: number } {
  const ham = Math.floor(Math.min(w / 640, h / 360));
  if (dokunmatik && ham < 2) {
    const o = 1;
    const d = dpr > 0 ? dpr : 1;
    const yo = Math.max(1, Math.round(1.5 * metin * d) / d);
    return { o, yo, yaziOrani: yo / o };
  }
  const o = Math.max(2, ham);
  const yo = metin <= 1 ? o : Math.max(o + 1, Math.ceil(o * metin - 0.01));
  return { o, yo, yaziOrani: yo / o };
}

/** Cihaz sınıfı (efekt tavanları): dokunmatik cihaz ya da az çekirdek / az bellek → "mobil". */
export type CihazSinifi = "masaustu" | "mobil";
export function cihazSinifi(dokunmatik: boolean, cekirdek = 8, bellekGb = 8): CihazSinifi {
  return dokunmatik || cekirdek <= 4 || bellekGb <= 2 ? "mobil" : "masaustu";
}

let sinifOnbellek: CihazSinifi | null = null;
/** Çalışma zamanı cihaz sınıfı (bir kez hesaplanır; Node testinde "masaustu"). */
export function buCihazSinifi(): CihazSinifi {
  if (sinifOnbellek) return sinifOnbellek;
  if (typeof navigator === "undefined") return "masaustu";
  const n = navigator as unknown as { hardwareConcurrency?: number; deviceMemory?: number };
  sinifOnbellek = cihazSinifi(dokunmatikMi(), n.hardwareConcurrency ?? 8, n.deviceMemory ?? 8);
  return sinifOnbellek;
}

/** Efekt tavanları cihaz sınıfına göre (parçacık 400 / kıvılcım 150 masaüstü; mobilde yarıya yakın). */
export function efektTavani(masaustu: number, sinif: CihazSinifi = buCihazSinifi()): number {
  return sinif === "mobil" ? Math.round(masaustu * 0.55) : masaustu;
}

/**
 * Klavye terimli öğretici metni dokunmatik karşılığına çevirir (eğitim şeridi, karşılama). Metin paylaşılan veriden
 * gelir (src/paylasilan/egitim.ts değişmez); yalnız gösterim çevrilir.
 */
export function dokunmatikMetin(s: string): string {
  return s
    .replace(/\*\*W A S D\*\* ile/g, "**Sol başparmakla**")
    .replace(/WASD ile/g, "sol başparmakla")
    .replace(/\*\*Shift\*\* ile/g, "**DASH** ile")
    .replace(/Fareyi rakibe tut, \*\*1\*\*'e bas ve bırak/g, "**1**'e dokun (rakibe kendiliğinden nişan alır) ya da sürükleyip bırak")
    .replace(/\*\*Space\*\* ile/g, "**SEKME** ile");
}

/** Eğitim şeridindeki tuş rozeti (dokunmatik karşılığı). */
export function dokunmatikTus(tus: string): string {
  return ({ WASD: "SÜR", Shift: "DASH", Space: "SEKME" } as Record<string, string>)[tus] ?? tus;
}
