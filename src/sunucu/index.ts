import { defineServer, defineRoom, monitor, playground } from "colyseus";
import { ArenaOdasi } from "./odalar/ArenaOdasi.ts";

// D1'de sunucu yalnız iskelettir; Topaç Lab istemcide yerel simülasyonla çalışır.
// D4'te yetkili MacOdasi (defineInput + setFixedTimestep 60 Hz) eklenir.
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
