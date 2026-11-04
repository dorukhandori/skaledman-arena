// Ağ simülatörü (flint § 3 netcode matrisi): Colyseus sunucusunun önünde HTTP + WebSocket vekili. Her istemci kendi
// vekiline bağlanır (`?sunucu=http://localhost:<port>`), böylece profil istemci başına (N5 asimetrik) ayarlanır.
// Tek yön gecikme + jitter (düzgün ±j) + kayıp. WebSocket TCP üstündedir: kayıp bir çerçeve DÜŞMEZ, yeniden
// iletim bekler (RTO ≈ 200 ms + tek yön gecikme) ve arkasındaki çerçeveleri de bekletir (hat başı tıkanması). Bu
// yüzden kayıp burada "gecikme sıçraması + sıra korunur" olarak modellenir; gerçek WebSocket davranışı budur.
// Patlama (N6): belirli bir pencerede %100 kayıp (pencere bitince birikmiş çerçeveler sırayla akar).
// Kesme (`kes(ms)`): iki bacağı da düşürür (sunucu onDrop, istemci SDK yeniden bağlanma dener) ve pencere boyunca
// yeni bağlantıyı reddeder. Bant: yön başına bayt (WS çerçeve başlığı tahminiyle).
//
// Komut satırı: npx tsx araclar/ag-simulatoru.ts <port> <hedef> <gecikme> <jitter> <kayip%>
//   ör. npx tsx araclar/ag-simulatoru.ts 2601 http://localhost:5173 150 20 2
import http from "node:http";
import { createRequire } from "node:module";
import type { Duplex } from "node:stream";

const require = createRequire(import.meta.url);

interface WsSoket {
  readyState: number;
  send(d: unknown, o: { binary: boolean }): void;
  terminate(): void;
  close(kod?: number): void;
  on(o: "message", f: (d: Buffer, ikili: boolean) => void): void;
  on(o: "close" | "open", f: () => void): void;
  on(o: "error", f: (e: Error) => void): void;
}
interface WsModulu {
  WebSocket: new (url: string, o: { headers: Record<string, string> }) => WsSoket;
  WebSocketServer: new (o: { noServer: boolean }) => { handleUpgrade(req: http.IncomingMessage, s: Duplex, h: Buffer, f: (ws: WsSoket) => void): void };
}
const ws = require("ws") as WsModulu;

export interface YonProfili { gecikme: number; jitter: number; kayip: number }
export interface AgProfili {
  ad: string;
  /** istemci → sunucu */
  yukari: YonProfili;
  /** sunucu → istemci */
  asagi: YonProfili;
  /** N6: ilk bağlantıdan `bas` ms sonra `sure` ms %100 kayıp */
  patlama?: { bas: number; sure: number };
}

export function simetrik(ad: string, gecikme: number, jitter: number, kayipYuzde: number): AgProfili {
  const y = { gecikme, jitter, kayip: kayipYuzde / 100 };
  return { ad, yukari: { ...y }, asagi: { ...y } };
}

/** TCP yeniden iletim cezası: Linux RTO tabanı 200 ms + yeniden gönderilen paketin yolu. */
const RTO_MS = 200;

class Hat {
  private son = 0;
  /** sıra korunur: tek kuyruk, tek zamanlayıcı (aynı ms'e düşen ayrı setTimeout'lar Node'da sırasız çalışabilir) */
  private kuyruk: { t: number; veri: Buffer; ikili: boolean }[] = [];
  private zamanlayici: ReturnType<typeof setTimeout> | null = null;
  bayt = 0;
  cerceve = 0;
  kayip = 0;
  constructor(private profil: () => YonProfili, private patlama: () => { bas: number; bit: number } | null, private hedef: () => WsSoket | null, private baslik: number) {}

  gonder(veri: Buffer, ikili: boolean): void {
    const p = this.profil();
    const simdi = Date.now();
    let t = simdi + p.gecikme + (p.jitter ? (Math.random() * 2 - 1) * p.jitter : 0);
    if (p.kayip > 0 && Math.random() < p.kayip) { t += RTO_MS + p.gecikme; this.kayip++; }
    const pt = this.patlama();
    if (pt && simdi >= pt.bas && simdi < pt.bit) { t = Math.max(t, pt.bit + RTO_MS + p.gecikme); this.kayip++; }
    t = Math.max(t, this.son, simdi);
    this.son = t;
    this.bayt += veri.length + (veri.length < 126 ? this.baslik : this.baslik + 2);
    this.cerceve++;
    this.kuyruk.push({ t, veri, ikili });
    this.planla();
  }

  private planla(): void {
    if (this.zamanlayici || !this.kuyruk.length) return;
    const bekle = Math.max(0, this.kuyruk[0]!.t - Date.now());
    this.zamanlayici = setTimeout(() => {
      this.zamanlayici = null;
      const simdi = Date.now();
      const h = this.hedef();
      while (this.kuyruk.length && this.kuyruk[0]!.t <= simdi) {
        const m = this.kuyruk.shift()!;
        if (h && h.readyState === 1) h.send(m.veri, { binary: m.ikili });
      }
      this.planla();
    }, bekle);
  }
}

export interface BaglantiIstatistigi { yol: string; sureMs: number; asagiBayt: number; yukariBayt: number; asagiCerceve: number; yukariCerceve: number; kayipCerceve: number; asagiKBs: number; yukariKBs: number }

export class AgSimulatoru {
  private sunucu: http.Server;
  private wss = new ws.WebSocketServer({ noServer: true });
  /** `oyun`: Colyseus oda bağlantısı (/<süreç>/<oda>); Vite HMR soketi kesmeden ve gecikmeden muaf (yoksa sayfa yenilenir) */
  private acik = new Set<{ ic: WsSoket; dis: WsSoket | null; oyun: boolean }>();
  private redBitis = 0;
  private baslangic = 0;
  readonly istatistik: BaglantiIstatistigi[] = [];
  private canli: { yol: string; bas: number; asagi: Hat; yukari: Hat }[] = [];

  constructor(readonly port: number, readonly hedef: string, public profil: AgProfili) {
    this.sunucu = http.createServer((req, res) => this.http(req, res));
    this.sunucu.on("upgrade", (req, soket, bas) => this.yukselt(req, soket as Duplex, bas));
  }

  baslat(): Promise<void> {
    return new Promise((coz) => this.sunucu.listen(this.port, "127.0.0.1", () => coz()));
  }

  kapat(): Promise<void> {
    for (const b of this.acik) { b.ic.terminate(); b.dis?.terminate(); }
    return new Promise((coz) => this.sunucu.close(() => coz()));
  }

  /** Bağlantıyı düşür ve `ms` boyunca yeni bağlantı kabul etme (kopma senaryosu). */
  kes(ms: number): void {
    this.redBitis = Date.now() + ms;
    for (const b of [...this.acik]) { if (!b.oyun) continue; b.ic.terminate(); b.dis?.terminate(); this.acik.delete(b); }
  }

  private patlamaPenceresi(): { bas: number; bit: number } | null {
    const p = this.profil.patlama;
    if (!p || !this.baslangic) return null;
    return { bas: this.baslangic + p.bas, bit: this.baslangic + p.bas + p.sure };
  }

  /** Canlı + kapanmış bağlantıların bant özeti. */
  bant(): BaglantiIstatistigi[] {
    const simdi = Date.now();
    const canli = this.canli.map((c) => this.ozet(c, simdi));
    return [...this.istatistik, ...canli];
  }

  private ozet(c: { yol: string; bas: number; asagi: Hat; yukari: Hat }, simdi: number): BaglantiIstatistigi {
    const sure = Math.max(1, simdi - c.bas);
    return {
      yol: c.yol, sureMs: sure, asagiBayt: c.asagi.bayt, yukariBayt: c.yukari.bayt, asagiCerceve: c.asagi.cerceve,
      yukariCerceve: c.yukari.cerceve, kayipCerceve: c.asagi.kayip + c.yukari.kayip,
      asagiKBs: c.asagi.bayt / 1024 / (sure / 1000), yukariKBs: c.yukari.bayt / 1024 / (sure / 1000),
    };
  }

  private http(req: http.IncomingMessage, res: http.ServerResponse): void {
    // sayfa ve varlıklar da bu vekilden gelir (aynı köken: CORS yok); gecikme yalnız oyun trafiğine (eşleştirme, API)
    const oyun = /^\/(matchmake|api)\//.test(req.url ?? "");
    const g = oyun ? this.profil.yukari.gecikme : 0;
    const gAsagi = oyun ? this.profil.asagi.gecikme : 0;
    const u = new URL(this.hedef);
    const govde: Buffer[] = [];
    req.on("data", (p: Buffer) => govde.push(p));
    req.on("end", () => {
      setTimeout(() => {
        const ist = http.request({ host: u.hostname, port: u.port, path: req.url, method: req.method, headers: req.headers }, (cev) => {
          const parca: Buffer[] = [];
          cev.on("data", (p: Buffer) => parca.push(p));
          cev.on("end", () => setTimeout(() => {
            res.writeHead(cev.statusCode ?? 502, cev.headers);
            res.end(Buffer.concat(parca));
          }, gAsagi));
        });
        ist.on("error", () => { res.writeHead(502); res.end(); });
        ist.end(Buffer.concat(govde));
      }, g);
    });
  }

  private yukselt(req: http.IncomingMessage, soket: Duplex, bas: Buffer): void {
    const oyun = /^\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?(\?|$)/.test(req.url ?? "");
    if (oyun && Date.now() < this.redBitis) { soket.destroy(); return; }
    this.wss.handleUpgrade(req, soket, bas, (ic) => {
      if (!this.baslangic) this.baslangic = Date.now();
      const u = new URL(this.hedef);
      const basliklar: Record<string, string> = {};
      if (req.headers.origin) basliklar["origin"] = String(req.headers.origin);
      const dis = new ws.WebSocket(`ws://${u.host}${req.url}`, { headers: basliklar });
      const kayit = { ic, dis: dis as WsSoket | null, oyun };
      this.acik.add(kayit);
      const sifir: YonProfili = { gecikme: 0, jitter: 0, kayip: 0 };
      const yukari = new Hat(() => (oyun ? this.profil.yukari : sifir), () => (oyun ? this.patlamaPenceresi() : null), () => dis, 6);
      const asagi = new Hat(() => (oyun ? this.profil.asagi : sifir), () => (oyun ? this.patlamaPenceresi() : null), () => ic, 2);
      const c = { yol: req.url ?? "", bas: Date.now(), asagi, yukari };
      this.canli.push(c);
      const bekleyen: { d: Buffer; b: boolean }[] = [];
      let acikMi = false;
      dis.on("open", () => { acikMi = true; for (const m of bekleyen) yukari.gonder(m.d, m.b); bekleyen.length = 0; });
      ic.on("message", (d, b) => { if (acikMi) yukari.gonder(d, b); else bekleyen.push({ d, b }); });
      dis.on("message", (d, b) => asagi.gonder(d, b));
      const bitir = () => {
        if (!this.canli.includes(c)) return;
        this.canli.splice(this.canli.indexOf(c), 1);
        this.istatistik.push(this.ozet(c, Date.now()));
        this.acik.delete(kayit);
        // kapanış da gecikmeyle gider (sıra korunsun)
        setTimeout(() => { try { ic.close(); } catch { /* */ } try { dis.close(); } catch { /* */ } }, this.profil.asagi.gecikme);
      };
      ic.on("close", bitir);
      dis.on("close", bitir);
      ic.on("error", () => bitir());
      dis.on("error", () => bitir());
    });
  }
}

// komut satırı
if (process.argv[1]?.endsWith("ag-simulatoru.ts")) {
  const [port, hedef, gecikme, jitter, kayip] = process.argv.slice(2);
  const s = new AgSimulatoru(Number(port ?? 2601), hedef ?? "http://localhost:5173", simetrik("cli", Number(gecikme ?? 150), Number(jitter ?? 20), Number(kayip ?? 2)));
  await s.baslat();
  console.log(`ag-simulatoru: 127.0.0.1:${s.port} → ${s.hedef} (${JSON.stringify(s.profil)})`);
}
