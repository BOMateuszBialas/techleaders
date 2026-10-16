import { describe, expect, it } from "vitest";
import {
  CATALOG_SEARCH_MAX_LENGTH,
  catalogSearchSchema,
  parseCatalogQuery,
} from "./catalog-query.schema";
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

describe("catalog search term (q)", () => {
  it("trims the term and collapses whitespace", () => {
    expect(parseCatalogQuery({ q: "  wireless 	  mouse " })).toEqual({
      categoryInvalid: false,
      q: "wireless mouse",
    });
  });

  it("treats a missing, empty or whitespace-only term as no search", () => {
    for (const raw of [{}, { q: "" }, { q: "   " }, { q: [] }])
      expect(parseCatalogQuery(raw)).toEqual({ categoryInvalid: false });
  });

  it("uses the first value of a repeated parameter", () => {
    expect(parseCatalogQuery({ q: ["fight", "mouse"] })).toEqual({
      categoryInvalid: false,
      q: "fight",
    });
  });

  it("accepts the maximum length and flags a longer term without keeping it", () => {
    const longest = "a".repeat(CATALOG_SEARCH_MAX_LENGTH);
    expect(parseCatalogQuery({ q: ` ${longest} ` })).toEqual({
      categoryInvalid: false,
      q: longest,
    });
    expect(parseCatalogQuery({ q: `${longest}a` })).toEqual({
      categoryInvalid: false,
      qError: "too_long",
    });
  });

  it("combines the term with the category, keeping each problem separate", () => {
    expect(parseCatalogQuery({ category: "mice", q: "wireless" })).toEqual({
      category: "mice",
      categoryInvalid: false,
      q: "wireless",
    });
    expect(parseCatalogQuery({ category: "bad slug!", q: "x".repeat(101) })).toEqual({
      categoryInvalid: true,
      qError: "too_long",
    });
  });

  it("keeps LIKE wildcards as ordinary characters", () => {
    expect(catalogSearchSchema.parse(" 100% _x\\ ")).toBe("100% _x\\");
  });
});
