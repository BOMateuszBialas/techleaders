const DEBUG="http://127.0.0.1:9333";
const t=await (await fetch(`${DEBUG}/json/new?about:blank`,{method:"PUT"})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let id=0; const p=new Map(); const errs=[];
ws.onmessage=m=>{const x=JSON.parse(m.data); if(x.id&&p.has(x.id)){p.get(x.id)(x);p.delete(x.id);} else if(x.method==="Runtime.exceptionThrown") errs.push("exception"); else if(x.method==="Runtime.consoleAPICalled"&&x.params.type==="error") errs.push("console"); else if(x.method==="Log.entryAdded"&&x.params.entry.level==="error"&&!/404/.test(x.params.entry.text)) errs.push("log");};
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async(e)=>(await send("Runtime.evaluate",{returnByValue:true,awaitPromise:true,expression:e})).result?.result?.value;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await send("Runtime.enable"); await send("Log.enable");
const out=[];
for (const width of [320,1440]) {
  await send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:false});
  for (const [route,lay] of [["s01","A"],["s01","B"],["s01","C"],["s18","A"],["s18","B"],["s18","C"]]) {
    await send("Page.navigate",{url:`http://localhost:4173/#${route}`}); await sleep(800);
    await ev(`(()=>{const s=document.querySelector('#rb-layout'); const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; set.call(s,${JSON.stringify(lay)}); s.dispatchEvent(new Event('change',{bubbles:true})); return true;})()`);
    await sleep(150);
    const m = await ev(`(()=>{const f=document.querySelector('[data-testid=screen-frame]'); return {sel: document.querySelector('#rb-layout').value, frame: f.scrollWidth>f.clientWidth+1, page: document.documentElement.scrollWidth>window.innerWidth+1, len: f.innerText.length}})()`);
    if (width===320) { const shot = await send("Page.captureScreenshot",{format:"png"}); require_fs(`${route}-${lay}-320.png`, shot.result.data); }
    out.push(`${route} ${lay} @${width}: sel=${m.sel} frameOverflow=${m.frame} pageOverflow=${m.page} textLen=${m.len}`);
  }
}
out.push("console/exception events: "+errs.length);
console.log(out.join("\n"));
ws.close(); await fetch(`${DEBUG}/json/close/${t.id}`);
async function require_fs(name, b64){ const {writeFileSync}=await import("node:fs"); writeFileSync(`${process.argv[2]}/${name}`, Buffer.from(b64,"base64")); }
