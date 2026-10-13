import { describe, expect, it } from "vitest";
import { AppError, ConflictError, NotFoundError, ValidationError } from "./app-error";

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
});
