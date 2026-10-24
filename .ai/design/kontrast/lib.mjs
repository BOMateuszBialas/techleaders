// oklch -> sRGB (CSS Color 4), gamut clip, WCAG 2.x contrast
function oklchToLinear(L, C, H) {
  const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const enc = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const dec = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
function parse(str) { // "oklch(L C H)" or "oklch(L C H / a)"
  const m = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/);
  if (!m) throw new Error("bad " + str);
  let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { L: +m[1], C: +m[2], H: +m[3], a };
}
function toSrgb(str) {
  const { L, C, H, a } = parse(str);
  const lin = oklchToLinear(L, C, H);
  const inGamut = lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  const rgb = lin.map((v) => Math.min(1, Math.max(0, enc(Math.max(0, v)))));
  return { rgb, a, inGamut };
}
function composite(fg, bg) { // fg {rgb,a} over opaque bg rgb (gamma space, like browsers)
  return fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));
}
const hex = (rgb) => "#" + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
const lum = (rgb) => { const [r, g, b] = rgb.map((c) => dec(Math.round(c * 255) / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export { toSrgb, composite, hex, ratio };
