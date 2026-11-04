import { AYAR } from "../kurallar/ayar.ts";
import { topacCarpismasi } from "./carpisma.ts";
import { TOPAC_DURUM, type Dunya, type Topac } from "./durum.ts";
import { duvarCoz, erimeUygula, hareketAdimla, sinirla } from "./fizik.ts";
import { type Girdi, girdiTemizle } from "./Girdi.ts";
import { bitisDurumu, bitisSec, bosBitis, turKarari } from "./mac.ts";
import { aktifMi, eylemleriUygula, sayaclariIlerlet, yorgunlukCarpani } from "./topac.ts";

// Bir sim adımı (1/60 s). Sıra:
//   1) girdi temizle  2) her topaç: sayaç, eylem, hareket, erime (birbirinden bağımsız, sıra fark etmez)
//   3) topaç-topaç çarpışma (sıra bağımsız çözüm)  4) duvar / Ring Out  5) bitiş adayları → tur kararı (adım sonu)
// Girdiler indeksle eşleşir: girdiler[i] → topaclar[i].

function sonumAdimla(t: Topac): void {
  // Durma sonrası: hız 40 adımda doğrusal söner; çarpışma ve hasar yok (salt süs, karar verilmiştir)
  if (t.sonumKalan <= 0) { t.vx = 0; t.vz = 0; return; }
  const k = (t.sonumKalan - 1) / t.sonumKalan;
  t.vx *= k;
  t.vz *= k;
  t.sonumKalan--;
  t.x += t.vx * AYAR.dt;
  t.z += t.vz * AYAR.dt;
}

export function adim(d: Dunya, girdiler: readonly [Girdi, Girdi]): void {
  d.olaylar = [];
  d.tick++;
  const karar = d.mac.faz === "tur";
  const g = [girdiTemizle(girdiler[0]), girdiTemizle(girdiler[1])] as const;

  for (let i = 0; i < 2; i++) {
    const t = d.topaclar[i]!;
    const p = d.profiller[i]!;
    if (t.durum === TOPAC_DURUM.durma) { sonumAdimla(t); duvarCoz(t, p, i, d.tick, null); continue; }
    if (!aktifMi(t)) continue;
    sayaclariIlerlet(t);
    const yorgunluk = yorgunlukCarpani(t, p);
    eylemleriUygula(t, p, g[i]!, d.topaclar[1 - i]!, i, d.tick, d.olaylar);
    hareketAdimla(t, p, g[i]!, d.tick, yorgunluk);
    if (karar) erimeUygula(t, p);
  }

  topacCarpismasi(d);

  const bitisler = [bosBitis(), bosBitis()] as const;
  for (let i = 0; i < 2; i++) {
    const t = d.topaclar[i]!;
    const p = d.profiller[i]!;
    if (!aktifMi(t)) continue;
    sinirla(t);
    const ro = duvarCoz(t, p, i, d.tick, karar ? d.olaylar : null);
    if (!karar) continue;
    const b = bitisler[i]!;
    b.ringOut = ro;
    b.parcalanma = t.tik >= p.parametreler.burstEsik;
    b.durma = t.stamina <= 0;
  }
  if (!karar) return;

  // adım sonu: bitişleri uygula (iki topaç birden olabilir), sonra tek karar
  for (let i = 0; i < 2; i++) {
    const tur = bitisSec(bitisler[i]!);
    if (!tur) continue;
    const t = d.topaclar[i]!;
    t.durum = bitisDurumu(tur);
    if (tur === "durma") { t.stamina = 0; t.sonumKalan = AYAR.durmaSonumu; }
    if (tur === "parcalanma" && t.stamina < 0) t.stamina = 0;
    if (tur === "ringOut") d.olaylar.push({ tur: "ringOut", tick: d.tick, i, x: t.x, z: t.z, vx: t.vx, vz: t.vz });
    else if (tur === "parcalanma") d.olaylar.push({ tur: "parcalandi", tick: d.tick, i, x: t.x, z: t.z, vx: t.vx, vz: t.vz });
    else d.olaylar.push({ tur: "durma", tick: d.tick, i, x: t.x, z: t.z });
  }
  const sonuc = turKarari(d, bitisler);
  if (sonuc) d.olaylar.push({ tur: "turBitti", tick: d.tick, sonuc });
}
