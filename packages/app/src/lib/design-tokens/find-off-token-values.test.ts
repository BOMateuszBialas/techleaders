import { describe, expect, it, vi } from "vitest";
import { findOffTokenValues, runTokenCheck, shouldScan } from "./find-off-token-values";

const kinds = (content: string) =>
  findOffTokenValues("x.tsx", content).map((finding) => [finding.kind, finding.match]);

describe("shouldScan", () => {
  it("scans TypeScript, TSX and CSS in the app, stories and Storybook config", () => {
    expect(shouldScan("src/components/cart/cart-link.tsx")).toBe(true);
    expect(shouldScan("src/lib/theme/theme.ts")).toBe(true);
    expect(shouldScan("stories/foundations/blocks/swatch.tsx")).toBe(true);
    expect(shouldScan(".storybook\\preview.tsx")).toBe(true);
    expect(shouldScan("src/app/other.css")).toBe(true);
  });

  it("skips the token file, tests, the scanner itself and other file types", () => {
    expect(shouldScan("src/app/globals.css")).toBe(false);
    expect(shouldScan("src/components/admin/redirect-notice.test.ts")).toBe(false);
    expect(shouldScan("src/components/x.test.tsx")).toBe(false);
    expect(shouldScan("src/lib/design-tokens/find-off-token-values.ts")).toBe(false);
    expect(shouldScan("stories/foundations/Colors.mdx")).toBe(false);
    expect(shouldScan("public/demo/products/mouse.svg")).toBe(false);
  });
});

describe("findOffTokenValues", () => {
  it("finds color literals in every CSS color syntax", () => {
    expect(
      kinds(
        `a #fff b #FFFFFF c #11223344 d rgb(1 2 3) rgba(0,0,0,.5) hsl(0 0% 0%) oklch(0.5 0.1 25)`,
      ),
    ).toEqual([
      ["color-literal", "#fff"],
      ["color-literal", "#FFFFFF"],
      ["color-literal", "#11223344"],
      ["color-literal", "rgb("],
      ["color-literal", "rgba("],
      ["color-literal", "hsl("],
      ["color-literal", "oklch("],
    ]);
    expect(kinds("oklab(1 0 0) lab(50 0 0) lch(50 0 0) color-mix(in oklch, red, blue)")).toEqual([
      ["color-literal", "oklab("],
      ["color-literal", "lab("],
      ["color-literal", "lch("],
      ["color-literal", "color-mix("],
    ]);
  });

  it("does not take ids, anchors or longer words for hex colors", () => {
    expect(kinds(`href="#top" id="#cafe-menu" "#12345" #abcdefgh`)).toEqual([]);
  });

  it("finds Tailwind palette classes, with variants and opacity", () => {
    expect(
      kinds(
        `"bg-amber-100 hover:text-emerald-700 border-amber-500/50 dark:bg-amber-950/30 text-white bg-black ring-offset-zinc-50 border-t-red-950"`,
      ),
    ).toEqual([
      ["palette-class", "bg-amber-100"],
      ["palette-class", "text-emerald-700"],
      ["palette-class", "border-amber-500"],
      ["palette-class", "bg-amber-950"],
      ["palette-class", "text-white"],
      ["palette-class", "bg-black"],
      ["palette-class", "ring-offset-zinc-50"],
      ["palette-class", "border-t-red-950"],
    ]);
  });

  it("ignores semantic token classes and words that only look like palette classes", () => {
    expect(
      kinds(`"bg-action text-muted-foreground border-input bg-amber text-red-555 my-text-white"`),
    ).toEqual([]);
  });

  it("finds arbitrary values but not arbitrary variants or token references", () => {
    expect(
      kinds(`"p-[13px] text-[0.8rem] ring-[3px] rounded-[min(var(--radius-md),10px)]"`),
    ).toEqual([
      ["arbitrary-value", "p-[13px]"],
      ["arbitrary-value", "text-[0.8rem]"],
      ["arbitrary-value", "ring-[3px]"],
      ["arbitrary-value", "rounded-[min(var(--radius-md),10px)]"],
    ]);
    expect(
      kinds(
        `"has-[>svg]:px-2 data-[slot=card]:p-4 group-data-[size=sm]/card:px-3 [&::-webkit-details-marker]:hidden size-(--control-h-md) items[0]"`,
      ),
    ).toEqual([]);
  });

  it("reports the line and column of each finding", () => {
    expect(findOffTokenValues("a.tsx", "ok\n  bg-amber-50 p-[2px]")).toEqual([
      { file: "a.tsx", line: 2, column: 3, kind: "palette-class", match: "bg-amber-50" },
      { file: "a.tsx", line: 2, column: 15, kind: "arbitrary-value", match: "p-[2px]" },
    ]);
  });
});

describe("runTokenCheck", () => {
  const files: Record<string, string> = {
    "src/clean.tsx": `<p className="text-success" />`,
    "src/dirty.tsx": `<p className="text-amber-700" />`,
    "src/app/globals.css": `--raw-red-600: oklch(0.5 0.19 25);`,
    "src/dirty.test.ts": `"text-emerald-700"`,
  };

  it("prints each finding and returns 1 when values bypass the tokens", () => {
    const write = vi.fn();
    const code = runTokenCheck({
      files: Object.keys(files),
      readFile: (path) => files[path] ?? "",
      write,
    });
    expect(code).toBe(1);
    expect(write.mock.calls.map(([line]) => line)).toEqual([
      "src/dirty.tsx:1:15 palette-class text-amber-700",
      "check:tokens: 1 value(s) outside the tokens in 2 files. Use a semantic token (globals.css) instead; see .ai/design/tokeny.md.",
    ]);
  });

  it("returns 0 when every scanned file uses tokens only", () => {
    const write = vi.fn();
    const code = runTokenCheck({
      files: ["src/clean.tsx", "src/app/globals.css"],
      readFile: (path) => files[path] ?? "",
      write,
    });
    expect(code).toBe(0);
    expect(write).toHaveBeenCalledWith("check:tokens: no values outside the tokens in 1 files.");
  });
});
