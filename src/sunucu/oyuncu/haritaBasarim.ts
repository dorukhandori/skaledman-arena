import type { BasarimGirdisi } from "../../paylasilan/kurallar/basarim.ts";
import { ILK_BOLGELER, yildizToplami } from "../../paylasilan/kurallar/harita.ts";
import { seviye } from "../../paylasilan/kurallar/ustalik.ts";
import type { Depo } from "../db/depo.ts";
import { type BasarimBildirimi, basarimOlayiIsle, bildirim } from "./basarimYaz.ts";
import type { HaritaOlaylari } from "./harita.ts";
import type { MadenOlaylari } from "./maden.ts";
import type { OcakOlaylari } from "./ocak.ts";
import { koleksiyonDegeri, uretilenler, vitrinOku } from "./ocak.ts";

// Harita/maden/Ocak başarımları (docs/design/harita/05 § 2.2, § 4): uçlar kendi işlemlerinde biriken artış olaylarını
// verir; durum değerleri (yıldız toplamı, en yüksek rozet, Ustalık seviyeleri, vitrin, malzemeli topaç, aynı parçanın
// kademe çeşidi, koleksiyon değeri) burada kalıcı durumdan hesaplanır. Ödül `basarim:<id>:<oyuncu>` (idempotent).

type HaritaGirdisi = NonNullable<BasarimGirdisi["harita"]>;

/** Kalıcı durumdan harita başarım değerleri. */
export function haritaDurumu(d: Depo, id: number): HaritaGirdisi {
  const maskeler: Record<string, number> = {};
  for (const s of d.dugumDurumlari(id)) maskeler[s.dugum_id] = s.yildiz;
  const rozetler = d.bolgeRozetleri(id);
  const u = d.ustaliklar(id);
  const ur = uretilenler(d, id);
  // aynı tanımın en çok kaç farklı kademede biçimi var
  const kademeler = new Map<string, Set<number>>();
  for (const p of ur) (kademeler.get(p.tanim) ?? kademeler.set(p.tanim, new Set()).get(p.tanim)!).add(p.malzeme);
  const tanimKademeCesidi = Math.max(0, ...[...kademeler.values()].map((s) => s.size));
  // bir topacın 4 örneği de üretilmiş ve aynı kademede mi (Tam Takım)
  const malzemeTopac = d.takimlar(id).some((t) => t.yuvalar.some((y) => !!y?.malzeme && y.malzeme[0]! > 0 && y.malzeme.every((m) => m === y.malzeme![0])));
  return {
    yildizToplam: yildizToplami(maskeler),
    enYuksekRozet: Math.max(0, ...ILK_BOLGELER.map((b) => rozetler[b.id] ?? 0)),
    ustalik: { madencilik: seviye(u.madencilik), isleme: seviye(u.isleme) },
    vitrinDolu: vitrinOku(d, id).length,
    malzemeTopac,
    tanimKademeCesidi,
    koleksiyonDegeri: koleksiyonDegeri(d, id),
  };
}

/** Artış olayları + durum → başarım; dönen: tamamlananların bildirimi (istemcinin "AÇILDI" kartı). */
export function haritaBasarimIsle(d: Depo, id: number, artis: Partial<HaritaGirdisi>, simdi: number): BasarimBildirimi[] {
  const s = basarimOlayiIsle(d, id, { harita: { ...haritaDurumu(d, id), ...artis } }, simdi);
  return s.degisimler.map(bildirim).filter((x): x is BasarimBildirimi => x !== null && x.tamamlandi);
}

const haritaArtis = (o: HaritaOlaylari): Partial<HaritaGirdisi> => ({ dugumTamam: o.dugumTamam, bolgeTamam: o.bolgeTamam });

export function basarimHaritaOlaylari(d: Depo, id: number, o: HaritaOlaylari, simdi: number): BasarimBildirimi[] {
  return haritaBasarimIsle(d, id, haritaArtis(o), simdi);
}

export function basarimMadenOlaylari(d: Depo, id: number, o: MadenOlaylari, simdi: number): BasarimBildirimi[] {
  return haritaBasarimIsle(d, id, { ...haritaArtis(o), cevherKazildi: o.cevherKazildi, nadirDamar: o.nadirDamar, isabetSerisi: o.isabetSerisi }, simdi);
}

export function basarimOcakOlaylari(d: Depo, id: number, o: OcakOlaylari, simdi: number): BasarimBildirimi[] {
  return haritaBasarimIsle(d, id, { eritme: o.eritme, ustaIsi: o.ustaIsi, parcaUret: o.parcaUret }, simdi);
}

export function basarimVitrin(d: Depo, id: number, _dolu: number, simdi: number): BasarimBildirimi[] {
  return haritaBasarimIsle(d, id, {}, simdi);
}
