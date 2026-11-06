import { KazSema, MadenBaslaSema, MadenBitirSema } from "../../paylasilan/veri/harita.ts";
import { madenBasla, madenBitir, madenKaz } from "../oyuncu/maden.ts";
import { basarimMadenOlaylari } from "../oyuncu/haritaBasarim.ts";
import { type Uygulama, yaz, yazimGirisi } from "./ortak.ts";

// Kazı seansı uçları (docs/design/harita/08 § 4, § 6): basla · kaz · bitir. Oturum + Origin + zod; sunucu yetkili.

export function madenRotalariKur(app: Uygulama): void {
  app.post("/api/maden/basla", async (q, r) => {
    const g = await yazimGirisi(q, r, MadenBaslaSema);
    if (!g) return;
    const s = madenBasla(g.d, g.id, g.b.dugum, Date.now());
    if (!s.ok) { yaz(r, s.hata === "yok" ? 404 : s.hata === "kapali" ? 403 : 409, s); return; }
    const { ok: _ok, ...v } = s;
    yaz(r, 201, v);
  });

  app.post("/api/maden/kaz", async (q, r) => {
    const g = await yazimGirisi(q, r, KazSema);
    if (!g) return;
    const simdi = Date.now();
    const s = madenKaz(g.d, g.id, g.b, simdi);
    if (!s.ok) { yaz(r, s.hata === "seans" ? 404 : s.hata === "erken" ? 429 : 409, s); return; }
    const { ok: _ok, olaylar, ...v } = s;
    yaz(r, 200, { ...v, yeniBasarimlar: basarimMadenOlaylari(g.d, g.id, olaylar, simdi) });
  });

  app.post("/api/maden/bitir", async (q, r) => {
    const g = await yazimGirisi(q, r, MadenBitirSema);
    if (!g) return;
    const s = madenBitir(g.d, g.id, g.b.seans);
    if (!s.ok) { yaz(r, 404, s); return; }
    yaz(r, 200, { ozet: s.ozet });
  });
}
