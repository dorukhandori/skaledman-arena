// ESLint düz yapılandırma. Amaç stil değil, KAPI: src/paylasilan (paylaşılan benzetim) istemci ve sunucuda
// bit bit aynı sonucu vermeli (tahmin/uzlaşma buna dayanır). Bu yüzden orada DOM, Node, saat, rastgelelik,
// ağ ve çerçeve bağımlılığı yasak. D4: kapsam src geneli; paylaşılan kapı kuralları yalnız src/paylasilan/**, diğer
// dosyalarda yalnız netcode yalıtım kuralları. Çalıştır: npm run lint
import tseslint from "typescript-eslint";

const YASAK_GLOBALLER = [
  // tarayıcı
  "window", "document", "navigator", "location", "history", "localStorage", "sessionStorage",
  "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback",
  "fetch", "XMLHttpRequest", "WebSocket", "indexedDB", "crypto",
  // zaman
  "performance", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "clearImmediate",
  // Node
  "process", "Buffer", "require", "module", "exports", "__dirname", "__filename",
  // alan genişletme/kaçış yolları
  "globalThis", "self", "global",
].map((name) => ({ name, message: `src/paylasilan'da yasak: '${name}' (DOM/Node/zaman/ağ). Deterministik, saf kod yaz.` }));

/** Sim'de yasak Math işlevleri (yaklaşık sonuç: ECMAScript bit kesinliği istemez). */
const YASAK_MATH = [
  "hypot", "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
  "pow", "exp", "expm1", "log", "log1p", "log2", "log10", "cbrt",
];

const YASAK_ICE_AKTARIMLAR = {
  paths: [
    { name: "fs" }, { name: "path" }, { name: "os" }, { name: "crypto" }, { name: "child_process" },
    { name: "http" }, { name: "https" }, { name: "net" }, { name: "worker_threads" }, { name: "pixi.js" },
    { name: "colyseus" },
  ].map((p) => ({ ...p, message: "src/paylasilan'a Node/çerçeve bağımlılığı girmez." })),
  patterns: [
    { group: ["node:*"], message: "src/paylasilan'da Node modülü yasak." },
    { group: ["pixi.js/*", "@pixi/*"], message: "Render istemciye aittir (src/istemci)." },
    { group: ["colyseus/*", "@colyseus/*"], message: "Colyseus sunucu/istemci katmanına aittir, paylaşılan benzetime girmez." },
    { group: ["**/sunucu/**", "**/istemci/**", "**/araclar/**"], message: "Paylaşılan kod yalnızca kendi içine bağımlı olur." },
  ],
};

// Netcode yalıtımı (axiom § 2 #7): src/ag ortak sözleşme (zod, Colyseus'suz); yalnız src/istemci/ag/** @colyseus/sdk,
// yalnız src/sunucu/** colyseus (ve şema için @colyseus/schema) import eder; @colyseus/core doğrudan alınmaz.
const yalitim = (kurallar) => ({ "no-restricted-imports": ["error", { paths: kurallar.paths ?? [], patterns: kurallar.patterns ?? [] }] });
const COLYSEUS_SUNUCU = { name: "colyseus", message: "colyseus yalnız src/sunucu/** içinde." };
const COLYSEUS_CORE = { group: ["@colyseus/core", "@colyseus/core/*"], message: "@colyseus/core doğrudan import edilmez; 'colyseus' paketinden al (src/sunucu)." };
const SDK = { group: ["@colyseus/sdk", "@colyseus/sdk/*"], message: "@colyseus/sdk yalnız src/istemci/ag/** içinde." };
const SEMA = { group: ["@colyseus/schema", "@colyseus/schema/*"], message: "@colyseus/schema yalnız src/sunucu/** (şema sınıfları) içinde; istemci yansıtmadan okur." };
const DIGER_COLYSEUS = { group: ["@colyseus/*", "!@colyseus/sdk", "!@colyseus/schema", "!@colyseus/core"], message: "Colyseus yardımcı paketleri yalnız src/sunucu/** içinde." };

export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", ".cache/**", "public/**", "veri/**"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: "module" },
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },
  {
    files: ["src/ag/**/*.ts"],
    rules: yalitim({
      paths: [COLYSEUS_SUNUCU, { name: "pixi.js", message: "src/ag ortak sözleşme: render yok." }],
      patterns: [COLYSEUS_CORE, SDK, SEMA, DIGER_COLYSEUS, { group: ["node:*"], message: "src/ag hem tarayıcıda hem Node'da çalışır." }, { group: ["**/istemci/**", "**/sunucu/**"], message: "src/ag yalnız src/paylasilan ve kendine bağımlı olur." }],
    }),
  },
  {
    files: ["src/istemci/**/*.ts"],
    ignores: ["src/istemci/ag/**"],
    rules: yalitim({ paths: [COLYSEUS_SUNUCU], patterns: [COLYSEUS_CORE, SDK, SEMA, DIGER_COLYSEUS, { group: ["**/sunucu/**"], message: "İstemci sunucu koduna bağımlı olmaz." }] }),
  },
  {
    files: ["src/istemci/ag/**/*.ts"],
    rules: yalitim({ paths: [COLYSEUS_SUNUCU], patterns: [COLYSEUS_CORE, SEMA, DIGER_COLYSEUS, { group: ["**/sunucu/**"], message: "İstemci sunucu koduna bağımlı olmaz." }] }),
  },
  {
    files: ["src/sunucu/**/*.ts"],
    rules: yalitim({ paths: [{ name: "pixi.js", message: "Sunucu render etmez." }], patterns: [COLYSEUS_CORE, SDK, { group: ["**/istemci/**"], message: "Sunucu istemci koduna bağımlı olmaz." }] }),
  },
  {
    files: ["src/paylasilan/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", ...YASAK_GLOBALLER],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Tohumlu üreteci kullan (sim/rastgele.ts); Math.random yasak." },
        { object: "Date", property: "now", message: "Duvar saati yasak; adım sayacı (tik) kullan." },
        { object: "performance", property: "now", message: "Duvar saati yasak; adım sayacı (tik) kullan." },
        { object: "crypto", property: "getRandomValues", message: "Tohumlu üreteci kullan." },
        { object: "crypto", property: "randomUUID", message: "Tohumlu üreteci kullan." },
        { object: "globalThis", property: "Math", message: "globalThis üzerinden kaçış yok." },
        // Determinizm sözleşmesi (tuning.md § 3, flint § 2, axiom karar 1): yalnız + - * / ve Math.sqrt,
        // abs/min/max/floor/trunc/sign/imul. Yaklaşık (motorlar arası son bit farkı verebilen) işlevler yasak.
        ...YASAK_MATH.map((property) => ({
          object: "Math", property,
          message: `Math.${property} sim'de yasak (motorlar arası bit farkı). Karekök için Math.sqrt, trig için kurallar/sinTablo.ts.`,
        })),
        { object: "Math", property: "fround", message: "fround kullanılmaz (ADR-004 yazılmadı; sim saf float64)." },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date']", message: "new Date() yasak (duvar saati)." },
        { selector: "CallExpression[callee.name='Date']", message: "Date() yasak (duvar saati)." },
        { selector: "MemberExpression[object.name='Date'][property.name=/^(now|parse|UTC)$/]", message: "Date.* yasak." },
        { selector: "MemberExpression[object.name='Math'][property.value='random']", message: "Math['random'] yasak." },
        { selector: "MemberExpression[object.name='Intl']", message: "Intl yerel ayara bağlıdır, benzetimde yasak." },
        { selector: "CallExpression[callee.property.name=/^toLocale/]", message: "Yerel ayara bağlı çağrı yasak." },
        { selector: "BinaryExpression[operator='**']", message: "** yasak (pow ile aynı: yaklaşık). Kare için x * x yaz." },
        { selector: "AssignmentExpression[operator='**=']", message: "**= yasak. x = x * x yaz." },
        { selector: `MemberExpression[object.name='Math'][property.value=/^(${YASAK_MATH.join("|")})$/]`, message: "Math['...'] ile yasak işlev çağrılamaz." },
        { selector: "CallExpression[callee.property.name='sort'][arguments.length=0]", message: "Karşılaştırıcısız sort yasak (motorlar arası sıra); (a, b) => ... ver." },
        { selector: "CallExpression[callee.property.name='toSorted'][arguments.length=0]", message: "Karşılaştırıcısız toSorted yasak." },
        { selector: "ForInStatement", message: "for..in sırası nesne anahtar sırasına bağlı; dizi ya da sabit anahtar listesi kullan." },
      ],
      "no-restricted-imports": ["error", YASAK_ICE_AKTARIMLAR],
    },
  },
);
