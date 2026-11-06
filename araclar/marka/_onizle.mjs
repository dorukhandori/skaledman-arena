import { amblem, topacAmblem, yaziMarkasi, R } from "./isaretler.mjs";
import { tuval, yapistir, pngYaz, dikdortgen } from "./piksel.mjs";
const S = process.argv[2];
const a = topacAmblem();
const y = yaziMarkasi();
const t = tuval(200, 50);
dikdortgen(t, 0, 0, 200, 50, R.tas1);
dikdortgen(t, 100, 0, 100, 50, "#e9e4da");
for (const ox of [0, 100]) { yapistir(t, a, ox + 3, 6); yapistir(t, y, ox + 38, 14); }
yapistir(t, amblem(32), 3, 0 + 40 - 40 + 0 < 0 ? 0 : 200); 
await pngYaz(t, `${S}/onizleme.png`, 6);
