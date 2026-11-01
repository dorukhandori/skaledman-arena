import type { Application } from "pixi.js";
import { type FusionKaydi, fusionKayitlari } from "../../paylasilan/kart.ts";
import { profilKur } from "../../paylasilan/dovuscu.ts";
import { rastgele } from "../../paylasilan/sim/rastgele.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { EkranBaglami } from "../main.ts";
import { Oyun } from "../oyun/Oyun.ts";
import { TIP_RENK } from "../oyun/renkler.ts";
import { animatorYukle } from "../sprite/FusionAnimator.ts";
import { atlasListesi } from "../sprite/AtlasYukleyici.ts";
import gecmis from "../../../veri/gecmis.json";
import kartlar from "../../../veri/kartlar.json";

// F0 arena ekranı: iki 3'lü fusion takımı, oyuncu (klavye + fare) ve bot. Çevrimdışı.
// URL: ?ekran=arena&a=<id>,<id>,<id>&b=<id>,...  (eksik yuvalar tohumlu rastgele), &tohum=<N>

const KAYITLAR = fusionKayitlari(gecmis, kartlar);
const TOHUM_SINIRI = 1_000_000;

function kayitBul(fusionId: string | null): FusionKaydi | null {
  return fusionId ? KAYITLAR.find((k) => k.acilis.fusionId === fusionId) ?? null : null;
}

/** `a=1.2,3.4,5.6` → kayıtlar (bilinmeyenler atlanır). */
function takimOku(deger: string | null): FusionKaydi[] {
  return (deger ?? "").split(",").map((s) => kayitBul(s.trim())).filter((k): k is FusionKaydi => k !== null).slice(0, AYAR.takim.boyut);
}

/** Tohumdan `n` farklı kart; `haric` dışındakilerden. */
export function rastgeleKartlar(tohum: number, n: number, haric: readonly string[] = [], kaynak: readonly FusionKaydi[] = KAYITLAR): FusionKaydi[] {
  const havuz = kaynak.filter((k) => !haric.includes(k.acilis.fusionId));
  const secilen: FusionKaydi[] = [];
  for (let sira = 0; secilen.length < Math.min(n, havuz.length); sira++) {
    const k = havuz[Math.floor(rastgele(tohum, sira) * havuz.length)]!;
    if (!secilen.includes(k)) secilen.push(k);
  }
  return secilen;
}

/** Eksik takım yuvalarını tohumlu rastgele kartlarla doldurur (iki takımda tekrar yok). */
function takimlariTamamla(tohum: number, a: FusionKaydi[], b: FusionKaydi[], havuz: readonly FusionKaydi[]): [FusionKaydi[], FusionKaydi[]] {
  const n = AYAR.takim.boyut;
  const kullanilan = [...a, ...b].map((k) => k.acilis.fusionId);
  const ek = rastgeleKartlar(tohum, 2 * n - a.length - b.length, kullanilan, havuz);
  return [[...a, ...ek.splice(0, n - a.length)], [...b, ...ek.splice(0, n - b.length)]];
}

const kimlikler = (t: readonly FusionKaydi[]) => t.map((k) => k.acilis.fusionId).join(",");
const adlar = (t: readonly FusionKaydi[]) => t.map((k) => k.acilis.name).join(", ");

function adresiYaz(a: FusionKaydi[], b: FusionKaydi[], tohum: number): void {
  const p = new URLSearchParams(location.search);
  p.set("ekran", "arena");
  p.set("a", kimlikler(a));
  p.set("b", kimlikler(b));
  p.set("tohum", String(tohum));
  history.replaceState(null, "", `?${p.toString()}`);
}

export async function baslat({ app, ustYazi }: EkranBaglami): Promise<void> {
  const sorgu = new URLSearchParams(location.search);
  const hasarCarpani = Number(sorgu.get("hasar")) || undefined;
  let tohum = Number(sorgu.get("tohum")) || Math.floor(Math.random() * TOHUM_SINIRI) + 1;

  // Rastgele seçim yalnız atlası üretilmiş kartlardan (public/fusion/liste.json); yoksa hepsi (kutu görünür).
  const atlasli = new Set((await atlasListesi().catch(() => [])).map((k) => k.fusionId));
  const havuz = atlasli.size >= 2 ? KAYITLAR.filter((k) => atlasli.has(k.acilis.fusionId)) : KAYITLAR;
  const spriteNotu = (k: FusionKaydi) => (atlasli.has(k.acilis.fusionId) ? "" : " [sprite yok, kutu]");

  const bilgi = document.createElement("div");
  bilgi.style.cssText = "position:absolute;top:6px;left:12px;right:12px;display:flex;gap:12px;align-items:center;font-size:14px;pointer-events:none;";
  const yazi = document.createElement("span");
  yazi.style.cssText = "flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  const dugme = document.createElement("button");
  dugme.style.cssText = "font:inherit;font-weight:700;padding:4px 12px;background:var(--panel);color:var(--cream);border:1px solid var(--edge);cursor:pointer;pointer-events:auto;";
  bilgi.append(yazi, dugme);
  ustYazi.appendChild(bilgi);

  let oyun: Oyun | null = null;
  let yukleniyor = false;

  const yukle = (t: readonly FusionKaydi[]) => Promise.all(t.map((k) => animatorYukle(k.acilis.fusionId, TIP_RENK[k.acilis.types[0]!])));
  const takimYazisi = (t: readonly FusionKaydi[]) => t.map((k) => `${k.acilis.name}${spriteNotu(k)}`).join(", ");

  const kur = async (a: FusionKaydi[], b: FusionKaydi[]): Promise<void> => {
    if (yukleniyor) return;
    yukleniyor = true;
    try {
      oyun?.yokEt();
      oyun = null;
      yazi.textContent = `Yükleniyor… ${adlar(a)} vs ${adlar(b)}`;
      const [animA, animB] = await Promise.all([yukle(a), yukle(b)]);
      oyun = new Oyun({ app: app as Application, ustYazi, takimlar: [a.map(profilKur), b.map(profilKur)], kartlar: [a, b], animatorlar: [animA, animB], tohum, hasarCarpani });
      yazi.textContent = `Sen: ${takimYazisi(a)}  ·  Bot: ${takimYazisi(b)}  ·  sprite'lı kart: ${atlasli.size}/${KAYITLAR.length}`;
      dugme.textContent = `Rastgele (${tohum})`;
      adresiYaz(a, b, tohum);
    } finally {
      yukleniyor = false;
    }
  };

  dugme.addEventListener("click", () => {
    tohum = Math.floor(Math.random() * TOHUM_SINIRI) + 1;
    void kur(...takimlariTamamla(tohum, [], [], havuz));
  });

  const [ilkA, ilkB] = takimlariTamamla(tohum, takimOku(sorgu.get("a")), takimOku(sorgu.get("b")), havuz);
  await kur(ilkA, ilkB);
}
