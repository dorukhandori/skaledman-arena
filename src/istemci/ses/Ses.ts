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

class SesCephesi {
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
    const ac = () => this.kilidiAc();
    window.addEventListener("pointerdown", ac, { once: true, capture: true });
    window.addEventListener("keydown", ac, { once: true, capture: true });
  }

  /** İlk kullanıcı etkileşimi: ses bağlamını sürdür. */
  kilidiAc(): void {
    if (this.kilitAcik) return;
    this.kilitAcik = true;
    try {
      const ctx = (sound.context as unknown as { audioContext?: AudioContext }).audioContext;
      if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
    } catch { /* ses yok: sessiz */ }
  }

  get bagliMi(): boolean { return this.kilitAcik; }
  get acikMi(): boolean { return this.acik; }

  ac(): void { this.acik = true; try { sound.unmuteAll(); } catch { /* yok */ } }
  kapat(): void { this.acik = false; try { sound.muteAll(); } catch { /* yok */ } }
  /** M tuşu. Yeni hâli döner. */
  degistir(): boolean { if (this.acik) this.kapat(); else this.ac(); return this.acik; }

  cal(ad: SesAdi, hacim = 1): void {
    this.sayac[ad] = (this.sayac[ad] ?? 0) + 1;
    if (!this.acik || !this.kilitAcik || !this.yuklenen.has(ad)) return;
    const simdi = performance.now();
    if (simdi - (this.son[ad] ?? -1e9) < EN_AZ_ARALIK_MS) return;
    this.son[ad] = simdi;
    try {
      const katman = KAYIT_KATMANI[ad];
      const hazir = katman?.dosyalar.filter((f) => this.yuklenen.has(`kayit:${f}`)) ?? [];
      void sound.play(ad, { volume: Math.min(1, hacim * (HACIM[ad] ?? 1) * (hazir.length ? SENTEZ_KATMANLI : 1)) });
      if (katman && hazir.length) {
        const i = (this.kayitSira[ad] = ((this.kayitSira[ad] ?? -1) + 1) % hazir.length);
        void sound.play(`kayit:${hazir[i]!}`, { volume: Math.min(1, hacim * katman.hacim) });
        this.calinan[`kayit:${hazir[i]!}`] = (this.calinan[`kayit:${hazir[i]!}`] ?? 0) + 1;
      }
      this.calinan[ad] = (this.calinan[ad] ?? 0) + 1;
    } catch (e) { this.hatalar.push(`${ad}: ${String(e)}`); }
  }
}

export const Ses = new SesCephesi();
