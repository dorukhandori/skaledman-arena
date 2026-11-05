// D8 QA kapısı madde 7 (flint § 7): sunucu ÇÖKMESİ ve yeniden başlatma. ÜRETİM paketi (`npm run build` sonrası
// dist/server/server.mjs, NODE_ENV=production, geçici VERI_DIZINI) açılır; iki gerçek headless Chromium hesap açar,
// oda kurar, maç başlar (OTOMATİK OYNANIŞ: ?oto botları); maçın ortasında süreç SIGKILL ile öldürülür, yeniden
// başlatılır. Denetlenen: SQLite `PRAGMA integrity_check` = ok, yarım maç için `mac` satırı YOK (maç iptal), Altın
// defterinde maç kalemi YOK, oturumlar geçerli (aynı OTURUM_SIRRI), istemci "Bağlanamadık" bandı, eski oda kodu kapalı.
// Çalıştır: npm run build && AG_ADRES=http://localhost:2567/ npx tsx araclar/qa-cokme.ts [--json=yol]
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { TABAN, bekle, bekleKosul, ev, istemciAc, odayiKur, ozetAl } from "./ag-ortak.ts";

const VERI = join(tmpdir(), `devran-cokme-${process.pid}`);
const ORTAM = { ...process.env, NODE_ENV: "production", OTURUM_SIRRI: "cokme-testi-icin-uzun-bir-sir-0123456789abcdef", IZINLI_KOKENLER: TABAN.replace(/\/$/, ""), VERI_DIZINI: VERI };
const gunluk: string[] = [];

async function sunucuAc(): Promise<ChildProcess> {
  const p = spawn("node", ["dist/server/server.mjs"], { env: ORTAM, stdio: ["ignore", "pipe", "pipe"] });
  p.stdout!.on("data", (b: Buffer) => gunluk.push(b.toString()));
  p.stderr!.on("data", (b: Buffer) => gunluk.push(`ERR ${b.toString()}`));
  for (let k = 0; k < 60; k++) {
    try { const r = await fetch(`${TABAN}api/saglik`); if (r.ok) return p; } catch { /* açılıyor */ }
    await bekle(250);
  }
  throw new Error("sunucu açılmadı");
}

rmSync(VERI, { recursive: true, force: true });
mkdirSync(VERI, { recursive: true });
let sunucu = await sunucuAc();
const a = await istemciAc("A");
const b = await istemciAc("B");
const sonuc: Record<string, unknown> = {};
try {
  const kod = await odayiKur(a, b, null, null, "oto=kenar&cizim=yok&takim=0", "oto=dolas&cizim=yok&takim=1");
  await bekleKosul(a.sayfa, `window.__lobi.agMaci && window.__lobi.agMaci.sunucu && window.__lobi.agMaci.sunucu.mac.faz === "tur"`, 40000);
  await bekle(6000);
  const once = await ozetAl(a.sayfa);
  sonuc["olumOncesi"] = { kod, tick: once.tick, puan: once.puan, faz: once.faz };
  sunucu.kill("SIGKILL");
  await new Promise((r) => sunucu.once("exit", r));
  await bekle(1500);
  // ölü sunucu: veritabanı tutarlı mı (WAL dahil)
  const db = new Database(join(VERI, "devran.sqlite"), { readonly: true });
  sonuc["integrity"] = db.pragma("integrity_check", { simple: true });
  sonuc["macSatiri"] = (db.prepare("SELECT COUNT(*) n FROM mac").get() as { n: number }).n;
  sonuc["altinKalemleri"] = db.prepare("SELECT neden, COUNT(*) n, SUM(miktar) toplam FROM altin_defteri GROUP BY neden").all();
  sonuc["oturum"] = (db.prepare("SELECT COUNT(*) n FROM oturum").get() as { n: number }).n;
  db.close();
  sunucu = await sunucuAc();
  const bantA = await (async () => { for (let k = 0; k < 80; k++) { const x = await ozetAl(a.sayfa); if (x.bant.includes("Bağlanamadık") || x.bant.includes("koptu")) return x.bant; await bekle(500); } return (await ozetAl(a.sayfa)).bant; })();
  sonuc["istemciBandi"] = bantA;
  sonuc["eskiKod"] = await (await fetch(`${TABAN}api/oda/${kod}`)).json();
  const ben = await ev<{ girisli: boolean }>(a.sayfa, `fetch("/api/ben", { credentials: "same-origin" }).then((r) => r.json())`);
  sonuc["yenidenBaslatmaSonrasiOturum"] = ben.girisli;
  const db2 = new Database(join(VERI, "devran.sqlite"), { readonly: true });
  sonuc["integritySonra"] = db2.pragma("integrity_check", { simple: true });
  sonuc["macSatiriSonra"] = (db2.prepare("SELECT COUNT(*) n FROM mac").get() as { n: number }).n;
  sonuc["userVersion"] = db2.pragma("user_version", { simple: true });
  db2.close();
  sonuc["konsolHata"] = [...a.hatalar, ...b.hatalar].filter((h) => !/WebSocket|ERR_CONNECTION|Failed to load resource|net::/.test(h));
  sonuc["kapi"] = sonuc["integrity"] === "ok" && sonuc["integritySonra"] === "ok" && sonuc["macSatiri"] === 0 && !(sonuc["altinKalemleri"] as { neden: string }[]).some((x) => x.neden === "mac") && ben.girisli === true;
} finally {
  await a.tarayici.close(); await b.tarayici.close();
  sunucu.kill("SIGTERM");
}
sonuc["sunucuGunlukHata"] = gunluk.filter((s) => /ERR |Error|error/.test(s)).slice(0, 10);
console.log(JSON.stringify(sonuc, null, 1));
const j = process.argv.find((x) => x.startsWith("--json="))?.slice(7);
if (j) writeFileSync(j, JSON.stringify(sonuc, null, 1));
process.exit(0);
