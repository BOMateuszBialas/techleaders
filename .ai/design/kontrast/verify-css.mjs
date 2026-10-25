// Recounts contrast for the values actually written in globals.css (tokeny.md, rule 19).
// Reads the raw palette and the light (`:root, .light`) and dark (`.dark`) semantic blocks,
// checks that every token matches the approved mapping in tokens.mjs, then prints every pair
// that falls below its threshold. Exit code 1 on a mismatch or a failing pair.
// Usage: node .ai/design/kontrast/verify-css.mjs [path/to/globals.css]
import { readFileSync } from "node:fs";
import { composite, ratio, toSrgb } from "./lib.mjs";
import { D, L, backdrop as approvedBackdrop, pairs, raw as approvedRaw } from "./tokens.mjs";

const file = process.argv[2] ?? "packages/app/src/app/globals.css";
const css = readFileSync(file, "utf8");

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`block not found: ${selector}`);
  return css.slice(start, css.indexOf("\n}", start));
}

const raw = {};
for (const m of css.matchAll(/--raw-([a-z]+-\d+):\s*(oklch\([^)]*\))/g)) raw[m[1]] = m[2];

function semantic(selector) {
  const out = {};
  for (const m of block(selector).matchAll(/--([a-z-]+):\s*var\(--raw-([a-z]+-\d+)\)/g)) out[m[1]] = m[2];
  return out;
}

const written = { light: semantic(":root,\n.light"), dark: semantic(".dark") };
const approved = { light: L, dark: D };
let failures = 0;

const numbers = (value) => (value ?? "").match(/[\d.]+/g)?.map(Number).join(" ");
for (const [name, value] of Object.entries(approvedRaw)) {
  if (numbers(raw[name]) !== numbers(value)) {
    failures++;
    console.log(`MISMATCH --raw-${name}: written ${raw[name]}, approved ${value}`);
  }
}

for (const theme of ["light", "dark"]) {
  for (const [token, rawName] of Object.entries(approved[theme])) {
    if (written[theme][token] !== rawName) {
      failures++;
      console.log(`MISMATCH ${theme} --${token}: written ${written[theme][token]}, approved ${rawName}`);
    }
  }
  const color = (token) => raw[written[theme][token]];
  let ok = 0;
  for (const [fg, bg, kind, note] of pairs) {
    if (kind === "X") continue;
    const r = Math.floor(ratio(toSrgb(color(fg)).rgb, toSrgb(color(bg)).rgb) * 100) / 100;
    const decorative = fg === "border"; // tokeny.md §2, pairs 57–58: decorative by rule 12
    if (r >= (kind === "T" ? 4.5 : 3) || decorative) ok++;
    else {
      failures++;
      console.log(`BELOW ${theme} --${fg} on --${bg}: ${r}:1 (${note})`);
    }
  }
  console.log(`${theme}: ${Object.keys(written[theme]).length} tokens from the raw layer, ${ok} pairs at or above threshold`);

  // Dialog backdrop (B4.5): a translucent literal, not a raw token. Check the value, then report
  // the dialog surface against the dimmed page (decorative edge; the dialog also has an outline).
  const writtenBackdrop = block(theme === "light" ? ":root,\n.light" : ".dark").match(
    /--backdrop:\s*(oklch\([^)]*\))/,
  )?.[1];
  if (numbers(writtenBackdrop) !== numbers(approvedBackdrop[theme])) {
    failures++;
    console.log(`MISMATCH ${theme} --backdrop: written ${writtenBackdrop}, approved ${approvedBackdrop[theme]}`);
  } else {
    const dimmed = composite(toSrgb(writtenBackdrop), toSrgb(color("background")).rgb);
    const edge = Math.floor(ratio(toSrgb(color("popover")).rgb, dimmed) * 100) / 100;
    console.log(`${theme}: --backdrop ok; dialog to dimmed page ${edge}:1 (decorative)`);
  }
}

if (failures > 0) {
  console.log(`${failures} problem(s)`);
  process.exitCode = 1;
} else {
  console.log("globals.css matches tokeny.md; every non-decorative pair passes");
}
