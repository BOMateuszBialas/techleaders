import { toSrgb, hex, ratio } from "./lib.mjs";
import { light, dark, pairs } from "./tokens.mjs";
const themes = { light, dark };
const out = {};
for (const [name, t] of Object.entries(themes)) {
  out[name] = { hex: {}, pairs: [] };
  for (const k in t) {
    const s = toSrgb(t[k]);
    out[name].hex[k] = hex(s.rgb) + (s.inGamut ? "" : "!");
  }
  for (const [f, b, kind, note] of pairs) {
    const r = ratio(toSrgb(t[f]).rgb, toSrgb(t[b]).rgb);
    const th = kind === "T" ? 4.5 : 3;
    out[name].pairs.push({ f, b, kind, note, r: Math.floor(r * 100) / 100, ok: kind === "X" ? null : r >= th });
  }
}
for (const k of Object.keys(light))
  console.log(k.padEnd(26), light[k].padEnd(26), out.light.hex[k].padEnd(10), dark[k].padEnd(26), out.dark.hex[k]);
for (let i = 0; i < pairs.length; i++) {
  const a = out.light.pairs[i], d = out.dark.pairs[i];
  const flag = (p) => (p.ok === false ? "FAIL" : p.ok === null ? "ctl " : "ok  ");
  console.log(`${a.f} / ${a.b}`.padEnd(46), a.kind, String(a.r).padEnd(6), flag(a), String(d.r).padEnd(6), flag(d));
}
