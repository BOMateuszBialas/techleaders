// Check and screenshot s08, s09, s10 (order lookup, sign-up, sign-in) at 320 and 1440 px, light and dark.
// Needs: `npm run preview` on port 4173 (after `npm run build`) and headless Chrome with
// --remote-debugging-port=9333. Run from this folder: node evidence/account-screens.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const DEBUG = "http://127.0.0.1:9333";
const BASE = "http://localhost:4173";
const SCREENS = ["s08", "s09", "s10"];
const STATES = {
  s08: ["default", "malformed", "rate-limited", "no-match", "match", "error"],
  s09: ["default", "field-errors", "duplicate-email", "created", "loading", "error"],
  s10: ["default", "field-errors", "wrong-password", "unavailable", "attempt-limit", "signed-in-cart", "signed-in-empty-cart", "error"],
};

const t = await (await fetch(`${DEBUG}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const errs = [];
ws.onmessage = (m) => {
  const x = JSON.parse(m.data);
  if (x.id && pending.has(x.id)) {
    pending.get(x.id)(x);
    pending.delete(x.id);
  } else if (x.method === "Runtime.exceptionThrown")
    errs.push("exception: " + (x.params.exceptionDetails.exception?.description ?? "").slice(0, 200));
  else if (x.method === "Runtime.consoleAPICalled" && x.params.type === "error")
    errs.push("console: " + x.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200));
  else if (x.method === "Log.entryAdded" && x.params.entry.level === "error" && !/404/.test(x.params.entry.text))
    errs.push("log: " + x.params.entry.text.slice(0, 200));
};
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const ev = async (e) => (await send("Runtime.evaluate", { returnByValue: true, awaitPromise: true, expression: e })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Runtime.enable");
await send("Log.enable");

const measure = () =>
  ev(`(()=>{const f=document.querySelector('[data-testid=screen-frame]'); return {
    frame: f.scrollWidth > f.clientWidth + 1,
    page: document.documentElement.scrollWidth > window.innerWidth + 1,
    h1: !!document.querySelector('h1'),
    dark: document.documentElement.classList.contains('dark'),
    state: document.querySelector('#rb-state').value,
    text: f.innerText.length };})()`);

const setSelect = (sel, value) =>
  ev(`(()=>{const s=document.querySelector(${JSON.stringify(sel)}); const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; set.call(s,${JSON.stringify(value)}); s.dispatchEvent(new Event('change',{bubbles:true})); return true;})()`);

const problems = [];
const shots = [];
let checks = 0;

// 1. Default state, both widths, both themes: screenshot.
for (const width of [320, 1440]) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const theme of ["light", "dark"]) {
    for (const screen of SCREENS) {
      errs.length = 0;
      await send("Page.navigate", { url: `${BASE}/#${screen}` });
      await sleep(900);
      const wantDark = theme === "dark";
      const isDark = await ev(`document.documentElement.classList.contains('dark')`);
      if (isDark !== wantDark) {
        await ev(`[...document.querySelectorAll('button')].find(b=>/theme$/.test(b.textContent.trim())).click()`);
        await sleep(200);
      }
      await setSelect("#rb-state", "default");
      await setSelect("#rb-width", String(width));
      await sleep(150);
      const m = await measure();
      checks++;
      if (m.frame || m.page || !m.h1 || m.dark !== wantDark || errs.length) problems.push({ screen, width, theme, state: "default", m, errs: [...errs] });
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      const name = `${screen}-${width}-${theme}.png`;
      writeFileSync(join(here, name), Buffer.from(shot.result.data, "base64"));
      shots.push(name);
    }
  }
}

// 2. Every state of the three screens at 320 and 1440 px in light theme: no overflow, no errors, h1 present.
for (const width of [320, 1440]) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const screen of SCREENS) {
    await send("Page.navigate", { url: `${BASE}/#${screen}` });
    await sleep(900);
    const isDark = await ev(`document.documentElement.classList.contains('dark')`);
    if (isDark) {
      await ev(`[...document.querySelectorAll('button')].find(b=>/theme$/.test(b.textContent.trim())).click()`);
      await sleep(200);
    }
    await setSelect("#rb-width", String(width));
    for (const st of STATES[screen]) {
      errs.length = 0;
      await setSelect("#rb-state", st);
      await sleep(120);
      const m = await measure();
      checks++;
      if (m.state !== st || m.frame || m.page || !m.h1 || m.text < 5 || errs.length)
        problems.push({ screen, width, theme: "light", state: st, m, errs: [...errs] });
    }
  }
}

console.log("checks:", checks);
console.log("problems:", problems.length);
for (const p of problems.slice(0, 30)) console.log(JSON.stringify(p).slice(0, 400));
console.log("screenshots:", shots.join(", "));
ws.close();
await fetch(`${DEBUG}/json/close/${t.id}`);
