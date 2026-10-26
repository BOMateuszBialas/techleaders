const DEBUG="http://127.0.0.1:9333";
const ROUTES=["s01","s02","s03","s04","s05","s06","s07","s11","s12","s13","s14","s15","s16","s17","s18","s19"];
const t=await (await fetch(`${DEBUG}/json/new?about:blank`,{method:"PUT"})).json();
const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
let id=0; const p=new Map(); const errs=[];
ws.onmessage=m=>{const x=JSON.parse(m.data); if(x.id&&p.has(x.id)){p.get(x.id)(x);p.delete(x.id);} else if(x.method==="Runtime.exceptionThrown") errs.push("exception: "+(x.params.exceptionDetails.exception?.description??"").slice(0,200)); else if(x.method==="Runtime.consoleAPICalled"&&x.params.type==="error") errs.push("console: "+x.params.args.map(a=>a.value??a.description??"").join(" ").slice(0,200)); else if(x.method==="Log.entryAdded"&&x.params.entry.level==="error"&&!/404/.test(x.params.entry.text)) errs.push("log: "+x.params.entry.text.slice(0,200));};
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async(e)=>(await send("Runtime.evaluate",{returnByValue:true,awaitPromise:true,expression:e})).result?.result?.value;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await send("Runtime.enable"); await send("Log.enable");
let total=0; const bad=[];
for (const width of [320,1440]) {
  await send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:false});
  for (const route of ROUTES) {
    await send("Page.navigate",{url:`http://localhost:4173/#${route}`});
    await sleep(800);
    const states = await ev(`[...document.querySelectorAll('#rb-state option')].map(o=>o.value)`);
    for (const st of states) {
      errs.length=0;
      await ev(`(()=>{const s=document.querySelector('#rb-state'); const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; set.call(s,${JSON.stringify(st)}); s.dispatchEvent(new Event('change',{bubbles:true})); return true;})()`);
      await sleep(120);
      const m = await ev(`(()=>{const f=document.querySelector('[data-testid=screen-frame]'); const h=document.querySelector('h1'); const pageOver=document.documentElement.scrollWidth>window.innerWidth+1; return {frame: f.scrollWidth>f.clientWidth+1, page: pageOver, h1: !!h, sel: document.querySelector('#rb-state').value, content: f.innerText.length};})()`);
      total++;
      if (m.sel!==st || m.frame || m.page || errs.length || m.content<5) bad.push({route,width,st,m,errs:[...errs]});
    }
  }
}
console.log("state checks:", total);
console.log("issues:", bad.length);
for (const b of bad.slice(0,30)) console.log(JSON.stringify(b).slice(0,300));
ws.close(); await fetch(`${DEBUG}/json/close/${t.id}`);
