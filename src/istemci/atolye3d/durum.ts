// Atölye 3B görünüm durumu (saf; birim test edilir). Görüntüleyici (three.js) ve DOM katmanı bu durumu okur.
//   mod: "patlatilmis" (referans 03: dört katman dikey ayrı) · "birlesik" (topaç takılı) · "odak" (tek parça öne çıkar)
//   Klavye: ←/→ yatay döndür, ↑/↓ dikey (sınırlı), Enter/Space odaktaki katmanı seç, Esc geri (odak → önceki mod),
//   B birleştir/ayır. Sürükleme: yatay serbest (360° sarar), dikey [EN_AZ_EGIM, EN_COK_EGIM] derece.

export type KatmanTuru = "cekirdek" | "govde" | "disk" | "uc";
export type GorunumModu = "patlatilmis" | "birlesik" | "odak";

/** Yukarıdan aşağı (referans 03): Çekirdek, Gövde, Disk, Uç */
export const KATMAN_SIRASI: readonly KatmanTuru[] = ["cekirdek", "govde", "disk", "uc"];
export const KATMAN_ETIKET: Record<KatmanTuru, string> = { cekirdek: "ÇEKİRDEK", govde: "GÖVDE", disk: "DİSK", uc: "UÇ" };

export const EN_AZ_EGIM = 8;
export const EN_COK_EGIM = 72;
export const VARSAYILAN_EGIM = 28;
export const ADIM_YATAY = 15;
export const ADIM_DIKEY = 8;
/** sürükleme: 1 CSS px kaç derece */
export const SURUKLE_DERECE = 0.6;

export interface Aci { yaw: number; egim: number }

export interface GorunumDurumu {
  mod: GorunumModu;
  /** odak modunda seçili katman */
  odak: KatmanTuru | null;
  /** odaktan dönülecek mod */
  donus: "patlatilmis" | "birlesik";
  /** topaç (patlatılmış / birleşik) açısı */
  aci: Aci;
  /** odaktaki parçanın ayrı açısı (her odakta sıfırlanır) */
  odakAci: Aci;
}

export type GorunumOlayi =
  | { tur: "tus"; tus: string; katman?: KatmanTuru | null }
  | { tur: "sec"; katman: KatmanTuru }
  | { tur: "geri" }
  | { tur: "birlestirAyir" }
  | { tur: "surukle"; dx: number; dy: number };

export function ilkDurum(): GorunumDurumu {
  return { mod: "patlatilmis", odak: null, donus: "patlatilmis", aci: { yaw: 0, egim: VARSAYILAN_EGIM }, odakAci: { yaw: 0, egim: VARSAYILAN_EGIM } };
}

const sinirla = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const sar = (v: number) => ((v % 360) + 360) % 360;

function dondur(a: Aci, dYaw: number, dEgim: number): Aci {
  return { yaw: sar(a.yaw + dYaw), egim: sinirla(a.egim + dEgim, EN_AZ_EGIM, EN_COK_EGIM) };
}

function aciGuncelle(d: GorunumDurumu, dYaw: number, dEgim: number): GorunumDurumu {
  return d.mod === "odak" ? { ...d, odakAci: dondur(d.odakAci, dYaw, dEgim) } : { ...d, aci: dondur(d.aci, dYaw, dEgim) };
}

/** Saf geçiş işlevi; tanınmayan olayda aynı nesne döner (değişiklik yok). */
export function gorunumOlay(d: GorunumDurumu, o: GorunumOlayi): GorunumDurumu {
  switch (o.tur) {
    case "sec":
      if (d.mod === "odak" && d.odak === o.katman) return d;
      return { ...d, mod: "odak", odak: o.katman, donus: d.mod === "odak" ? d.donus : d.mod, odakAci: { yaw: 0, egim: VARSAYILAN_EGIM } };
    case "geri":
      if (d.mod !== "odak") return d;
      return { ...d, mod: d.donus, odak: null };
    case "birlestirAyir":
      if (d.mod === "odak") return { ...d, mod: d.donus === "patlatilmis" ? "birlesik" : "patlatilmis", odak: null, donus: d.donus === "patlatilmis" ? "birlesik" : "patlatilmis" };
      return { ...d, mod: d.mod === "patlatilmis" ? "birlesik" : "patlatilmis", donus: d.mod === "patlatilmis" ? "birlesik" : "patlatilmis" };
    case "surukle":
      return aciGuncelle(d, o.dx * SURUKLE_DERECE, -o.dy * SURUKLE_DERECE);
    case "tus":
      switch (o.tus) {
        case "ArrowLeft": return aciGuncelle(d, -ADIM_YATAY, 0);
        case "ArrowRight": return aciGuncelle(d, ADIM_YATAY, 0);
        case "ArrowUp": return aciGuncelle(d, 0, ADIM_DIKEY);
        case "ArrowDown": return aciGuncelle(d, 0, -ADIM_DIKEY);
        case "Escape": return gorunumOlay(d, { tur: "geri" });
        case "Enter": case " ": return o.katman ? gorunumOlay(d, { tur: "sec", katman: o.katman }) : d;
        case "b": case "B": return gorunumOlay(d, { tur: "birlestirAyir" });
        default: return d;
      }
  }
}

/** Tuş görünüm durumunu değiştirdi mi (DOM varsayılan davranışı engellensin mi)? */
export function tusIsler(tus: string): boolean {
  return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape", "Enter", " ", "b", "B"].includes(tus);
}

// ------------------------------------------------------------------ katman düzeni (dünya birimi, y yukarı)

/** Birleşik topaçta katmanların taban kayması: Uç 0; Disk kendi z'sinde; Gövde ve Çekirdek Disk üstüne oturur. */
export interface KatmanYukseklik { cekirdek: number; govde: number; disk: number; uc: number }

/**
 * Katman başına dikey kayma (dünya birimi). `t` 0 = birleşik, 1 = patlatılmış. `diskUst`: takılı Diskin üst yüzü
 * (Gövde tabanı 16'ya göre kayma = diskUst − 16). Patlatılmışta aralık `ARALIK` (alttan üste birikir).
 */
export const ARALIK = 16;
export function katmanKaymasi(t: number, diskUst: number): KatmanYukseklik {
  const govdeKay = diskUst - 16;
  const k = Math.max(0, Math.min(1, t));
  return {
    uc: 0,
    disk: ARALIK * 1 * k,
    govde: govdeKay + ARALIK * 2 * k,
    cekirdek: govdeKay + ARALIK * 3 * k + 4 * k,
  };
}

export interface KatmanOlcusu { yAlt: number; yUst: number; R: number }
/** boş yuva için yer tutucu ölçü (etiket yine yerinde dursun) */
export const BOS_OLCU: KatmanOlcusu = { yAlt: 0, yUst: 6, R: 10 };

/**
 * Patlatılmış düzen: katmanlar alttan üste, ekranda (kamera eğimi `egim` radyan, ortografik) birbirine değmeyecek ve
 * aralarında `bosluk` birim kalacak şekilde dizilir. Ekran dikeyi y·cos(e) ± R·sin(e). Sonuç birleşik tabandan aşağı
 * inmez. `p` 0..1 birleşik ↔ patlatılmış.
 */
export function patlatilmisTabanlar(o: Partial<Record<KatmanTuru, KatmanOlcusu>>, egim: number, bosluk: number, diskUst: number, p: number): KatmanYukseklik {
  const b = katmanKaymasi(0, diskUst);
  const c = Math.max(0.05, Math.cos(egim)), s = Math.sin(egim);
  const sonuc = { ...b };
  let ust = -Infinity;
  for (const t of ["uc", "disk", "govde", "cekirdek"] as const) {
    const m = o[t] ?? BOS_OLCU;
    const alt = m.yAlt * c - m.R * s;
    const y = Math.max(b[t], isFinite(ust) ? (ust + bosluk - alt) / c : b[t]);
    sonuc[t] = b[t] + (y - b[t]) * Math.max(0, Math.min(1, p));
    ust = (y + m.yUst) * c + m.R * s;
  }
  return sonuc;
}

/** Hareket eğrisi (giriş-çıkış). */
export function yumusat(t: number): number {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
}
