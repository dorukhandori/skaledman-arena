import { defineConfig } from "vite";
import { colyseus } from "colyseus/vite";

// Tek vite süreci: istemci + Colyseus sunucusu (docs/tech/mimari.md § 1, K-9).
// Üretim: `vite build --app` → dist/client + dist/server/server.mjs
export default defineConfig({
  plugins: [
    colyseus({
      serverEntry: "/src/sunucu/index.ts",
      // Üretim portu yapı sırasında gömülür (dist/server/server.mjs `listen(port)`): VPS'te 2567'yi WyrmWar tutar,
      // bu yüzden deploy/kur.sh `SUNUCU_PORT=2568` ile derler. Geliştirmede varsayılan 2567.
      port: Number(process.env.SUNUCU_PORT ?? 2567),
      serveClient: true,
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    // MOBIL-1: `npm run dev:ag` (vite --host) yerel ağa açar; IP ile gelen telefon her zaman kabul. Ad ile gelen tünel
    // (ör. Cloudflare Tunnel *.trycloudflare.com) için: DEV_EK_HOSTLAR=abc.trycloudflare.com npm run dev:ag
    // (o zaman IZINLI_KOKENLER=https://abc.trycloudflare.com,http://localhost:5173 de verilir; README › Telefonla deneme)
    allowedHosts: (process.env.DEV_EK_HOSTLAR ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    // SQLite dosyası (.veri/) değişince sayfa yenilenmesin
    watch: { ignored: ["**/.veri/**", "**/*.sqlite*"] },
  },
  // D5: better-sqlite3 (yerel modül) sunucu paketine gömülmez: colyseus/vite eklentisi sunucu ortamında (`colyseus`)
  // tüm bağımlılıkları zaten dışlar (`resolve.external: true`); ayrıca `ssr` ortamı tanımlanmaz (html girdisi hatası).
});
