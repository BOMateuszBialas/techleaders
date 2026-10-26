import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EXAMPLE_DELIVERY_TEXT } from "@/components/storefront/storefront-content";
import { ProductTabs } from "./product-tabs";
import { ProductTechnicalData } from "./product-technical-data";

const specs = [
  { label: "Sensor", value: "Optical, 26,000 DPI" },
  { label: "Weight", value: "78 g" },
];

describe("ProductTechnicalData", () => {
  it("shows the neutral line without rows", () => {
    const html = renderToStaticMarkup(createElement(ProductTechnicalData, { specs: [] }));
    expect(html).toContain("Technical data is not available for this product yet.");
    expect(html).not.toContain("<dl");
    expect(html).not.toContain("Example values for the demo store.");
  });

  it("shows the rows as a description list with the example note", () => {
    const html = renderToStaticMarkup(createElement(ProductTechnicalData, { specs }));
    expect(html).toContain("Example values for the demo store.");
    expect(html).toContain("<dl");
    expect(html).toContain("<dt");
    expect(html).toContain("Sensor");
    expect(html).toContain("Optical, 26,000 DPI");
    expect(html).toContain("78 g");
  });

  it("escapes row values as text", () => {
    const html = renderToStaticMarkup(
      createElement(ProductTechnicalData, {
        specs: [{ label: "Note", value: "<script>alert(1)</script>" }],
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("ProductTabs", () => {
  it("renders the three tabs, the description panel and no other panel", () => {
    const html = renderToStaticMarkup(
      createElement(ProductTabs, { description: "A mouse.\nTwo modes.", technicalSpecs: specs }),
    );
    expect(html).toContain('aria-label="Product details"');
    expect(html).toContain("Description");
    expect(html).toContain("Technical data");
    expect(html).toContain("Delivery and returns");
    expect(html).toContain("A mouse.");
    expect(html).toContain('aria-selected="true"');
    expect(html).not.toContain("Sensor");
    expect(html).not.toContain(EXAMPLE_DELIVERY_TEXT);
  });
});
