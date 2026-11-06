import type { Depo } from "../db/depo.ts";
import { type BasarimBildirimi, basarimOlayiIsle, bildirim } from "./basarimYaz.ts";
import type { HaritaOlaylari } from "./harita.ts";

// Harita/maden/Ocak başarımlarının maç dışı girişi (05 § 2.2, § 4): uçlar kendi işlemlerinde biriktirdiği olayları
// buradan `basarimIsle`'ye verir. H2: yer tutucu (olay sözlüğü H5'te); dönen bildirim listesi istemcinin "AÇILDI" kartı.

export function basarimHaritaOlaylari(d: Depo, id: number, o: HaritaOlaylari, simdi: number): BasarimBildirimi[] {
  if (!o.dugumTamam && !o.bolgeTamam.length && !o.rozet.length) return [];
  const s = basarimOlayiIsle(d, id, {}, simdi);
  return s.degisimler.map(bildirim).filter((x): x is BasarimBildirimi => x !== null && x.tamamlandi);
}
