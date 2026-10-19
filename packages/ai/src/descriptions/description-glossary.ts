/**
 * The vocabulary the description grounding checks (descriptions spec, "Grounding rules"). One
 * versioned module: a term the D10 catalog (gaming accessories) needs and this list lacks is a
 * gap in the check, so `description-glossary.test.ts` fails when a seeded description holds a word
 * that is neither a glossary term nor on its list of plain words.
 *
 * Variants are written lower-case. When matching, a space or hyphen inside a variant matches a
 * space, a hyphen or nothing ("memory foam" = "memory-foam"), a dot between digits matches a dot
 * or a comma ("2.4 ghz" = "2,4ghz"), and a variant ending in a letter also matches its plural
 * ("switch" = "switches"). All variants of a term are one fact: "cordless" in a draft is grounded
 * by "wireless" in the owner's fields.
 */
export const DESCRIPTION_GLOSSARY_VERSION = "description-glossary-2026-10-19.1";

/**
 * - `feature`, `compatibility`, `claim`: allowed in a draft only when the owner's fields mention
 *   the term too, with the same polarity (codes `unsupported_feature`, `unsupported_compatibility`,
 *   `unsupported_claim`).
 * - `commerce`: stock, delivery and promotions; never allowed (`commerce_talk`).
 * - `instruction`: prompt-leak or injection echoes; never allowed (`instruction_text`).
 */
export type GlossaryKind = "feature" | "compatibility" | "claim" | "commerce" | "instruction";

export type GlossaryTerm = {
  /** The term's canonical name: its first variant. Safe to send back to the model. */
  id: string;
  kind: GlossaryKind;
  group: string;
  variants: readonly string[];
  /** Extra regular expressions (lower-case text) for shapes a word list cannot express. */
  patterns?: readonly string[];
};

function terms(
  kind: GlossaryKind,
  group: string,
  ...entries: ReadonlyArray<readonly string[] | { variants: string[]; patterns: string[] }>
): GlossaryTerm[] {
  return entries.map((entry) => {
    const variants = "patterns" in entry ? entry.variants : entry;
    const patterns = "patterns" in entry ? entry.patterns : undefined;
    return {
      id: variants[0] ?? "",
      kind,
      group,
      variants,
      ...(patterns ? { patterns } : {}),
    };
  });
}

/** Spelled numbers counted on both sides (zero to twenty), only before a counted noun. */
export const SPELLED_NUMBERS: Readonly<Record<string, number>> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

/**
 * Nouns and units a spelled number counts ("five buttons", "two rear paddles", "eight 30 mm
 * buttons"), in the singular. "one of the lightest" or "one click" are not numbers.
 */
export const COUNTED_NOUNS: ReadonlySet<string> = new Set([
  "axis",
  "button",
  "cable",
  "channel",
  "cm",
  "color",
  "colour",
  "cpi",
  "day",
  "device",
  "dpi",
  "driver",
  "g",
  "ghz",
  "gram",
  "hour",
  "hz",
  "inch",
  "key",
  "kg",
  "khz",
  "layer",
  "level",
  "m",
  "macro",
  "mah",
  "meter",
  "metre",
  "minute",
  "mm",
  "mode",
  "month",
  "ms",
  "paddle",
  "percent",
  "port",
  "preset",
  "profile",
  "setting",
  "side",
  "size",
  "stick",
  "switch",
  "time",
  "trigger",
  "weight",
  "week",
  "year",
  "zone",
]);

const FEATURES: GlossaryTerm[] = [
  ...terms(
    "feature",
    "connectivity",
    ["wireless", "cordless", "cable-free"],
    ["wired", "corded"],
    ["bluetooth"],
    ["2.4 ghz"],
    ["usb-c", "type-c"],
    ["dongle", "receiver"],
    ["tri-mode", "triple-mode"],
    ["jack", "aux"],
  ),
  ...terms(
    "feature",
    "sensors",
    ["sensor"],
    ["dpi"],
    ["cpi"],
    ["polling rate"],
    ["hz"],
    ["optical"],
    ["laser"],
    ["hall-effect"],
    ["magnetic"],
    ["latency"],
  ),
  ...terms(
    "feature",
    "build",
    ["mechanical"],
    ["hot-swappable", "hot-swap"],
    ["switch"],
    ["linear"],
    ["tactile"],
    ["clicky"],
    ["keycap"],
    ["pbt"],
    ["abs"],
    ["rgb", "backlit", "backlight", "backlighting", "lighting"],
    ["aluminium", "aluminum"],
    ["steel"],
    ["braided"],
    ["paracord"],
    ["detachable", "removable"],
    ["foldable", "folding"],
    ["lightweight", "ultralight", "ultra-lightweight"],
    ["honeycomb"],
    ["ergonomic"],
    ["ambidextrous"],
    ["tkl", "tenkeyless"],
    ["60 %", "60 percent"],
    ["full-size", "full-sized"],
    ["numpad", "number pad", "numeric keypad"],
    ["volume roller", "volume wheel", "volume dial", "volume knob"],
    ["wrist rest", "palm rest"],
    ["d-pad"],
    ["paddle"],
    ["thumbstick", "joystick", "analog stick", "analogue stick"],
    ["trigger"],
    ["ball-top"],
    ["lever"],
    ["memory foam"],
    ["cushion", "ear pad", "earpad"],
    ["cloth"],
    ["glass", "tempered"],
    ["speed surface"],
    ["control surface"],
    ["textured"],
    ["etched"],
    ["stitched"],
    ["non-slip", "anti-slip"],
    ["rubber"],
  ),
  ...terms(
    "feature",
    "audio",
    ["surround"],
    ["7.1"],
    ["stereo"],
    ["noise cancelling", "noise canceling", "noise-cancellation", "noise cancellation"],
    ["anc"],
    ["microphone", "mic"],
    ["driver"],
  ),
  ...terms(
    "feature",
    "power",
    ["battery", "batteries"],
    ["mah"],
    ["hour", "hr"],
    ["charging", "charge", "charger"],
    ["rechargeable"],
  ),
  ...terms(
    "feature",
    "software",
    ["macro"],
    ["programmable", "customisable", "customizable", "remappable"],
    ["profile"],
    ["on-board memory"],
    ["software", "app"],
    ["hotkey"],
    ["mmo"],
    ["moba"],
  ),
  ...terms(
    "feature",
    "resistance",
    ["waterproof"],
    ["water-resistant"],
    ["spill-proof", "spill-resistant"],
  ),
];

const COMPATIBILITY: GlossaryTerm[] = [
  ...terms(
    "compatibility",
    "platforms",
    ["pc", "windows"],
    ["mac", "macos", "macbook"],
    ["playstation"],
    ["ps4"],
    ["ps5"],
    ["xbox"],
    // The bare word "switch" is a keyboard part (feature group "build"), never a platform.
    ["nintendo switch"],
    ["steam deck"],
    ["handheld"],
    ["mobile", "smartphone", "phone", "tablet"],
    ["android"],
    ["ios", "iphone", "ipad"],
    ["console"],
    ["linux"],
  ),
  ...terms(
    "compatibility",
    "brands",
    ["logitech"],
    ["razer"],
    ["steelseries"],
    ["corsair"],
    ["hyperx"],
    ["nintendo"],
    ["sony"],
    ["microsoft"],
  ),
];

const CLAIMS: GlossaryTerm[] = terms(
  "claim",
  "claims",
  ["warranty"],
  ["guarantee", "guaranteed"],
  ["award", "award-winning"],
  ["certified", "certification"],
  ["official", "officially"],
  ["licensed"],
  ["eco", "eco-friendly", "sustainable"],
  ["recycled"],
  ["bestseller", "best-seller", "best-selling"],
  { variants: ["used by pros"], patterns: ["used by (?:the )?(?:pros|professionals|esports)"] },
  ["best"],
  ["fastest"],
  ["#1", "number one", "no. 1"],
  ["world's"],
  ["ultimate"],
  ["unbeatable"],
);

const COMMERCE: GlossaryTerm[] = terms(
  "commerce",
  "availability",
  ["in stock", "out of stock", "stock"],
  {
    variants: ["only a few left"],
    patterns: ["only (?:\\d+|[a-z]+) left", "\\d+ left in"],
  },
  ["ships", "ship", "shipped"],
  ["shipping"],
  ["delivery", "delivered", "deliveries"],
  ["dispatch", "dispatched"],
  ["discount", "discounted"],
  ["sale", "on sale"],
  { variants: ["% off", "percent off"], patterns: ["\\d+ ?% off"] },
  ["limited"],
  ["deal"],
  ["order now", "buy now"],
  ["cheap", "cheapest", "bargain", "low price"],
);

const INSTRUCTIONS: GlossaryTerm[] = terms(
  "instruction",
  "injection",
  {
    variants: ["ignore previous"],
    patterns: ["ignore (?:all |any |the |your )*(?:previous|prior|above|rules|instructions)"],
  },
  ["system prompt"],
  ["as an ai", "language model"],
  ["instruction"],
);

/** Every term, in a fixed order (feature, compatibility, claim, commerce, instruction). */
export const DESCRIPTION_GLOSSARY: readonly GlossaryTerm[] = [
  ...FEATURES,
  ...COMPATIBILITY,
  ...CLAIMS,
  ...COMMERCE,
  ...INSTRUCTIONS,
];
