import type { ArraySchema } from "@colyseus/schema";
import { alanAlanlari, dunyaKokAlanlari, macAlanlari, topacAlanlari } from "../../ag/durum.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import { AlanSema, type DunyaS, EngelSema, TakimSema, TopacSema, UyeSema } from "./sema.ts";

// Dunya → şema örneği (yalnız değişen alan yamaya girer; aynı değeri yazmak yama üretmez).

function kopyala(hedef: Record<string, unknown>, kaynak: Record<string, number>): void {
  for (const k in kaynak) if (hedef[k] !== kaynak[k]) hedef[k] = kaynak[k];
}

function uzunlukAyarla<T>(dizi: ArraySchema<T>, n: number, yeni: () => T): void {
  while (dizi.length < n) dizi.push(yeni());
  while (dizi.length > n) dizi.pop();
}

export function dunyayiYaz(s: DunyaS, d: Dunya): void {
  if (!d.takimlar) throw new Error("şema yalnız maç kipinde");
  kopyala(s as unknown as Record<string, unknown>, dunyaKokAlanlari(d));
  kopyala(s.mac as unknown as Record<string, unknown>, macAlanlari(d));
  uzunlukAyarla(s.topaclar, 2, () => new TopacSema());
  for (let i = 0; i < 2; i++) {
    const t = s.topaclar.at(i)!;
    kopyala(t, { ...topacAlanlari(d.topaclar[i]!), uye: d.takimlar[i]!.aktif, yon: d.profiller[i]!.donus === "sol" ? -1 : 1 });
  }
  uzunlukAyarla(s.takimlar, 2, () => new TakimSema());
  for (let i = 0; i < 2; i++) {
    const tk = d.takimlar[i]!;
    const ts = s.takimlar.at(i)!;
    kopyala(ts, { aktif: tk.aktif, geriCekHedef: tk.geriCekHedef, geriCekBekleme: tk.geriCekBekleme, secim: tk.secim, elenen: tk.elenen });
    uzunlukAyarla(ts.uyeler, 3, () => new UyeSema());
    for (let j = 0; j < 3; j++) {
      const u = tk.uyeler[j]!;
      kopyala(ts.uyeler.at(j)!, { stamina: u.stamina, tik: u.tik, enerji: u.enerji, elendi: u.elendi, bekleme1: u.bekleme1, bekleme2: u.bekleme2, yapayIndirim: u.yapayIndirim });
    }
  }
  uzunlukAyarla(s.alanlar, 2, () => new AlanSema());
  for (let i = 0; i < 2; i++) kopyala(s.alanlar.at(i)!, alanAlanlari(d.alanlar[i] ?? null));
  uzunlukAyarla(s.engeller, d.engeller.length, () => new EngelSema());
  d.engeller.forEach((e, i) => kopyala(s.engeller.at(i)!, { x: e.x, z: e.z, r: e.r, can: e.can, sahip: e.sahip, kalan: e.kalan }));
}
