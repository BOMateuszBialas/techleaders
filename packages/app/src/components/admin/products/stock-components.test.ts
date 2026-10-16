import type { AdminProduct, StockAdjustment } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import {
  formatStockDelta,
  ownerLocale,
  stockChangedMessage,
  stockPreview,
  toStockHistoryRows,
  type StockHistoryRow,
} from "./stock-copy";
import { StockPanel } from "./stock-panel";
import { StockPanelView, type StockPanelProduct } from "./stock-panel-view";

const PRODUCT_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const action = vi.fn();
const serverAction = vi.fn(async (state: ActionState) => state);
const published: StockPanelProduct = { id: PRODUCT_ID, status: "published", stockQuantity: 8 };

const adminProduct: AdminProduct = {
  id: PRODUCT_ID,
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  description: "",
  priceMinor: 24900,
  currency: "PLN",
  sku: null,
  stockQuantity: 0,
  imageUrl: null,
  status: "published",
  featured: false,
  category: null,
  availability: "out_of_stock",
};

const adjustment: StockAdjustment = {
  id: "adj-1",
  productId: PRODUCT_ID,
  previousQuantity: 8,
  newQuantity: 0,
  delta: -8,
  createdAt: new Date("2026-10-16T09:30:00.000Z"),
};

const rows: StockHistoryRow[] = [
  {
    id: "adj-2",
    at: "2026-10-16T10:00:00.000Z",
    atLabel: "16 Oct 2026, 12:00",
    change: "0 → 4",
    delta: "+4",
  },
  {
    id: "adj-1",
    at: "2026-10-16T09:30:00.000Z",
    atLabel: "16 Oct 2026, 11:30",
    change: "8 → 0",
    delta: "-8",
  },
];

function renderPanel(
  state: ActionState,
  options: { pending?: boolean; product?: StockPanelProduct; history?: StockHistoryRow[] } = {},
) {
  return renderToStaticMarkup(
    createElement(StockPanelView, {
      action,
      state,
      pending: options.pending ?? false,
      product: options.product ?? published,
      history: options.history ?? rows,
    }),
  );
}

describe("stock copy", () => {
  it("previews the availability after a change from the product's status", () => {
    expect(stockPreview("published")).toBe(
      "After the change: 0 shows it to shoppers as out of stock; 1 or more lets them buy it.",
    );
    expect(stockPreview("draft")).toBe(
      "It stays hidden from shoppers whatever the quantity, until it is published.",
    );
  });

  it("states the new quantity and what shoppers now see", () => {
    expect(stockChangedMessage({ outcome: "updated", product: adminProduct, adjustment })).toBe(
      "Stock set to 0 (was 8). Visible in the store, shown as out of stock.",
    );
    expect(
      stockChangedMessage({
        outcome: "unchanged",
        product: { ...adminProduct, stockQuantity: 8, availability: "available" },
        adjustment: null,
      }),
    ).toBe("Stock unchanged at 8. Nothing was recorded.");
  });

  it("signs the delta", () => {
    expect(formatStockDelta(4)).toBe("+4");
    expect(formatStockDelta(-8)).toBe("-8");
  });

  it.each([
    ["pl-PL,pl;q=0.9,en;q=0.8", "pl-PL"],
    ["en-US", "en-US"],
    [" de ;q=1", "de"],
    ["zz, fr", "fr"],
    ["en_US, *", "en-GB"],
    ["", "en-GB"],
    [null, "en-GB"],
  ])("reads the owner's locale from Accept-Language %j", (header, locale) => {
    expect(ownerLocale(header)).toBe(locale);
  });

  it("formats history rows in the owner's locale and the store's time zone", () => {
    expect(toStockHistoryRows([adjustment], "en-GB")).toEqual([
      {
        id: "adj-1",
        at: "2026-10-16T09:30:00.000Z",
        // 09:30 UTC is 11:30 in Warsaw (CEST).
        atLabel: "16 Oct 2026, 11:30",
        change: "8 → 0",
        delta: "-8",
      },
    ]);
  });
});

describe("StockPanelView", () => {
  it("shows the current stock, the form preset to it, the preview and the history", () => {
    const html = renderPanel(IDLE_ACTION_STATE);
    expect(html).toContain("Current stock: <span");
    expect(html).toContain(`name="productId" value="${PRODUCT_ID}"`);
    expect(html).toContain('name="expectedQuantity" value="8"');
    expect(html).toMatch(/name="newQuantity"[^>]*value="8"/);
    expect(html).toMatch(/<form[^>]*novalidate=""/i);
    expect(html).toContain('min="0"');
    expect(html).toContain('step="1"');
    expect(html).toContain('aria-describedby="stock-preview"');
    expect(html).toContain("1 or more lets them buy it.");
    expect(html).toContain("Initial stock: not recorded.");
    expect(html).toContain('<time dateTime="2026-10-16T09:30:00.000Z"');
    expect(html.indexOf("0 → 4")).toBeLessThan(html.indexOf("8 → 0"));
    expect(html).toContain("+4");
    expect(html).not.toContain('role="alert"');
    expect(html).toContain(">Set stock<");
  });

  it("says when no change is recorded yet, and previews a draft as hidden", () => {
    const html = renderPanel(IDLE_ACTION_STATE, {
      history: [],
      product: { ...published, status: "draft" },
    });
    expect(html).toContain("No stock changes recorded yet.");
    expect(html).not.toContain("<ol");
    expect(html).toContain("It stays hidden from shoppers");
  });

  it("disables the button while pending", () => {
    const html = renderPanel(IDLE_ACTION_STATE, { pending: true });
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Setting stock…/);
  });

  it("shows a refused quantity under the field and keeps it", () => {
    const html = renderPanel({
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { newQuantity: ["Enter a whole number from 0 to 1,000,000."] },
      values: { expectedQuantity: "8", newQuantity: "-1" },
    });
    expect(html).toMatch(/name="newQuantity"[^>]*value="-1"/);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="stock-preview stock-new-quantity-error"');
    expect(html).toContain("Enter a whole number from 0 to 1,000,000.");
    expect(html).toContain('role="alert"');
  });

  it("resets to the current quantity after a stale refusal", () => {
    const html = renderPanel({
      status: "error",
      message: "Stock changed to 5 since this page loaded. Check it and try again.",
      values: { expectedQuantity: "5", newQuantity: "5" },
    });
    expect(html).toContain('<span class="font-medium">5</span>');
    expect(html).toContain('name="expectedQuantity" value="5"');
    expect(html).toMatch(/name="newQuantity"[^>]*value="5"/);
    expect(html).toContain("Stock changed to 5 since this page loaded.");
  });

  it("shows the success message with the stored quantity", () => {
    const html = renderPanel(
      {
        status: "success",
        message: "Stock set to 0 (was 8). Visible in the store, shown as out of stock.",
      },
      { product: { ...published, stockQuantity: 0 } },
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('name="expectedQuantity" value="0"');
  });
});

describe("StockPanel", () => {
  it("renders the view in its idle state", () => {
    const html = renderToStaticMarkup(
      createElement(StockPanel, { action: serverAction, product: published, history: [] }),
    );
    expect(html).toContain(">Set stock<");
    expect(html).toContain("No stock changes recorded yet.");
  });
});
