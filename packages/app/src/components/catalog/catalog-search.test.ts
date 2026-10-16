import { money, type CatalogListing, type CatalogProductSummary } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeaderSearch } from "../storefront/header-search";
import {
  emptyListingMessage,
  listingHeading,
  productsHref,
  resultCountText,
  SEARCH_TOO_LONG_MESSAGE,
} from "./catalog-copy";
import { CatalogResults } from "./catalog-results";
import { CatalogSearchForm } from "./catalog-search-form";
import { CategoryNav } from "./category-nav";

const mice = { slug: "mice", name: "Mice", description: "Gaming mice" };
const categories = [{ slug: "keyboards", name: "Keyboards", description: null }, mice];

const product: CatalogProductSummary = {
  id: "p-1",
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  price: money(24900, "PLN"),
  category: { slug: "mice", name: "Mice" },
  availability: "in_stock",
  imageUrl: null,
};

function listing(overrides: Partial<CatalogListing> = {}): CatalogListing {
  return { category: null, products: [product], total: 1, limit: 48, ...overrides };
}

/** React escapes quotes in text; compare against the visible text. */
function text(html: string): string {
  return html.replace(/&quot;/g, '"');
}

describe("search copy", () => {
  it("builds listing links with a category, a search term or both", () => {
    expect(productsHref(undefined, "wireless mouse")).toBe("/products?q=wireless+mouse");
    expect(productsHref("mice", "100%")).toBe("/products?category=mice&q=100%25");
    expect(productsHref(undefined, "")).toBe("/products");
  });

  it("describes a search with no results, with or without a category", () => {
    expect(emptyListingMessage(null, "zzz")).toBe('No products match "zzz".');
    expect(emptyListingMessage(mice, "zzz")).toBe('No products match "zzz" in Mice.');
  });

  it("titles the listing by category and search term", () => {
    expect(listingHeading(null)).toBe("All products");
    expect(listingHeading(mice)).toBe("Mice");
    expect(listingHeading(null, "fight")).toBe('Results for "fight" in All products');
    expect(listingHeading(mice, "wireless")).toBe('Results for "wireless" in Mice');
  });

  it("counts results", () => {
    expect(resultCountText(0)).toBe("0 products");
    expect(resultCountText(1)).toBe("1 product");
    expect(resultCountText(3)).toBe("3 products");
  });
});

describe("CatalogSearchForm", () => {
  it("is a GET search form to /products with a labelled term and category", () => {
    const html = renderToStaticMarkup(createElement(CatalogSearchForm, { categories }));
    expect(html).toMatch(/^<form role="search" aria-label="Search the catalog"/);
    expect(html).toMatch(/^<form[^>]* action="\/products" method="get">/);
    expect(html).toContain('for="catalog-search-q"');
    expect(html).toMatch(/id="catalog-search-q"[^>]*name="q"/);
    expect(html).toMatch(/maxLength="100"/);
    expect(html).toContain('for="catalog-search-category"');
    expect(html).toContain('<option value="" selected="">All categories</option>');
    expect(html).toContain('<option value="mice">Mice</option>');
    expect(html).toContain('type="submit"');
    expect(html).not.toContain('aria-invalid="');
    expect(html).not.toContain(SEARCH_TOO_LONG_MESSAGE);
  });

  it("keeps the submitted term and category", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogSearchForm, { categories, search: "wireless", categorySlug: "mice" }),
    );
    expect(html).toContain('value="wireless"');
    expect(html).toContain('<option value="mice" selected="">Mice</option>');
  });

  it("falls back to all categories for an unknown slug", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogSearchForm, { categories, categorySlug: "missing" }),
    );
    expect(html).toContain('<option value="" selected="">All categories</option>');
  });

  it("ties the too-long message to the input", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogSearchForm, { categories, searchTooLong: true }),
    );
    expect(html).toMatch(/aria-invalid="true"/);
    expect(html).toMatch(/aria-describedby="catalog-search-q-error"/);
    expect(html).toContain(`<p id="catalog-search-q-error"`);
    expect(html).toContain(SEARCH_TOO_LONG_MESSAGE);
  });
});

describe("CatalogResults", () => {
  it("lists products under the heading with the result count", () => {
    const html = text(
      renderToStaticMarkup(
        createElement(CatalogResults, {
          listing: listing({ category: mice }),
          unknownCategory: false,
          search: "wireless",
        }),
      ),
    );
    expect(html).toContain('Results for "wireless" in Mice</h2>');
    expect(html).toContain(">1 product</p>");
    expect(html).toContain("Vortex Wireless Mouse");
    expect(html).not.toContain("Clear search");
  });

  it("shows the no-results state with a link that clears only the search", () => {
    const html = text(
      renderToStaticMarkup(
        createElement(CatalogResults, {
          listing: listing({ category: mice, products: [], total: 0 }),
          unknownCategory: false,
          search: "zzz",
        }),
      ),
    );
    expect(html).toContain('No products match "zzz" in Mice.');
    expect(html).toMatch(/href="\/products\?category=mice"[^>]*>Clear search</);
    expect(html).toContain(">0 products</p>");
  });

  it("shows the empty category and empty catalog states without a search", () => {
    const inCategory = renderToStaticMarkup(
      createElement(CatalogResults, {
        listing: listing({ category: mice, products: [], total: 0 }),
        unknownCategory: false,
      }),
    );
    expect(inCategory).toContain("No products in Mice yet.");
    expect(inCategory).toMatch(/href="\/products"[^>]*>Browse all products</);

    const all = renderToStaticMarkup(
      createElement(CatalogResults, {
        listing: listing({ products: [], total: 0 }),
        unknownCategory: false,
      }),
    );
    expect(all).toContain("No products are available yet.");
    expect(all).not.toContain("Browse all products");
  });

  it("explains the listing cap when more products match", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogResults, { listing: listing({ total: 60 }), unknownCategory: false }),
    );
    expect(html).toContain("Showing 1 of 60.");
  });

  it("says that an unknown category does not exist", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogResults, { listing: null, unknownCategory: true }),
    );
    expect(html).toContain("This category does not exist.");
    expect(html).toMatch(/href="\/products"[^>]*>Browse all products</);
  });

  it("renders nothing when no query ran for a too-long search", () => {
    const html = renderToStaticMarkup(
      createElement(CatalogResults, { listing: null, unknownCategory: false }),
    );
    expect(html).toBe("");
  });
});

describe("CategoryNav with a search", () => {
  it("keeps the search term in every link", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryNav, { categories, activeSlug: "mice", search: "wireless" }),
    );
    expect(html).toContain('href="/products?q=wireless"');
    expect(html).toMatch(/aria-current="page"[^>]*href="\/products\?category=mice&amp;q=wireless"/);
  });
});

describe("HeaderSearch", () => {
  it("is a labelled GET search form to /products", () => {
    const html = renderToStaticMarkup(createElement(HeaderSearch));
    expect(html).toMatch(/^<form role="search" aria-label="Site search"/);
    expect(html).toMatch(/^<form[^>]* action="\/products" method="get">/);
    expect(html).toContain('<label for="header-search-q" class="sr-only">Search products</label>');
    expect(html).toMatch(/id="header-search-q"[^>]*name="q"/);
    expect(html).toContain('aria-label="Search"');
    expect(html).toContain('type="submit"');
  });
});
