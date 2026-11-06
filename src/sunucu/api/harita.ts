import { z } from "zod";
import { GitSema, SandikAcSema } from "../../paylasilan/veri/harita.ts";
import { depo } from "../db/depo.ts";
import { haritaGit, haritaGorunumu, sandikAc } from "../oyuncu/harita.ts";
import { basarimHaritaOlaylari } from "../oyuncu/haritaBasarim.ts";
import { type Uygulama, oturumdakiOyuncu, yaz, yazimGirisi } from "./ortak.ts";

// Harita uçları (docs/design/harita/08 § 4, 13 § 4.2): GET /api/harita, POST /api/harita/git (yürüme, KEŞFET),
// POST /api/harita/sandik, PATCH /api/profil (karakter). Hepsi oturum ister (misafir haritayı görmez); yazımlar Origin
// + zod; sunucu yetkili (istemci yalnız düğüm kimliği yollar).

const ProfilYamaSema = z.object({ karakter: z.number().int().min(0).max(3).optional(), cerceve: z.string().max(40).nullable().optional() })
  .refine((o) => o.karakter !== undefined || o.cerceve !== undefined);

/** Yürüme hız sınırı: oyuncu başına saniyede 10 istek (dolaşma ödülsüz; yalnız kötüye kullanım kesici). */
const gitPencere = new Map<number, number[]>();
export function gitIzinli(id: number, simdi: number): boolean {
  const s = (gitPencere.get(id) ?? []).filter((t) => simdi - t < 1000);
  if (s.length >= 10) { gitPencere.set(id, s); return false; }
  s.push(simdi);
  gitPencere.set(id, s);
  return true;
}

export function haritaRotalariKur(app: Uygulama): void {
  app.get("/api/harita", (q, r) => {
    const d = depo();
    const id = oturumdakiOyuncu(q, d);
    if (id === null) { yaz(r, 401, { hata: "oturum" }); return; }
    yaz(r, 200, d.islem(() => haritaGorunumu(d, id, Date.now())));
  });

  app.post("/api/harita/git", async (q, r) => {
    const g = await yazimGirisi(q, r, GitSema);
    if (!g) return;
    const simdi = Date.now();
    if (!gitIzinli(g.id, simdi)) { yaz(r, 429, { hata: "cok" }); return; }
    const s = haritaGit(g.d, g.id, g.b.dugum, simdi);
    if (!s.ok) { yaz(r, s.hata === "yok" ? 404 : s.hata === "kapali" ? 403 : 409, s); return; }
    const basarimlar = basarimHaritaOlaylari(g.d, g.id, s.olaylar, simdi);
    yaz(r, 200, { konum: s.konum, yol: s.yol, asama: s.asama, yeniAsama: s.yeniAsama, acilan: s.acilan, yeniBasarimlar: basarimlar });
  });

  app.post("/api/harita/sandik", async (q, r) => {
    const g = await yazimGirisi(q, r, SandikAcSema);
    if (!g) return;
    const simdi = Date.now();
    const s = sandikAc(g.d, g.id, g.b.dugum, simdi);
    if (!s.ok) { yaz(r, s.hata === "yok" ? 404 : s.hata === "tur" ? 400 : s.hata === "kapali" ? 403 : 409, s); return; }
    const basarimlar = basarimHaritaOlaylari(g.d, g.id, s.olaylar, simdi);
    console.log(`[harita] sandık: oyuncu ${g.id} ${g.b.dugum} +${s.altin}`);
    yaz(r, 200, { altin: s.altin, cevher: s.cevher, bakiye: s.bakiye, acilan: s.acilan, yeniBasarimlar: basarimlar, harita: haritaGorunumu(g.d, g.id, simdi) });
  });

  /** Profil yaması (13 § 2.1, 08 § 4): karakter gövdesi 0–3; çerçeve yalnız sahip olunan görünüm (null = yok). */
  app.patch("/api/profil", async (q, r) => {
    const g = await yazimGirisi(q, r, ProfilYamaSema);
    if (!g) return;
    if (g.b.cerceve) {
      const sahip = g.d.gorunumler(g.id).some((x) => x.gorunum_id === g.b.cerceve && x.gorunum_id.startsWith("cerceve-"));
      if (!sahip) { yaz(r, 403, { hata: "sahipDegil" }); return; }
    }
    if (g.b.karakter !== undefined) g.d.karakterYaz(g.id, g.b.karakter);
    if (g.b.cerceve !== undefined) g.d.cerceveYaz(g.id, g.b.cerceve);
    yaz(r, 200, { ok: true });
  });
}
