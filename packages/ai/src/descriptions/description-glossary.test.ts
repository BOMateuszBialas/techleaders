import { describe, expect, it } from "vitest";
import { SEEDED_PRODUCTS } from "../evals/descriptions/seeded-products";
import { DESCRIPTION_GLOSSARY, SPELLED_NUMBERS } from "./description-glossary";
import { blankSpans, findMoney, findTermSpans, normalizeText } from "./description-text";

/**
 * Words of the seeded descriptions that are deliberately not glossary terms: product types,
 * grammar and plain prose. A new seeded word must be added either here (plain) or to the
 * glossary (a fact the draft may only repeat), so the check never misses catalog vocabulary
 * silently (descriptions spec, "Grounding rules").
 */
const PLAIN_WORDS = new Set([
  "a",
  "an",
  "and",
  "arcade",
  "base",
  "buttons",
  "cable",
  "classic",
  "cleaning",
  "compact",
  "consistent",
  "controller",
  "covers",
  "desk",
  "ear",
  "easy",
  "edges",
  "emulated",
  "extended",
  "fast",
  "fight",
  "flexible",
  "flick",
  "for",
  "free",
  "g",
  "games",
  "gaming",
  "glide",
  "grid",
  "headset",
  "in",
  "key",
  "keyboard",
  "layout",
  "life",
  "low",
  "medium",
  "mm",
  "more",
  "mouse",
  "mousepad",
  "of",
  "per",
  "platformers",
  "precise",
  "put",
  "rear",
  "room",
  "shell",
  "shots",
  "side",
  "sound",
  "stays",
  "stick",
  "sticks",
  "surface",
  "swipes",
  "that",
  "the",
  "thumb",
  "virtual",
  "whole",
  "wide",
  "with",
  "works",
  "x",
]);

describe("DESCRIPTION_GLOSSARY", () => {
  it("has one lower-case canonical name per term", () => {
    const ids = DESCRIPTION_GLOSSARY.map((term) => term.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const term of DESCRIPTION_GLOSSARY) {
      expect(term.id).toBe(term.variants[0]);
      expect(term.variants.every((variant) => variant === variant.toLowerCase())).toBe(true);
    }
  });

  it("covers every group the spec names", () => {
    const groups = [...new Set(DESCRIPTION_GLOSSARY.map((term) => `${term.kind}/${term.group}`))];
    expect(groups.sort()).toEqual(
      [
        "claim/claims",
        "commerce/availability",
        "compatibility/brands",
        "compatibility/platforms",
        "feature/audio",
        "feature/build",
        "feature/connectivity",
        "feature/power",
        "feature/resistance",
        "feature/sensors",
        "feature/software",
        "instruction/injection",
      ].sort(),
    );
  });

  it.each(SEEDED_PRODUCTS.map((product) => [product.slug, product.description]))(
    "resolves every feature-like word of the seeded %s description to a glossary group",
    (_slug, description) => {
      const text = normalizeText(description);
      const rest = blankSpans(text, [...findTermSpans(text), ...findMoney(text)]);
      const words = rest.match(/\p{L}+/gu) ?? [];
      const unknown = words.filter((word) => !PLAIN_WORDS.has(word) && !(word in SPELLED_NUMBERS));
      expect(unknown).toEqual([]);
    },
  );
});
