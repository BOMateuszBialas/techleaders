import { describe, expect, it } from "vitest";
import { leadSentence } from "./product-page-copy";

describe("leadSentence", () => {
  it("returns the first sentence of the description", () => {
    expect(
      leadSentence(
        "Wireless gaming mouse with a 26,000 DPI sensor. A light body for long sessions.",
      ),
    ).toBe("Wireless gaming mouse with a 26,000 DPI sensor.");
  });

  it("returns the whole text when it has no sentence end", () => {
    expect(leadSentence("Plain text without a full stop")).toBe("Plain text without a full stop");
  });

  it("collapses whitespace and line breaks", () => {
    expect(leadSentence("  A   mouse\n with  two modes.  ")).toBe("A mouse with two modes.");
  });

  it("cuts a long sentence at a word boundary and marks the cut", () => {
    const long = `${"word ".repeat(60).trim()}`;
    const lead = leadSentence(long);
    expect(lead.endsWith("…")).toBe(true);
    expect(lead.length).toBeLessThanOrEqual(161);
    expect(lead).toMatch(/^word( word)*…$/);
  });

  it("cuts a long run of characters without spaces at the limit", () => {
    const lead = leadSentence("x".repeat(200));
    expect(lead).toBe(`${"x".repeat(160)}…`);
  });

  it("returns an empty string for an empty description", () => {
    expect(leadSentence("   ")).toBe("");
  });
});
