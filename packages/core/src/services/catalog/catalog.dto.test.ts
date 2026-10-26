import { describe, expect, it } from "vitest";
import { productRecord } from "./in-memory-catalog.fixture";
import { toCatalogProductDetail, toCatalogProductSummary } from "./catalog.dto";

describe("toCatalogProductDetail", () => {
  it("maps the technical rows as stored, in their order", () => {
    const detail = toCatalogProductDetail(
      productRecord({
        technicalSpecs: [
          { label: "Sensor", value: "Optical" },
          { label: "Weight", value: "95 g" },
        ],
      }),
    );
    expect(detail.technicalSpecs).toEqual([
      { label: "Sensor", value: "Optical" },
      { label: "Weight", value: "95 g" },
    ]);
  });

  it("returns an empty list for a product without rows", () => {
    expect(toCatalogProductDetail(productRecord()).technicalSpecs).toEqual([]);
  });

  it("trims the stored label and value", () => {
    const detail = toCatalogProductDetail(
      productRecord({ technicalSpecs: [{ label: " Sensor ", value: " Optical " }] }),
    );
    expect(detail.technicalSpecs).toEqual([{ label: "Sensor", value: "Optical" }]);
  });

  it("fails loudly when a stored row breaks the shape", () => {
    expect(() =>
      toCatalogProductDetail(productRecord({ technicalSpecs: [{ label: "", value: "x" }] })),
    ).toThrow();
  });

  it("keeps the description and the summary fields", () => {
    const detail = toCatalogProductDetail(productRecord());
    expect(detail.description).toBe("A wireless mouse.");
    expect(detail).toMatchObject({ ...toCatalogProductSummary(productRecord()) });
  });

  it("does not expose the technical rows on the summary", () => {
    const summary = toCatalogProductSummary(
      productRecord({ technicalSpecs: [{ label: "Sensor", value: "Optical" }] }),
    );
    expect(summary).not.toHaveProperty("technicalSpecs");
  });
});
