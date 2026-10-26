import { describe, expect, it } from "vitest";
import { descriptionDraftSchema } from "./description-draft.schema";
import { CATEGORY_CHOICE_MESSAGE, PRICE_FORMAT_MESSAGE } from "./product-input.schema";

const MICE_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01";

function errors(input: unknown): Record<string, string[]> {
  const result = descriptionDraftSchema.safeParse(input);
  if (result.success) throw new Error("expected invalid input");
  const found: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    found[field] = [...(found[field] ?? []), issue.message];
  }
  return found;
}

describe("descriptionDraftSchema", () => {
  it("trims the fields and parses the price into minor units", () => {
    expect(
      descriptionDraftSchema.parse({
        name: " Vortex Wireless Mouse ",
        categoryId: ` ${MICE_ID} `,
        price: " 249,00 ",
        notes: "  26,000 DPI.  ",
        sku: " DEMO-MOU-001 ",
      }),
    ).toEqual({
      name: "Vortex Wireless Mouse",
      categoryId: MICE_ID,
      price: 24900,
      notes: "26,000 DPI.",
      sku: "DEMO-MOU-001",
    });
  });

  it("allows a blank or missing category, price, notes and SKU", () => {
    expect(descriptionDraftSchema.parse({ name: "Mouse", categoryId: "", price: " " })).toEqual({
      name: "Mouse",
      categoryId: null,
      price: null,
      notes: "",
      sku: "",
    });
    expect(descriptionDraftSchema.parse({ name: "Mouse" })).toEqual({
      name: "Mouse",
      categoryId: null,
      price: null,
      notes: "",
      sku: "",
    });
  });

  it("uses the product form's messages and limits", () => {
    expect(errors({ name: "  " })).toEqual({ name: ["Enter a name."] });
    expect(errors({ name: "x".repeat(201) })).toEqual({ name: ["Use at most 200 characters."] });
    expect(errors({ name: "Mouse", notes: "x".repeat(5001) })).toEqual({
      notes: ["Use at most 5000 characters."],
    });
    expect(errors({ name: "Mouse", sku: "x".repeat(65) })).toEqual({
      sku: ["Use at most 64 characters."],
    });
    expect(errors({ name: "Mouse", price: "12.345" })).toEqual({ price: [PRICE_FORMAT_MESSAGE] });
    expect(errors({ name: "Mouse", categoryId: "mice" })).toEqual({
      categoryId: [CATEGORY_CHOICE_MESSAGE],
    });
  });
});
