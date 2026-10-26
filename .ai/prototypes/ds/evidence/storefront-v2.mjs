// Storefront v2 walk (2026-10-26): headless Chrome over CDP, run by hand, not part of the gate.
// Start the preview first (npm run preview, port 4173) and Chrome with --remote-debugging-port=9333
// and a scratch profile outside the repo. Usage: node evidence/storefront-v2.mjs <outDir>
// Drawer edge: measured against the body width (the layout width left of the page scrollbar gutter, 15 px in headless Chrome).
// Photos (2026-10-26): every <img> must load (naturalWidth > 0, after scrolling so lazy images load) and stay inside the frame.
// Checks, per screen, state, width (320, 390, 768, 1440) and theme (light, dark):
//   console errors and exceptions, page-level and frame-level sideways scroll, one h1,
//   no "demo store" wording inside the shopper frame, the fictional company footer,
//   no layout picker on s01 and s18, the cart drawer (right side, full width below 448 px),
//   and on s03 the two-column product page (gallery beside the information from 1024 px).
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:4173/";
const DEBUG = "http://127.0.0.1:9333";
const OUT = process.argv[2];
const WIDTHS = [320, 390, 768, 1440];
const THEMES = ["light", "dark"];
// "all" = every state the state select offers for that screen.
const PLAN = [
  { route: "s01", states: "all" },
  { route: "s02", states: ["list"] },
  { route: "s03", states: "all" },
  { route: "s04", states: ["items"] },
  { route: "s05", states: ["guest"] },
  { route: "s06", states: ["pending"] },
  { route: "s11", states: ["list"] },
  { route: "s12", states: ["own-order"] },
  { route: "s18", states: ["ai"] },
];
const H1_STATES = new Set(["default", "keyboard-photo", "items", "list", "guest", "pending", "own-order", "ai", "cart-open", "cart-empty", "adding", "added", "over-stock", "out-of-stock"]);
const SHOT_ROUTES = new Set(["s01", "s03"]);
const SHOT_STATES = new Set(["default", "keyboard-photo", "cart-open", "cart-empty"]);

const target = await (await fetch(`${DEBUG}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0;
const pending = new Map();
let events = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) {
    events.push({ kind: `console.${msg.params.type}`, text: msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200) });
  } else if (msg.method === "Runtime.exceptionThrown") {
    events.push({ kind: "exception", text: (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0, 200) });
  } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
    events.push({ kind: "log.error", text: msg.params.entry.text.slice(0, 200) });
  }
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");

const MEASURE = `(() => {
  const f = document.querySelector('[data-testid=screen-frame]');
  const h = document.querySelector('h1');
  const d = document.querySelector('[data-slot=cart-drawer]');
  const g = document.querySelector('[aria-label="Product images"]');
  const info = document.querySelector('section[aria-label="Product information"]');
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width) }; };
  const text = f ? f.innerText : '';
  return {
    vw: window.innerWidth,
    cw: Math.round(document.body.getBoundingClientRect().right),
    frameOverflow: f ? f.scrollWidth > f.clientWidth + 1 : null,
    docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    h1: h ? h.textContent.slice(0, 60) : null,
    dark: document.documentElement.classList.contains('dark'),
    demoWording: /demo store/i.test(text),
    fictionalFooter: /Fictional company/.test(text),
    layoutPicker: !!document.querySelector('#rb-layout'),
    drawer: rect(d),
    gallery: rect(g),
    info: rect(info),
    imgs: [...document.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0, lazy: i.loading, rightOfFrame: f ? i.getBoundingClientRect().right > f.getBoundingClientRect().right + 1 : false })),
  };
})()`;

/* Lazy images load when they near the viewport: scroll the page once, then wait for every image. */
const LOAD_ALL_IMAGES = `(async () => {
  const h = Math.max(document.documentElement.scrollHeight, 900);
  for (let y = 0; y < h; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
  window.scrollTo(0, 0);
  await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  return true;
})()`;

const setSelect = (sel, value) => `(() => {
  const s = document.querySelector('${sel}'); if (!s) return false;
  const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  set.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event('change', { bubbles: true })); return true;
})()`;

const themeJs = (want) => `(() => {
  const dark = document.documentElement.classList.contains('dark');
  if ((${JSON.stringify(want)} === 'dark') !== dark) {
    const b = [...document.querySelectorAll('button')].find((x) => /Dark theme|Light theme/.test(x.textContent));
    if (b) b.click();
  }
  return true;
})()`;

const results = [];
const shots = [];
for (const width of WIDTHS) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const theme of THEMES) {
    for (const { route, states } of PLAN) {
      await send("Page.navigate", { url: `${BASE}#${route}` });
      await sleep(700);
      await evaluate(setSelect("#rb-width", "full"));
      await evaluate(themeJs(theme));
      await sleep(150);
      const list = states === "all" ? await evaluate(`[...document.querySelectorAll('#rb-state option')].map((o) => o.value)`) : states;
      for (const st of list) {
        events = [];
        await evaluate(setSelect("#rb-state", st));
        await sleep(st.startsWith("cart-") ? 900 : 300);
        await evaluate(LOAD_ALL_IMAGES);
        const m = await evaluate(MEASURE);
        const shopper = route !== "s18";
        const drawerOk = !st.startsWith("cart-") || (m.drawer && m.drawer.r === m.cw && (m.cw > 448 ? m.drawer.w <= 449 : m.drawer.w === m.cw));
        const twoCol = route === "s03" && st === "default" && m.gallery && m.info ? (width >= 1024 ? m.info.l >= m.gallery.r - 1 && m.info.t < m.gallery.b : m.info.t >= m.gallery.b - 1) : null;
        const errors = events.filter((e) => e.kind !== "console.warning");
        results.push({
          route, state: st, width, theme,
          h1: m.h1, frameOverflow: m.frameOverflow, docOverflow: m.docOverflow, themeOk: m.dark === (theme === "dark"),
          demoWording: shopper ? m.demoWording : null,
          fictionalFooter: shopper ? m.fictionalFooter : null,
          layoutPicker: m.layoutPicker,
          drawer: m.drawer, drawerOk, twoCol,
          errors,
          imgs: m.imgs,
          imgBroken: m.imgs.filter((i) => !i.loaded).length,
          imgOverflow: m.imgs.some((i) => i.rightOfFrame),
        });
        if (SHOT_ROUTES.has(route) && SHOT_STATES.has(st) && (width === 320 || width === 1440 || (theme === "light" && (width === 390 || width === 768))) && (theme === "light" || width === 320 || width === 1440)) {
          const h = await evaluate(`Math.max(document.documentElement.scrollHeight, window.innerHeight)`);
          const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.min(h, 2400), scale: 1 } });
          const name = `v2-${route}-${st}-${width}-${theme}.png`;
          writeFileSync(join(OUT, name), Buffer.from(shot.result.data, "base64"));
          shots.push(name);
        }
      }
    }
  }
}

writeFileSync(join(OUT, "storefront-v2-results.json"), JSON.stringify({ checks: results.length, shots, results }, null, 2));

const bad = results.filter((r) => r.errors.length || r.docOverflow || r.frameOverflow || (H1_STATES.has(r.state) && !r.h1) || !r.themeOk || r.layoutPicker || r.demoWording || (r.route !== "s18" && r.fictionalFooter === false) || r.drawerOk === false || r.twoCol === false || r.imgBroken > 0 || r.imgOverflow);
console.log(`checks: ${results.length}; screenshots: ${shots.length}`);
console.log(`checks with a finding: ${bad.length}`);
const kinds = {};
for (const r of bad) { const k = [r.errors.length ? "errors" : "", r.docOverflow ? "docOverflow" : "", r.frameOverflow ? "frameOverflow" : "", (H1_STATES.has(r.state) && !r.h1) ? "noH1" : "", r.layoutPicker ? "layoutPicker" : "", r.demoWording ? "demoWording" : "", (r.route !== "s18" && r.fictionalFooter === false) ? "noFooter" : "", r.drawerOk === false ? "drawer" : "", r.twoCol === false ? "twoCol" : "", r.imgBroken > 0 ? "brokenImg" : "", r.imgOverflow ? "imgOverflow" : ""].filter(Boolean).join("+"); kinds[k] = (kinds[k] ?? 0) + 1; }
console.log("findings by kind:", JSON.stringify(kinds));
for (const r of bad.slice(0, 12)) console.log(JSON.stringify({ route: r.route, state: r.state, width: r.width, theme: r.theme, errors: r.errors, docOverflow: r.docOverflow, frameOverflow: r.frameOverflow, h1: r.h1, layoutPicker: r.layoutPicker, demoWording: r.demoWording, fictionalFooter: r.fictionalFooter, drawer: r.drawer, drawerOk: r.drawerOk, twoCol: r.twoCol, imgs: r.imgs }));
ws.close();
await fetch(`${DEBUG}/json/close/${target.id}`);
