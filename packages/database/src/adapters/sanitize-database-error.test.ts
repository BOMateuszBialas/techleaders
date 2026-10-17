import { InsufficientStockError } from "@commerceos/core";
import { describe, expect, it } from "vitest";
import {
  DatabaseOperationError,
  sanitizeDatabaseError,
  withSanitizedErrors,
} from "./sanitize-database-error";

class CheckConstraintViolationException extends Error {
  readonly code = "23514";
  readonly constraint = "orders_total_check";
  constructor() {
    super(
      'insert into "orders" ("customer_email", "public_reference") values (\'ada@example.test\', \'CO-AAAAA\') - new row violates check constraint',
    );
    this.name = "CheckConstraintViolationException";
  }
}

describe("sanitizeDatabaseError", () => {
  it("keeps the operation, class, SQLSTATE and constraint, and drops the query", () => {
    const sanitized = sanitizeDatabaseError(
      "Order placement",
      new CheckConstraintViolationException(),
    );
    expect(sanitized).toBeInstanceOf(DatabaseOperationError);
    expect((sanitized as Error).message).toBe(
      "Order placement failed: CheckConstraintViolationException (SQLSTATE 23514, constraint orders_total_check)",
    );
    expect((sanitized as Error).stack).not.toContain("ada@example.test");
  });

  it("names a driver exception without a code or constraint", () => {
    const connection = Object.assign(new Error("connect ECONNREFUSED 10.0.0.1"), {
      name: "ConnectionException",
    });
    expect((sanitizeDatabaseError("Order read", connection) as Error).message).toBe(
      "Order read failed: ConnectionException",
    );
  });

  it("passes application errors and anything else through", () => {
    const stock = new InsufficientStockError(["Pulse Ultralight Mouse"]);
    expect(sanitizeDatabaseError("Order placement", stock)).toBe(stock);
    expect(sanitizeDatabaseError("Order placement", "text")).toBe("text");
  });

  it("wraps a call: results pass, driver exceptions are replaced", async () => {
    await expect(withSanitizedErrors("Rate limit", async () => 1)).resolves.toBe(1);
    await expect(
      withSanitizedErrors("Rate limit", async () => {
        throw new CheckConstraintViolationException();
      }),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
  });
});
