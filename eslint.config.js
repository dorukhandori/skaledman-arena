// ESLint düz yapılandırma. Amaç stil değil, KAPI: src/paylasilan (paylaşılan benzetim) istemci ve sunucuda
// bit bit aynı sonucu vermeli (tahmin/uzlaşma buna dayanır). Bu yüzden orada DOM, Node, saat, rastgelelik,
// ağ ve çerçeve bağımlılığı yasak. Çalıştır: npm run lint
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

export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", ".cache/**", "public/**", "veri/**"] },
  {
    files: ["src/paylasilan/**/*.ts"],
    languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: "module" },
    linterOptions: { reportUnusedDisableDirectives: "error" },
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
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date']", message: "new Date() yasak (duvar saati)." },
        { selector: "CallExpression[callee.name='Date']", message: "Date() yasak (duvar saati)." },
        { selector: "MemberExpression[object.name='Date'][property.name=/^(now|parse|UTC)$/]", message: "Date.* yasak." },
        { selector: "MemberExpression[object.name='Math'][property.value='random']", message: "Math['random'] yasak." },
        { selector: "MemberExpression[object.name='Intl']", message: "Intl yerel ayara bağlıdır, benzetimde yasak." },
        { selector: "CallExpression[callee.property.name=/^toLocale/]", message: "Yerel ayara bağlı çağrı yasak." },
      ],
      "no-restricted-imports": ["error", YASAK_ICE_AKTARIMLAR],
    },
  },
);
