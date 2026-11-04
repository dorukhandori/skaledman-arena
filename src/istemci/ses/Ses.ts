import { sound } from "@pixi/sound";

// Ses cephesi (axiom #28): oyunun geri kalanı @pixi/sound'u YALNIZ buradan görür. Dosyalar public/ses/*.wav
// (araclar/ses-uret.ts ile sentez, CC0; veri/manifest-ses.json). Tarayıcı ses bağlamı ilk kullanıcı tıklaması /
// tuşuyla açılır; o ana kadar `cal` yalnız sayar. Ses yoksa ya da yüklenemezse oyun sessiz çalışır (05 § 3.3).

export const SES_ADLARI = [
  "carpisma-hafif", "carpisma-agir", "carpisma-kritik", "duvar", "dash", "sekme", "ring-out", "parcalanma", "durma",
  "telegraf", "ulti", "geri-sayim", "mac-sonu", "ui-tik", "enerji-doldu", "kenar-uyari",
] as const;
export type SesAdi = (typeof SES_ADLARI)[number];

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
      void sound.play(ad, { volume: Math.min(1, hacim * (HACIM[ad] ?? 1)) });
      this.calinan[ad] = (this.calinan[ad] ?? 0) + 1;
    } catch (e) { this.hatalar.push(`${ad}: ${String(e)}`); }
  }
}

export const Ses = new SesCephesi();
