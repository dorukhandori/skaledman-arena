import type { EkranBaglami } from "../main.ts";
import { git } from "../hesap.ts";

// Maden ekranı: H7'de (07 § 4). Geçici: haritaya dön.
export function baslat(_b: EkranBaglami): void { git("harita"); }
