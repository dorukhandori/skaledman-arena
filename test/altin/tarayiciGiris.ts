import { type AltinSenaryo, altinCalistir } from "./calistir.ts";

// Tarayıcı paketi girişi (araclar/altin-tarayici.ts esbuild ile IIFE yapar): window.altin(senaryo) → sonuç.
(globalThis as unknown as { altin: (s: AltinSenaryo) => ReturnType<typeof altinCalistir> }).altin = altinCalistir;
