import { describe, expect, it } from "vitest";
import { buildFacts, serializeFactContext } from "./build-facts";
import { lowStock, top } from "./copilot-results.fixture";

/** Characters by code point, so no invisible character is typed into the source. */
const chars = (...codes: number[]) => String.fromCodePoint(...codes);
const ZWSP = chars(0x200b);
const ZWNJ = chars(0x200c);
const BIDI_OVERRIDE = chars(0x202e);
const BOM = chars(0xfeff);

/** Regression (SEC-02, INJ-01): names and SKUs reached the model and the checks with invisible characters. */
describe("catalog names in the facts", () => {
  const HIDDEN = `Pulse${ZWSP} Mouse${BIDI_OVERRIDE}${BOM}`;

  it("sends and labels a sanitized name and SKU, in the product table and in every fact", () => {
    const table = buildFacts({
      topProducts: top([{ productId: "a", name: HIDDEN, units: 4, revenueMinor: 20 }]),
      lowStock: lowStock([
        { id: "a", name: HIDDEN, slug: "pulse", sku: `DEMO${ZWSP}-001`, stockQuantity: 2 },
      ]),
    });
    expect(table.products).toEqual([
      { alias: "p1", id: "a", name: "Pulse Mouse", sku: "DEMO-001" },
    ]);
    const labels = table.facts.map((fact) => fact.metric).join("|");
    expect(labels).toContain("Units sold: Pulse Mouse");
    expect(labels).toContain("Stock: Pulse Mouse");
    const context = serializeFactContext(table);
    expect(context).not.toMatch(new RegExp(`[${ZWSP}${BIDI_OVERRIDE}${BOM}]`, "u"));
    expect(context).toContain('"name":"Pulse Mouse"');
  });

  it("drops a SKU that is only format characters, and caps a long name", () => {
    const table = buildFacts({
      lowStock: lowStock([
        { id: "a", name: "x".repeat(300), slug: "x", sku: `${ZWSP}${ZWNJ}`, stockQuantity: 2 },
      ]),
    });
    expect(table.products).toEqual([{ alias: "p1", id: "a", name: "x".repeat(120), sku: null }]);
  });

  it("keeps a deleted product's sanitized name as its key", () => {
    const table = buildFacts({
      topProducts: top([{ productId: null, name: `Old${ZWSP} Lamp`, units: 1, revenueMinor: 1 }]),
    });
    expect(table.products).toEqual([{ alias: "p1", id: null, name: "Old Lamp", sku: null }]);
  });
});
