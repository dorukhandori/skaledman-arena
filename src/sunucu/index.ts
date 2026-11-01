import { defineServer, defineRoom, monitor, playground } from "colyseus";
import { ArenaOdasi } from "./odalar/ArenaOdasi.ts";

// F0'da sunucu yalnız iskelettir; dövüş istemcide yerel simülasyonla çalışır.
// F1'de ArenaOdasi defineInput + setFixedTimestep(60) ile yetkili olur (docs/tech/mimari.md § 3).
export const server = defineServer({
  rooms: {
    arena: defineRoom(ArenaOdasi),
  },
  express: (app) => {
    if (process.env.NODE_ENV !== "production") {
      app.use("/playground", playground());
    }
    app.use("/monitor", monitor());
  },
});
