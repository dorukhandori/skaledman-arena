import { AYAR, type DurumTuru } from "../kurallar/ayar.ts";
import { rastgele } from "./rastgele.ts";
import type { Dovuscu, Dunya } from "./durum.ts";

// Durum etkileri: yanık, felç. Bağışıklık: Ateş yanmaz, Elektrik felç olmaz (analiz § 2.5).

export function sans(d: Dunya): number {
  return rastgele(d.tohum, d.rngSira++);
}

function bagisik(d: Dunya, hedef: number, tur: DurumTuru): boolean {
  const tipler = d.profiller[hedef]!.tipler;
  return tur === "yanik" ? tipler.includes("FIRE") : tipler.includes("ELECTRIC");
}

/** Vuruş sonrası durum ihtimali (tipe göre). */
export function durumDene(d: Dunya, hedef: number, tip: string): DurumTuru | undefined {
  const kural = (AYAR.durumSansi as Record<string, { tur: DurumTuru; olasilik: number }>)[tip];
  if (!kural) return undefined;
  const hd = d.dovusculer[hedef]!;
  if (hd.olu || bagisik(d, hedef, kural.tur)) return undefined;
  if ((kural.tur === "yanik" ? hd.yanik : hd.felc) > 0) return undefined;
  if (sans(d) >= kural.olasilik) return undefined;
  if (kural.tur === "yanik") {
    hd.yanik = AYAR.yanik.sure;
    hd.yanikSayac = AYAR.yanik.aralik;
  } else {
    hd.felc = AYAR.felc.sure;
    hd.felcSayac = AYAR.felc.aralik;
  }
  d.olaylar.push({ tur: "durum", kime: hedef, durum: kural.tur });
  return kural.tur;
}

/** Her adım: yanık hasarı, felç takılması, süre sayaçları. */
export function durumlariIsle(d: Dunya, dv: Dovuscu, dt: number): void {
  if (dv.olu) return;
  if (dv.yanik > 0) {
    dv.yanik -= dt;
    dv.yanikSayac -= dt;
    if (dv.yanikSayac <= 0) {
      dv.yanikSayac += AYAR.yanik.aralik;
      const h = Math.max(1, Math.floor(dv.maxHp * AYAR.yanik.kesir));
      dv.hp = Math.max(0, dv.hp - h);
      d.olaylar.push({ tur: "vurdu", kime: dv.indeks, kimden: dv.indeks, hasar: h, etkinlik: 1, tip: "FIRE", yuva: -1, x: dv.x, z: dv.z, durum: "yanik" });
    }
    if (dv.yanik <= 0) dv.yanik = 0;
  }
  if (dv.felc > 0) {
    dv.felc -= dt;
    dv.felcSayac -= dt;
    if (dv.felcSayac <= 0) {
      dv.felcSayac += AYAR.felc.aralik;
      if (sans(d) < AYAR.felc.olasilikTakilma) dv.takilma = AYAR.felc.takilma;
    }
    if (dv.felc <= 0) dv.felc = 0;
  }
  if (dv.takilma > 0) dv.takilma = Math.max(0, dv.takilma - dt);
}
