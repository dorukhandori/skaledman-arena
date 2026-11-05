import type { IncomingMessage, ServerResponse } from "node:http";
import { type Depo, depo } from "../db/depo.ts";
import { OTURUM_CEREZI, cerezleriCoz, kokenIzinli, oturumCereziCoz } from "../kimlik.ts";

// REST ortak yardımcıları (rotalar.ts, atolye.ts). Express 5 (Colyseus `defineServer.express`) üstünde; express tipleri
// kurulu değil, yalnız kullandığımız yüzey.

export type Istek = IncomingMessage & { params: Record<string, string | undefined>; query: Record<string, unknown>; body?: unknown };
export type Yanit = ServerResponse & { json(v: unknown): void; status(k: number): Yanit; set(k: string, v: string): void };
type Isleyici = (q: Istek, r: Yanit) => void | Promise<void>;
export interface Uygulama {
  get(yol: string, f: Isleyici): void;
  post(yol: string, f: Isleyici): void;
  put(yol: string, f: Isleyici): void;
  patch(yol: string, f: Isleyici): void;
  delete(yol: string, f: Isleyici): void;
}

export async function govdeOku(q: Istek): Promise<unknown> {
  if (q.body && typeof q.body === "object") return q.body;
  const parcalar: Buffer[] = [];
  let boy = 0;
  for await (const p of q as AsyncIterable<Buffer>) {
    boy += p.length;
    if (boy > 16 * 1024) throw new Error("govde");
    parcalar.push(p);
  }
  const metin = Buffer.concat(parcalar).toString("utf8");
  return metin ? JSON.parse(metin) : {};
}

export function ip(q: Istek): string {
  if (process.env.GUVENILIR_VEKIL === "1") {
    const h = q.headers["cf-connecting-ip"] ?? q.headers["x-forwarded-for"];
    const v = Array.isArray(h) ? h[0] : h;
    if (v) return v.split(",")[0]!.trim();
  }
  return q.socket.remoteAddress ?? "?";
}

export function oturumId(q: Istek): string | null {
  return oturumCereziCoz(cerezleriCoz(q.headers.cookie)[OTURUM_CEREZI]);
}

/** Geçerli oturumun oyuncusu. */
export function oturumdakiOyuncu(q: Istek, d: Depo = depo()): number | null {
  const id = oturumId(q);
  return id ? d.oturumOyuncusu(id, Date.now()) : null;
}

/** Yazım uçları: Origin izinli olmalı (CSRF; SameSite=Lax'a ek). */
export function kokenTamam(q: Istek, r: Yanit): boolean {
  const o = q.headers.origin;
  if (kokenIzinli(typeof o === "string" ? o : null)) return true;
  r.status(403).json({ hata: "koken" });
  return false;
}

export function yaz(r: Yanit, kod: number, v: unknown): void {
  r.setHeader("Cache-Control", "no-store");
  r.status(kod).json(v);
}

/** Yazım ucu girişi: Origin + oturum + gövde şeması. Başarısızsa yanıtı yazar ve null döner. */
export async function yazimGirisi<T>(q: Istek, r: Yanit, sema: { parse(v: unknown): T }): Promise<{ id: number; d: Depo; b: T } | null> {
  if (!kokenTamam(q, r)) return null;
  const d = depo();
  const id = oturumdakiOyuncu(q, d);
  if (id === null) { yaz(r, 401, { hata: "oturum" }); return null; }
  let b: T;
  try { b = sema.parse(await govdeOku(q)); } catch { yaz(r, 400, { hata: "bicim" }); return null; }
  return { id, d, b };
}
