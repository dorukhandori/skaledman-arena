import { SIM_HZ } from "../../ag/protokol.ts";
import type { BitisKaydi, MacOzeti } from "../../paylasilan/kurallar/basarim.ts";
import type { Dunya, Olay } from "../../paylasilan/sim/durum.ts";
import { kok2, kusakta } from "../../paylasilan/sim/fizik.ts";
import { aktifMi, staminaOrani } from "../../paylasilan/sim/topac.ts";

// Maç özeti sayacı (axiom § 2 #21, D7): oda her sim adımından sonra o adımın olaylarıyla çağırır; maç sonunda iki
// oyuncunun başarım/Altın özeti (MacOzeti'nin sim'den türeyen kısmı). Saf sayaç, sim'i değiştirmez (hash dışı).
// Bitiş nedeni: biten topaca bu oyuncudan son isabetli yetenek (pencere değerlendiricide: `yetenekSonrasiMaxSn`),
// bitiş anında ya da son 1 sn içinde biten topacın bu oyuncunun alanında olması, son 2 sn'de bu oyuncunun dash çarpışması.

export type OzetHam = Omit<MacOzeti, "mod" | "sayildi" | "cekirdekler" | "rakipId" | "evSahibi" | "destekKanaliCanli">;

const ALAN_PENCERE = SIM_HZ; // 1 sn
const DASH_PENCERE = 2 * SIM_HZ; // 2 sn

export class MacOzetSayaci {
  private enAz: [number, number] = [1, 1];
  private kusak: [number, number] = [0, 0];
  private alinan: [number, number] = [0, 0];
  private zit: [number, number] = [0, 0];
  private carpSn: [number[], number[]] = [[], []];
  private geri: [number, number] = [0, 0];
  private aniOlum = false;
  private sonYetenek: [{ no: number; tick: number } | null, { no: number; tick: number } | null] = [null, null];
  private sonAlan: [{ no: number; tick: number } | null, { no: number; tick: number } | null] = [null, null];
  private sonCarpisma: { tick: number; dash: [boolean, boolean] } | null = null;
  private etkinNo: [number, number] = [-1, -1];
  readonly bitisler: [BitisKaydi[], BitisKaydi[]] = [[], []];
  /** sahaya çıkan takım yuvaları (0 her zaman ilk) */
  readonly sahayaCikan: [Set<number>, Set<number>] = [new Set([0]), new Set([0])];
  /** tur sonuçları (telemetri) */
  readonly turlar: { tur: string; kazanan: number; sn: number }[] = [];

  /** Bir sim adımından sonra: durum örnekleri + o adımın olayları. */
  adim(d: Dunya, olaylar: readonly Olay[]): void {
    this.durumAdimi(d);
    this.olaylariIsle(d, olaylar);
  }

  private durumAdimi(d: Dunya): void {
    const tur = d.mac.faz === "tur";
    if (d.mac.aniOlum) this.aniOlum = true;
    if (tur) {
      for (let i = 0; i < 2; i++) {
        const t = d.topaclar[i]!;
        if (!aktifMi(t)) continue;
        const o = staminaOrani(t, d.profiller[i]!);
        if (o < this.enAz[i]!) this.enAz[i] = o;
        if (kusakta(t, d.arenaYaricap)) this.kusak[i]!++;
        // alan: bu oyuncunun alanı etkin ve rakip topaç içinde
        const a = d.alanlar[i];
        const r = d.topaclar[1 - i]!;
        if (a && aktifMi(r) && kok2(r.x - a.x, r.z - a.z) <= a.yaricap) this.sonAlan[i] = { no: a.no, tick: d.tick };
      }
    }
  }

  /** Sim dışı olaylar (teslim, hükmen) da buradan geçer. */
  olaylariIsle(d: Dunya, olaylar: readonly Olay[]): void {
    const sn = d.mac.saat / SIM_HZ;
    for (const o of olaylar) {
      switch (o.tur) {
        case "carpisma":
          for (let j = 0; j < 2; j++) {
            if (o.taraflar[j]!.hasar > 0) this.alinan[j]!++;
            this.carpSn[j]!.push(sn);
            if (o.zitElement) this.zit[j]!++;
          }
          this.sonCarpisma = { tick: o.tick, dash: [o.taraflar[0].dash, o.taraflar[1].dash] };
          break;
        case "yetenekVurus":
          if (o.hedef >= 0 && o.hedef < 2) this.alinan[o.hedef]!++;
          this.sonYetenek[o.i] = { no: o.no, tick: o.tick };
          break;
        case "zincir":
          // zincir sıçraması (Zincir Kıvılcım): yetenek numarası olayda yok, sahadaki etkin yetenekten
          if (o.hedef >= 0 && o.hedef < 2) this.alinan[o.hedef]!++;
          this.sonYetenek[o.i] = { no: this.etkinNo[o.i] ?? -1, tick: o.tick };
          break;
        case "yetenekBasladi":
          this.etkinNo[o.i] = o.etkinNo;
          break;
        case "degisim":
          this.sahayaCikan[o.i]!.add(o.uye);
          break;
        case "turBasladi":
          this.sonYetenek = [null, null];
          this.sonAlan = [null, null];
          this.sonCarpisma = null;
          break;
        case "turBitti": {
          const s = o.sonuc;
          this.turlar.push({ tur: s.tur, kazanan: s.kazanan, sn: Math.round(sn * 10) / 10 });
          if (s.tur !== "berabere" && s.kazanan >= 0) {
            const w = s.kazanan;
            const sy = this.sonYetenek[w];
            const sa = this.sonAlan[w];
            const sc = this.sonCarpisma;
            this.bitisler[w]!.push({
              tur: s.tur, macSn: sn,
              yetenekNo: sy ? sy.no : null, yetenekGecenSn: sy ? (o.tick - sy.tick) / SIM_HZ : null,
              alanNo: sa && o.tick - sa.tick <= ALAN_PENCERE ? sa.no : null,
              dash: !!sc && o.tick - sc.tick <= DASH_PENCERE && sc.dash[w]!,
              macKazandiran: false,
            });
          }
          const p = d.mac.puan;
          for (let i = 0; i < 2; i++) this.geri[i] = Math.max(this.geri[i]!, p[1 - i]! - p[i]!);
          break;
        }
        case "macBitti": {
          const s = o.sonuc;
          // maçı bitiren puan: puanla (3'e ulaşma) / ani ölüm / takım tükenmesi bitişinde kazananın son bitişi
          if ((s.neden === "puan" || s.neden === "aniOlum" || s.neden === "tukenme") && s.kazanan >= 0) {
            const son = this.bitisler[s.kazanan]!.at(-1);
            if (son && Math.abs(son.macSn - sn) < 0.05) son.macKazandiran = true;
          }
          break;
        }
        default:
          break;
      }
    }
  }

  /** Maç sonu: iki oyuncunun sim'den türeyen özeti. */
  ozet(d: Dunya, kalanStaminaOrani: readonly [number, number]): [OzetHam, OzetHam] {
    const kazanan = d.mac.macSonucu?.kazanan ?? -1;
    const tek = (i: number): OzetHam => ({
      kazandi: kazanan === i,
      sureSn: d.mac.saat / SIM_HZ,
      bitisler: this.bitisler[i]!.map((b) => ({ ...b })),
      enAzStaminaOran: this.enAz[i]!,
      bitisStaminaOrani: staminaOrani(d.topaclar[i]!, d.profiller[i]!),
      kalanStaminaOrani: kalanStaminaOrani[i]!,
      alinanCarpisma: this.alinan[i]!,
      ozelYetenekSayisi: d.yetenekSayisi[i]![1]!,
      enCokGeriPuan: this.geri[i]!,
      kusakSn: this.kusak[i]! / SIM_HZ,
      zitElementCarpisma: this.zit[i]!,
      carpismaSnleri: [...this.carpSn[i]!],
      aniOlum: this.aniOlum,
      takimUltisi: false, // D8
    });
    return [tek(0), tek(1)];
  }
}
