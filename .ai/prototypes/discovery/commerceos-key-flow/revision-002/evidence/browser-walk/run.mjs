import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const [,, pageDir, outDir] = process.argv;
const PORT = 9333;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(outDir, { recursive: true });
const profile = outDir + '/profile';
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 80; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.some((t) => t.type === 'page')) break; } catch {} await sleep(250); }
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + JSON.stringify(m.params.args.map((a) => a.value ?? a.description))); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
const results = []; const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
const setViewport = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
await send('Page.enable'); await send('Runtime.enable');
const url = 'file:///' + pageDir.replace(/\\/g, '/') + '/index.html';
const go = async (hash, w = 1440, h = 900) => { await setViewport(w, h); await send('Page.navigate', { url: url + hash }); await sleep(400); };
const overflow = () => ev(`document.documentElement.scrollWidth > document.documentElement.clientWidth + 1`);

await go('#/home/a/default');
check('home A renders h1', await ev(`!!document.querySelector('h1')&&document.querySelector('h1').textContent.includes('desk that works')`));
check('review bar shows variant A current', await ev(`[...document.querySelectorAll('.review-bar a[aria-current="true"]')].some(a=>a.textContent.startsWith('A:'))`));
await ev(`document.querySelector('a[href="#/home/b/default"]').click()`); await sleep(200);
check('switch to B via review bar', await ev(`location.hash==='#/home/b/default' && document.querySelector('h1').textContent==='Shop all products'`));
await ev(`document.querySelector('a[href="#/home/c/default"]').click()`); await sleep(200);
check('switch to C', await ev(`document.querySelector('h1').textContent==='What are you setting up?'`));
await ev(`const s=document.getElementById('state-pick'); s.value='empty'; s.dispatchEvent(new Event('change',{bubbles:true}))`); await sleep(200);
check('state select to empty', await ev(`location.hash==='#/home/c/empty' && document.body.textContent.includes('No categories yet.')`));
await ev(`document.querySelector('a[href="#/copilot/a/answer-ai"]').click()`); await sleep(200);
check('nav to Copilot from review bar', await ev(`document.querySelector('h1').textContent==='Commerce Copilot'`));
await ev(`document.querySelector('a[href="#/home/a/default"]').click()`); await sleep(200);
check('admin side Storefront link goes home', await ev(`location.hash==='#/home/a/default'`));
await go('#/home/a/error');
check('home error state has alert', await ev(`!!document.querySelector('[role="alert"]') && document.body.textContent.includes('temporarily unavailable')`));
await ev(`document.querySelector('[role="alert"] a').click()`); await sleep(200);
check('retry returns to default', await ev(`location.hash==='#/home/a/default' && !!document.querySelector('.product-grid')`));
await go('#/home/b/loading');
check('loading skeleton', await ev(`!!document.querySelector('[aria-busy="true"]')`));

for (const v of ['a', 'b', 'c']) {
  await go(`#/copilot/${v}/answer-ai`);
  check(`copilot ${v} answer lists 3 recs`, await ev(`document.body.textContent.includes('Restock Keyboard K7') && document.body.textContent.includes('Headset H3') && document.body.textContent.includes('USB microphone Stream')`));
  check(`copilot ${v} shows AI source`, await ev(`document.body.textContent.includes('Source: AI-generated')`));
}
await go('#/copilot/a/answer-ai');
await ev(`[...document.querySelectorAll('button[data-action=rec]')].find(b=>b.dataset.to==='saved').click()`); await sleep(150);
check('save changes status to Saved', await ev(`document.body.textContent.includes('Status: Saved') && document.body.textContent.includes('Mark completed')`));
await go('#/copilot/c/answer-ai');
await ev(`document.querySelector('button[data-action=step][data-step="1"]').click()`); await sleep(150);
check('C next moves to rec 2', await ev(`document.body.textContent.includes('Recommendation 2 of 3')`));
await ev(`[...document.querySelectorAll('button[data-action=rec]')].find(b=>b.dataset.to==='dismissed').click()`); await sleep(150);
check('C dismiss shows Dismissed', await ev(`document.body.textContent.includes('Status: Dismissed') && document.body.textContent.includes('No further actions.')`));
await go('#/copilot/b/answer-ai');
check('B table and 3 details present', await ev(`!!document.querySelector('table.data-table') && document.querySelectorAll('details').length===3`));
for (const s of ['answer-not-configured','answer-timed-out','answer-daily-limit','answer-failed-checks']) {
  await go(`#/copilot/a/${s}`);
  check(`fallback ${s} shows rule-based source and recs`, await ev(`document.body.textContent.includes('rule-based insights') && document.body.textContent.includes('Restock Keyboard K7')`));
}
await go('#/copilot/b/empty-store');
check('copilot empty store sentence and 3 suggestions', await ev(`document.body.textContent.includes('No paid orders and no traffic in this period.')`) && await ev(`document.querySelectorAll('.suggest-row button').length===3`));
await go('#/copilot/a/error-500');
check('copilot error alert', await ev(`!!document.querySelector('[role="alert"]') && document.body.textContent.includes('Copilot is temporarily unavailable.')`));
await ev(`document.querySelector('[role="alert"] a').click()`); await sleep(200);
check('ask again returns to answer', await ev(`location.hash==='#/copilot/a/answer-ai'`));
await go('#/copilot/a/answer-ai');
await ev(`document.querySelector('form[data-form=ask]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`); await sleep(150);
check('ask form does not send, shows note', await ev(`document.body.textContent.includes('no question is sent')`));
await go('#/nope/x');
check('unknown route recovery page', await ev(`document.body.textContent.includes('Unknown page in this prototype')`));

await go('#/home/a/default');
await ev(`document.querySelector('button[data-action=theme]').click()`); await sleep(150);
check('dark theme applies .dark on html', await ev(`document.documentElement.classList.contains('dark')`));
await ev(`document.querySelector('button[data-action=theme]').click()`);

for (const [w, h] of [[320, 740], [390, 844], [768, 1024], [1440, 900]]) {
  for (const hash of ['#/home/a/default', '#/home/b/default', '#/home/c/default', '#/copilot/a/answer-ai', '#/copilot/b/answer-ai', '#/copilot/c/answer-ai']) {
    await go(hash, w, h);
    const o = await overflow();
    const culprit = o ? await ev(`[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right > document.documentElement.clientWidth+1).slice(0,4).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)).join(' ; ') + ' | admin=' + (document.querySelector('.admin')?.getBoundingClientRect().width) + ' tpl=' + (document.querySelector('.admin') && getComputedStyle(document.querySelector('.admin')).gridTemplateColumns) + ' root=' + document.getElementById('root').getBoundingClientRect().width + ' body=' + document.body.getBoundingClientRect().width + ' sw=' + document.documentElement.scrollWidth + ' cw=' + document.documentElement.clientWidth + ' iw=' + innerWidth`) : '';
    check(`no overflow ${w} ${hash}`, !o, o ? 'page scrolls sideways: ' + culprit : '');
  }
}
const shots = [['#/home/a/default', 1440, 900, 'home-a-1440'], ['#/home/b/default', 1440, 900, 'home-b-1440'], ['#/home/c/default', 1440, 900, 'home-c-1440'],
  ['#/copilot/a/answer-ai', 1440, 900, 'copilot-a-1440'], ['#/copilot/b/answer-ai', 1440, 900, 'copilot-b-1440'], ['#/copilot/c/answer-ai', 1440, 900, 'copilot-c-1440'],
  ['#/home/a/default', 320, 740, 'home-a-320'], ['#/home/b/default', 320, 740, 'home-b-320'], ['#/home/c/default', 320, 740, 'home-c-320'],
  ['#/copilot/a/answer-not-configured', 320, 740, 'copilot-a-fallback-320'], ['#/copilot/b/error-500', 320, 740, 'copilot-b-error-320'], ['#/copilot/c/empty-store', 320, 740, 'copilot-c-empty-320']];
for (const [hash, w, h, name] of shots) { await go(hash, w, h); await shot(name); }
check('no console errors or exceptions', errors.length === 0, errors.join(' | '));
writeFileSync(`${outDir}/results.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`checks: ${results.length}, failed: ${failed.length}`);
for (const f of failed) console.log('FAIL', f.name, f.detail);
ws.close(); chrome.kill();
