import type { BotProfili } from "../../paylasilan/kurallar/botlar.ts";
import type { HamleKurali } from "../../paylasilan/kurallar/hamleler.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import { budanmisEtkinlik, etkinlik } from "../../paylasilan/kurallar/tipler.ts";
import { parcaEngel } from "../../paylasilan/sim/carpisma.ts";
import type { Dovuscu, Dunya } from "../../paylasilan/sim/durum.ts";
import { type Girdi, bosGirdi } from "../../paylasilan/sim/Girdi.ts";
import { rastgele } from "../../paylasilan/sim/rastgele.ts";

// PokeRivals `facil/normal` profillerinden esinli bot: menzile yaklaş / geri çekil, yan adım, en iyi tip-etkinlikli
// hazır yuvayı at, telegrafı görünce dash ile kaç. Yalnız istemcide çalışır; paylaşılan sim'e girmez.

const BOT = {
  /** yön vektörü bu kadar ilerisine duvar payı */
  duvarPayi: 40,
  koseTasma: 18,
  /** telegraf: rakibin bakışı bana bu kadar hizalıysa tehlike */
  hizaEsigi: 0.6,
  tehlikeMenziliPayi: 30,
  alanPayi: 14,
  menzilIcinPayi: 0.95,
  dashYanMesafeEsigi: 0.5,
  /** PokeRivals normal bot `cambios:[vidaBaja]`: can bu oranın altına inince daha sağlıklı üyeye geç */
  dusukCan: 0.25,
  yedekCanEsigi: 0.5,
} as const;

export class Bot {
  private zaman = 0;
  private sira = 0;
  private yanYon = 1;
  private yanAdimZamani = 0;
  private kararKalan = 0;
  private hareket = { x: 0, z: 0 };
  private sonAtis = -10;
  private tehlikeVar = false;
  private tepkiKalan = 0;
  private dashKararli = false;
  private oncekiRakip = { x: 0, z: 0 };
  private rakipHiz = { x: 0, z: 0 };

  constructor(private profil: BotProfili, private indeks: number, private tohum: number) {}

  private rnd(): number {
    return rastgele(this.tohum, this.sira++);
  }

  girdiUret(d: Dunya, dt: number): Girdi {
    const g = bosGirdi();
    const ben = d.dovusculer[this.indeks]!;
    const rakip = d.dovusculer[1 - this.indeks]!;
    if (d.sonuc) return g;
    g.degistir = this.takimKarari(d, ben);
    if (ben.olu || rakip.olu || ben.sahaDisi || rakip.sahaDisi) return g;
    this.zaman += dt;
    this.rakipHizi(rakip, dt);

    const p = d.profiller[this.indeks]!;
    const ph = d.profiller[1 - this.indeks]!;
    const uzaklik = Math.hypot(rakip.x - ben.x, rakip.z - ben.z);
    const secim = this.enIyiYuva(ben, p.yuvalar, ph.tipler, p.tipler);
    const secKural = secim >= 0 ? p.yuvalar[secim]! : null;

    this.kararKalan -= dt;
    if (this.kararKalan <= 0) {
      this.kararKalan = this.profil.kararAraligi;
      this.hareketKarari(d, ben, rakip, uzaklik, secKural);
    }
    g.yonX = this.hareket.x;
    g.yonZ = this.hareket.z;

    this.kacis(d, g, ben, rakip, dt);
    this.saldiri(d, g, ben, rakip, uzaklik, secim, secKural);
    return g;
  }

  /** KO'da en sağlıklı yedeği hemen indir; canı azalınca bir kez yedeğe çekil. */
  private takimKarari(d: Dunya, ben: Dovuscu): number {
    const t = d.takimlar[this.indeks]!;
    let en = -1;
    let enOran = 0;
    t.uyeler.forEach((u, k) => {
      if (k === t.aktif || u.ko) return;
      const oran = u.hp / u.maxHp;
      if (oran > enOran) { enOran = oran; en = k; }
    });
    if (en < 0) return -1;
    if (ben.olu) return t.secimKalan > 0 && t.secimKalan < AYAR.takim.koSecim - this.profil.tepki ? en : -1;
    const dusuk = ben.hp / ben.maxHp < BOT.dusukCan && enOran > BOT.yedekCanEsigi;
    return dusuk && t.bekleme <= 0 && !ben.hamle && !this.cekildi ? (this.cekildi = true, en) : -1;
  }

  private cekildi = false;

  private rakipHizi(rakip: Dovuscu, dt: number): void {
    this.rakipHiz = { x: (rakip.x - this.oncekiRakip.x) / dt, z: (rakip.z - this.oncekiRakip.z) / dt };
    this.oncekiRakip = { x: rakip.x, z: rakip.z };
  }

  /** Hazır yuvalar içinde güç · etkinlik · STAB puanı en yüksek olan; hazır yoksa -1. */
  private enIyiYuva(ben: Dovuscu, yuvalar: (HamleKurali | null)[], hedefTipler: readonly string[], kendiTipler: readonly string[]): number {
    let en = -1;
    let enPuan = -1;
    yuvalar.forEach((k, i) => {
      if (!k || (ben.cooldown[i] ?? 0) > 0) return;
      const etk = budanmisEtkinlik(etkinlik(k.tip, hedefTipler as never));
      const puan = k.guc * etk * (kendiTipler.includes(k.tip) ? AYAR.stab : 1);
      if (puan > enPuan) { enPuan = puan; en = i; }
    });
    return en;
  }

  private hareketKarari(d: Dunya, ben: Dovuscu, rakip: Dovuscu, uzaklik: number, kural: HamleKurali | null): void {
    this.yanAdimZamani += this.profil.kararAraligi;
    if (this.yanAdimZamani >= this.profil.yanAdimAraligi) { this.yanAdimZamani = 0; this.yanYon = this.rnd() < 0.5 ? -1 : 1; }

    // hedef nokta: rakip ya da engelin etrafındaki ara nokta
    const hedef = this.hedefNokta(d, ben, rakip);
    let dx = hedef.x - ben.x;
    let dz = hedef.z - ben.z;
    const u = Math.hypot(dx, dz) || 1;
    dx /= u; dz /= u;

    const tercih = (kural?.menzil ?? AYAR.saha.govdeYaricap * 2) * this.profil.menzilCarpani;
    let ileri = 0;
    if (hedef.dogrudan) {
      if (uzaklik > tercih * 1.15) ileri = 1;
      else if (uzaklik < tercih * this.profil.geriCekilOrani) ileri = -1;
    } else ileri = 1;
    const yan = hedef.dogrudan ? this.yanYon * 0.8 : 0;
    let mx = dx * ileri - dz * yan;
    let mz = dz * ileri + dx * yan;

    // saha kenarından uzak dur: kenara bakan bileşeni çevir
    const a = d.arena;
    if (ben.x + mx * BOT.duvarPayi > a.yariGenislik - BOT.duvarPayi || ben.x + mx * BOT.duvarPayi < -a.yariGenislik + BOT.duvarPayi) { mx = -mx; this.yanYon = -this.yanYon; }
    if (ben.z + mz * BOT.duvarPayi > a.derinlik - BOT.duvarPayi || ben.z + mz * BOT.duvarPayi < BOT.duvarPayi) { mz = -mz; this.yanYon = -this.yanYon; }
    const m = Math.hypot(mx, mz);
    this.hareket = m > 1 ? { x: mx / m, z: mz / m } : { x: mx, z: mz };
  }

  /** Rakip görüş hattındaysa rakip; değilse engelin köşelerinden birine yönel. */
  private hedefNokta(d: Dunya, ben: Dovuscu, rakip: Dovuscu): { x: number; z: number; dogrudan: boolean } {
    const r = d.arena.govdeYaricap;
    if (parcaEngel(d.arena, ben.x, ben.z, rakip.x, rakip.z, r) === null) return { x: rakip.x, z: rakip.z, dogrudan: true };
    let en: { x: number; z: number } | null = null;
    let enMesafe = Infinity;
    for (const e of d.arena.engeller) {
      if (e.tur !== "dikdortgen") continue;
      const pay = r + BOT.koseTasma;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const k = { x: e.x + sx * (e.yariGenislik + pay), z: e.z + sz * (e.yariDerinlik + pay) };
        if (k.z < r || k.z > d.arena.derinlik - r || Math.abs(k.x) > d.arena.yariGenislik - r) continue;
        if (parcaEngel(d.arena, ben.x, ben.z, k.x, k.z, r * 0.8) !== null) continue;
        const toplam = Math.hypot(k.x - ben.x, k.z - ben.z) + Math.hypot(rakip.x - k.x, rakip.z - k.z);
        if (toplam < enMesafe) { enMesafe = toplam; en = k; }
      }
    }
    return en ? { ...en, dogrudan: false } : { x: rakip.x, z: rakip.z, dogrudan: false };
  }

  /** Gelen telegraf / alan: tepki süresi sonra olasılıkla dash. */
  private kacis(d: Dunya, g: Girdi, ben: Dovuscu, rakip: Dovuscu, dt: number): void {
    const t = this.tehlikeBul(d, ben, rakip);
    if (t && !this.tehlikeVar) {
      this.tehlikeVar = true;
      this.tepkiKalan = this.profil.tepki;
      this.dashKararli = this.rnd() < this.profil.dashKacma;
    }
    if (!t) { this.tehlikeVar = false; return; }
    this.tepkiKalan -= dt;
    if (this.tepkiKalan > 0) return;
    // yana çık
    const yan = { x: -rakip.yonZ * this.yanYon, z: rakip.yonX * this.yanYon };
    if (t.alanMerkezi) {
      const dx = ben.x - t.alanMerkezi.x;
      const dz = ben.z - t.alanMerkezi.z;
      const u = Math.hypot(dx, dz) || 1;
      g.yonX = dx / u; g.yonZ = dz / u;
    } else { g.yonX = yan.x; g.yonZ = yan.z; }
    if (this.dashKararli && ben.dashBekleme <= 0) { g.dash = true; this.dashKararli = false; }
  }

  private tehlikeBul(d: Dunya, ben: Dovuscu, rakip: Dovuscu): { alanMerkezi?: { x: number; z: number } } | null {
    for (const a of d.alanlar) {
      if (a.sahip === this.indeks) continue;
      if (Math.hypot(ben.x - a.x, ben.z - a.z) < a.yaricap + d.arena.govdeYaricap + BOT.alanPayi) return { alanMerkezi: { x: a.x, z: a.z } };
    }
    const h = rakip.hamle;
    if (h?.evre !== "aviso") return null;
    const kural = d.profiller[1 - this.indeks]!.yuvalar[h.yuva];
    if (!kural || kural.aile === "alan") return null;
    const dx = ben.x - rakip.x;
    const dz = ben.z - rakip.z;
    const u = Math.hypot(dx, dz) || 1;
    const hiza = (dx * h.yonX + dz * h.yonZ) / u;
    return u < kural.menzil + BOT.tehlikeMenziliPayi && hiza > BOT.hizaEsigi ? {} : null;
  }

  private saldiri(d: Dunya, g: Girdi, ben: Dovuscu, rakip: Dovuscu, uzaklik: number, secim: number, kural: HamleKurali | null): void {
    g.nisanX = rakip.x;
    g.nisanZ = rakip.z;
    if (!kural || secim < 0 || ben.hamle || ben.hitStun > 0) return;
    if (this.zaman < this.profil.tepki || this.zaman - this.sonAtis < this.profil.atisAraligi) return;
    if (uzaklik > (kural.aile === "embestida" ? (kural.mesafe ?? kural.menzil) : kural.menzil) * BOT.menzilIcinPayi) return;
    const gorus = parcaEngel(d.arena, ben.x, ben.z, rakip.x, rakip.z, 0) === null;
    if ((kural.aile === "mermi" || kural.aile === "isin" || kural.aile === "embestida") && !gorus) return;

    // önden tahmin: mermi uçuş süresi, alan gecikmesi
    let ileri = 0;
    if (kural.aile === "mermi") ileri = uzaklik / (kural.hiz || 1);
    else if (kural.aile === "alan") ileri = kural.gecikme ?? 0;
    ileri *= this.profil.onTahmin;
    const hata = this.profil.nisanHatasi;
    g.nisanX = rakip.x + this.rakipHiz.x * ileri + (this.rnd() * 2 - 1) * hata;
    g.nisanZ = rakip.z + this.rakipHiz.z * ileri + (this.rnd() * 2 - 1) * hata;
    g.secilenYuva = secim;
    g.atesle = true;
    this.sonAtis = this.zaman;
  }
}
