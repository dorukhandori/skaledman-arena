import { el, kalin } from "../ekranlar/arayuz.ts";
import { ayarlariOku } from "../oyun/Ayarlar.ts";
import { kayitOku, kayitYaz } from "./depo.ts";
import { type Ipucu, IPUCLARI } from "./ipuclari.ts";

// Harita / Maden / Ocak ilk kullanım ipuçları (07 § 4, § 10; metinler veri/ipuclari.json). Atölye'deki Pergel
// balonunun yerine ekranın kendi ipucu satırında, her biri BİR KEZ: görülenler Pergel'in kaydına yazılır (aynı anahtar),
// böylece Atölye'de "sor" bunları tekrar seçmez. Pergel ayarı "kapalı" ise hiç gösterilmez.

export const HARITA_KOSULLARI = ["harita-ilk", "harita-dal", "yildiz-sart", "maden-ilk", "maden-ustalik", "maden-ogretmez", "ocak-ilk", "ocak-alasim"] as const;
export type HaritaKosulu = (typeof HARITA_KOSULLARI)[number];

/** Bu koşulun ipucu henüz görülmediyse onu döndürür ve görüldü işaretler; aksi halde null. */
export function birKezIpucu(oyuncuId: number | null | undefined, kosul: HaritaKosulu): Ipucu | null {
  if (ayarlariOku().pergel === "kapali") return null;
  const x = IPUCLARI.find((i) => i.kosul === kosul);
  if (!x) return null;
  const id = oyuncuId ?? 0;
  const k = kayitOku(id);
  if (k.goruldu.includes(x.id)) return null;
  kayitYaz(id, { ...k, goruldu: [...k.goruldu, x.id] });
  return x;
}

/** Sıradaki ilk görülmemiş koşulun ipucu (görüldü işaretler); hiçbiri yoksa null. */
export function ipucuSec(oyuncuId: number | null | undefined, ...kosullar: HaritaKosulu[]): Ipucu | null {
  for (const c of kosullar) { const x = birKezIpucu(oyuncuId, c); if (x) return x; }
  return null;
}

/** İpucunu `ust` içine tek satır olarak basar (data-ipucu = kimlik). Ekran yeniden çizilse de aynı ipucu kalır. */
export function ipucuBas(ust: HTMLElement, sinif: string, x: Ipucu | null): void {
  if (!x) return;
  const d = el("div", sinif, ust);
  d.dataset["ipucu"] = x.id;
  d.setAttribute("role", "status");
  d.innerHTML = `PERGEL: ${kalin(x.metin)}`;
}
