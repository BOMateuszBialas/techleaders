import { describe, expect, it } from "vitest";
import { hasAppErrorCode } from "../../errors/app-error";
import { isUuid } from "../common/uuid.schema";
import { INVALID_FIELDS_MESSAGE, parseInput } from "../parse-input";
import { SLUG_EMPTY_MESSAGE, SLUG_FORMAT_MESSAGE } from "../catalog/slug.schema";
import { categoryInputSchema } from "./category-input.schema";

function fieldErrorsFor(input: unknown): Record<string, string[] | undefined> {
  const result = categoryInputSchema.safeParse(input);
  if (result.success) throw new Error("expected invalid input");
  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    errors[field] = [...(errors[field] ?? []), issue.message];
  }
  return errors;
}

describe("categoryInputSchema", () => {
  it("trims values, keeps a typed slug (lowercased) and stores a blank description as null", () => {
    expect(
      categoryInputSchema.parse({ name: "  Mice ", slug: " Gaming-Mice ", description: "  " }),
    ).toEqual({ name: "Mice", slug: "gaming-mice", description: null });
  });

  it("derives a blank or missing slug from the name", () => {
    expect(categoryInputSchema.parse({ name: "Słuchawki gamingowe", slug: "" })).toEqual({
      name: "Słuchawki gamingowe",
      slug: "sluchawki-gamingowe",
      description: null,
    });
    expect(
      categoryInputSchema.parse({ name: "Mousepads", description: "Cloth and glass." }),
    ).toEqual({ name: "Mousepads", slug: "mousepads", description: "Cloth and glass." });
  });

  it("asks for a name", () => {
    expect(fieldErrorsFor({ name: "   ", slug: "mice" })).toEqual({ name: ["Enter a name."] });
  });

  it("asks for a slug when the name has no letters or digits", () => {
    expect(fieldErrorsFor({ name: "!!!", slug: "" })).toEqual({ slug: [SLUG_EMPTY_MESSAGE] });
  });

  it.each(["gaming mice", "gaming--mice", "-mice", "myszki-żółte"])(
    "rejects the malformed slug %j",
    (slug) => {
      expect(fieldErrorsFor({ name: "Mice", slug })).toEqual({ slug: [SLUG_FORMAT_MESSAGE] });
    },
  );

  it("enforces the column lengths", () => {
    expect(fieldErrorsFor({ name: "x".repeat(121) })).toEqual({
      name: ["Use at most 120 characters."],
    });
    expect(fieldErrorsFor({ name: "Mice", slug: "a".repeat(141) })).toEqual({
      slug: ["Use at most 140 characters."],
    });
    expect(fieldErrorsFor({ name: "Mice", description: "d".repeat(1001) })).toEqual({
      description: ["Use at most 1000 characters."],
    });
  });
});

describe("parseInput", () => {
  it("returns the parsed value", () => {
    expect(parseInput(categoryInputSchema, { name: "Mice" })).toMatchObject({ slug: "mice" });
  });

  it("throws a ValidationError with per-field messages", () => {
    expect(() => parseInput(categoryInputSchema, { name: "", slug: "a b" })).toThrow(
      expect.objectContaining({
        code: "VALIDATION_FAILED",
        message: INVALID_FIELDS_MESSAGE,
        fieldErrors: { name: ["Enter a name."] },
      }),
    );
  });

  it("uses a form-level message when the input itself is malformed", () => {
    let caught: unknown;
    try {
      parseInput(categoryInputSchema, "not an object");
    } catch (error) {
      caught = error;
    }
    expect(hasAppErrorCode(caught, "VALIDATION_FAILED")).toBe(true);
    expect(caught).toMatchObject({ fieldErrors: {} });
    expect(caught).not.toMatchObject({ message: INVALID_FIELDS_MESSAGE });
  });
});

describe("isUuid", () => {
  it("accepts generated ids only", () => {
    expect(isUuid("6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});
