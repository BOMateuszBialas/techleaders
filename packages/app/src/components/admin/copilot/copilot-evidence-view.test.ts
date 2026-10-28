import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EvidenceView } from "./copilot-evidence-view";

const CAPTION = "Figures in this summary";

const ROWS = [
  { metric: "Paid orders", value: "29", period: "Last 7 days", source: "getSalesSummary" },
  { metric: "Sessions", value: "1,200", source: "getTrafficSummary", demo: true },
];

function render(): string {
  return renderToStaticMarkup(createElement(EvidenceView, { caption: CAPTION, rows: ROWS }));
}

describe("EvidenceView", () => {
  it("renders the table and the list, the container query picks one by width", () => {
    const html = render();
    expect(html).toContain('class="@container"');
    expect(html).toContain("hidden @xl:block");
    expect(html).toContain("@xl:hidden");
    expect(html).toContain('data-slot="table-container"');
    expect(html).toContain(`<caption`);
    expect(html).toContain(`aria-label="${CAPTION}"`);
  });

  it("keeps every field of every row in both shapes", () => {
    const html = render();
    for (const row of ROWS) {
      expect(html.split(row.value).length - 1).toBe(2);
      expect(html).toContain(row.source);
    }
    expect(html).toContain("Last 7 days");
  });

  it("tags demo rows with their text in both shapes", () => {
    const html = render();
    expect(html.split("Fictional demo data").length - 1).toBe(2);
  });

  it("omits the period line for a row without one, in the list", () => {
    const list = render().slice(render().indexOf("<ul"));
    expect(list.split("Period").length - 1).toBe(1);
  });
});
