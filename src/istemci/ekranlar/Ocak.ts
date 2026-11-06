import type { EkranBaglami } from "../main.ts";
import { git } from "../hesap.ts";

// Ocak ekranı: H7'de (07 § 5). Geçici: Atölye'ye dön.
export function baslat(_b: EkranBaglami): void { git("atolye"); }
