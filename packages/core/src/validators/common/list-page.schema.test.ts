import { describe, expect, it } from "vitest";
import { adminOrderPageSchema, parseAdminOrderPage } from "../orders/order-status-change.schema";
import { listPageSchema, parseListPage } from "./list-page.schema";

describe("parseListPage", () => {
  it.each([
    [undefined, 1],
    ["2", 2],
    [3, 3],
    ["-1", 1],
    ["0", 1],
    ["abc", 1],
    ["1.5", 1],
    ["", 1],
    ["99999999", 1],
  ])("reads %j as page %d", (value, page) => {
    expect(parseListPage(value)).toBe(page);
  });
});

describe("deprecated order-list names", () => {
  it("are the shared list-page parser", () => {
    expect(adminOrderPageSchema).toBe(listPageSchema);
    expect(parseAdminOrderPage).toBe(parseListPage);
  });
});
