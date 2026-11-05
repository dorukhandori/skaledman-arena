// express tipleri kurulu değil: yalnız kullandığımız yüzey
interface Request { params: Record<string, string | undefined> }
interface Response { json(v: unknown): void; set(k: string, v: string): void }
import { defineRoom, defineServer, monitor, playground } from "colyseus";
import { odaKoduCoz } from "../ag/protokol.ts";
import { MacOdasi } from "./odalar/MacOdasi.ts";
import { IzleOdasi } from "./odalar/IzleOdasi.ts";
import { kodDurumu } from "./odaKayit.ts";
import { yayinBul } from "./izleKayit.ts";
import { olcumler } from "./olcum.ts";
import { kimlikAyarlariniDenetle } from "./kimlik.ts";
import { type Uygulama, rotalariKur } from "./api/rotalar.ts";
import { depo } from "./db/depo.ts";

// Devran sunucusu: yetkili maç odası + HTTP uçları (D5: kayıt/giriş, oturum çerezi, oda bileti, profil, ilk Çekirdek,
// SQLite). Üretimde 127.0.0.1:2567 (Cloudflare Tunnel arkası), geliştirmede Vite'ın HTTP sunucusuna bağlı.
// Eksik ortamda açılışta açık hata (kimlikAyarlariniDenetle); SQLite göçleri açılışta uygulanır.
kimlikAyarlariniDenetle();
depo();

export const server = defineServer({
  rooms: {
    // "hizli" genel odalarda moda göre eşleşir; "oda" ve "antrenman" özel (kodla / tek kişilik)
    mac: defineRoom(MacOdasi).filterBy(["mod"]),
    // D8 seyirci: yayın kodu başına tek oda (en çok 50 seyirci)
    izle: defineRoom(IzleOdasi).filterBy(["kod"]),
  },
  express: (app) => {
    rotalariKur(app as unknown as Uygulama);
    app.get("/api/oda/:kod", (req: Request, res: Response) => {
      const kod = odaKoduCoz(String(req.params.kod ?? ""));
      res.set("Access-Control-Allow-Origin", "*");
      res.json({ durum: kod ? kodDurumu(kod) : "yok" });
    });
    // D8 seyirci: oda kodu ya da yayın kodu → yayın kodu (seyirci odası bu kodla süzülür)
    app.get("/api/izle/:kod", (req: Request, res: Response) => {
      const kod = odaKoduCoz(String(req.params.kod ?? ""));
      const y = kod ? yayinBul(kod) : null;
      res.set("Access-Control-Allow-Origin", "*");
      res.json(y ? { durum: "var", kod: y.kod } : { durum: "yok" });
    });
    if (process.env.NODE_ENV !== "production") {
      app.get("/api/olcum", (_req: Request, res: Response) => { res.set("Access-Control-Allow-Origin", "*"); res.json(olcumler()); });
      app.use("/playground", playground());
      app.use("/monitor", monitor());
    }
  },
});
