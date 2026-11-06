// A7 kazı telemetri raporu (yalnız okur): son 30 günde isabet ≥ %98 ve vuruş aralığı sapması < 20 ms olan oyuncu-günleri.
// Çalıştır: VERI_DIZINI=<veri> npm run maden:rapor   (otomatik ceza yok; @vault insan incelemesi için)
import { depo } from "../src/sunucu/db/depo.ts";
import { madenSupheliRaporu } from "../src/sunucu/oyuncu/madenRapor.ts";

const satirlar = madenSupheliRaporu(depo(), Date.now() - 30 * 86_400_000);
console.log(`| Oyuncu | Ad | Gün | Vuruş | İsabet | Aralık ort. (ms) | Sapma (ms) |\n|---|---|---|---|---|---|---|`);
for (const s of satirlar) console.log(`| ${s.oyuncuId} | ${s.ad ?? "(silinmiş)"} | ${s.gun} | ${s.vurus} | %${Math.round(s.isabetOrani * 100)} | ${s.aralikOrtMs} | ${s.aralikSapmaMs} |`);
console.log(`\n${satirlar.length} şüpheli oyuncu-günü (son 30 gün).`);
