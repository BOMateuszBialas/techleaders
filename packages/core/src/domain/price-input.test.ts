import { describe, expect, it } from "vitest";
import { formatPriceInput, MAX_PRICE_MINOR, parsePriceInput } from "./money";

describe("parsePriceInput", () => {
  it.each([
    ["249.90", 24990],
    ["249,90", 24990],
    ["249,9", 24990],
    ["249", 24900],
    [" 12.05 ", 1205],
    ["0", 0],
    ["0.01", 1],
    ["21474836.47", MAX_PRICE_MINOR],
  ])("parses %j into %d minor units", (text, minor) => {
    expect(parsePriceInput(text)).toBe(minor);
  });

  it.each([
    "12.345",
    "-1",
    "+1",
    "1e3",
    "abc",
    "",
    "1.",
    ".5",
    "1 000",
    "1,000.00",
    "21474836.48",
    "99999999999",
  ])("rejects %j", (text) => {
    expect(parsePriceInput(text)).toBeNull();
  });
});

describe("formatPriceInput", () => {
  it.each([
    [24990, "249.90"],
    [1205, "12.05"],
    [5, "0.05"],
    [0, "0.00"],
  ])("formats %d as %j", (minor, text) => {
    expect(formatPriceInput(minor)).toBe(text);
  });

  it("round-trips with parsePriceInput", () => {
    for (const minor of [0, 1, 99, 100, 24990, MAX_PRICE_MINOR]) {
      expect(parsePriceInput(formatPriceInput(minor))).toBe(minor);
    }
  });
});
