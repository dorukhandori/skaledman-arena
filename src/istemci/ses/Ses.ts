import { sound } from "@pixi/sound";

// Ses cephesi (axiom #28): oyunun geri kalanı @pixi/sound'u YALNIZ buradan görür. Dosyalar public/ses/*.wav
// (araclar/ses-uret.ts ile sentez, CC0; veri/manifest-ses.json). Tarayıcı ses bağlamı ilk kullanıcı tıklaması /
// tuşuyla açılır; o ana kadar `cal` yalnız sayar. Ses yoksa ya da yüklenemezse oyun sessiz çalışır (05 § 3.3).

export const SES_ADLARI = [
  "carpisma-hafif", "carpisma-agir", "carpisma-kritik", "duvar", "dash", "sekme", "ring-out", "parcalanma", "durma",
  "telegraf", "ulti", "geri-sayim", "mac-sonu", "ui-tik", "enerji-doldu", "kenar-uyari",
] as const;
export type SesAdi = (typeof SES_ADLARI)[number];

/**
 * GU-B kayıt katmanı (CC0; veri/manifest-ses.json `kayitAdaylari`, public/ses/kayit/): sentez taban kalır, üstüne
 * gerçek kayıt varyantı sırayla (çeşitlilik) çalınır. Dosya yüklenemezse (ör. Ogg desteklenmiyor) yalnız sentez duyulur.
 */
const KAYIT_KATMANI: Partial<Record<SesAdi, { dosyalar: string[]; hacim: number }>> = {
  "carpisma-hafif": { dosyalar: ["impact_metal_light_000", "impact_metal_light_002", "impact_metal_light_004"], hacim: 0.55 },
  "carpisma-agir": { dosyalar: ["impact_metal_medium_001", "impact_metal_medium_002"], hacim: 0.7 },
  "carpisma-kritik": { dosyalar: ["impact_metal_heavy_000", "impact_metal_heavy_003"], hacim: 0.8 },
  duvar: { dosyalar: ["impact_tin_medium_002", "impact_plate_heavy_001"], hacim: 0.55 },
  parcalanma: { dosyalar: ["glass_breaking", "impact_glass_heavy_001", "impact_glass_heavy_004"], hacim: 0.8 },
  durma: { dosyalar: ["bsb-2700-coin-spinning-durma"], hacim: 0.8 },
  "enerji-doldu": { dosyalar: ["impact_bell_heavy_004"], hacim: 0.45 },
  "ui-tik": { dosyalar: ["click_001"], hacim: 0.6 },
};
/** Kayıt katmanı varken sentez tabanının payı. */
const SENTEZ_KATMANLI = 0.6;

/** Aynı sesin iki çalımı arasında en az (ms): art arda çarpışma gürültü olmasın. */
const EN_AZ_ARALIK_MS = 45;
const HACIM: Partial<Record<SesAdi, number>> = { "kenar-uyari": 0.5, "ui-tik": 0.6, telegraf: 0.7 };

const HACIM_ANAHTAR = "devran.sesHacim.v1";
/** H16: Müzik varsayılanı düşük (%40), Efekt %100. */
function hacimOku(): { muzik: number; efekt: number } {
  try {
    const h = JSON.parse(localStorage.getItem(HACIM_ANAHTAR) ?? "{}") as { muzik?: number; efekt?: number };
    const s = (v: unknown, d: number) => (typeof v === "number" && v >= 0 && v <= 1 ? v : d);
    return { muzik: s(h.muzik, 0.4), efekt: s(h.efekt, 1) };
  } catch { return { muzik: 0.4, efekt: 1 }; }
}

class SesCephesi {
  /** H16 kaydırıcıları (0..1), tarayıcıda saklanır */
  readonly hacim = hacimOku();
  private muzikCaliyor = false;
  /** `cal` çağrı sayısı (kapalıyken de sayılır; headless doğrulama). */
  readonly sayac: Record<string, number> = {};
  /** Gerçekten çalınan (bağlam açık, ses açık, dosya yüklü). */
  readonly calinan: Record<string, number> = {};
  readonly yuklenen = new Set<string>();
  readonly hatalar: string[] = [];
  private acik = true;
  private kilitAcik = false;
  private son: Record<string, number> = {};
  private kuruldu = false;
  private kayitSira: Record<string, number> = {};

  /** Dosyaları yükler (bir kez). Taban yol Vite `BASE_URL`. */
  yukle(): void {
    if (this.kuruldu) return;
    this.kuruldu = true;
    const taban = import.meta.env.BASE_URL ?? "/";
    for (const ad of SES_ADLARI) {
      try {
        sound.add(ad, {
          url: `${taban}ses/${ad}.wav`,
          preload: true,
          loaded: (hata) => { if (hata) this.hatalar.push(`${ad}: ${String(hata)}`); else this.yuklenen.add(ad); },
        });
      } catch (e) { this.hatalar.push(`${ad}: ${String(e)}`); }
    }
    for (const tanim of Object.values(KAYIT_KATMANI)) {
      for (const f of tanim!.dosyalar) {
        const ad = `kayit:${f}`;
        if (sound.exists(ad)) continue;
        try {
          sound.add(ad, { url: `${taban}ses/kayit/${f}.ogg`, preload: true, loaded: (hata) => { if (!hata) this.yuklenen.add(ad); } });
        } catch { /* kayıt yok: yalnız sentez */ }
      }
    }
    try { sound.add("muzik-arena", { url: `${taban}ses/kayit/atari-dongu.ogg`, preload: true, loop: true, loaded: (hata) => { if (!hata) { this.yuklenen.add("muzik-arena"); if (this.muzikIstek) this.muzikBaslat(); } } }); } catch { /* müzik yok */ }
    // MOBIL-1: iOS Safari / Android Chrome ses bağlamını yalnız "etkinleştiren" olayda açar (dokunmatikte pointerdown
    // DEĞİL: pointerup / touchend / click). Bağlam "running" olana kadar her etkileşimde yeniden denenir; iOS arka plandan
    // dönüşte bağlamı "interrupted" bırakır, sonraki dokunuş yine açar.
    const ac = () => this.kilidiAc();
    for (const ad of ["pointerdown", "pointerup", "touchend", "click", "keydown"]) window.addEventListener(ad, ac, { capture: true, passive: true });
    // pil: sekme gizliyken sesler duraklar (maç sürer; görüntü/girdi zaten durur), dönüşte sürer
    document.addEventListener("visibilitychange", () => {
      try { if (document.hidden) sound.pauseAll(); else sound.resumeAll(); } catch { /* ses yok */ }
    });
  }

  private sessizCalindi = false;
  /** Kullanıcı etkileşimi: ses bağlamını sürdür (bağlam çalışana kadar her etkileşimde). */
  kilidiAc(): void {
    this.kilitAcik = true;
    try {
      const ctx = (sound.context as unknown as { audioContext?: AudioContext }).audioContext;
      if (!ctx || ctx.state === "running") return;
      void ctx.resume().catch(() => {});
      // eski iOS: bağlam ancak etkileşim içinde bir kaynak çalınınca açılır → 1 örneklik sessiz tampon
      if (!this.sessizCalindi) {
        this.sessizCalindi = true;
        const k = ctx.createBufferSource();
        k.buffer = ctx.createBuffer(1, 1, 22050);
        k.connect(ctx.destination);
        k.start(0);
      }
    } catch { /* ses yok: sessiz */ }
  }
  /** Ses bağlamının durumu (debug / test). */
  get baglamDurumu(): string {
    try { return (sound.context as unknown as { audioContext?: AudioContext }).audioContext?.state ?? "yok"; } catch { return "yok"; }
  }

  private muzikIstek = false;
  /** Arena döngüsü (maç ekranı; sahip kararı: basit atari döngüsü, CC0 kendi sentezimiz). */
  muzikBaslat(): void {
    this.muzikIstek = true;
    if (this.muzikCaliyor || !this.yuklenen.has("muzik-arena")) return;
    try { void sound.play("muzik-arena", { loop: true, volume: this.hacim.muzik * 0.5 }); this.muzikCaliyor = true; } catch { /* yok */ }
  }
  muzikDurdur(): void {
    this.muzikIstek = false;
    if (!this.muzikCaliyor) return;
    try { sound.stop("muzik-arena"); } catch { /* yok */ }
    this.muzikCaliyor = false;
  }
  /** H16 kaydırıcı: tür (müzik/efekt), 0..1. */
  hacimAyarla(tur: "muzik" | "efekt", v: number): void {
    this.hacim[tur] = Math.max(0, Math.min(1, v));
    try { localStorage.setItem(HACIM_ANAHTAR, JSON.stringify(this.hacim)); } catch { /* depolama kapalı */ }
    if (tur === "muzik") { try { const m = sound.find("muzik-arena"); if (m) m.volume = this.hacim.muzik * 0.5; } catch { /* yok */ } }
  }

  get bagliMi(): boolean { return this.kilitAcik; }
  get acikMi(): boolean { return this.acik; }

  ac(): void { this.acik = true; try { sound.unmuteAll(); } catch { /* yok */ } }
  kapat(): void { this.acik = false; try { sound.muteAll(); } catch { /* yok */ } }
  /** M tuşu. Yeni hâli döner. */
  degistir(): boolean { if (this.acik) this.kapat(); else this.ac(); return this.acik; }

  /** `perde` oynatma hızı (1 = özgün; GU-E: çarpışma şiddetiyle ağır vuruş pes, sürtünme tiz). */
  cal(ad: SesAdi, hacim = 1, perde = 1): void {
    this.sayac[ad] = (this.sayac[ad] ?? 0) + 1;
    if (!this.acik || !this.kilitAcik || !this.yuklenen.has(ad)) return;
    const simdi = performance.now();
    if (simdi - (this.son[ad] ?? -1e9) < EN_AZ_ARALIK_MS) return;
    this.son[ad] = simdi;
    try {
      const katman = KAYIT_KATMANI[ad];
      const hazir = katman?.dosyalar.filter((f) => this.yuklenen.has(`kayit:${f}`)) ?? [];
      hacim *= this.hacim.efekt;
      const speed = Math.max(0.5, Math.min(2, perde));
      void sound.play(ad, { volume: Math.min(1, hacim * (HACIM[ad] ?? 1) * (hazir.length ? SENTEZ_KATMANLI : 1)), speed });
      if (katman && hazir.length) {
        const i = (this.kayitSira[ad] = ((this.kayitSira[ad] ?? -1) + 1) % hazir.length);
        void sound.play(`kayit:${hazir[i]!}`, { volume: Math.min(1, hacim * katman.hacim), speed });
        this.calinan[`kayit:${hazir[i]!}`] = (this.calinan[`kayit:${hazir[i]!}`] ?? 0) + 1;
      }
      this.calinan[ad] = (this.calinan[ad] ?? 0) + 1;
    } catch (e) { this.hatalar.push(`${ad}: ${String(e)}`); }
  }
}

export const Ses = new SesCephesi();
