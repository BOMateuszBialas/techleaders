import { describe, expect, it } from "vitest";
import { hasAppErrorCode, isUniqueFieldConflict } from "@commerceos/core";
import { toCatalogWriteError } from "./catalog-write-error";

/** Shaped like MikroORM's DriverException, which copies the pg error's own properties. */
function dbError(code: string, constraint?: string): Error {
  return Object.assign(new Error("duplicate key value violates unique constraint"), {
    code,
    ...(constraint ? { constraint } : {}),
  });
}

describe("toCatalogWriteError", () => {
  it.each([
    ["categories_slug_unique", "slug", "This slug is already used by another category."],
    ["products_slug_unique", "slug", "This slug is already used by another product."],
    ["products_sku_unique", "sku", "This SKU is already used by another product."],
  ])("maps the unique constraint %s to a conflict on %s", (constraint, field, message) => {
    const mapped = toCatalogWriteError(dbError("23505", constraint));
    expect(isUniqueFieldConflict(mapped)).toBe(true);
    expect(mapped).toMatchObject({ field, message });
  });

  it.each([
    ["23503", "products_category_id_foreign", "categoryId", "Choose an existing category."],
    ["23514", "products_price_minor_check", "price", "Enter a price of 0 or more."],
    ["23514", "products_stock_quantity_check", "stockQuantity", "Enter a quantity of 0 or more."],
  ])("maps %s on %s to a field error on %s", (code, constraint, field, message) => {
    const mapped = toCatalogWriteError(dbError(code, constraint));
    expect(hasAppErrorCode(mapped, "VALIDATION_FAILED")).toBe(true);
    expect(mapped).toMatchObject({ fieldErrors: { [field]: [message] } });
  });

  it.each([
    ["an unknown unique constraint", dbError("23505", "admin_users_email_unique")],
    ["an unknown check constraint", dbError("23514", "products_currency_check")],
    ["a field constraint with another SQLSTATE", dbError("23505", "products_price_minor_check")],
    ["a database error without a constraint", dbError("57P01")],
    ["an error whose code is not a string", Object.assign(new Error("x"), { code: 23505 })],
    ["a plain error", new Error("connection refused")],
  ])("returns %s unchanged", (_label, error) => {
    expect(toCatalogWriteError(error) === error).toBe(true);
  });

  it("returns a non-Error value unchanged", () => {
    const thrown = { code: "23505", constraint: "categories_slug_unique" };
    expect(toCatalogWriteError(thrown) === thrown).toBe(true);
  });
});
