// Ata 3B üretimi: Tripo image-to-model (dokulu). Anahtar yalnız ortamdan (TRIPO_API_KEY), yazdırılmaz.
import { printBalance, uploadImage, postJson, taskIdOf, pollTask, download, modelUrlOf, creditsOf, H_MODEL } from "/Users/dorukhanersoyleyen/dev/wyrmwar/tools/asset-pipeline/lib/tripo.mjs";
import { appendFileSync } from "node:fs";
const key = process.env.TRIPO_API_KEY;
if (!key) { console.error("TRIPO_API_KEY yok"); process.exit(2); }
const A = "/Users/dorukhanersoyleyen/dev/skaledman-arena/art-source/ruh";
const ids = process.argv.slice(2);
await printBalance(key);
if (!ids.length) process.exit(0);
await Promise.all(ids.map(async (id) => {
  try {
    const body = { model: H_MODEL, texture: true, pbr: false, auto_size: true, export_uv: true, face_limit: 30000, texture_quality: "detailed" };
    body.input = await uploadImage(key, `${A}/tripo/${id}.png`);
    const tid = taskIdOf(await postJson(key, "/v3/generation/image-to-model", body), id);
    console.log(`${id} görev ${tid}`);
    const task = await pollTask(key, tid, 20);
    const n = await download(modelUrlOf(task), `${A}/glb/${id}.glb`);
    const satir = { id, gorev: tid, model: H_MODEL, kredi: creditsOf(task), bayt: n, tarih: new Date().toISOString() };
    appendFileSync(`${A}/tripo-kayit.jsonl`, JSON.stringify(satir) + "\n");
    console.log(JSON.stringify(satir));
  } catch (e) { console.log(`${id} HATA ${String(e.message).slice(0, 300)}`); }
}));
await printBalance(key);
