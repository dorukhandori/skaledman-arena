import { BASARIMLAR, parcaBul } from "../veri/katalog.ts";
import type { Parca } from "../veri/semalar.ts";

// Atölye kuralları (US-2.1, saf; istemci anında gösterir, sunucu aynı fonksiyonla yetkili doğrular):
// takım taslağı doğrulama (sahiplik, tür/yuva uyumu, 3 farklı Çekirdek, bir parça tek topaçta, ödünç kotası),
// parça takma (çakışan parça diğer topaçtan otomatik çıkar), envanter görünürlüğü (parcalar.json kilit/gorunum).

export type YuvaTuru = "cekirdek" | "govde" | "disk" | "uc";
export const YUVA_TURLERI: readonly YuvaTuru[] = ["cekirdek", "govde", "disk", "uc"];
export const YUVA_AD: Record<YuvaTuru, string> = { cekirdek: "Çekirdek", govde: "Gövde", disk: "Disk", uc: "Uç" };

/** Bir topaç taslağı: örnek kimlikleri (Çekirdek → `cekirdek.id`, diğerleri → `parca.id`); null = boş. */
export interface TaslakTopac { cekirdek: number | null; govde: number | null; disk: number | null; uc: number | null }
export type Taslak = [TaslakTopac, TaslakTopac, TaslakTopac];

export interface EnvanterCekirdegi { id: number; tanimId: string; devreDisi: boolean }
export interface EnvanterParcasi { id: number; tanimId: string }
export interface Envanter { cekirdekler: readonly EnvanterCekirdegi[]; parcalar: readonly EnvanterParcasi[] }

export type TakimHataKodu = "bicim" | "sahipDegil" | "yanlisTur" | "ayniCekirdek" | "parcaTekrar" | "parcaEksik" | "cekirdekYok";
export interface TakimHatasi { kod: TakimHataKodu; yuva: number; tur: YuvaTuru }

export interface TakimDegerlendirmesi {
  /** kayıt engelleyen hatalar (boşsa kaydedilebilir) */
  hatalar: TakimHatasi[];
  /** yuva başına: "sahip" dolu · "odunc" (boş ya da ömrü biten, ödünç doldurur) · "bos" (oynamayı engeller) */
  durum: ("sahip" | "odunc" | "devreDisi" | "bos")[];
  /** oynamayı engelleyen boş yuva sayısı */
  bos: number;
  oynanabilir: boolean;
}

export const bosTopac = (): TaslakTopac => ({ cekirdek: null, govde: null, disk: null, uc: null });

/**
 * Ödünç kotası (nile B-10): sahip olunan, kullanılabilir (ömrü bitmemiş) Çekirdek üçe ulaşana kadar boş yuvalar ödünç
 * topaçla dolar. Üç kullanılabilir Çekirdeği olan oyuncunun boş yuvası "boş"tur (OYNA soluk, ux § 7). Ömrü biten Yapay
 * yuvası her zaman ödünçle dolar (B-27) ve kotayı tüketmez.
 */
export function oduncKotasi(env: Envanter): number {
  return Math.max(0, 3 - env.cekirdekler.filter((c) => !c.devreDisi).length);
}

/** Taslağı doğrula (sunucuda yetkili, istemcide anında). */
export function takimDegerlendir(t: readonly TaslakTopac[], env: Envanter): TakimDegerlendirmesi {
  const hatalar: TakimHatasi[] = [];
  if (t.length !== 3) return { hatalar: [{ kod: "bicim", yuva: 0, tur: "cekirdek" }], durum: ["bos", "bos", "bos"], bos: 3, oynanabilir: false };
  const gorulenParca = new Set<number>();
  const gorulenCekirdekId = new Set<number>();
  const gorulenCekirdekTanim = new Set<string>();
  const durum: TakimDegerlendirmesi["durum"] = [];
  for (let k = 0; k < 3; k++) {
    const y = t[k]!;
    let devreDisi = false;
    if (y.cekirdek === null) {
      for (const tur of ["govde", "disk", "uc"] as const) if (y[tur] !== null) { hatalar.push({ kod: "cekirdekYok", yuva: k, tur: "cekirdek" }); break; }
    } else {
      const c = env.cekirdekler.find((x) => x.id === y.cekirdek);
      if (!c) hatalar.push({ kod: "sahipDegil", yuva: k, tur: "cekirdek" });
      else {
        devreDisi = c.devreDisi;
        if (gorulenCekirdekId.has(c.id) || gorulenCekirdekTanim.has(c.tanimId)) hatalar.push({ kod: "ayniCekirdek", yuva: k, tur: "cekirdek" });
        gorulenCekirdekId.add(c.id);
        gorulenCekirdekTanim.add(c.tanimId);
      }
      for (const tur of ["govde", "disk", "uc"] as const) {
        const id = y[tur];
        if (id === null) { hatalar.push({ kod: "parcaEksik", yuva: k, tur }); continue; }
        const p = env.parcalar.find((x) => x.id === id);
        if (!p) { hatalar.push({ kod: "sahipDegil", yuva: k, tur }); continue; }
        let tanim: Parca | null = null;
        try { tanim = parcaBul(p.tanimId); } catch { tanim = null; }
        if (!tanim || tanim.tur !== tur) { hatalar.push({ kod: "yanlisTur", yuva: k, tur }); continue; }
        if (gorulenParca.has(id)) hatalar.push({ kod: "parcaTekrar", yuva: k, tur });
        gorulenParca.add(id);
      }
    }
    durum.push(y.cekirdek === null ? "bos" : devreDisi ? "devreDisi" : "sahip");
  }
  let kota = oduncKotasi(env);
  let bos = 0;
  for (let k = 0; k < 3; k++) {
    if (durum[k] === "devreDisi") continue; // B-27: ödünç doldurur, kota dışı
    if (durum[k] !== "bos") continue;
    if (kota > 0) { durum[k] = "odunc"; kota--; } else bos++;
  }
  return { hatalar, durum, bos, oynanabilir: hatalar.length === 0 && bos === 0 };
}

/**
 * Taslakta bir yuvaya parça tak (ya da `id = null` ile çıkar). Aynı parça başka topaçtaysa oradan çıkarılır (bir parça
 * aynı anda tek topaçta); Çekirdek için aynı tanımlı başka Çekirdek de çıkarılır. Dönen: yeni taslak + çıkarılan yer.
 */
export function parcaTak(t: Taslak, yuva: number, tur: YuvaTuru, id: number | null, cekirdekTanimi?: (id: number) => string | undefined): { taslak: Taslak; cikarilan: { yuva: number; tur: YuvaTuru } | null } {
  const yeni = t.map((x) => ({ ...x })) as Taslak;
  let cikarilan: { yuva: number; tur: YuvaTuru } | null = null;
  if (id !== null) {
    const tanim = tur === "cekirdek" ? cekirdekTanimi?.(id) : undefined;
    for (let k = 0; k < 3; k++) {
      if (k === yuva) continue;
      const v = yeni[k]![tur];
      if (v === null) continue;
      if (v === id || (tanim !== undefined && cekirdekTanimi?.(v) === tanim)) { yeni[k]![tur] = null; cikarilan = { yuva: k, tur }; }
    }
  }
  yeni[yuva]![tur] = id;
  return { taslak: yeni, cikarilan };
}

/** İki yuvanın yerini değiştir (sürükle-bırak ya da klavye ile sıralama). */
export function yuvaTasi(t: Taslak, kaynak: number, hedef: number): Taslak {
  const yeni = t.map((x) => ({ ...x })) as Taslak;
  if (kaynak < 0 || kaynak > 2 || hedef < 0 || hedef > 2 || kaynak === hedef) return yeni;
  const a = yeni[kaynak]!;
  yeni[kaynak] = yeni[hedef]!;
  yeni[hedef] = a;
  return yeni;
}

/** ux § 7 mikro-kopya: hata → oyuncu metni (ne oldu + ne yapabilirsin). */
export function takimHataMetni(h: TakimHatasi): string {
  const n = `${h.yuva + 1}. topaçta`;
  switch (h.kod) {
    case "ayniCekirdek": return "Takımda 3 farklı Çekirdek olmalı. Aynı Çekirdek iki topaçta olamaz.";
    case "parcaTekrar": return "Bir parça aynı anda tek topaçta olur.";
    case "parcaEksik": return `${n} ${YUVA_AD[h.tur]} eksik. Envanterden bir ${YUVA_AD[h.tur]} tak.`;
    case "cekirdekYok": return `${n} Çekirdek yok. Önce bir Çekirdek tak.`;
    case "sahipDegil": return `${n} sende olmayan bir ${YUVA_AD[h.tur]} var.`;
    case "yanlisTur": return `${n} ${YUVA_AD[h.tur]} yuvasına başka türden parça takılmış.`;
    case "bicim": return "Takım 3 yuvadan oluşur.";
  }
}

export function bosYuvaMetni(bos: number): string {
  return `Takımda 3 farklı Çekirdek olmalı. ${bos} yuva boş.`;
}

// ---- envanter görünürlüğü (parcalar.json `kilit`, `gorunum`; ux § 6.4: ad + fiyat + kilit koşulu METİN) ----

export type GorunurlukDurumu = "sahip" | "market" | "kilitli" | "gizli";
export interface ParcaGorunumu {
  durum: GorunurlukDurumu;
  /** oyuncuya görünen ad ("???" gizlide) */
  ad: string;
  /** kısa durum etiketi */
  etiket: string;
  /** ekran okuyucu / odak metni: ad + fiyat + kilit koşulu */
  okunan: string;
}

/** Başarım ilerlemesi (D7'de sunucu sayar; şimdilik 0/N). */
export function parcaGorunumu(p: Parca, sahipAdet: number, ilerleme: Readonly<Record<string, number>> = {}): ParcaGorunumu {
  if (sahipAdet > 0) {
    const e = sahipAdet > 1 ? `Sende ×${sahipAdet}` : "Sende";
    return { durum: "sahip", ad: p.ad, etiket: e, okunan: `${p.ad}. ${e}.` };
  }
  const b = BASARIMLAR.find((x) => x.id === p.kilit);
  const kilitMetni = b ? `Kilitli: ${b.ad} ${Math.min(b.sart.sayi, ilerleme[b.id] ?? 0)}/${b.sart.sayi}` : "Kilitli";
  if (p.gorunum === "gizli") return { durum: "gizli", ad: "???", etiket: "Gizli parça", okunan: "Gizli parça. Bir başarımla açılır." };
  if (p.gorunum === "kilitli-gorunur" || p.kilit !== "acik") return { durum: "kilitli", ad: p.ad, etiket: kilitMetni, okunan: `${p.ad}. ${p.fiyat} Altın. ${kilitMetni}.` };
  return { durum: "market", ad: p.ad, etiket: `Market'te · ${p.fiyat} Altın`, okunan: `${p.ad}. Market'te, ${p.fiyat} Altın.` };
}
