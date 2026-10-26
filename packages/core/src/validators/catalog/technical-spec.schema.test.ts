import { describe, expect, it } from "vitest";
import {
  TECHNICAL_SPEC_LABEL_MAX_LENGTH,
  TECHNICAL_SPEC_VALUE_MAX_LENGTH,
  TECHNICAL_SPECS_MAX_ROWS,
  technicalSpecSchema,
  technicalSpecsSchema,
} from "./technical-spec.schema";

const row = { label: "Sensor", value: "Optical" };

describe("technicalSpecSchema", () => {
  it("accepts a label and value of one character", () => {
    expect(technicalSpecSchema.safeParse({ label: "A", value: "B" }).success).toBe(true);
  });

  it("accepts labels and values at their maximum length", () => {
    const result = technicalSpecSchema.safeParse({
      label: "L".repeat(TECHNICAL_SPEC_LABEL_MAX_LENGTH),
      value: "V".repeat(TECHNICAL_SPEC_VALUE_MAX_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a label longer than 60 characters and a value longer than 200", () => {
    expect(
      technicalSpecSchema.safeParse({
        ...row,
        label: "L".repeat(TECHNICAL_SPEC_LABEL_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      technicalSpecSchema.safeParse({
        ...row,
        value: "V".repeat(TECHNICAL_SPEC_VALUE_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects empty and whitespace-only labels and values", () => {
    expect(technicalSpecSchema.safeParse({ ...row, label: "" }).success).toBe(false);
    expect(technicalSpecSchema.safeParse({ ...row, value: "   " }).success).toBe(false);
  });

  it("trims labels and values", () => {
    expect(technicalSpecSchema.parse({ label: "  Sensor ", value: " Optical " })).toEqual(row);
  });

  it("rejects missing fields, extra keys are stripped, and non-string values fail", () => {
    expect(technicalSpecSchema.safeParse({ label: "Sensor" }).success).toBe(false);
    expect(technicalSpecSchema.safeParse({ label: 1, value: "x" }).success).toBe(false);
    expect(technicalSpecSchema.parse({ ...row, extra: "x" })).toEqual(row);
  });
});

describe("technicalSpecsSchema", () => {
  it("accepts an empty array and an array of up to 12 rows", () => {
    expect(technicalSpecsSchema.safeParse([]).success).toBe(true);
    const twelve = Array.from({ length: TECHNICAL_SPECS_MAX_ROWS }, () => row);
    expect(technicalSpecsSchema.safeParse(twelve).success).toBe(true);
  });

  it("rejects more than 12 rows", () => {
    const thirteen = Array.from({ length: TECHNICAL_SPECS_MAX_ROWS + 1 }, () => row);
    expect(technicalSpecsSchema.safeParse(thirteen).success).toBe(false);
  });

  it("rejects a value that is not an array, such as an object or null", () => {
    expect(technicalSpecsSchema.safeParse({ label: "x", value: "y" }).success).toBe(false);
    expect(technicalSpecsSchema.safeParse(null).success).toBe(false);
  });

  it("rejects an array that holds an invalid row", () => {
    expect(technicalSpecsSchema.safeParse([row, { label: "", value: "x" }]).success).toBe(false);
  });
});
