import { Room, type Client } from "colyseus";
import { schema, t, type SchemaType } from "@colyseus/schema";

// İskelet oda. Yetkili maç odası D4'te `MacOdasi.ts` olarak gelir (defineInput, setFixedTimestep 60 Hz, tahmin A).
export const ArenaDurumu = schema({
  faz: t.string(),
  oyuncuSayisi: t.uint8(),
});
export type ArenaDurumu = SchemaType<typeof ArenaDurumu>;

export class ArenaOdasi extends Room<{ state: ArenaDurumu }> {
  state = new ArenaDurumu();
  maxClients = 2;

  onCreate() {
    this.state.faz = "bekliyor";
    this.state.oyuncuSayisi = 0;
  }

  onJoin(client: Client) {
    this.state.oyuncuSayisi++;
    console.log("[arena] katıldı", client.sessionId);
  }

  onLeave(client: Client) {
    this.state.oyuncuSayisi = Math.max(0, this.state.oyuncuSayisi - 1);
    console.log("[arena] ayrıldı", client.sessionId);
  }
}
