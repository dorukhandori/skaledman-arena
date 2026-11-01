import type { DovuscuProfili } from "../../paylasilan/dovuscu.ts";
import { YUVA_SAYISI } from "../../paylasilan/kurallar/hamleler.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import { TIP_TR, tipRozetRengi, tipSimgesi } from "../stil/tipSimgesi.ts";

// DOM HUD (ustYazi içinde). Stil index.html değişkenlerinden. Yalnız değişen metni yazar.

const STIL = `
.ah { position:absolute; inset:0; pointer-events:none; font-family:"Nunito Sans",system-ui,sans-serif; color:var(--ink); user-select:none; }
.ah .p { position:absolute; top:48px; width:260px; padding:6px 12px 7px; background:var(--panel); border:3px solid var(--shade); border-radius:14px; box-shadow:inset 0 0 0 2px var(--edge), inset 0 -5px 0 rgba(0,0,0,.22), 0 4px 0 var(--shade); }
.ah .sol { left:12px; } .ah .sag { right:12px; }
.ah .p .s { display:flex; align-items:center; gap:6px; min-width:0; }
.ah .ad { flex:1; min-width:0; font:400 25px/1.05 var(--pixel); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ah .sv { font:400 18px/1 var(--pixel); color:var(--muted); }
.ah .p em { font:400 15px/1 var(--pixel); font-style:normal; padding:1px 5px 0; border-radius:5px; background:var(--gold); color:#2a2104; }
.ah .bar { flex:1; height:10px; margin:4px 0; background:#24323a; border:2px solid var(--shade); border-radius:5px; overflow:hidden; }
.ah .bar i { display:block; height:100%; width:100%; background:var(--kick); box-shadow:inset 0 -2px 0 rgba(0,0,0,.2); transition:width .08s linear; }
.ah .kim { flex:1; min-width:0; font-size:12.5px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ah .tipler { display:flex; gap:2px; font-size:13px; }
.ah .hp { font:400 18px/1 var(--pixel); font-variant-numeric:tabular-nums; }
.ah .sure { position:absolute; top:48px; left:50%; transform:translateX(-50%); min-width:88px; padding:4px 16px 2px; text-align:center; font:400 40px/1 var(--display); }
.ah .sure.az { color:var(--red); }
.ah .yuvalar { position:absolute; left:12px; bottom:14px; display:flex; gap:10px; }
.ah .y { --c:var(--edge); position:relative; width:132px; height:60px; padding:6px 30px 0 9px; border:3px solid var(--shade); border-radius:12px; background:color-mix(in srgb, var(--c) 32%, var(--panel)); box-shadow:inset 0 -4px 0 rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.07), 0 4px 0 var(--shade); transition:transform .08s; }
.ah .y.bos { opacity:.35; }
.ah .y.sec { border-color:var(--gold); transform:translateY(-4px); box-shadow:inset 0 -4px 0 rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.07), 0 8px 0 var(--shade); }
.ah .y.sec::after { content:""; position:absolute; left:50%; top:-17px; transform:translateX(-50%); border:7px solid transparent; border-top:9px solid var(--red); border-bottom:0; }
.ah .y b { position:absolute; top:5px; right:6px; min-width:19px; padding:2px 4px 0; border-radius:5px; background:var(--shade); text-align:center; font:400 18px/1 var(--pixel); color:var(--gold); }
.ah .y .m { font-size:13px; font-weight:800; line-height:1.15; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; text-shadow:0 1px 1px rgba(0,0,0,.35); }
.ah .y .t { position:absolute; left:6px; bottom:5px; display:flex; align-items:center; gap:4px; font-size:11px; font-weight:700; color:rgba(255,255,255,.75); }
.ah .y .t .tsimge { width:16px; height:16px; }
.ah .y .cd { position:absolute; inset:0; border-radius:9px; background:rgba(5,13,16,.72); transform-origin:bottom; display:none; }
.ah .y .c { position:absolute; right:7px; bottom:4px; font:400 22px/1 var(--pixel); display:none; }
.ah .rozet { position:absolute; left:50%; transform:translateX(-50%); display:flex; gap:6px; align-items:center; padding:5px 14px 3px; background:var(--panel-2); border:3px solid var(--shade); border-radius:10px; box-shadow:inset 0 -3px 0 rgba(0,0,0,.25), 0 4px 0 var(--shade); font:400 20px/1 var(--pixel); letter-spacing:.5px; white-space:nowrap; }
.ah .dash { bottom:14px; } .ah .dash.hazir { color:var(--kick); } .ah .dash.bekle { color:var(--muted); }
.ah .enerji { bottom:58px; font-size:17px; color:var(--muted); }
.ah .enerji i { display:block; width:46px; height:10px; background:#24323a; border:2px solid var(--shade); border-radius:5px; overflow:hidden; }
.ah .enerji i b { display:block; height:100%; background:#6bd3ff; box-shadow:inset 0 -2px 0 rgba(0,0,0,.2); }
.ah .takim { position:absolute; top:138px; width:260px; display:flex; gap:4px; font-size:11px; font-weight:700; }
.ah .takim.sol { left:12px; } .ah .takim.sag { right:12px; justify-content:flex-end; }
.ah .takim span { display:flex; align-items:center; gap:4px; flex:1; min-width:0; max-width:86px; height:22px; padding:0 7px 0 3px; background:var(--panel); border:2px solid var(--shade); border-radius:99px; box-shadow:inset 0 0 0 1px var(--edge), 0 2px 0 var(--shade); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ah .takim span::before { --top:var(--red); content:""; flex:none; width:13px; height:13px; border-radius:50%; border:1.5px solid #0b0f19; background:radial-gradient(circle, #f3f5f9 0 20%, #0b0f19 21% 36%, transparent 37%), linear-gradient(var(--top) 0 42%, #0b0f19 0 58%, #f3f5f9 0); }
.ah .takim span.akt { border-color:var(--gold); color:var(--gold); }
.ah .takim span.ko { opacity:.45; text-decoration:line-through; } .ah .takim span.ko::before { --top:#6f8287; }
.ah .secim { position:absolute; left:50%; top:34%; transform:translate(-50%,-50%); padding:12px 44px 12px 22px; font:400 22px/1.25 var(--pixel); display:none; text-align:center; }
.ah .secim::after { content:""; position:absolute; right:18px; bottom:14px; border:8px solid transparent; border-top:10px solid var(--red); border-bottom:0; animation:ahDurt 1s steps(2) infinite; }
@keyframes ahDurt { 50% { transform:translateY(4px); } }
.ah .ipucu { position:absolute; right:12px; bottom:12px; font-size:12px; color:var(--muted); text-align:right; line-height:1.55; text-shadow:0 1px 0 var(--shade); }
.ah .ipucu b { color:var(--ink); font-weight:800; }
.ah .son { position:absolute; left:50%; top:22%; transform:translate(-50%,-50%); padding:18px 34px 22px; text-align:center; pointer-events:auto; display:none; }
.ah .son h2 { margin:0 0 6px; font:400 50px/.95 var(--display); }
.ah .son h2 span { color:var(--red); }
.ah .son p { margin:0 0 16px; font-size:14.5px; font-weight:700; color:#5b6577; }
`;

const HUD = { dashHazir: "SHIFT · DODGE · READY", gecikmeAraligi: 0.1 } as const;

function el(sinif: string, etiket = "div", ust?: HTMLElement): HTMLElement {
  const e = document.createElement(etiket);
  e.className = sinif;
  ust?.appendChild(e);
  return e;
}

export class Hud {
  private kok = el("ah");
  private onbellek = new Map<HTMLElement, string>();
  private sol = Hud.panel();
  private sag = Hud.panel();
  private sure = el("sure win");
  private yuvalar: { kok: HTMLElement; ad: HTMLElement; tip: HTMLElement; cd: HTMLElement; sn: HTMLElement }[] = [];
  private dash = el("rozet dash");
  private enerji = el("rozet enerji");
  private enerjiDolu: HTMLElement[] = [];
  private takimSerit = [el("takim sol"), el("takim sag")];
  private secim = el("secim win");
  private sonProfil: DovuscuProfili | null = null;
  private son = el("son win");
  private sonBaslik = el("", "h2");
  private sonYazi = el("", "p");
  private tekrarDugme = el("", "button") as HTMLButtonElement;
  private stil = document.createElement("style");

  /** @param takimlar  oyuncu başına takım profilleri (sahadaki ilk kart başta) */
  constructor(ust: HTMLElement, private takimlar: readonly (readonly DovuscuProfili[])[], private yerel: number, tekrar: () => void) {
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    this.panelKur("sol", this.sol);
    this.panelKur("sag", this.sag);
    this.sure.textContent = "";
    const yuvaKutusu = el("yuvalar");
    for (let i = 0; i < YUVA_SAYISI; i++) {
      const k = el("y", "div", yuvaKutusu);
      const tus = el("", "b", k); tus.textContent = String(i + 1);
      this.yuvalar.push({ kok: k, ad: el("m", "div", k), tip: el("t", "div", k), cd: el("cd", "div", k), sn: el("c", "div", k) });
    }
    this.yuvalariDoldur(this.takimlar[this.yerel]![0]!);
    const etiket = el("", "span", this.enerji); etiket.textContent = "SPACE · JUMP";
    for (let i = 0; i < 3; i++) { const kap = el("", "i", this.enerji); this.enerjiDolu.push(el("", "b", kap)); }
    this.son.append(this.sonBaslik, this.sonYazi, this.tekrarDugme);
    this.tekrarDugme.className = "btn birincil";
    this.tekrarDugme.textContent = "Tekrar (R)";
    this.tekrarDugme.addEventListener("click", tekrar);
    const ipucu = el("ipucu");
    ipucu.innerHTML = "<b>WASD</b> hareket · <b>1-4</b> / tekerlek hamle<br><b>sağ tuş</b> basılı nişan, bırak = at · <b>sol tık</b> = anında at<br><b>Shift</b> dash · <b>Space</b> zıpla · <b>Z</b> basılı dinlen<br><b>Q/E</b> takım · <b>Tab</b> basılı + 1-3 = fare noktasına düşür";
    this.kok.style.pointerEvents = "none"; // #ustYazi > * kuralını ezer: fare tuvale ulaşsın
    this.kok.append(yuvaKutusu, this.dash, this.enerji, this.sure, ...this.takimSerit, this.secim, this.son, ipucu);
    ust.appendChild(this.kok);
  }

  private static panel() {
    return { ad: el("ad"), sv: el("sv"), kim: el("kim"), tipler: el("tipler"), bar: el("bar"), dolu: el("", "i"), hp: el("hp") };
  }

  /** Pokémon savaş kutusu düzeni: ad + Sv. / HP çubuğu / @sahip, tip simgeleri, can. */
  private panelKur(taraf: "sol" | "sag", p: Hud["sol"]): void {
    const kutu = el(`p ${taraf}`, "div", this.kok);
    p.bar.appendChild(p.dolu);
    const ust = el("s", "div", kutu); ust.append(p.ad, p.sv);
    const orta = el("s", "div", kutu); el("", "em", orta).textContent = "HP"; orta.append(p.bar);
    const alt = el("s", "div", kutu); alt.append(p.kim, p.tipler, p.hp);
  }

  private panelYaz(p: Hud["sol"], profil: DovuscuProfili): void {
    this.yaz(p.ad, profil.ad);
    this.yaz(p.sv, `Sv. ${profil.seviye}`);
    this.yaz(p.kim, `@${profil.sahip}`);
    this.stilYaz(p.tipler, "t", profil.tipler.join(), () => { p.tipler.innerHTML = profil.tipler.map(tipSimgesi).join(""); });
  }

  /** Aktif üye değişince yuva kutuları o kartın hamleleriyle yeniden yazılır. */
  private yuvalariDoldur(profil: DovuscuProfili): void {
    this.sonProfil = profil;
    this.yuvalar.forEach((y, i) => {
      const m = profil.yuvalar[i];
      y.kok.classList.toggle("bos", !m);
      y.kok.style.setProperty("--c", m ? tipRozetRengi(m.tip) : "var(--edge)");
      y.ad.textContent = m ? m.ad : "—";
      y.tip.innerHTML = m ? `${tipSimgesi(m.tip)}${TIP_TR[m.tip]} · ${m.guc}` : "";
      y.kok.title = m ? `${m.ad} · ${m.tip} · güç ${m.guc} · ${m.aile} · ${m.cooldown} s` : "";
    });
  }

  private takimYaz(d: Dunya, oyuncu: number, serit: HTMLElement): void {
    const t = d.takimlar[oyuncu]!;
    const dv = d.dovusculer[oyuncu]!;
    if (serit.children.length !== t.profiller.length) {
      serit.replaceChildren(...t.profiller.map(() => el("", "span")));
    }
    t.profiller.forEach((p, k) => {
      const s = serit.children[k] as HTMLElement;
      const hp = k === t.aktif ? dv.hp : t.uyeler[k]!.hp;
      const oran = Math.ceil((100 * hp) / t.uyeler[k]!.maxHp);
      this.yaz(s, `${k + 1} ${p.ad} ${oran}%`);
      this.stilYaz(s, "s", `${k === t.aktif}${t.uyeler[k]!.ko}`, () => {
        s.classList.toggle("akt", k === t.aktif);
        s.classList.toggle("ko", t.uyeler[k]!.ko);
      });
    });
  }

  private yaz(e: HTMLElement, metin: string): void {
    if (this.onbellek.get(e) === metin) return;
    this.onbellek.set(e, metin);
    e.textContent = metin;
  }

  private stilYaz(e: HTMLElement, anahtar: string, deger: string, uygula: () => void): void {
    const k = `${anahtar}:${deger}`;
    if (this.onbellek.get(e) === k) return;
    this.onbellek.set(e, k);
    uygula();
  }

  guncelle(d: Dunya, secili: number): void {
    const ben = d.dovusculer[this.yerel]!;
    const rakip = d.dovusculer[1 - this.yerel]!;
    const profil = d.profiller[this.yerel]!;
    if (profil !== this.sonProfil) this.yuvalariDoldur(profil);
    this.panelYaz(this.sol, profil);
    this.panelYaz(this.sag, d.profiller[1 - this.yerel]!);
    this.takimYaz(d, this.yerel, this.takimSerit[0]!);
    this.takimYaz(d, 1 - this.yerel, this.takimSerit[1]!);
    this.enerjiDolu.forEach((b, k) => {
      const w = `${(Math.max(0, Math.min(1, ben.enerji * 3 - k)) * 100).toFixed(0)}%`;
      this.stilYaz(b, "w", w, () => { b.style.width = w; });
    });
    const takim = d.takimlar[this.yerel]!;
    const secimMetni = takim.secimKalan > 0 ? `Kartın bayıldı · Q/E ya da Tab+1-3 ile sıradakini seç (${Math.ceil(takim.secimKalan)} s)` : "";
    this.stilYaz(this.secim, "g", secimMetni, () => { this.secim.style.display = secimMetni ? "block" : "none"; this.secim.textContent = secimMetni; });
    this.panelHp(this.sol, ben.hp / ben.maxHp, `${ben.hp} / ${ben.maxHp}`);
    this.panelHp(this.sag, rakip.hp / rakip.maxHp, `${Math.ceil((100 * rakip.hp) / rakip.maxHp)}%`);
    const sn = Math.max(0, Math.ceil(d.kalanSure));
    this.yaz(this.sure, `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, "0")}`);
    this.stilYaz(this.sure, "az", String(sn <= 10), () => this.sure.classList.toggle("az", sn <= 10));

    for (let i = 0; i < YUVA_SAYISI; i++) {
      const y = this.yuvalar[i]!;
      const m = profil.yuvalar[i];
      if (!m) continue;
      const kalan = ben.cooldown[i] ?? 0;
      const oran = Math.min(1, kalan / m.cooldown);
      this.stilYaz(y.kok, "sec", String(i === secili), () => y.kok.classList.toggle("sec", i === secili));
      this.stilYaz(y.cd, "h", oran.toFixed(2), () => {
        y.cd.style.display = kalan > 0 ? "block" : "none";
        y.cd.style.transform = `scaleY(${oran})`;
      });
      this.stilYaz(y.sn, "t", kalan > 0 ? kalan.toFixed(1) : "", () => {
        y.sn.style.display = kalan > 0 ? "block" : "none";
        y.sn.textContent = kalan.toFixed(1);
      });
    }
    const degisimBekleme = takim.bekleme > 0 ? ` · Q/E ${takim.bekleme.toFixed(1)} s` : "";
    const hazir = ben.dashBekleme <= 0;
    this.yaz(this.dash, (hazir ? HUD.dashHazir : `SHIFT · DODGE · ${ben.dashBekleme.toFixed(1)} s`) + degisimBekleme);
    this.stilYaz(this.dash, "hazir", String(hazir), () => { this.dash.classList.toggle("hazir", hazir); this.dash.classList.toggle("bekle", !hazir); });
  }

  private panelHp(p: Hud["sol"], oran: number, metin: string): void {
    const w = `${(Math.max(0, oran) * 100).toFixed(1)}%`;
    this.stilYaz(p.dolu, "w", w, () => { p.dolu.style.width = w; p.dolu.style.background = oran > 0.5 ? "var(--kick)" : oran > 0.2 ? "var(--gold)" : "var(--red)"; });
    this.yaz(p.hp, metin);
  }

  /** Maç bitti / yeniden başladı. */
  sonuc(d: Dunya | null): void {
    if (!d?.sonuc) { this.son.style.display = "none"; return; }
    const k = d.sonuc.kazanan;
    this.sonBaslik.textContent = k === null ? "BERABERE" : "KAZANAN: ";
    if (k !== null) el("", "span", this.sonBaslik).textContent = `${k === this.yerel ? "SEN" : "RAKİP"} (${d.profiller[k]!.ad})`;
    this.sonYazi.textContent = k === null
      ? `Süre doldu (${AYAR.mac.sure} s), takım can oranları eşit.`
      : `${k === this.yerel ? "Sen kazandın" : "Rakip kazandı"} · ${d.sonuc.neden === "ko" ? "bayıltma" : "süre dolunca takım can oranı"} · R ile tekrar`;
    this.son.style.display = "block";
  }

  yokEt(): void {
    this.kok.remove();
    this.stil.remove();
  }
}
