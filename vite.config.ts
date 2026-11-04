import { defineConfig } from "vite";
import { colyseus } from "colyseus/vite";

// Tek vite süreci: istemci + Colyseus sunucusu (docs/tech/mimari.md § 1, K-9).
// Üretim: `vite build --app` → dist/client + dist/server/server.mjs
export default defineConfig({
  plugins: [
    colyseus({
      serverEntry: "/src/sunucu/index.ts",
      port: 2567,
      serveClient: true,
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    // SQLite dosyası (.veri/) değişince sayfa yenilenmesin
    watch: { ignored: ["**/.veri/**", "**/*.sqlite*"] },
  },
  // D5: better-sqlite3 (yerel modül) sunucu paketine gömülmez: colyseus/vite eklentisi sunucu ortamında (`colyseus`)
  // tüm bağımlılıkları zaten dışlar (`resolve.external: true`); ayrıca `ssr` ortamı tanımlanmaz (html girdisi hatası).
});
