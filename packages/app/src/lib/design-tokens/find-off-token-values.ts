/**
 * Finds values that bypass the design tokens (design system spec A10, lesson 06 prompt stage 1,
 * rule 3): color literals outside the token file, Tailwind palette classes (`bg-amber-100`,
 * `text-white`) and arbitrary values (`p-[13px]`, `text-[0.8rem]`). Arbitrary variants such as
 * `has-[>svg]:` or `data-[slot=x]:` select an element, not a value, so they are allowed; so is a
 * token reference (`size-(--control-h-md)`, `var(--action)`).
 * `npm run check:tokens` runs it and exits with 1 on any finding, so CI can use it later (A11).
 */

export type OffTokenKind = "color-literal" | "palette-class" | "arbitrary-value";

export type OffTokenFinding = {
  file: string;
  line: number;
  column: number;
  kind: OffTokenKind;
  match: string;
};

/** Directories scanned, relative to packages/app. */
export const TOKEN_SCAN_ROOTS = ["src", "stories", ".storybook"] as const;

const SCANNED_EXTENSIONS = [".ts", ".tsx", ".css"];
/** The token file itself, tests (they assert today's classes) and this scanner. */
const SKIPPED = [
  /(^|\/)src\/app\/globals\.css$/,
  /\.test\.tsx?$/,
  /(^|\/)src\/lib\/design-tokens\//,
];

const COLOR_LITERAL =
  /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/gi;

const PALETTE_COLORS =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_UTILITIES =
  "bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow|inset-shadow|drop-shadow";
const PALETTE_CLASS = new RegExp(
  `(?<![\\w-])(?:${COLOR_UTILITIES})-(?:(?:${PALETTE_COLORS})-(?:50|[1-9]00|950)|white|black)(?![\\w-])`,
  "g",
);

/**
 * `utility-[value]` not followed by `:` or `/name:` (those are arbitrary variants, including
 * named groups such as `group-data-[size=sm]/card:`).
 */
const ARBITRARY_VALUE = /(?<![\w-])[a-z][a-z0-9-]*-\[[^\]\s]+\](?![\w:-]|\/[\w-]+:)/g;

export function shouldScan(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  if (!SCANNED_EXTENSIONS.some((extension) => normalized.endsWith(extension))) return false;
  return !SKIPPED.some((pattern) => pattern.test(normalized));
}

export function findOffTokenValues(file: string, content: string): OffTokenFinding[] {
  const findings: OffTokenFinding[] = [];
  const patterns: Array<[OffTokenKind, RegExp]> = [
    ["color-literal", COLOR_LITERAL],
    ["palette-class", PALETTE_CLASS],
    ["arbitrary-value", ARBITRARY_VALUE],
  ];
  content.split("\n").forEach((text, index) => {
    for (const [kind, pattern] of patterns) {
      for (const match of text.matchAll(pattern)) {
        findings.push({ file, line: index + 1, column: match.index + 1, kind, match: match[0] });
      }
    }
  });
  return findings;
}

export type TokenCheckDeps = {
  /** Candidate files, relative to packages/app; unscanned ones are skipped here. */
  files: readonly string[];
  readFile(path: string): string;
  write(line: string): void;
};

/** Prints every finding as `file:line:column kind match` and returns the exit code. */
export function runTokenCheck({ files, readFile, write }: TokenCheckDeps): number {
  const scanned = files.filter(shouldScan).sort();
  const findings = scanned.flatMap((file) => findOffTokenValues(file, readFile(file)));
  for (const f of findings) write(`${f.file}:${f.line}:${f.column} ${f.kind} ${f.match}`);
  if (findings.length === 0) {
    write(`check:tokens: no values outside the tokens in ${scanned.length} files.`);
    return 0;
  }
  write(
    `check:tokens: ${findings.length} value(s) outside the tokens in ${scanned.length} files. ` +
      "Use a semantic token (globals.css) instead; see .ai/design/tokeny.md.",
  );
  return 1;
}
