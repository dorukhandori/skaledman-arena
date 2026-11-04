// express tipleri kurulu değil: yalnız kullandığımız yüzey
interface Request { params: Record<string, string | undefined> }
interface Response { json(v: unknown): void; set(k: string, v: string): void }
import { defineRoom, defineServer, monitor, playground } from "colyseus";
import { PROTOKOL_SURUMU, odaKoduCoz } from "../ag/protokol.ts";
import { KATALOG_OZETI } from "../ag/katalog.ts";
import { MacOdasi } from "./odalar/MacOdasi.ts";
import { acikOdaSayisi, kodDurumu } from "./odaKayit.ts";
import { olcumler } from "./olcum.ts";
import { kimlikModu } from "./kimlik.ts";

// Devran sunucusu (D4): yetkili maç odası + küçük HTTP uçları. Üretimde 127.0.0.1:2567 (Cloudflare Tunnel arkası),
// geliştirmede Vite'ın HTTP sunucusuna bağlı (colyseus/vite eklentisi).
export const server = defineServer({
  rooms: {
    // "hizli" genel odalarda moda göre eşleşir; "oda" ve "antrenman" özel (kodla / tek kişilik)
    mac: defineRoom(MacOdasi).filterBy(["mod"]),
  },
  express: (app) => {
    app.get("/api/saglik", (_req: Request, res: Response) => {
      res.json({ ok: true, protokol: PROTOKOL_SURUMU, katalog: KATALOG_OZETI, kimlik: kimlikModu(), odalar: acikOdaSayisi() });
    });
    app.get("/api/oda/:kod", (req: Request, res: Response) => {
      const kod = odaKoduCoz(String(req.params.kod ?? ""));
      res.set("Access-Control-Allow-Origin", "*");
      res.json({ durum: kod ? kodDurumu(kod) : "yok" });
    });
    if (process.env.NODE_ENV !== "production") {
      app.get("/api/olcum", (_req: Request, res: Response) => { res.set("Access-Control-Allow-Origin", "*"); res.json(olcumler()); });
      app.use("/playground", playground());
      app.use("/monitor", monitor());
    }
  },
});
