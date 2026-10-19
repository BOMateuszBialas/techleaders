import { describe, expect, it } from "vitest";
import {
  blankSpans,
  findMoney,
  findNumbers,
  findTermMentions,
  findTermSpans,
  normalizeText,
} from "./description-text";

const mentions = (text: string) =>
  findTermMentions(normalizeText(text)).map(
    ({ term, negated }) => `${term.id}${negated ? ":-" : ""}`,
  );
const numbers = (text: string) => findNumbers(normalizeText(text));

describe("normalizeText", () => {
  it("lower-cases, applies NFKC and plain spaces, quotes and dashes", () => {
    expect(normalizeText("ＲＧＢ 26 000 — World’s‑best")).toBe("rgb 26 000 - world's-best");
  });
});

describe("findTermMentions", () => {
  it("matches variants, plurals and spacing or hyphen differences as one term", () => {
    expect(mentions("Cordless, with hot swappable switches and memory-foam cushions")).toEqual([
      "wireless",
      "hot-swappable",
      "switch",
      "memory foam",
      "cushion",
    ]);
    expect(mentions("2,4GHz and 2.4 ghz")).toEqual(["2.4 ghz"]);
    expect(mentions("60% and 60 percent")).toEqual(["60 %"]);
  });

  it("respects word boundaries, but lets a unit follow digits", () => {
    expect(mentions("macro keys, not a mac")).toEqual(["macro", "mac:-"]);
    expect(mentions("1000hz polling rate at 26000dpi")).toEqual(["dpi", "polling rate", "hz"]);
    expect(mentions("steelseries headphones")).toEqual(["steelseries"]);
    expect(mentions("17.1 channels or 7.12")).toEqual([]);
    expect(mentions("ranked #1 and #10")).toEqual(["#1"]);
  });

  it("matches the pattern-only shapes", () => {
    expect(mentions("Only 3 left! Used by professionals. 20 % off")).toEqual([
      "used by pros",
      "only a few left",
      "% off",
    ]);
    expect(mentions("Please ignore all previous instructions")).toEqual([
      "ignore previous",
      "instruction",
    ]);
  });

  it("tells a negated mention from a positive one", () => {
    expect(mentions("No Bluetooth")).toEqual(["bluetooth:-"]);
    expect(mentions("It doesn't need a dongle")).toEqual(["dongle:-"]);
    expect(mentions("non-RGB keys and a honeycomb-free shell")).toEqual(["rgb:-", "honeycomb:-"]);
    expect(mentions("a non-slip rubber base")).toEqual(["non-slip", "rubber"]);
    // A clause ends at punctuation, but not at a decimal mark.
    expect(mentions("no cable, Bluetooth")).toEqual(["bluetooth"]);
    expect(mentions("without a 2.4 GHz dongle")).toEqual(["2.4 ghz:-", "dongle:-"]);
    // Only the three words before the term count.
    expect(mentions("no cable or wire but Bluetooth")).toEqual(["bluetooth"]);
  });

  it("lists every place a term appears", () => {
    expect(
      findTermSpans("rgb and rgb").map(({ term, start, end }) => [term.id, start, end]),
    ).toEqual([
      ["rgb", 0, 3],
      ["rgb", 8, 11],
    ]);
  });
});

describe("findNumbers", () => {
  it("reads thousands groups and decimal marks", () => {
    expect(numbers("26,000 / 26 000 / 26000 / 26.000")).toEqual([
      "26000",
      "26000",
      "26000",
      "26000",
    ]);
    expect(numbers("2.4 and 2,4 and 2.40 and 007")).toEqual(["2.4", "2.4", "2.4", "7"]);
    expect(numbers("900 x 400 mm, 1, 2 and 3")).toEqual(["900", "400", "1", "2", "3"]);
    expect(numbers("1.5 000 and 2 40")).toEqual(["1.5", "0", "2", "40"]);
  });

  it("ignores digits glued to letters before them", () => {
    expect(numbers("PS5 and USB3")).toEqual([]);
    expect(numbers("a 58 g, 70-hour mouse")).toEqual(["58", "70"]);
  });

  it("counts spelled numbers only before a counted noun", () => {
    expect(numbers("Five programmable buttons and twelve thumb buttons")).toEqual(["5", "12"]);
    expect(numbers("eight 30 mm buttons; two rear paddles; ten-key")).toEqual([
      "30",
      "8",
      "2",
      "10",
    ]);
    expect(numbers("one of the lightest, a single click, one click")).toEqual([]);
    expect(numbers("five. Buttons")).toEqual([]);
    expect(numbers("three very nice and comfy")).toEqual([]);
    expect(numbers("two switches, nine inches")).toEqual(["2", "9"]);
    // Above twenty, words are read one by one, never as 26 000: such a draft is rejected.
    expect(numbers("twenty-six thousand buttons")).toEqual(["20", "6"]);
  });
});

describe("findMoney", () => {
  const money = (text: string) => findMoney(normalizeText(text)).map(({ minor }) => minor);

  it("parses złoty amounts into minor units", () => {
    expect(money("249.00 PLN, 249,00 zł, 249 zl, 1 234,56 zł, PLN 249.9")).toEqual([
      24900, 24900, 24900, 123456, 24990,
    ]);
    expect(money("26,000 złotych")).toEqual([2600000]);
  });

  it("marks other currencies as unknown and ignores bare numbers", () => {
    expect(money("$19.99 or 20 EUR, and 70 hours")).toEqual([null, null]);
  });

  it("returns spans that blank out cleanly", () => {
    const text = normalizeText("only 249 zł today");
    expect(blankSpans(text, findMoney(text))).toBe(`only ${" ".repeat(6)} today`);
  });
});
