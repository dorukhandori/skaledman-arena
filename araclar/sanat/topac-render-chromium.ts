// GU-C: topaç parçalarının veri geçişli render'ı, başsız Chromium (SwiftShader WebGL2) ile. Blender betiği
// (`blender/topac_render.py`) ile aynı çıktı sözleşmesi, böylece `topac-uret.ts` pişirmesi değişmeden okur:
//   <k>_n.png  RGB = normal * 0,5 + 0,5 (z yukarı dünya uzayı; ışık yok)
//   <k>_v.png  R = sınıf / 16, G = (kamera derinliği − 120) / 160, A = kapsama
// Geometri Atölye 3B'nin parametrik modelinden (src/istemci/atolye3d/geometri.ts, kaynak/topac/parcalar-3b.json) gelir:
// menüdeki 3B parça ile maç sprite'ı aynı ağdan çıkar. Ortografik kamera, kenar yumuşatma kapalı (×4 süper örnek Node'da
// çoğunluk oyuyla iner). Normaller "auto smooth" taklidi: köşe normali yüz normalinden `puruzAci`'dan (vars. 40°) çok
// sapıyorsa yüz normali (sırtlar ve pahlar keskin okunur).
// 8 bit kanal yeterli: normal ×4 alt örnek ortalamasıyla iner, sınıf tam, derinlik 0,63 birim (iç çizgi eşiği 3 birim).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { parcaGeometrisi, type Parca3B } from "../../src/istemci/atolye3d/geometri.ts";

interface PwSayfa {
  setContent(html: string): Promise<void>;
  evaluate<R, A>(f: (a: A) => R | Promise<R>, arg: A): Promise<R>;
  on(olay: "console", f: (m: { type(): string; text(): string }) => void): void;
}
interface PwTarayici { newPage(): Promise<PwSayfa>; close(): Promise<void> }
const require = createRequire(import.meta.url);
function playwright(): { chromium: { launch(o: { args: string[] }): Promise<PwTarayici> } } {
  try {
    return require("playwright") as ReturnType<typeof playwright>;
  } catch {
    // ortamda global kurulu (NODE_PATH=/opt/node-tools/node_modules)
    return require("/opt/node-tools/node_modules/playwright") as ReturnType<typeof playwright>;
  }
}

export interface RenderAyar {
  parcalar: string[];
  specler: Record<string, Parca3B & { ikonAci?: number }>;
  cikti: string;
  inceKare: number;
  /** tür başına yatay (x, y) ölçek; normal buna göre düzeltilir */
  xyOlcek?: Record<string, number>;
  superOrnek: number;
  kamera: { yukselti: number; kareBirim: number; kareW: number; kareH: number; capaX: number; capaY: number };
  ikonlar: { ad: string; kare: number; yukselti: number; kareBirim: Record<string, number>; capaDy: Record<string, number> }[];
}

/** Geometri: z yukarı köşe konumu + keskin kenarlı normal + sınıf (üçgen başına sabit). */
function agHazirla(spec: Parca3B, ayna: boolean, xy = 1): { p: Float32Array; n: Float32Array; c: Float32Array } {
  const g = parcaGeometrisi(spec, ayna, spec.torna ? { nTh: 180, nT: 0 } : { nTh: 360, nT: 56 });
  const esik = Math.cos(((spec.puruzAci ?? 40) * Math.PI) / 180);
  const p = new Float32Array(g.kose * 3), n = new Float32Array(g.kose * 3);
  // geometri y yukarı (x, z, −y) → z yukarı (x, −z_g, y_g)
  for (let i = 0; i < g.kose; i++) {
    p[i * 3] = g.konum[i * 3]! * xy; p[i * 3 + 1] = -g.konum[i * 3 + 2]! * xy; p[i * 3 + 2] = g.konum[i * 3 + 1]!;
    // ölçekli yüzeyin normali: (nx/s, ny/s, nz) normalize
    const nx = g.normal[i * 3]! / xy, ny = -g.normal[i * 3 + 2]! / xy, nz = g.normal[i * 3 + 1]!;
    const u = Math.hypot(nx, ny, nz) || 1;
    n[i * 3] = nx / u; n[i * 3 + 1] = ny / u; n[i * 3 + 2] = nz / u;
  }
  for (let t = 0; t < g.kose; t += 3) {
    const a = t * 3, b = a + 3, d = a + 6;
    const ux = p[b]! - p[a]!, uy = p[b + 1]! - p[a + 1]!, uz = p[b + 2]! - p[a + 2]!;
    const vx = p[d]! - p[a]!, vy = p[d + 1]! - p[a + 1]!, vz = p[d + 2]! - p[a + 2]!;
    let fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const fu = Math.hypot(fx, fy, fz);
    if (fu < 1e-12) continue;
    fx /= fu; fy /= fu; fz /= fu;
    // yüz normalini köşe normallerinin yönüne çevir (sarım ne olursa olsun dışa baksın)
    const ort = n[a]! + n[b]! + n[d]!, orty = n[a + 1]! + n[b + 1]! + n[d + 1]!, ortz = n[a + 2]! + n[b + 2]! + n[d + 2]!;
    if (fx * ort + fy * orty + fz * ortz < 0) { fx = -fx; fy = -fy; fz = -fz; }
    for (const k of [a, b, d]) {
      if (n[k]! * fx + n[k + 1]! * fy + n[k + 2]! * fz < esik) { n[k] = fx; n[k + 1] = fy; n[k + 2] = fz; }
    }
  }
  const c = new Float32Array(g.kose);
  c.set(g.sinif);
  return { p, n, c };
}

const b64 = (a: Float32Array): string => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");

// Sayfa tarafı: WebGL2, iki geçiş (normal / veri), N açı tek tuvalde ızgara; PNG dataURL döner.
const SAYFA = `<!doctype html><html><body><canvas id="t"></canvas><script>
const tv = document.getElementById("t");
const gl = tv.getContext("webgl2", { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true, alpha: true });
const vs = \`#version 300 es
in vec3 p; in vec3 n; in float c;
uniform float aci, e, birim, cx, cy, W, H; uniform vec4 hucre; uniform vec2 tuval;
out vec3 vn; out float vc; out float vd;
void main() {
  float ca = cos(aci), sa = sin(aci);
  vec3 q = vec3(p.x * ca - p.y * sa, p.x * sa + p.y * ca, p.z);
  vn = vec3(n.x * ca - n.y * sa, n.x * sa + n.y * ca, n.z);
  vc = c;
  vec3 u = vec3(0.0, sin(e), cos(e));
  vec3 d = vec3(0.0, cos(e), -sin(e));
  float px = cx + q.x / birim;          // kare pikseli (sol üst 0,0)
  float py = cy - dot(q, u) / birim;
  float derin = 200.0 + dot(q, d);
  vd = (derin - 120.0) / 160.0;
  vec2 t = hucre.xy + vec2(px, py) / vec2(W, H) * hucre.zw; // tuval pikseli
  gl_Position = vec4(t.x / tuval.x * 2.0 - 1.0, 1.0 - t.y / tuval.y * 2.0, vd * 2.0 - 1.0, 1.0);
}\`;
const fs = \`#version 300 es
precision highp float;
in vec3 vn; in float vc; in float vd; uniform int kip; out vec4 o;
void main() {
  if (kip == 0) { vec3 nn = normalize(vn); o = vec4(nn * 0.5 + 0.5, 1.0); }
  else o = vec4(vc / 16.0, vd, 0.0, 1.0);
}\`;
function sh(t, s) { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
gl.useProgram(pr);
const U = (a) => gl.getUniformLocation(pr, a);
const bufs = {};
function nitelik(ad, b, k) { let x = bufs[ad]; if (!x) { x = bufs[ad] = gl.createBuffer(); } const l = gl.getAttribLocation(pr, ad); gl.bindBuffer(gl.ARRAY_BUFFER, x); gl.bufferData(gl.ARRAY_BUFFER, b, gl.STATIC_DRAW); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, k, gl.FLOAT, false, 0, 0); }
const f32 = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Float32Array(u.buffer); };
let adet = 0;
window.agYukle = (a) => { const p = f32(a.p); nitelik("p", p, 3); nitelik("n", f32(a.n), 3); nitelik("c", f32(a.c), 1); adet = p.length / 3; return adet; };
// is: { acilar[], sutun, e, birim, W, H, cx, cy, ss } → [normal dataURL, veri dataURL]
window.ciz = (is) => {
  const hw = is.W * is.ss, hh = is.H * is.ss;
  const satir = Math.ceil(is.acilar.length / is.sutun);
  tv.width = is.sutun * hw; tv.height = satir * hh;
  gl.viewport(0, 0, tv.width, tv.height);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
  gl.uniform1f(U("e"), is.e); gl.uniform1f(U("birim"), is.birim); gl.uniform1f(U("cx"), is.cx); gl.uniform1f(U("cy"), is.cy);
  gl.uniform1f(U("W"), is.W); gl.uniform1f(U("H"), is.H); gl.uniform2f(U("tuval"), tv.width, tv.height);
  const sonuc = [];
  for (const kip of [0, 1]) {
    gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1i(U("kip"), kip);
    is.acilar.forEach((a, i) => {
      const x = (i % is.sutun) * hw, y = Math.floor(i / is.sutun) * hh;
      gl.uniform1f(U("aci"), a);
      gl.uniform4f(U("hucre"), x, y, hw, hh);
      // hücre dışına taşmasın
      gl.enable(gl.SCISSOR_TEST); gl.scissor(x, tv.height - y - hh, hw, hh);
      gl.drawArrays(gl.TRIANGLES, 0, adet);
      gl.disable(gl.SCISSOR_TEST);
    });
    gl.finish();
    sonuc.push(tv.toDataURL("image/png"));
  }
  return sonuc;
};
window.hazir = !!gl;
</script></body></html>`;

/** Tüm parçaları render eder (oyun görünümü 32 ince açı + ikon görünümleri), `cikti/<tur>/<id>/<yon>/NN_{n,v}.png`. */
export async function chromiumRender(A: RenderAyar): Promise<void> {
  const tarayici = await playwright().chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  try {
    const s = await tarayici.newPage();
    const hata: string[] = [];
    s.on("console", (m) => { if (m.type() === "error") hata.push(m.text()); });
    await s.setContent(SAYFA);
    if (!(await s.evaluate(() => (window as unknown as { hazir: boolean }).hazir, null))) throw new Error(`WebGL2 yok: ${hata.join("; ")}`);
    const K = A.kamera;
    for (const id of A.parcalar) {
      const spec = A.specler[id];
      if (!spec) continue;
      const yonler: ("s" | "l")[] = spec.kiral ? ["s", "l"] : ["s"];
      const periyot = (2 * Math.PI) / spec.simetri;
      const gorunumler = [
        { ad: "oyun", e: K.yukselti, birim: K.kareBirim, W: K.kareW, H: K.kareH, cx: K.capaX, cy: K.capaY, adet: A.inceKare },
        ...A.ikonlar.map((ik) => ({ ad: ik.ad, e: ik.yukselti, birim: ik.kareBirim[spec.tur]!, W: ik.kare, H: ik.kare, cx: ik.kare / 2, cy: ik.kare / 2 + ik.capaDy[spec.tur]!, adet: 1 })),
      ];
      for (const yon of yonler) {
        let yuklu = -1;
        for (const g of gorunumler) {
          // yatay ölçek yalnız maç sprite'ında; ikonlar Atölye 3B oranında kalır
          const xy = g.ad === "oyun" ? A.xyOlcek?.[spec.tur] ?? 1 : 1;
          if (xy !== yuklu) {
            const ag = agHazirla(spec, yon === "l", xy);
            await s.evaluate((a) => (window as unknown as { agYukle(x: unknown): number }).agYukle(a), { p: b64(ag.p), n: b64(ag.n), c: b64(ag.c) });
            yuklu = xy;
          }
          const ek = g.ad === "oyun" ? 0 : ((spec.ikonAci ?? 0) * Math.PI) / 180;
          const acilar = Array.from({ length: g.adet }, (_, k) => { const a = (k * periyot) / A.inceKare; return (yon === "s" ? -a : a) + ek; });
          const sutun = Math.min(8, acilar.length);
          const [nUrl, vUrl] = await s.evaluate((is) => (window as unknown as { ciz(x: unknown): string[] }).ciz(is), {
            acilar, sutun, e: (g.e * Math.PI) / 180, birim: g.birim, W: g.W, H: g.H, cx: g.cx, cy: g.cy, ss: A.superOrnek,
          });
          const klasor = join(A.cikti, spec.tur, id, g.ad === "oyun" ? yon : `${g.ad}-${yon}`);
          mkdirSync(klasor, { recursive: true });
          const hw = g.W * A.superOrnek, hh = g.H * A.superOrnek;
          for (const [son, url] of [["n", nUrl!], ["v", vUrl!]] as const) {
            const buf = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
            for (let k = 0; k < acilar.length; k++) {
              const parca = await sharp(buf).extract({ left: (k % sutun) * hw, top: Math.floor(k / sutun) * hh, width: hw, height: hh }).png({ compressionLevel: 1 }).toBuffer();
              writeFileSync(join(klasor, `${String(k).padStart(2, "0")}_${son}.png`), parca);
            }
          }
        }
      }
      console.log("PARCA", id, yonler.join("+"));
    }
    if (hata.length) throw new Error(`Chromium konsol hatası: ${hata.join("; ")}`);
  } finally {
    await tarayici.close();
  }
}
