import { describe, expect, it } from "vitest";
import { buildDescriptionSources, isDemoSku, MIN_NOTES_LENGTH } from "./description-sources";

const VORTEX = {
  name: "Vortex Wireless Mouse",
  categoryId: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01",
  price: 24900,
  notes:
    "Wireless gaming mouse with a 26,000 DPI optical sensor, 70 hours of battery life and five programmable buttons.",
  sku: "DEMO-MOU-001",
};

describe("buildDescriptionSources", () => {
  it("sends the four fields only, with a canonical price, and reads the demo flag from the SKU", () => {
    const sources = buildDescriptionSources(VORTEX, "Mice");
    expect(sources.fields).toEqual({
      name: "Vortex Wireless Mouse",
      category: "Mice",
      price: "249.00 PLN",
      notes:
        "Wireless gaming mouse with a 26,000 DPI optical sensor, 70 hours of battery life and five programmable buttons.",
    });
    expect(sources).toMatchObject({
      priceMinor: 24900,
      demo: true,
      insufficient: false,
      fieldsUsed: ["name", "category", "price", "notes"],
    });
    expect([...sources.numbers].sort()).toEqual(["249", "26000", "5", "70"]);
    expect([...sources.mentions]).toContain("wireless:+");
    expect([...sources.mentions]).toContain("programmable:+");
  });

  it("is not a demo product without a DEMO- SKU, whatever the text says (OA-3)", () => {
    const sources = buildDescriptionSources(
      { name: "Pulse", categoryId: null, price: 18990, notes: "[DEMO] no RGB", sku: "OWN-0001" },
      null,
    );
    expect(sources.fields).toEqual({
      name: "Pulse",
      category: "",
      price: "189.90 PLN",
      notes: "[DEMO] no RGB",
    });
    expect(sources.numbers).toEqual(new Set(["189.9"]));
    expect(sources.demo).toBe(false);
  });

  it("treats a blank or 0.00 price as not set", () => {
    for (const price of [null, 0]) {
      const sources = buildDescriptionSources({ ...VORTEX, price }, "Mice");
      expect(sources.priceMinor).toBeNull();
      expect(sources.fields.price).toBe("");
      expect(sources.fieldsUsed).toEqual(["name", "category", "notes"]);
    }
  });

  it("needs a name plus a category or 20+ characters of notes (A5)", () => {
    const notes = "x".repeat(MIN_NOTES_LENGTH);
    const base = { name: "Mouse", categoryId: null, price: null, sku: "" };
    expect(buildDescriptionSources({ ...base, notes: "" }, null).insufficient).toBe(true);
    expect(buildDescriptionSources({ ...base, notes: notes.slice(1) }, null).insufficient).toBe(
      true,
    );
    expect(buildDescriptionSources({ ...base, notes }, null).insufficient).toBe(false);
    expect(buildDescriptionSources({ ...base, notes: "" }, "Mice").insufficient).toBe(false);
    expect(buildDescriptionSources({ ...base, name: "", notes }, "Mice").insufficient).toBe(true);
  });
});

describe("isDemoSku", () => {
  it("marks a DEMO- SKU as demo content, ignoring case and surrounding spaces", () => {
    expect(isDemoSku("DEMO-MOU-001")).toBe(true);
    expect(isDemoSku(" demo-mou-001 ")).toBe(true);
  });

  it("does not mark any other SKU, including one that only contains DEMO", () => {
    expect(isDemoSku("")).toBe(false);
    expect(isDemoSku("OWN-DEMO-1")).toBe(false);
    expect(isDemoSku("DEMO")).toBe(false);
  });
});
