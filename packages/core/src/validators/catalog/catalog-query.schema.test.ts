import { describe, expect, it } from "vitest";
import { parseCatalogQuery } from "./catalog-query.schema";
import { categorySlugSchema, productSlugSchema } from "./slug.schema";

describe("slug schemas", () => {
  it("accepts lowercase hyphenated slugs only", () => {
    expect(productSlugSchema.safeParse("vortex-wireless-mouse").success).toBe(true);
    for (const bad of [
      "Vortex-Mouse",
      "vortex--mouse",
      "-vortex",
      "vortex mouse",
      "",
      "x".repeat(221),
    ])
      expect(productSlugSchema.safeParse(bad).success).toBe(false);
  });

  it("normalises a category slug before checking it", () => {
    expect(categorySlugSchema.parse("  Mice ")).toBe("mice");
    expect(categorySlugSchema.safeParse("x".repeat(141)).success).toBe(false);
  });
});

describe("parseCatalogQuery", () => {
  it("means all products when no category is given", () => {
    expect(parseCatalogQuery({})).toEqual({ categoryInvalid: false });
    expect(parseCatalogQuery({ category: "   " })).toEqual({ categoryInvalid: false });
  });

  it("parses a category slug", () => {
    expect(parseCatalogQuery({ category: " Keyboards " })).toEqual({
      category: "keyboards",
      categoryInvalid: false,
    });
  });

  it("uses the first value of a repeated parameter", () => {
    expect(parseCatalogQuery({ category: ["mice", "keyboards"] })).toEqual({
      category: "mice",
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
