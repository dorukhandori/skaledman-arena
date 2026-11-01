import { type FusionKaydi, TIPLER, type Tip } from "../../paylasilan/kart.ts";
import { etkinlik } from "../../paylasilan/kurallar/tipler.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import { TIP_RENK, renkCss } from "./renkler.ts";

// Arenada dövüşen fusion'ın Skaledman kartı (sahibin isteği, 2026-11-01). Görünüm skaledman.com `tradingCard`'ın
// sadeleştirilmiş eşi (docs/research/skaledman-sayfa-analizi.md § 3-4): 63/88 oran, altın çerçeve, krem kâğıt,
// başlık (Fusion, ad, HP, tipler) → resim → şerit (kategori, boy, kilo) → yetenek + 2 saldırı → zayıflık/direnç → @sahip.
// Kart HP'si ve nadirlik Skaledman formülleriyle; arenadaki can HUD'dadır.

const STIL = `
.kp { position:absolute; top:150px; width:168px; pointer-events:none; display:flex; flex-direction:column; gap:6px; }
.kp.sol { left:12px; } .kp.sag { right:12px; align-items:flex-end; }
.kk { width:168px; aspect-ratio:63/88; padding:5px; box-sizing:border-box; background:linear-gradient(135deg,#f4cf47,#d9ac24); box-shadow:0 4px 0 var(--shade); font-family:"Nunito Sans",system-ui,sans-serif; color:#1d2230; transition:filter .3s, opacity .3s; }
.kk.shiny { background:linear-gradient(135deg,#e8eef5,#9fb3c8); }
.kk.r-double { background:linear-gradient(135deg,#ffe680,#f4b400 50%,#ffe680); }
.kk.ko { filter:grayscale(1); opacity:.55; }
.kk .y { height:100%; background:#f4f0e3; display:flex; flex-direction:column; padding:4px 5px; box-sizing:border-box; gap:2px; overflow:hidden; }
.kk .bas { display:flex; align-items:baseline; gap:4px; font-size:9px; }
.kk .bas b { font-family:"Jost",sans-serif; font-size:13px; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kk .bas .hp { font-weight:800; font-size:11px; color:#e3350d; }
.kk .tip { display:inline-block; padding:0 4px; border-radius:6px; color:#fff; font-size:8px; font-weight:800; }
.kk .resim { position:relative; height:76px; border:2px solid #b9c4cf; background:linear-gradient(var(--t1),var(--t2)); display:flex; align-items:center; justify-content:center; }
.kk .resim img { height:100%; image-rendering:pixelated; }
.kk .resim i { position:absolute; right:3px; top:2px; font-style:normal; font-size:9px; font-weight:800; color:#fff; text-shadow:0 1px 0 #000; }
.kk .serit { font-size:8px; text-align:center; background:#e2dcc6; padding:1px 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kk .yet { font-size:9px; } .kk .yet b { color:#7a63c9; }
.kk .sal { display:flex; font-size:10px; font-weight:700; gap:4px; align-items:center; }
.kk .sal span:first-child { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kk .wrr { margin-top:auto; display:flex; justify-content:space-between; font-size:8px; border-top:1px solid #c9c1a8; padding-top:2px; }
.kk .ayak { display:flex; justify-content:space-between; font-size:8px; opacity:.75; }
.kp .yedek { display:flex; gap:4px; }
.kp .yedek .kk { width:80px; padding:3px; } .kp .yedek .kk .y { padding:2px 3px; }
.kp .yedek .kk .resim { height:46px; } .kp .yedek .kk .bas b { font-size:9px; }
.kp .yedek .kk .serit, .kp .yedek .kk .yet, .kp .yedek .kk .sal, .kp .yedek .kk .wrr { display:none; }
`;

const NADIRLIK = [
  { esik: 580, sinif: "r-double", sembol: "★★" },
  { esik: 500, sinif: "r-rare", sembol: "★" },
  { esik: 400, sinif: "r-uncommon", sembol: "◆" },
  { esik: 0, sinif: "r-common", sembol: "●" },
] as const;

/** Skaledman kart HP'si: clamp(30, 340, round((hp·0,8 + BST·0,15)/10)·10). */
export function kartHp(k: FusionKaydi): number {
  const s = k.kart.stats;
  const bst = s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
  return Math.max(30, Math.min(340, Math.round((s.hp * 0.8 + bst * 0.15) / 10) * 10));
}

function nadirlik(k: FusionKaydi): (typeof NADIRLIK)[number] {
  const s = k.kart.stats;
  const bst = s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
  return NADIRLIK.find((n) => bst >= n.esik)!;
}

/** En güçlü zayıflık (×2+) ve direnç (×½−) tipi; yoksa "—". */
function zayiflikDirenc(tipler: readonly Tip[]): { zayif: string; direnc: string } {
  let zayif: Tip | null = null;
  let direnc: Tip | null = null;
  for (const t of TIPLER) {
    const e = etkinlik(t, tipler);
    if (e >= 2 && (!zayif || e > etkinlik(zayif, tipler))) zayif = t;
    if (e > 0 && e <= 0.5 && (!direnc || e < etkinlik(direnc, tipler))) direnc = t;
  }
  return { zayif: zayif ? `${zayif} ×2` : "—", direnc: direnc ? `${direnc} −30` : "—" };
}

function tipRozeti(t: Tip): string {
  return `<span class="tip" style="background:${renkCss(TIP_RENK[t])}">${t}</span>`;
}

const kacis = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function kartElemani(k: FusionKaydi): HTMLElement {
  const { acilis: a, kart } = k;
  const n = nadirlik(k);
  const wr = zayiflikDirenc(a.types);
  const geri = kart.weight / 10 < 10 ? 1 : kart.weight / 10 < 50 ? 2 : kart.weight / 10 < 120 ? 3 : 4;
  const kutu = document.createElement("div");
  kutu.className = `kk ${n.sinif}${a.shiny ? " shiny" : ""}`;
  kutu.style.setProperty("--t1", renkCss(TIP_RENK[a.types[0]!]));
  kutu.style.setProperty("--t2", renkCss(TIP_RENK[a.types[1] ?? a.types[0]!]));
  const filtre = a.shiny ? `filter:hue-rotate(${a.hue}deg) saturate(1.3)` : "";
  kutu.innerHTML = `<div class="y">
    <div class="bas"><span>Fusion</span><b>${kacis(a.name)}</b><span class="hp">HP ${kartHp(k)}</span></div>
    <div>${a.types.map(tipRozeti).join(" ")}</div>
    <div class="resim"><img src="${kacis(a.sprite)}" alt="" referrerpolicy="no-referrer" style="${filtre}">${a.shiny ? "<i>✦ Shiny</i>" : ""}</div>
    <div class="serit">${kacis(kart.category)} · ${(kart.height / 10).toFixed(1)} m · ${(kart.weight / 10).toFixed(1)} kg</div>
    <div class="yet"><b>Yetenek</b> ${kacis(kart.ability)}</div>
    ${kart.attacks.map((s) => `<div class="sal"><span>${kacis(s.name)}</span>${tipRozeti(s.type)}<span>${s.power}</span></div>`).join("")}
    <div class="wrr"><span>Zayıf: ${wr.zayif}</span><span>Diren: ${wr.direnc}</span><span>Geri ${geri}</span></div>
    <div class="ayak"><span>@${kacis(a.user)}</span><span>${a.artists.length ? `✎ ${kacis(a.artists.join(", "))}` : ""}</span><span>${a.shiny ? "★" : n.sembol}</span></div>
  </div>`;
  return kutu;
}

/** İki tarafın sahadaki kartı büyük, yedekleri küçük; geçiş ve KO'da güncellenir. */
export class KartPanosu {
  private kok: HTMLElement[];
  private stil = document.createElement("style");
  private kartlar: HTMLElement[][];
  private son = "";

  constructor(ust: HTMLElement, takimlar: readonly (readonly FusionKaydi[])[], private yerel: number) {
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    this.kok = takimlar.map((_, i) => {
      const e = document.createElement("div");
      e.className = `kp ${i === yerel ? "sol" : "sag"}`;
      ust.appendChild(e);
      return e;
    });
    this.kartlar = takimlar.map((t) => t.map(kartElemani));
  }

  guncelle(d: Dunya): void {
    const anahtar = d.takimlar.map((t) => `${t.aktif}:${t.uyeler.map((u) => (u.ko ? 1 : 0)).join("")}`).join("|");
    if (anahtar === this.son) return;
    this.son = anahtar;
    d.takimlar.forEach((t, i) => {
      const kartlar = this.kartlar[i]!;
      kartlar.forEach((k, j) => k.classList.toggle("ko", t.uyeler[j]?.ko ?? false));
      const yedek = document.createElement("div");
      yedek.className = "yedek";
      yedek.append(...kartlar.filter((_, j) => j !== t.aktif));
      this.kok[i]!.replaceChildren(kartlar[t.aktif]!, yedek);
    });
  }

  yokEt(): void {
    for (const k of this.kok) k.remove();
    this.stil.remove();
  }
}
