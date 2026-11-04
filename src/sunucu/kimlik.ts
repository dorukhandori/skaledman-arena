import { randomUUID } from "node:crypto";
import type { KatilmaSecenekleri } from "../ag/protokol.ts";

// Kimlik (axiom § 2 #22). D4: yalnız `KIMLIK_MODU=yerel` (geliştirme / Access arkasında test): katılmada `ad` + rastgele
// id. D5'te Kick OAuth: REST'te imzalı oturum çerezi, odada 60 s ömürlü HMAC bileti `onAuth`'ta doğrulanır.

export function kimlikModu(): "yerel" | "kick" {
  const m = process.env.KIMLIK_MODU ?? (process.env.NODE_ENV === "production" ? "kick" : "yerel");
  return m === "yerel" ? "yerel" : "kick";
}

const AD_DESENI = /^[\p{L}\p{N} _.-]{1,16}$/u;

export function kimlikDogrula(k: KatilmaSecenekleri): { id: string; ad: string } | null {
  if (kimlikModu() !== "yerel") return null; // Kick bileti D5
  const ad = k.ad.trim();
  if (!AD_DESENI.test(ad)) return null;
  return { id: randomUUID(), ad };
}

/**
 * Origin kontrolü (cross-site WS ele geçirmeye karşı). `IZINLI_KOKENLER` virgüllü liste; yoksa geliştirmede
 * localhost / 127.0.0.1 (her port) ve Origin'siz (Node test istemcisi) kabul, üretimde liste zorunlu.
 */
export function kokenIzinli(koken: string | null): boolean {
  const liste = (process.env.IZINLI_KOKENLER ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (liste.length) return koken !== null && liste.includes(koken);
  if (process.env.NODE_ENV === "production") return false;
  if (koken === null) return true;
  try {
    const u = new URL(koken);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
