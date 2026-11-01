import type { Application, Ticker } from "pixi.js";
import { yonBul } from "../../paylasilan/atlas.ts";
import type { DovuscuProfili } from "../../paylasilan/dovuscu.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import { BOT_PROFILLERI, VARSAYILAN_BOT } from "../../paylasilan/kurallar/botlar.ts";
import { adim, dunyaKur } from "../../paylasilan/sim/Dunya.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import type { Animator } from "../sprite/Animator.ts";
import { Bot } from "./Bot.ts";
import { DovuscuGorsel } from "./Dovuscu.ts";
import { Efektler } from "./Efektler.ts";
import { OyuncuGirdisi } from "./Girdi.ts";
import { Hud } from "./Hud.ts";
import { KartPanosu } from "./KartPanosu.ts";
import type { FusionKaydi } from "../../paylasilan/kart.ts";
import { NisanGostergesi } from "./Nisan.ts";
import { Sahne } from "./Sahne.ts";
import { varsayilanArena } from "../../paylasilan/sim/Arena.ts";

export interface OyunSecenekleri {
  app: Application;
  ustYazi: HTMLElement;
  /** oyuncu başına 1-3 kart; ilk kart sahaya çıkar */
  takimlar: readonly [readonly DovuscuProfili[], readonly DovuscuProfili[]];
  animatorlar: readonly [readonly Animator[], readonly Animator[]];
  /** Skaledman kartları (KartPanosu); takımlarla aynı sıra */
  kartlar?: readonly [readonly FusionKaydi[], readonly FusionKaydi[]];
  tohum: number;
  bot?: keyof typeof BOT_PROFILLERI;
  /** deneme: genel hasar çarpanı (varsayılan AYAR.hasarCarpani) */
  hasarCarpani?: number;
}

const YEREL = 0; // oyuncu sol doğum noktasında (indeks 0), bot indeks 1

/** F0 çevrimdışı oyun: sabit 60 Hz birikimli simülasyon + her karede render. */
export class Oyun {
  private arena = varsayilanArena();
  private sahne: Sahne;
  private efektler: Efektler;
  private nisan: NisanGostergesi;
  private gorseller: DovuscuGorsel[];
  private hud: Hud;
  private kartPanosu: KartPanosu | null;
  private girdi: OyuncuGirdisi;
  private bot!: Bot;
  private dunya!: Dunya;
  private birikim = 0;
  private onceki: { x: number; z: number }[] = [];
  private macSayaci = 0;
  private tusDinleyici = (e: KeyboardEvent) => { if (e.code === "KeyR" && this.dunya.sonuc) this.yeniMac(); };

  constructor(private sec: OyunSecenekleri) {
    this.sahne = new Sahne(sec.app, this.arena);
    this.efektler = new Efektler(this.sahne);
    this.nisan = new NisanGostergesi(this.sahne);
    this.gorseller = sec.takimlar.map((t, i) => new DovuscuGorsel(sec.animatorlar[i]!, t, this.sahne));
    this.girdi = new OyuncuGirdisi(sec.app.canvas, () => sec.app.screen);
    this.hud = new Hud(sec.ustYazi, sec.takimlar, YEREL, () => this.yeniMac());
    this.kartPanosu = sec.kartlar ? new KartPanosu(sec.ustYazi, sec.kartlar, YEREL) : null;
    this.yeniMac();
    window.addEventListener("keydown", this.tusDinleyici);
    sec.app.ticker.add(this.kare);
    // ?debug: oynanış denemeleri (CDP) için salt-okunur kanca
    if (new URLSearchParams(location.search).has("debug")) (window as unknown as { __oyun: Oyun }).__oyun = this;
  }

  /** Hata ayıklama: true iken sim durur, efekt saati de durur. */
  duraklat = false;

  get durum(): Dunya { return this.dunya; }

  /** Tuval pikselinde dövüşçünün ayak noktası (hata ayıklama). */
  ekranKonumu(i: number): { x: number; y: number } {
    const dv = this.dunya.dovusculer[i]!;
    const p = this.sahne.dunyadanEkrana(dv.x, dv.z);
    const k = this.sahne.kok;
    return { x: k.x + p.x * k.scale.x, y: k.y + p.y * k.scale.y };
  }

  private yeniMac(): void {
    this.dunya = dunyaKur(this.sec.takimlar, this.sec.tohum + this.macSayaci, this.arena, this.sec.hasarCarpani);
    this.bot = new Bot(BOT_PROFILLERI[this.sec.bot ?? VARSAYILAN_BOT], 1, this.sec.tohum + this.macSayaci);
    this.macSayaci++;
    this.birikim = 0;
    this.onceki = this.dunya.dovusculer.map((d) => ({ x: d.x, z: d.z }));
    this.efektler.temizle();
    this.nisan.gizle();
    this.girdi.sifirla();
    this.hud.sonuc(null);
  }

  private tekAdim(): void {
    const d = this.dunya;
    this.onceki = d.dovusculer.map((v) => ({ x: v.x, z: v.z }));
    const t = d.takimlar[YEREL]!;
    this.girdi.yuvalariBildir(d.profiller[YEREL]!.yuvalar.map((y) => y !== null));
    const g0 = this.girdi.olustur(this.sahne, { aktif: t.aktif, ko: t.uyeler.map((u) => u.ko) });
    const g1 = this.bot.girdiUret(d, AYAR.dt);
    adim(d, [g0, g1], AYAR.dt);
    for (const o of d.olaylar) {
      this.efektler.olay(o, d);
      if (o.tur === "fin") this.hud.sonuc(d);
    }
  }

  private kare = (t: Ticker): void => {
    const dt = Math.min(t.deltaMS / 1000, 0.25);
    if (this.duraklat) { this.ciz(0, 1); return; }
    this.birikim += dt;
    let n = 0;
    while (this.birikim >= AYAR.dt && n < AYAR.enFazlaAdimKare) {
      this.tekAdim();
      this.birikim -= AYAR.dt;
      n++;
    }
    if (n === AYAR.enFazlaAdimKare) this.birikim = 0; // geride kaldık: telafi etme
    const alfa = Math.min(1, this.birikim / AYAR.dt);
    this.ciz(dt, alfa);
  };

  private ciz(dt: number, alfa: number): void {
    const d = this.dunya;
    this.sahne.boyutla(false, dt);
    const ben = d.dovusculer[YEREL]!;
    const nisanAliyor = this.girdi.nisanAliyor && !ben.olu && !d.sonuc;
    const fare = this.girdi.fareDunya(this.sahne);

    d.dovusculer.forEach((dv, i) => {
      const o = this.onceki[i] ?? dv;
      const konum = { x: o.x + (dv.x - o.x) * alfa, z: o.z + (dv.z - o.z) * alfa };
      const nisanYonu = i === YEREL && nisanAliyor ? yonBul(fare.x - konum.x, fare.z - konum.z, dv.yon) : null;
      this.gorseller[i]!.guncelle(dt, dv, konum, nisanYonu, d.takimlar[i]!.aktif);
    });

    if (nisanAliyor) this.nisan.goster(ben, d.profiller[YEREL]!.yuvalar[this.girdi.secilenYuva] ?? null, fare);
    else this.nisan.gizle();

    this.efektler.guncelle(dt, d, alfa);
    this.hud.guncelle(d, this.girdi.secilenYuva);
    this.kartPanosu?.guncelle(d);
  }

  yokEt(): void {
    this.sec.app.ticker.remove(this.kare);
    window.removeEventListener("keydown", this.tusDinleyici);
    this.girdi.yokEt();
    this.hud.yokEt();
    this.kartPanosu?.yokEt();
    for (const g of this.gorseller) g.yokEt();
    this.sahne.yokEt();
  }
}
