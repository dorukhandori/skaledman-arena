// Playwright depoya bağımlılık olarak girmez (ortamda kurulu: require('playwright')). Burada yalnız kullandığımız
// yüzeyin asgari tipleri var; tsc playwright paketini aramaz.
import { createRequire } from "node:module";

export interface PwKonsol { type(): string; text(): string }
export interface PwIstek { url(): string; failure(): { errorText: string } | null }
export interface Page {
  on(olay: "console", f: (m: PwKonsol) => void): void;
  on(olay: "pageerror", f: (e: Error) => void): void;
  on(olay: "requestfailed", f: (r: PwIstek) => void): void;
  goto(url: string): Promise<unknown>;
  setContent(html: string): Promise<void>;
  addScriptTag(o: { content: string }): Promise<unknown>;
  waitForFunction(f: () => unknown, arg: null, o: { timeout: number }): Promise<unknown>;
  evaluate<R>(f: () => R): Promise<R>;
  evaluate<R, A>(f: (a: A) => R, arg: A): Promise<R>;
  screenshot(o: { path: string }): Promise<unknown>;
  selectOption(sel: string, v: string): Promise<unknown>;
  getByRole(rol: "button", o: { name: string }): { click(): Promise<void> };
  keyboard: { down(k: string): Promise<void>; up(k: string): Promise<void>; press(k: string): Promise<void> };
  mouse: { move(x: number, y: number): Promise<void> };
}
export interface Browser {
  version(): string;
  newPage(): Promise<Page>;
  newContext(o: { viewport: { width: number; height: number }; deviceScaleFactor: number }): Promise<{ newPage(): Promise<Page> }>;
  close(): Promise<void>;
}

const require = createRequire(import.meta.url);
export const chromium = (require("playwright") as { chromium: { launch(): Promise<Browser> } }).chromium;
