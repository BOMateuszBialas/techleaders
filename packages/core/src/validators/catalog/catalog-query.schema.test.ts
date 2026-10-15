import { describe, expect, it } from "vitest";
import { parseCatalogQuery } from "./catalog-query.schema";
import { categorySlugSchema, productSlugSchema } from "./slug.schema";

describe("slug schemas", () => {
  it("accepts lowercase hyphenated slugs only", () => {
    expect(productSlugSchema.safeParse("v60-dripper").success).toBe(true);
    for (const bad of ["V60-Dripper", "v60--dripper", "-v60", "v60 dripper", "", "x".repeat(221)])
      expect(productSlugSchema.safeParse(bad).success).toBe(false);
  });

  it("normalises a category slug before checking it", () => {
    expect(categorySlugSchema.parse("  Coffee ")).toBe("coffee");
    expect(categorySlugSchema.safeParse("x".repeat(141)).success).toBe(false);
  });
});

describe("parseCatalogQuery", () => {
  it("means all products when no category is given", () => {
    expect(parseCatalogQuery({})).toEqual({ categoryInvalid: false });
    expect(parseCatalogQuery({ category: "   " })).toEqual({ categoryInvalid: false });
  });

  it("parses a category slug", () => {
    expect(parseCatalogQuery({ category: " Brewing " })).toEqual({
      category: "brewing",
      categoryInvalid: false,
    });
  });

  it("uses the first value of a repeated parameter", () => {
    expect(parseCatalogQuery({ category: ["coffee", "brewing"] })).toEqual({
      category: "coffee",
      categoryInvalid: false,
    });
    expect(parseCatalogQuery({ category: [] })).toEqual({ categoryInvalid: false });
  });

  it("flags a malformed category instead of throwing", () => {
    expect(parseCatalogQuery({ category: "not a slug!" })).toEqual({ categoryInvalid: true });
  });

  it("ignores unrelated parameters", () => {
    expect(parseCatalogQuery({ utm_source: "x" })).toEqual({ categoryInvalid: false });
  });
});
