import { describe, expect, it } from "vitest";
import { fieldA11y } from "./field-a11y";

describe("fieldA11y", () => {
  it("marks an input with messages as invalid and points at its error", () => {
    expect(fieldA11y("name-error", ["Required."])).toEqual({
      "aria-invalid": true,
      "aria-describedby": "name-error",
    });
  });

  it("lists the hints before the error", () => {
    expect(fieldA11y("e", ["Bad."], ["h1", "h2"])).toEqual({
      "aria-invalid": true,
      "aria-describedby": "h1 h2 e",
    });
  });

  it("is valid without messages, pointing only at its hints", () => {
    expect(fieldA11y("e", undefined, ["h"])).toEqual({
      "aria-invalid": false,
      "aria-describedby": "h",
    });
  });

  it("is valid with an empty message list and no hints", () => {
    expect(fieldA11y("e", [])).toEqual({ "aria-invalid": false, "aria-describedby": undefined });
  });
});
