import type { Container } from "pixi.js";
import type { TopacProfili } from "../../paylasilan/veri/profil.ts";

// GU-00: iki kamera kipinin (hibrit / düz) ortak çizim arayüzleri. Mac, Seyirci, TopacLab ve Efektler yalnız bunları görür.

export type Kademe = "yuksek" | "orta" | "dusuk";
export type TakimIsareti = "oyuncu" | "rakip" | "yok";
export type GorselBitis = "ringOut" | "parcalanma" | "durma";

export interface TopacCizimi {
  readonly kok: Container;
  readonly bitti: boolean;
  readonly kademeAdi: Kademe | null;
  readonly oran: number;
  readonly gorunurParcaSayisi: number;
  profilAyarla(p: TopacProfili, takim?: TakimIsareti): void;
  /** Squash/stretch: (nx, ny) SİM yönü; çizim kendi kamerasına çevirir. */
  squash(nx: number, ny: number, sx: number, sy: number, sure: number): void;
  catlakAyarla(oran: number): void;
  flas(kare: number): void;
  /** (vx, vy) SİM hızı */
  bitis(tur: GorselBitis, vx: number, vy: number): void;
  sifirla(): void;
  /** `x, y` dünya (zemin temas noktası), `oran` stamina/max, `sekme` havada mı, `yavas` efekt saati çarpanı */
  guncelle(dt: number, x: number, y: number, oran: number, sekme: boolean, yavas?: number): void;
  yokEt(): void;
}

export interface ArenaCizimi {
  readonly zemin: Container;
  readonly dudak: Container;
  arkaPlanGoster(goster: boolean): void;
  /** `R` sim çanak yarıçapı (ani ölümde daralır), `seritte` kuşakta topaç var mı, `aniOlum` 0..1 */
  guncelle(dt: number, R: number, seritte: boolean, aniOlum: number): void;
}
