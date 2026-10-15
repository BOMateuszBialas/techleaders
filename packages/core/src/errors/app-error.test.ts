import { describe, expect, it } from "vitest";
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
  isNotFoundError,
} from "./app-error";

describe("AppError hierarchy", () => {
  it("keeps the subclass name, code and instanceof chain", () => {
    const error = new NotFoundError();
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("NotFoundError");
    expect(error.code).toBe("NOT_FOUND");
  });

  it("carries field errors on validation failures", () => {
    const error = new ValidationError("Invalid product", { slug: ["Already taken"] });
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.fieldErrors).toEqual({ slug: ["Already taken"] });
  });

  it("accepts a custom message", () => {
    expect(new ConflictError("Slug already exists").message).toBe("Slug already exists");
  });

  // Regression: a NotFoundError from another bundled copy of core failed `instanceof`,
  // so the storefront showed "catalog unavailable" instead of "not found".
  it("recognises a NotFoundError by its code, even from another copy of the class", () => {
    class ForeignNotFoundError extends Error {
      readonly code = "NOT_FOUND";
    }
    expect(isNotFoundError(new NotFoundError())).toBe(true);
    expect(isNotFoundError(new ForeignNotFoundError())).toBe(true);
    expect(isNotFoundError(new ConflictError())).toBe(false);
    expect(isNotFoundError(new Error("plain"))).toBe(false);
    expect(isNotFoundError({ code: "NOT_FOUND" })).toBe(false);
  });
});
