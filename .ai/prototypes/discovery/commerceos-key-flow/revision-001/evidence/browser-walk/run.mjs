// Drives the local prototype in an installed headless Chrome over the DevTools protocol (no new packages).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PORT = 9333;
const DIR = dirname(fileURLToPath(import.meta.url));
const PROTO = process.argv[2];
const EVID = process.argv[3];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.some((t) => t.type === 'page')) break; } catch {}
  await sleep(250);
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.exceptionThrown') errors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push('console.error: ' + JSON.stringify(msg.params.args.map((a) => a.value ?? a.description)));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.result.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails).slice(0, 600));
  return res.result.result.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: pathToFileURL(PROTO).href });
await sleep(800);

const scenario = readFileSync(join(DIR, 'scenario.js'), 'utf8');
const results = await evaluate(scenario);
const failed = results.filter((r) => !r.ok);
console.log(`scenario checks: ${results.length - failed.length}/${results.length} passed`);
for (const r of failed) console.log('  FAIL:', r.name, '|', r.detail);

// Narrow-viewport overflow check (320 px contract) for every screen
await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 800, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: pathToFileURL(PROTO).href + '#s01' });
await sleep(500);
const overflow = [];
for (const s of ['s01','s02','s03','s04','s05','s06','s07','s08','s09','s10','s11','s12','s13','s14','s15','s16','s17','s18','s19','unknown']) {
  const r = await evaluate(`(async () => { location.hash = '${s}'; await new Promise(r => setTimeout(r, 30)); const f = document.querySelector('[data-screen]:not([hidden])'); return { id: f.id, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; })()`);
  overflow.push(r);
}
console.log('320 px page overflow (scrollWidth > clientWidth):', overflow.filter((o) => o.sw > o.cw).map((o) => o.id + ' ' + o.sw + '>' + o.cw).join(', ') || 'none');

// Evidence screenshots at 1440 px and 320 px
if (EVID) {
  mkdirSync(EVID, { recursive: true });
  const shot = async (file, hash, width, acct = 'guest') => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    await send('Page.navigate', { url: pathToFileURL(PROTO).href + hash });
    await sleep(600);
    await evaluate(`(async () => { document.querySelector('[data-act="reset"]').click(); document.querySelector('[data-ctl="acct"][value="${acct}"]').click(); location.hash = '${hash}'; await new Promise(r => setTimeout(r, 40)); document.querySelector('[data-screen]:not([hidden]) h1').scrollIntoView(); return true; })()`);
    const { result } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(EVID, file), Buffer.from(result.data, 'base64'));
  };
  await shot('s01-home-1440.png', '#s01', 1440);
  await shot('s18-copilot-answer-320.png', '#s18', 320, 'owner');
}

console.log('runtime errors:', errors.length ? errors.join(' | ') : 'none');
ws.close();
process.exit(failed.length || errors.length ? 1 : 0);
