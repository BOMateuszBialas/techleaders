import { describe, expect, it } from "vitest";
import { CATALOG_TEXT_LIMIT, catalogText } from "./catalog-text";

/** Characters by code point, so no invisible character is typed into the source. */
const chars = (...codes: number[]) => String.fromCodePoint(...codes);
const ZWSP = chars(0x200b);
const ZWJ = chars(0x200d);
const BIDI_OVERRIDE = chars(0x202e);
const LRI = chars(0x2066);
const BOM = chars(0xfeff);
const SOFT_HYPHEN = chars(0x00ad);
const BELL = chars(0x07);
const DEL = chars(0x7f);
const NBSP = chars(0x00a0);
const Z_DOT = chars(0x017b);
const EMOJI = chars(0x1f600);

describe("catalogText", () => {
  it("removes zero-width, bidi and byte-order characters and control characters", () => {
    expect(catalogText(`Pulse${ZWSP}${ZWJ} Mouse${BIDI_OVERRIDE}${LRI}${BOM}`)).toBe("Pulse Mouse");
    expect(catalogText(`Soft${SOFT_HYPHEN}hyphen${BELL}bell${DEL}`)).toBe("Softhyphenbell");
    expect(catalogText("Line\nbreak\tand tab")).toBe("Linebreakand tab");
  });

  it("keeps the visible text, its Polish letters and no-break spaces", () => {
    const name = `  Mysz gamingowa ${Z_DOT}${NBSP}200  `;
    expect(catalogText(name)).toBe(`Mysz gamingowa ${Z_DOT}${NBSP}200`);
  });

  it("caps the length in code points, so no surrogate pair is cut", () => {
    const name = `${"a".repeat(CATALOG_TEXT_LIMIT - 1)}${EMOJI}${EMOJI}`;
    expect(catalogText(name)).toBe(`${"a".repeat(CATALOG_TEXT_LIMIT - 1)}${EMOJI}`);
    expect(catalogText("x".repeat(500))).toHaveLength(CATALOG_TEXT_LIMIT);
  });

  it("returns an empty text for characters only", () => {
    expect(catalogText(`${ZWSP}${BIDI_OVERRIDE}`)).toBe("");
  });
});
