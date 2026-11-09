import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UnpaidOrdersCard } from "./unpaid-orders-card";
import {
  UNPAID_EMPTY,
  UNPAID_NOT_AVAILABLE,
  UNPAID_STALE_LABEL,
  unpaidOldestText,
} from "./dashboard-copy";

const oldest = new Date("2026-11-07T08:00:00.000Z");

describe("UnpaidOrdersCard", () => {
  it("shows the empty state when no order is unpaid", () => {
    const html = renderToStaticMarkup(
      createElement(UnpaidOrdersCard, {
        summary: { count: 0, staleCount: 0, oldestCreatedAt: null },
        locale: "en-GB",
      }),
    );
    expect(html).toContain(UNPAID_EMPTY);
    expect(html).not.toContain(UNPAID_STALE_LABEL);
    expect(html).toContain('href="/admin/orders?view=unpaid"');
  });

  it("shows the count, the stale count and the oldest creation time", () => {
    const html = renderToStaticMarkup(
      createElement(UnpaidOrdersCard, {
        summary: { count: 3, staleCount: 1, oldestCreatedAt: oldest },
        locale: "en-GB",
      }),
    );
    expect(html).toContain(UNPAID_STALE_LABEL);
    expect(html).toContain(">3<");
    expect(html).toContain(">1<");
    expect(html).toContain(
      unpaidOldestText({ count: 3, staleCount: 1, oldestCreatedAt: oldest }, "en-GB"),
    );
    expect(html).not.toContain(UNPAID_EMPTY);
  });
});

describe("unpaidOldestText", () => {
  it("formats the oldest time, or says it is not available", () => {
    expect(unpaidOldestText({ count: 1, staleCount: 0, oldestCreatedAt: oldest }, "en-GB")).toMatch(
      /2026/,
    );
    expect(unpaidOldestText({ count: 1, staleCount: 0, oldestCreatedAt: null }, "en-GB")).toBe(
      UNPAID_NOT_AVAILABLE,
    );
  });
});
