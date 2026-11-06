import { DovSema, EritSema, ParcaEritSema, ParcaUretSema, VitrinSema } from "../../paylasilan/veri/harita.ts";
import { depo } from "../db/depo.ts";
import { dovYap, eritYap, ocakGorunumu, parcaErit, parcaUret, vitrinYaz } from "../oyuncu/ocak.ts";
import { basarimOcakOlaylari, basarimVitrin } from "../oyuncu/haritaBasarim.ts";
import { type Uygulama, oturumdakiOyuncu, yaz, yazimGirisi } from "./ortak.ts";

// Ocak uçları (docs/design/harita/08 § 4, 12 § 10): GET /api/ocak, POST erit · dov · parca · parca-erit, PATCH vitrin.

const kod = (h: string): number => (h === "altin" ? 402 : h === "kilitli" || h === "kapali" ? 403 : h === "yok" ? 404 : 409);

export function ocakRotalariKur(app: Uygulama): void {
  app.get("/api/ocak", (q, r) => {
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    yaz(r, 200, ocakGorunumu(d, id));
  });

  app.post("/api/ocak/erit", async (q, r) => {
    const g = await yazimGirisi(q, r, EritSema);
    if (!g) return;
    const simdi = Date.now();
    const s = eritYap(g.d, g.id, g.b, simdi);
    if (!s.ok) { yaz(r, kod(s.hata), s); return; }
    const { ok: _o, olaylar, ...v } = s;
    yaz(r, 200, { ...v, yeniBasarimlar: basarimOcakOlaylari(g.d, g.id, olaylar, simdi) });
  });

  app.post("/api/ocak/dov", async (q, r) => {
    const g = await yazimGirisi(q, r, DovSema);
    if (!g) return;
    const simdi = Date.now();
    const s = dovYap(g.d, g.id, g.b, simdi);
    if (!s.ok) { yaz(r, kod(s.hata), s); return; }
    const { ok: _o, olaylar, ...v } = s;
    yaz(r, 201, { ...v, yeniBasarimlar: basarimOcakOlaylari(g.d, g.id, olaylar, simdi) });
  });

  app.post("/api/ocak/parca", async (q, r) => {
    const g = await yazimGirisi(q, r, ParcaUretSema);
    if (!g) return;
    const simdi = Date.now();
    const s = parcaUret(g.d, g.id, g.b, simdi);
    if (!s.ok) { yaz(r, kod(s.hata), s); return; }
    const { ok: _o, olaylar, ...v } = s;
    console.log(`[ocak] parça: oyuncu ${g.id} ${s.parca.tanim} K${s.parca.malzeme} No.${s.parca.seri}${s.parca.usta ? " usta" : ""}`);
    yaz(r, 201, { ...v, yeniBasarimlar: basarimOcakOlaylari(g.d, g.id, olaylar, simdi) });
  });

  app.post("/api/ocak/parca-erit", async (q, r) => {
    const g = await yazimGirisi(q, r, ParcaEritSema);
    if (!g) return;
    const s = parcaErit(g.d, g.id, g.b, Date.now());
    if (!s.ok) { yaz(r, kod(s.hata), s); return; }
    const { ok: _o, ...v } = s;
    yaz(r, 200, v);
  });

  app.patch("/api/vitrin", async (q, r) => {
    const g = await yazimGirisi(q, r, VitrinSema);
    if (!g) return;
    const s = vitrinYaz(g.d, g.id, g.b.parcalar);
    if (!s.ok) { yaz(r, 403, s); return; }
    yaz(r, 200, { ok: true, vitrin: s.vitrin, yeniBasarimlar: basarimVitrin(g.d, g.id, s.vitrin.length, Date.now()) });
  });
}
