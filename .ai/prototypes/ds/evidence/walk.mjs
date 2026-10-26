// Headless CDP walk of the DS prototype (scratchpad script, not part of the repo).
// Loads each screen at 320 and 1440 px in light and dark, records console errors, exceptions,
// page-level sideways scroll and frame-level content overflow, and saves a few screenshots.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:4173/";
const DEBUG = "http://127.0.0.1:9333";
const OUT = process.argv[2];
const ROUTES = ["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s11", "s12", "s13", "s14", "s15", "s16", "s17", "s18", "s19", "components"];
const WIDTHS = [320, 1440];
const THEMES = ["light", "dark"];
const SHOTS = new Set(["s01@320", "s05@320", "s14@1440", "s18@320", "s16@1440", "components@320"]);

const target = await (await fetch(`${DEBUG}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0;
const pending = new Map();
const events = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) {
    events.push({ kind: `console.${msg.params.type}`, text: msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300) });
  } else if (msg.method === "Runtime.exceptionThrown") {
    events.push({ kind: "exception", text: (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0, 300) });
  } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
    events.push({ kind: "log.error", text: msg.params.entry.text.slice(0, 300) });
  }
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
};
await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");

const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const width of WIDTHS) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const theme of THEMES) {
    for (const route of ROUTES) {
      events.length = 0;
      await send("Page.navigate", { url: `${BASE}#${route}` });
      await sleep(900);
      // Set theme through the review bar button (the page's own control).
      await evaluate(`(() => { const want = ${JSON.stringify(theme)}; const b=[...document.querySelectorAll('button')].find(x=>/Dark theme|Light theme/.test(x.textContent)); if (b && ((b.textContent.includes('Light')) !== (want==='dark'))) b.click(); return true; })()`);
      await sleep(250);
      const m = await evaluate(`(() => {
        const frame = document.querySelector('[data-testid=screen-frame]');
        const h1 = document.querySelector('h1');
        return {
          frameOverflow: frame ? frame.scrollWidth > frame.clientWidth + 1 : null,
          frameScroll: frame ? [frame.scrollWidth, frame.clientWidth] : null,
          docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          heading: h1 ? h1.textContent.slice(0, 60) : null,
          dark: document.documentElement.classList.contains('dark'),
          status: (document.querySelector('[role=status]')||{}).textContent?.slice(-40) ?? null,
        };
      })()`);
      const key = `${route}@${width}`;
      if (SHOTS.has(key) && theme === "light") {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        writeFileSync(join(OUT, `${route}-${width}-${theme}.png`), Buffer.from(shot.result.data, "base64"));
      }
      results.push({ route, width, theme, ...m, errors: events.filter((e) => e.kind !== "console.warning") , warnings: events.filter((e) => e.kind === "console.warning").length });
    }
  }
}
writeFileSync(join(OUT, "walk-results.json"), JSON.stringify(results, null, 2));
const bad = results.filter((r) => r.errors.length || r.docOverflow || !r.heading || r.dark === undefined);
console.log(`checks: ${results.length}`);
console.log(`with errors, page overflow or no heading: ${bad.length}`);
for (const r of bad) console.log(JSON.stringify(r).slice(0, 400));
const frameOver = results.filter((r) => r.frameOverflow).map((r) => `${r.route}@${r.width}/${r.theme}`);
console.log(`frame content wider than frame: ${frameOver.length ? frameOver.join(", ") : "none"}`);
const themeMismatch = results.filter((r) => r.dark !== (r.theme === "dark"));
console.log(`theme mismatch: ${themeMismatch.length}`);
ws.close();
await fetch(`${DEBUG}/json/close/${target.id}`);
