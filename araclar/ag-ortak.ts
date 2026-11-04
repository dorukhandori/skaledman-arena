// Ağ e2e ortak parçaları (matris ve ekran koşuları): iki AYRI Chromium süreci (iki gerçek istemci), lobi
// otomasyonu (Oda aç → kod → bağlantıyla katıl → Hazır), sayfa içi ölçüm okuma.
import { chromium } from "./pw.ts";
import type { Browser, Page } from "./pw.ts";

export const TABAN = process.env.AG_ADRES ?? "http://localhost:5173/";
export const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Istemci { ad: string; tarayici: Browser; sayfa: Page; hatalar: string[]; uyarilar: string[] }

const GURULTU = /GL Driver Message|GPU stall|WebGL/;

export async function istemciAc(ad: string, dpr = 1): Promise<Istemci> {
  const tarayici = await chromium.launch();
  const baglam = await tarayici.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: dpr });
  const sayfa = await baglam.newPage();
  const hatalar: string[] = [];
  const uyarilar: string[] = [];
  sayfa.on("console", (m) => {
    if (m.type() === "error") hatalar.push(m.text());
    else if (m.type() === "warning" && !GURULTU.test(m.text())) uyarilar.push(m.text());
  });
  sayfa.on("pageerror", (e) => hatalar.push(`pageerror: ${e.message}`));
  return { ad, tarayici, sayfa, hatalar, uyarilar };
}

// Sayfa içi değerlendirmeler dize olarak (tsx'in __name yardımcısı sayfada yok).
export const ev = <R>(s: Page, kod: string): Promise<R> => (s as unknown as { evaluate(k: string): Promise<R> }).evaluate(kod);
export const bekleKosul = (s: Page, kod: string, ms: number): Promise<unknown> =>
  (s as unknown as { waitForFunction(k: string, a: null, o: { timeout: number }): Promise<unknown> }).waitForFunction(kod, null, { timeout: ms });

export const tikla = (s: Page, secici: string) => ev(s, `(() => { const e = document.querySelector(${JSON.stringify(secici)}); if (!e) throw new Error("yok: ${secici}"); e.click(); return true; })()`);

/** Lobi adresi: vekil varsa sayfa da vekilden açılır (aynı köken; oyun trafiği gecikmeli, varlıklar değil). */
export function adres(port: number | null, ek: string): string {
  const q = new URLSearchParams(ek);
  q.set("ekran", "lobi");
  const taban = port ? `http://localhost:${port}/` : TABAN;
  return `${taban}?${q.toString().replace(/=(?=&|$)/g, "")}`;
}

/** A oda açar, B bağlantıyla katılır, ikisi Hazır → maç. Dönen: oda kodu. */
export async function odayiKur(a: Istemci, b: Istemci, portA: number | null, portB: number | null, ekA: string, ekB: string, hazir = true): Promise<string> {
  await a.sayfa.goto(adres(portA, ekA));
  await bekleKosul(a.sayfa, `!!document.querySelector("[data-eylem=oda-ac]")`, 20000);
  await tikla(a.sayfa, "[data-eylem=oda-ac]");
  await bekleKosul(a.sayfa, `!!document.querySelector("[data-kod]")`, 20000);
  const kod = await ev<string>(a.sayfa, `document.querySelector("[data-kod]").dataset.kod`);
  await b.sayfa.goto(`${adres(portB, ekB)}#oda=${kod}`);
  await bekleKosul(b.sayfa, `!!document.querySelector("[data-eylem=katil]")`, 20000);
  await tikla(b.sayfa, "[data-eylem=katil]");
  for (const s of [a, b]) await bekleKosul(s.sayfa, `!!document.querySelector("[data-eylem=hazir]")`, 20000);
  if (hazir) for (const s of [a, b]) await tikla(s.sayfa, "[data-eylem=hazir]");
  return kod;
}

export interface SayfaOzeti {
  asama: string; yerel: number; tick: number; faz: string; puan: number[]; sonuc: { kazanan: number; neden: string; puan: number[] } | null;
  odaFaz: number; donma: number; kopan: number; bant: string; olcum: Record<string, unknown>; kare: number; adim: number;
}

export const ozetAl = (s: Page): Promise<SayfaOzeti> => ev<SayfaOzeti>(s, `(() => {
  const l = window.__lobi; const ag = l && l.agMaci; const d = ag && ag.sunucu; const m = l && l.macEkrani;
  const o = ag ? ag.olcum : {};
  return { asama: l ? l.asama : "", yerel: ag ? ag.yerel : -1, tick: d ? d.tick : 0, faz: d ? d.mac.faz : "", puan: d ? [...d.mac.puan] : [],
    sonuc: d && d.mac.macSonucu ? { kazanan: d.mac.macSonucu.kazanan, neden: d.mac.macSonucu.neden, puan: [...d.mac.macSonucu.puan] } : null,
    odaFaz: ag && ag.durum ? ag.durum.faz : -1, donma: ag && ag.durum ? ag.durum.donma : 0, kopan: ag && ag.durum ? ag.durum.kopan : -1,
    bant: (document.querySelector(".agk .bant.acik") || {}).textContent || "",
    olcum: JSON.parse(JSON.stringify(o)), kare: m ? m.agKareSayisi : 0, adim: m ? m.agAdimSayisi : 0 };
})()`);

export const kayitDogrula = (s: Page) => ev<{ adim: number; karsilastirma: number; sapma: number; sonEsit: boolean; sonHash: string; sunucuSonHash: string; ms: number } | null>(s, `Promise.race([window.__lobi.agMaci.kayitDogrula(), new Promise((r) => setTimeout(() => r(null), 8000))])`);

export function istatistik(a: number[]): { n: number; ort: number; p50: number; p95: number; enFazla: number } {
  if (!a.length) return { n: 0, ort: 0, p50: 0, p95: 0, enFazla: 0 };
  const s = [...a].sort((x, y) => x - y);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
  return { n: s.length, ort: s.reduce((x, y) => x + y, 0) / s.length, p50: q(0.5), p95: q(0.95), enFazla: s[s.length - 1]! };
}
