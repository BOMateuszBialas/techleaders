import { describe, expect, it } from "vitest";
import {
  buildDescriptionSources,
  isDemoNotes,
  MIN_NOTES_LENGTH,
  stripDemoMarker,
} from "./description-sources";

const VORTEX = {
  name: "Vortex Wireless Mouse",
  categoryId: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01",
  price: 24900,
  notes:
    "[DEMO] Wireless gaming mouse with a 26,000 DPI optical sensor, 70 hours of battery life and five programmable buttons.",
};

describe("buildDescriptionSources", () => {
  it("sends the four fields only, with a canonical price and without demo markers", () => {
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

  it("strips [DEMO] from the name too, and reads each field on its own", () => {
    const sources = buildDescriptionSources(
      { name: "[DEMO] Pulse", categoryId: null, price: 18990, notes: "no RGB" },
      null,
    );
    expect(sources.fields).toEqual({
      name: "Pulse",
      category: "",
      price: "189.90 PLN",
      notes: "no RGB",
    });
    expect(sources.numbers).toEqual(new Set(["189.9"]));
    expect(sources.mentions).toEqual(new Set(["rgb:-"]));
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
    const base = { name: "Mouse", categoryId: null, price: null };
    expect(buildDescriptionSources({ ...base, notes: "" }, null).insufficient).toBe(true);
    expect(buildDescriptionSources({ ...base, notes: notes.slice(1) }, null).insufficient).toBe(
      true,
    );
    // The demo marker does not count towards the notes.
    expect(
      buildDescriptionSources({ ...base, notes: `[DEMO] ${notes.slice(1)}` }, null).insufficient,
    ).toBe(true);
    expect(buildDescriptionSources({ ...base, notes }, null).insufficient).toBe(false);
    expect(buildDescriptionSources({ ...base, notes: "" }, "Mice").insufficient).toBe(false);
    expect(buildDescriptionSources({ ...base, name: "[DEMO]", notes }, "Mice").insufficient).toBe(
      true,
    );
  });
});

describe("demo markers", () => {
  it("detects a demo product by its notes and strips every marker", () => {
    expect(isDemoNotes("  [demo] text")).toBe(true);
    expect(isDemoNotes("text [DEMO]")).toBe(false);
    expect(stripDemoMarker("[DEMO] A [DEMO]  mouse ")).toBe("A mouse");
  });
});
