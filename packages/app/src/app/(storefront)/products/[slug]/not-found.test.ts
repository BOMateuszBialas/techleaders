import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProductNotFound from "./not-found";

describe("product not-found UI", () => {
  it("says the product was not found and links to all products", () => {
    const html = renderToStaticMarkup(createElement(ProductNotFound));
    expect(html).toContain("<h1");
    expect(html).toContain(">Product not found<");
    expect(html).toContain('href="/products"');
  });
});
