import { Room, type Client } from "@colyseus/core";
import { schema, t, type SchemaType } from "@colyseus/schema";

// İskelet oda (F0). Durum şeması ve girdi tanımı F1'de src/paylasilan/Durum.ts'e taşınır.
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
