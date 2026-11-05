import ipuclariHam from "../../../veri/ipuclari.json";
import { IpuclariDosyaSema, type Ipucu } from "../../paylasilan/veri/semalar.ts";

// Pergel ipucu kataloğu (veri/ipuclari.json, zod ile doğrulanır). Metinler docs/ux/bilgic-pergel.md § 4'ten.
export type { Ipucu };
export const IPUCLARI: readonly Ipucu[] = IpuclariDosyaSema.parse(ipuclariHam).ipuclari;
