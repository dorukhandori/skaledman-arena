import {
  Box3, BufferAttribute, BufferGeometry, FrontSide, Group, Mesh, NearestFilter, OrthographicCamera, PlaneGeometry, Raycaster,
  RGBAFormat, Scene, ShaderMaterial, UnsignedByteType, Vector2, WebGLRenderTarget, WebGLRenderer, type Object3D,
} from "three";
import { ARALIK, BOS_OLCU, type GorunumDurumu, KATMAN_SIRASI, type KatmanOlcusu, type KatmanTuru, ilkDurum, katmanKaymasi, patlatilmisTabanlar, yumusat } from "./durum.ts";
import { PARCALAR_3B, SINIF_KOD, type Sinif, parcaGeometrisi } from "./geometri.ts";
import { type Boya, CIZGI_RENK, paletDizisi } from "./palet.ts";
import { type Cizer, GLB_LISTESI, type KatmanKonumlari, type TopacKurulumu, modelSec } from "./tipler.ts";

// Atölye 3B görüntüleyici (three.js, yalnız Atölye'de tembel yüklenir). Referans 03 merkez: patlatılmış topaç.
// Görünüm: ortografik kamera (eğim 8°–72°), sabit sol-üst ışık (görüş uzayında; nesne döner, ışık dönmez), 4 kademe
// toon (sınıf başına 5 tonlu rampa: çizgi/koyu/orta/açık/vurgu, palet.ts), ters gövde dış çizgi + sonradan 1 px koyu
// siluet konturu. PIXEL: sahne tuval boyutunda (sanat pikseli = UI mantıksal pikseli) küçük bir hedefe çizilir; tuval
// CSS'te `image-rendering: pixelated` ile tam sayı ölçekte büyür (UI ızgarasıyla aynı piksel).

const ISIK = [-0.66, 0.4, 0.64] as const;
const ISIK_U = Math.hypot(...ISIK);
const L = ISIK.map((v) => (v / ISIK_U).toFixed(4)).join(", ");
const cizgiVec = [(CIZGI_RENK >> 16) & 255, (CIZGI_RENK >> 8) & 255, CIZGI_RENK & 255].map((v) => (v / 255).toFixed(4)).join(", ");

const TOON_VS = /* glsl */ `
attribute float sinif;
varying vec3 vN;
varying float vS;
void main() {
  vS = sinif;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const TOON_FS = /* glsl */ `
uniform vec3 palet[50];
uniform float soluk;
uniform float vurgu;
uniform float kimlik;
uniform vec3 solukRenk;
varying vec3 vN;
varying float vS;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float d = dot(n, normalize(vec3(${L})));
  int t = d < 0.22 ? 1 : (d < 0.68 ? 2 : (d < 0.9 ? 3 : 4));
  t = min(4, t + int(vurgu));
  int s = int(vS + 0.5);
  vec3 c = palet[s * 5 + t];
  c = mix(c, solukRenk, soluk);
  // alfa = katman kimliği (sonraki geçiş katmanlar arası ve dış kontur çizer; karışım yok)
  gl_FragColor = vec4(c, kimlik);
}`;
const SON_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const SON_FS = /* glsl */ `
uniform sampler2D kaynak;
uniform vec2 px;
uniform float vurguId;
varying vec2 vUv;
float k(vec2 o) { return texture2D(kaynak, vUv + o * px).a; }
void main() {
  vec4 c = texture2D(kaynak, vUv);
  float a = c.a;
  float n1 = k(vec2(1.0, 0.0)), n2 = k(vec2(-1.0, 0.0)), n3 = k(vec2(0.0, 1.0)), n4 = k(vec2(0.0, -1.0));
  vec3 cz = vec3(${cizgiVec});
  if (a > 0.05) {
    // katmanlar arası 1 px çizgi: uzaktaki (küçük kimlik) katmanın pikseline
    bool kenar = n1 > a + 0.06 || n2 > a + 0.06 || n3 > a + 0.06 || n4 > a + 0.06;
    gl_FragColor = vec4(kenar ? cz : c.rgb, 1.0);
    return;
  }
  // dış siluet: 1 px koyu kontur; vurgulu / odaktaki katmanın çevresinde ikinci halka turuncu (referans 03)
  if (max(max(n1, n2), max(n3, n4)) > 0.05) { gl_FragColor = vec4(cz, 1.0); return; }
  if (vurguId > 0.0) {
    float h = 0.0;
    for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) {
      if (abs(float(i)) + abs(float(j)) > 2.0) continue;
      if (abs(k(vec2(float(i), float(j))) - vurguId) < 0.03) h = 1.0;
    }
    if (h > 0.0) { gl_FragColor = vec4(0.910, 0.463, 0.184, 1.0); return; }
  }
  gl_FragColor = vec4(0.0);
}`;
/** katman kimliği (alfa kanalı): yakındaki (üstteki) katman büyük */
const KIMLIK: Record<KatmanTuru, number> = { cekirdek: 1, govde: 0.75, disk: 0.5, uc: 0.25 };

/** soluk katman rengi (blueprint laciverti) */
const SOLUK_RENK = [0.075, 0.13, 0.23];

interface ParcaNesnesi {
  id: string;
  /** dönen kap (mesh + kabuk) */
  grup: Group;
  malzemeler: ShaderMaterial[];
  meshler: Mesh[];
  yaricap: number;
  yAlt: number;
  yUst: number;
  /** giriş/çıkış animasyonu başlangıcı (sn) */
  giris: number | null;
  cikis: number | null;
}

interface KatmanNesnesi {
  kok: Group;
  aktif: ParcaNesnesi | null;
  gidenler: ParcaNesnesi[];
  /** şimdiki (yumuşatılmış) değerler */
  olcek: number;
  soluk: number;
  geri: number;
  odakY: number;
}

const geoOnbellek = new Map<string, BufferGeometry>();
function geometriAl(id: string, ayna: boolean): { geo: BufferGeometry; yaricap: number; yAlt: number; yUst: number } | null {
  const s = PARCALAR_3B[id];
  if (!s) return null;
  const a = ayna && !!s.kiral;
  const anahtar = `${id}|${a ? 1 : 0}`;
  let geo = geoOnbellek.get(anahtar);
  if (!geo) {
    const g = parcaGeometrisi(s, a);
    geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(g.konum, 3));
    geo.setAttribute("normal", new BufferAttribute(g.normal, 3));
    geo.setAttribute("sinif", new BufferAttribute(g.sinif, 1));
    geo.userData = { yaricap: g.yaricap, yAlt: g.yAlt, yUst: g.yUst };
    geo.computeBoundingSphere();
    geoOnbellek.set(anahtar, geo);
  }
  const u = geo.userData as { yaricap: number; yAlt: number; yUst: number };
  return { geo, ...u };
}

/** Disk üst yüzü (Gövde tabanı buna oturur); Disk yoksa 16. */
function diskUst(id: string | null): number {
  const s = id ? PARCALAR_3B[id] : undefined;
  return s?.profil?.[0]?.[1] ?? 16;
}

export class Goruntuleyici implements Cizer {
  readonly tur = "webgl" as const;
  private r: WebGLRenderer;
  private sahne = new Scene();
  private kamera = new OrthographicCamera(-1, 1, 1, -1, 1, 1000);
  private topac = new Group();
  private katmanlar: Record<KatmanTuru, KatmanNesnesi>;
  private hedef: WebGLRenderTarget;
  private sonSahne = new Scene();
  private sonKamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private sonMalzeme: ShaderMaterial;
  private w = 160;
  private h = 200;
  private kur: TopacKurulumu | null = null;
  private gd: GorunumDurumu = ilkDurum();
  private hareketAzMi = false;
  private vurgulu: KatmanTuru | null = null;
  // yumuşatılmış görünüm
  private patlama = 1;
  private ppu = 2;
  private merkezY = 0;
  private egim = 28;
  private yaw = 0;
  private odakYaw = 0;
  private donme = 0;
  private sonEtkilesim = -10;
  private t0 = performance.now() / 1000;
  private son = 0;
  private raf = 0;
  private olcum: number[] = [];
  private kirli = true;
  private kayip = false;
  private dongusuz = false;
  private ikonOnbellek = new Map<string, HTMLCanvasElement>();
  private ray = new Raycaster();
  private kareSonrasi: (() => void) | null;
  private kayipCb: (() => void) | null;

  constructor(private tuval: HTMLCanvasElement, s: { kare?: () => void; kayip?: () => void } = {}) {
    this.kareSonrasi = s.kare ?? null;
    this.kayipCb = s.kayip ?? null;
    this.r = new WebGLRenderer({ canvas: tuval, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "low-power", preserveDrawingBuffer: true });
    if (!this.r.getContext()) throw new Error("webgl yok");
    this.r.setPixelRatio(1);
    this.r.setClearColor(0x000000, 0);
    this.r.autoClear = true;
    this.hedef = new WebGLRenderTarget(this.w, this.h, { minFilter: NearestFilter, magFilter: NearestFilter, format: RGBAFormat, type: UnsignedByteType, depthBuffer: true });
    this.sonMalzeme = new ShaderMaterial({ vertexShader: SON_VS, fragmentShader: SON_FS, uniforms: { kaynak: { value: this.hedef.texture }, px: { value: new Vector2(1 / this.w, 1 / this.h) }, vurguId: { value: 0 } }, depthTest: false, depthWrite: false, transparent: false });
    this.sonSahne.add(new Mesh(new PlaneGeometry(2, 2), this.sonMalzeme));
    this.sahne.add(this.topac);
    const kat = {} as Record<KatmanTuru, KatmanNesnesi>;
    for (const t of KATMAN_SIRASI) {
      const kok = new Group();
      kok.name = t;
      this.topac.add(kok);
      kat[t] = { kok, aktif: null, gidenler: [], olcek: 1, soluk: 0, geri: 0, odakY: 0 };
    }
    this.katmanlar = kat;
    tuval.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.kayip = true; cancelAnimationFrame(this.raf); this.kayipCb?.(); });
    this.boyut(this.w, this.h);
    this.raf = requestAnimationFrame((t) => this.kare(t));
  }

  // ---------------------------------------------------------------- kurulum

  boyut(w: number, h: number): void {
    w = Math.max(16, Math.floor(w)); h = Math.max(16, Math.floor(h));
    if (w === this.w && h === this.h && this.tuval.width === w) return;
    this.w = w; this.h = h;
    this.r.setSize(w, h, false);
    this.hedef.setSize(w, h);
    (this.sonMalzeme.uniforms["px"]!.value as Vector2).set(1 / w, 1 / h);
    this.kirli = true;
  }

  hareketAz(az: boolean): void { this.hareketAzMi = az; this.kirli = true; }

  private parcaKur(id: string, tur: KatmanTuru, boya: Boya, sol: boolean): ParcaNesnesi | null {
    const g = geometriAl(id, sol);
    if (!g) return null;
    const grup = new Group();
    const n: ParcaNesnesi = { id, grup, malzemeler: [], meshler: [], yaricap: g.yaricap, yAlt: g.yAlt, yUst: g.yUst, giris: null, cikis: null };
    this.meshEkle(n, g.geo, tur, boya);
    if (GLB_LISTESI.has(id)) void this.glbDene(n, tur, boya);
    return n;
  }

  private meshEkle(n: ParcaNesnesi, geo: BufferGeometry, tur: KatmanTuru, boya: Boya): void {
    const palet = paletDizisi(boya);
    const m = new ShaderMaterial({
      vertexShader: TOON_VS, fragmentShader: TOON_FS, side: FrontSide,
      uniforms: { palet: { value: palet }, soluk: { value: 0 }, vurgu: { value: 0 }, kimlik: { value: KIMLIK[tur] }, solukRenk: { value: SOLUK_RENK } },
    });
    const mesh = new Mesh(geo, m);
    mesh.userData["katman"] = tur;
    n.grup.add(mesh);
    n.malzemeler.push(m);
    n.meshler.push(mesh);
  }

  /** GLB kancası: listedeyse yükle, parametrik ağı değiştir; yükleme başarısızsa parametrik kalır. */
  private async glbDene(n: ParcaNesnesi, tur: KatmanTuru, boya: Boya): Promise<void> {
    const s = await modelSec(n.id, GLB_LISTESI, async (url) => {
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      return (await new GLTFLoader().loadAsync(url)).scene as Object3D;
    }, () => null);
    if (s.kaynak !== "glb" || !s.model) return;
    const kok = s.model;
    kok.updateMatrixWorld(true);
    const kutu = new Box3().setFromObject(kok);
    const yari = Math.max(kutu.max.x - kutu.min.x, kutu.max.z - kutu.min.z) / 2 || 1;
    const olcek = n.yaricap / yari;
    const cx = (kutu.max.x + kutu.min.x) / 2, cz = (kutu.max.z + kutu.min.z) / 2;
    const geolar: BufferGeometry[] = [];
    kok.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const g = (m.geometry as BufferGeometry).clone();
      g.applyMatrix4(m.matrixWorld);
      g.translate(-cx, -kutu.min.y, -cz);
      g.scale(olcek, olcek, olcek);
      g.translate(0, n.yAlt, 0);
      if (!g.getAttribute("normal")) g.computeVertexNormals();
      const ad = (Array.isArray(m.material) ? m.material[0]?.name : m.material?.name) ?? "";
      const sn = (ad in SINIF_KOD ? ad : tur === "govde" ? "boya" : tur === "disk" ? "metal" : tur === "uc" ? "koyu" : "cerceve") as Sinif;
      const say = g.getAttribute("position").count;
      g.setAttribute("sinif", new BufferAttribute(new Float32Array(say).fill(SINIF_KOD[sn]), 1));
      geolar.push(g);
    });
    if (!geolar.length) return;
    for (const c of [...n.grup.children]) n.grup.remove(c);
    for (const m of n.malzemeler) m.dispose();
    n.malzemeler = []; n.meshler = [];
    for (const g of geolar) this.meshEkle(n, g, tur, boya);
    this.kirli = true;
  }

  private parcaAt(n: ParcaNesnesi): void {
    n.grup.parent?.remove(n.grup);
    for (const m of n.malzemeler) m.dispose();
  }

  ayarla(k: TopacKurulumu, animasyon: boolean): void {
    const eski = this.kur;
    this.kur = { ...k };
    const t = this.zaman();
    for (const tur of KATMAN_SIRASI) {
      const kat = this.katmanlar[tur];
      const boyaDegisti = !eski || (tur === "govde" || tur === "cekirdek" ? eski.element !== k.element || eski.koken !== k.koken : false);
      const solDegisti = !eski || eski.sol !== k.sol;
      const id = k[tur];
      if (kat.aktif && kat.aktif.id === id && !boyaDegisti && !solDegisti) continue;
      const anim = animasyon && !this.hareketAzMi && !!eski && kat.aktif?.id !== id;
      if (kat.aktif) {
        if (anim) { kat.aktif.cikis = t; kat.gidenler.push(kat.aktif); } else this.parcaAt(kat.aktif);
      }
      kat.aktif = id ? this.parcaKur(id, tur, { element: k.element, koken: k.koken }, k.sol) : null;
      if (kat.aktif) {
        if (anim) kat.aktif.giris = t;
        kat.kok.add(kat.aktif.grup);
      }
    }
    this.kirli = true;
  }

  durum(d: GorunumDurumu): void {
    if (d.aci.yaw !== this.gd.aci.yaw || d.aci.egim !== this.gd.aci.egim || d.odakAci.yaw !== this.gd.odakAci.yaw || d.odakAci.egim !== this.gd.odakAci.egim) this.sonEtkilesim = this.zaman();
    if (d.mod === "odak" && this.gd.odak !== d.odak) this.odakYaw = 0;
    this.gd = d;
    this.kirli = true;
  }

  vurgu(t: KatmanTuru | null): void { if (this.vurgulu !== t) { this.vurgulu = t; this.kirli = true; } }

  // ---------------------------------------------------------------- yerleşim

  private zaman(): number { return performance.now() / 1000 - this.t0; }

  /** hedef patlama (0 birleşik, 1 patlatılmış) */
  private hedefPatlama(): number {
    const m = this.gd.mod === "odak" ? this.gd.donus : this.gd.mod;
    return m === "patlatilmis" ? 1 : 0;
  }

  /** etiket sütunu (sol) için ayrılan tuval pikseli (her modda: etiketler topacın üstüne binmez) */
  private solBosluk(_p: number): number { return 52; }

  /** katman taban y'leri (dünya), patlama p ile; sallanma dahil */
  private tabanlar(p: number, t: number, e: number): Record<KatmanTuru, number> {
    const o: Partial<Record<KatmanTuru, KatmanOlcusu>> = {};
    for (const tur of KATMAN_SIRASI) {
      const a = this.katmanlar[tur].aktif;
      const b = patlatmaOlcegi(tur, p);
      if (a) o[tur] = { yAlt: a.yAlt * b, yUst: a.yUst * b, R: a.yaricap * b };
    }
    const k = patlatilmisTabanlar(o, e, 7, diskUst(this.kur?.disk ?? null), p);
    if (!this.hareketAzMi && p > 0.01) {
      KATMAN_SIRASI.forEach((tur, i) => { k[tur] += Math.sin(t * 1.3 + i * 1.7) * 0.7 * p; });
    }
    return k;
  }

  /** ekrandaki dikey kapsam (dünya birimi, kamera yukarı ekseni): katman başına [alt, üst] */
  private kapsam(tur: KatmanTuru, taban: number, olcek: number, e: number): [number, number] | null {
    const a = this.katmanlar[tur].aktif;
    if (!a) return null;
    const c = Math.cos(e), s = Math.sin(e);
    return [(taban + a.yAlt * olcek) * c - a.yaricap * olcek * s, (taban + a.yUst * olcek) * c + a.yaricap * olcek * s];
  }

  /** Ortak ikon önbelleği (ikonOnbellek.ts): ekrana bağlı olmayan çizer kare döngüsü çalıştırmaz. */
  donguyuDurdur(): void { this.dongusuz = true; cancelAnimationFrame(this.raf); }

  private kare(ms: number): void {
    if (this.kayip || this.dongusuz) return;
    this.raf = requestAnimationFrame((t) => this.kare(t));
    const b0 = performance.now();
    const t = this.zaman();
    const dt = Math.min(0.1, Math.max(0, t - this.son));
    this.son = t;
    void ms;
    const hizli = this.hareketAzMi;
    const k = hizli ? 1 : 1 - Math.exp(-dt * 9);
    const yaklas = (a: number, b: number) => a + (b - a) * k;
    const odak = this.gd.mod === "odak" ? this.gd.odak : null;
    const hedefE = this.hedefPatlama();
    const animVar = Math.abs(this.patlama - hedefE) > 1e-3 || KATMAN_SIRASI.some((x) => this.katmanlar[x].gidenler.length || this.katmanlar[x].aktif?.giris !== null && this.katmanlar[x].aktif !== null);
    const bosta = !hizli && t - this.sonEtkilesim > 2.5;
    if (!this.kirli && !animVar && !bosta && hizli) { return; }
    // patlama: sabit süreli geçiş (0,6 sn) — yumuşatma eğrisiyle
    if (hizli) this.patlama = hedefE;
    else this.patlama += Math.sign(hedefE - this.patlama) * Math.min(Math.abs(hedefE - this.patlama), dt / 0.6);
    const p = yumusat(this.patlama);
    // açı
    const egimHedef = (odak ? this.gd.odakAci.egim : this.gd.aci.egim) * Math.PI / 180;
    this.egim = hizli ? egimHedef : yaklas(this.egim, egimHedef);
    const yawHedef = this.gd.aci.yaw * Math.PI / 180;
    this.yaw = hizli ? yawHedef : this.yaw + aciFark(yawHedef, this.yaw) * k;
    const oyHedef = odak ? this.gd.odakAci.yaw * Math.PI / 180 : 0;
    this.odakYaw = hizli ? oyHedef : this.odakYaw + aciFark(oyHedef, this.odakYaw) * k;
    if (bosta) this.donme += dt * 0.55 * (this.kur?.sol ? 1 : -1);
    const e = this.egim;
    // katman hedefleri
    const tab = this.tabanlar(p, t, e);
    const bos = this.solBosluk(p);
    let ustY = -Infinity, altY = Infinity, enR = 0;
    let odakAralik: [number, number] | null = null;
    for (const tur of KATMAN_SIRASI) {
      const kat = this.katmanlar[tur];
      const hedefSoluk = odak && odak !== tur ? 0.72 : 0;
      kat.soluk = hizli ? hedefSoluk : yaklas(kat.soluk, hedefSoluk);
      kat.geri = hizli ? (odak && odak !== tur ? 1 : 0) : yaklas(kat.geri, odak && odak !== tur ? 1 : 0);
      const kp = this.kapsam(tur, tab[tur], patlatmaOlcegi(tur, p), e);
      if (kp) {
        altY = Math.min(altY, kp[0]); ustY = Math.max(ustY, kp[1]);
        enR = Math.max(enR, kat.aktif!.yaricap);
      }
      if (odak === tur && kat.aktif) {
        odakAralik = kp;
      }
    }
    if (!isFinite(ustY)) { altY = -10; ustY = 40; enR = 32; }
    // ölçek: içerik (dikey pay 8 px, yatay boşluk sonrası 10 px)
    // dikey pay: üst 6, alt 22 (araç düğmeleri); yatay boşluk sonrası 10 px
    const payU = 6, payA = 22;
    const genis = Math.max(16, this.w - bos - 10);
    let ppuHedef = Math.min((this.h - payU - payA) / Math.max(1, ustY - altY), genis / (2 * enR));
    // içerik merkezi, alt pay kadar yukarı kayık
    let merkezHedef = (ustY + altY) / 2 - ((payA - payU) / 2) / ppuHedef;
    // odak: seçili katman büyür ve ortaya gelir (diğerleri geride, soluk)
    let odakOlcek = 1;
    if (odak && odakAralik) {
      const a = this.katmanlar[odak].aktif!;
      const kp1 = this.kapsam(odak, 0, 1, e) ?? odakAralik;
      const yuk = kp1[1] - kp1[0];
      const ppuOdak = Math.min((this.h * 0.62) / Math.max(1, yuk), (this.w * 0.72) / (2 * a.yaricap));
      odakOlcek = Math.max(1, ppuOdak / ppuHedef);
    }
    this.ppu = hizli ? ppuHedef : yaklas(this.ppu, ppuHedef);
    this.merkezY = hizli ? merkezHedef : yaklas(this.merkezY, merkezHedef);
    ppuHedef = this.ppu; merkezHedef = this.merkezY;
    // katman dönüşümleri
    const ileri = [0, Math.sin(e), Math.cos(e)];
    for (const tur of KATMAN_SIRASI) {
      const kat = this.katmanlar[tur];
      const hedefOlcek = odak === tur ? odakOlcek : (odak ? 0.9 : 1) * patlatmaOlcegi(tur, p);
      kat.olcek = hizli ? hedefOlcek : yaklas(kat.olcek, hedefOlcek);
      const hedefOdakY = odak === tur && kat.aktif ? this.merkezY / Math.cos(e) - ((kat.aktif.yAlt + kat.aktif.yUst) / 2) * kat.olcek : tab[tur];
      kat.odakY = hizli ? hedefOdakY : yaklas(kat.odakY, odak === tur ? hedefOdakY : tab[tur]);
      kat.kok.position.set(-ileri[0]! * 90 * kat.geri, kat.odakY - ileri[1]! * 90 * kat.geri, -ileri[2]! * 90 * kat.geri);
      kat.kok.scale.setScalar(kat.olcek);
      kat.kok.rotation.y = odak === tur ? this.odakYaw : 0;
      for (const n of [kat.aktif, ...kat.gidenler]) {
        if (!n) continue;
        n.grup.rotation.y = this.donme;
        for (const m of n.malzemeler) m.uniforms["soluk"]!.value = kat.soluk;
      }
      // giriş / çıkış
      const a = kat.aktif;
      if (a && a.giris !== null) {
        const u = Math.min(1, (t - a.giris) / 0.42);
        a.grup.position.set(0, (1 - yumusat(u)) * 46, 0);
        if (u >= 1) { a.giris = null; a.grup.position.set(0, 0, 0); }
      }
      kat.gidenler = kat.gidenler.filter((g) => {
        const u = Math.min(1, (t - (g.cikis ?? t)) / 0.36);
        g.grup.position.set(yumusat(u) * 80, u * 14, 0);
        g.grup.scale.setScalar(1 - 0.5 * u);
        if (u >= 1) { this.parcaAt(g); return false; }
        return true;
      });
    }
    this.topac.rotation.y = this.yaw;
    // kamera: içerik merkezi (yatayda sol boşluk sonrası ortada)
    const cxPx = bos + (this.w - bos) / 2;
    const kam = this.kamera;
    kam.left = -cxPx / ppuHedef; kam.right = (this.w - cxPx) / ppuHedef;
    kam.top = this.h / 2 / ppuHedef; kam.bottom = -this.h / 2 / ppuHedef;
    const hy = merkezHedef / Math.cos(e);
    kam.position.set(0, hy + Math.sin(e) * 300, Math.cos(e) * 300);
    kam.near = 1; kam.far = 800;
    kam.lookAt(0, hy, 0);
    kam.updateProjectionMatrix();
    // çiz: hedef → kontur → tuval
    const vk = odak ?? this.vurgulu;
    this.sonMalzeme.uniforms["vurguId"]!.value = vk ? KIMLIK[vk] : 0;
    this.r.setRenderTarget(this.hedef);
    this.r.clear();
    this.r.render(this.sahne, kam);
    this.r.setRenderTarget(null);
    this.r.render(this.sonSahne, this.sonKamera);
    this.kirli = false;
    this.olcum.push(performance.now() - b0);
    if (this.olcum.length > 600) this.olcum.splice(0, this.olcum.length - 600);
    this.kareSonrasi?.();
  }

  // ---------------------------------------------------------------- sorgular

  konumlar(): KatmanKonumlari {
    const e = this.egim, c = Math.cos(e);
    const bos = this.solBosluk(yumusat(this.patlama));
    const cxPx = bos + (this.w - bos) / 2;
    const out = {} as KatmanKonumlari;
    for (const tur of KATMAN_SIRASI) {
      const kat = this.katmanlar[tur];
      const a = kat.aktif;
      if (!a) {
        // boş yuva: komşu katmanların arasında, patlatılmış düzende yer
        const tab = this.tabanlar(yumusat(this.patlama), 0, e);
        const yy = (tab[tur] + (BOS_OLCU.yAlt + BOS_OLCU.yUst) / 2) * c;
        out[tur] = { y: this.h / 2 - (yy - this.merkezY) * this.ppu, sol: cxPx - 12, sag: cxPx + 12, gorunur: this.gd.mod !== "odak" };
        continue;
      }
      const yOrta = (kat.odakY + ((a.yAlt + a.yUst) / 2) * kat.olcek) * c;
      const R = a.yaricap * kat.olcek * this.ppu;
      out[tur] = { y: this.h / 2 - (yOrta - this.merkezY) * this.ppu, sol: cxPx - R, sag: cxPx + R, gorunur: this.gd.mod !== "odak" || this.gd.odak === tur };
    }
    return out;
  }

  sec(x: number, y: number): KatmanTuru | null {
    const ndc = new Vector2((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1);
    this.ray.setFromCamera(ndc, this.kamera);
    const meshler: Mesh[] = [];
    for (const tur of KATMAN_SIRASI) { const a = this.katmanlar[tur].aktif; if (a) meshler.push(...a.meshler); }
    const v = this.ray.intersectObjects(meshler, false)[0];
    return (v?.object.userData["katman"] as KatmanTuru | undefined) ?? null;
  }

  kareSureleri(): number[] { return [...this.olcum]; }

  // ---------------------------------------------------------------- ikonlar (tek kare)

  private tekKare(parcalar: { id: string; tur: KatmanTuru; taban: number }[], boya: Boya, sol: boolean, boyut: number): HTMLCanvasElement | null {
    if (this.kayip) return null;
    const sahne = new Scene();
    const nesneler: ParcaNesnesi[] = [];
    let alt = Infinity, ust = -Infinity, R = 1;
    const e = 30 * Math.PI / 180, c = Math.cos(e), s = Math.sin(e);
    for (const p of parcalar) {
      const n = this.parcaKur(p.id, p.tur, boya, sol);
      if (!n) continue;
      n.grup.position.y = p.taban;
      n.grup.rotation.y = -0.35;
      sahne.add(n.grup);
      nesneler.push(n);
      alt = Math.min(alt, (p.taban + n.yAlt) * c - n.yaricap * s);
      ust = Math.max(ust, (p.taban + n.yUst) * c + n.yaricap * s);
      R = Math.max(R, n.yaricap);
    }
    if (!nesneler.length) return null;
    const ppu = Math.min((boyut - 4) / (ust - alt), (boyut - 4) / (2 * R));
    const kam = new OrthographicCamera(-boyut / 2 / ppu, boyut / 2 / ppu, boyut / 2 / ppu, -boyut / 2 / ppu, 1, 800);
    const my = (alt + ust) / 2 / c;
    kam.position.set(0, my + s * 300, c * 300);
    kam.lookAt(0, my, 0);
    kam.updateProjectionMatrix();
    const rt1 = new WebGLRenderTarget(boyut, boyut, { minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true });
    const rt2 = new WebGLRenderTarget(boyut, boyut, { minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false });
    const kaynak = this.sonMalzeme.uniforms["kaynak"]!.value;
    const px = (this.sonMalzeme.uniforms["px"]!.value as Vector2).clone();
    try {
      this.r.setRenderTarget(rt1); this.r.clear(); this.r.render(sahne, kam);
      this.sonMalzeme.uniforms["kaynak"]!.value = rt1.texture;
      this.sonMalzeme.uniforms["vurguId"]!.value = 0;
      (this.sonMalzeme.uniforms["px"]!.value as Vector2).set(1 / boyut, 1 / boyut);
      this.r.setRenderTarget(rt2); this.r.clear(); this.r.render(this.sonSahne, this.sonKamera);
      const buf = new Uint8Array(boyut * boyut * 4);
      this.r.readRenderTargetPixels(rt2, 0, 0, boyut, boyut, buf);
      const cv = document.createElement("canvas");
      cv.width = boyut; cv.height = boyut;
      const g = cv.getContext("2d");
      if (!g) return null;
      const im = g.createImageData(boyut, boyut);
      for (let y = 0; y < boyut; y++) im.data.set(buf.subarray((boyut - 1 - y) * boyut * 4, (boyut - y) * boyut * 4), y * boyut * 4);
      g.putImageData(im, 0, 0);
      return cv;
    } finally {
      this.sonMalzeme.uniforms["kaynak"]!.value = kaynak;
      (this.sonMalzeme.uniforms["px"]!.value as Vector2).copy(px);
      this.r.setRenderTarget(null);
      rt1.dispose(); rt2.dispose();
      for (const n of nesneler) this.parcaAt(n);
      this.kirli = true;
    }
  }

  ikon(parcaId: string, boya: Boya, boyut: number): HTMLCanvasElement | null {
    const s = PARCALAR_3B[parcaId];
    if (!s) return null;
    const anahtar = `p|${parcaId}|${boya.element}|${boya.koken}|${boyut}`;
    let c = this.ikonOnbellek.get(anahtar);
    if (!c) {
      const r = this.tekKare([{ id: parcaId, tur: s.tur, taban: 0 }], boya, false, boyut);
      if (!r) return null;
      c = r;
      this.ikonOnbellek.set(anahtar, c);
    }
    return kopya(c);
  }

  topacIkonu(k: TopacKurulumu, boyut: number): HTMLCanvasElement | null {
    const anahtar = `t|${k.cekirdek}|${k.govde}|${k.disk}|${k.uc}|${k.element}|${k.koken}|${k.sol}|${boyut}`;
    let c = this.ikonOnbellek.get(anahtar);
    if (!c) {
      const tab = katmanKaymasi(0, diskUst(k.disk));
      const ps = KATMAN_SIRASI.filter((t) => k[t]).map((t) => ({ id: k[t]!, tur: t, taban: tab[t] }));
      const r = this.tekKare(ps, { element: k.element, koken: k.koken }, k.sol, boyut);
      if (!r) return null;
      c = r;
      this.ikonOnbellek.set(anahtar, c);
    }
    return kopya(c);
  }

  yokEt(): void {
    cancelAnimationFrame(this.raf);
    for (const tur of KATMAN_SIRASI) { const kat = this.katmanlar[tur]; if (kat.aktif) this.parcaAt(kat.aktif); for (const g of kat.gidenler) this.parcaAt(g); }
    this.hedef.dispose();
    this.sonMalzeme.dispose();
    this.r.dispose();
  }
}

/** Patlatılmış çizimde küçük parçalar okunur olsun diye büyür (Çekirdek ×1,6, Uç ×1,3); birleşikte gerçek ölçü. */
function patlatmaOlcegi(t: KatmanTuru, p: number): number {
  const k = t === "cekirdek" ? 1.6 : t === "uc" ? 1.3 : 1;
  return 1 + (k - 1) * p;
}

function aciFark(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function kopya(c: HTMLCanvasElement): HTMLCanvasElement {
  const y = document.createElement("canvas");
  y.width = c.width; y.height = c.height;
  y.getContext("2d")?.drawImage(c, 0, 0);
  return y;
}

/** Ortak ikon çizeri (TEMIZLIK #4): ayrık tuval, kare döngüsü yok; yalnız `ikon` / `topacIkonu`. WebGL yoksa atar. */
export function ikonCizeriKur(): Goruntuleyici {
  const g = new Goruntuleyici(document.createElement("canvas"));
  g.donguyuDurdur();
  return g;
}

/** ARALIK dışa açık (rapor/test): patlatılmış katman aralığı (dünya birimi). */
export { ARALIK };
