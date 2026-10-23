import { describe, expect, it } from "vitest";
import { aovChange, metricChange, percentChange } from "./metric-change";

describe("percentChange (the Copilot's rule, date-range spec A5)", () => {
  it("is a whole percent of the previous value", () => {
    expect(percentChange(14, 12)).toBe(17);
    expect(percentChange(9, 12)).toBe(-25);
    expect(percentChange(12, 12)).toBe(0);
    expect(percentChange(0, 4)).toBe(-100);
  });

  it("rounds halves the way Math.round does", () => {
    expect(percentChange(205, 200)).toBe(3); // 2.5 → 3
    expect(percentChange(195, 200)).toBe(-2); // −2.5 → −2
  });

  it("has no percentage without a base", () => {
    expect(percentChange(3, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe("metricChange", () => {
  it("returns both values, the delta, the percentage and the direction", () => {
    expect(metricChange(14, 12)).toEqual({
      current: 14,
      previous: 12,
      delta: 2,
      percent: 17,
      direction: "up",
    });
    expect(metricChange(9, 12)).toMatchObject({ delta: -3, percent: -25, direction: "down" });
    expect(metricChange(0, 0)).toMatchObject({ delta: 0, percent: null, direction: "same" });
    expect(metricChange(5, 0)).toMatchObject({ delta: 5, percent: null, direction: "up" });
  });

  it("withholds the percentage on request (partial history, A9)", () => {
    expect(metricChange(14, 12, { withPercent: false })).toMatchObject({
      delta: 2,
      percent: null,
      direction: "up",
    });
  });
});

describe("aovChange", () => {
  it("compares two averages, or gives null when either is missing", () => {
    expect(aovChange(12_000, 10_000)).toMatchObject({ delta: 2000, percent: 20 });
    expect(aovChange(12_000, 10_000, { withPercent: false })?.percent).toBeNull();
    expect(aovChange(null, 10_000)).toBeNull();
    expect(aovChange(12_000, null)).toBeNull();
  });
});
