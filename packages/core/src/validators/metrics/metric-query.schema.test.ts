import { describe, expect, it } from "vitest";
import {
  lowStockQuerySchema,
  parseMetricPeriod,
  topProductsQuerySchema,
} from "./metric-query.schema";

describe("parseMetricPeriod", () => {
  it("accepts the two presets", () => {
    expect(parseMetricPeriod("7d")).toBe("7d");
    expect(parseMetricPeriod("30d")).toBe("30d");
    expect(parseMetricPeriod(["30d", "7d"])).toBe("30d");
  });

  it("falls back to the last 7 days for anything else, never throwing", () => {
    for (const raw of [undefined, "", "abc", "90d", "30D", 30, null, [], ["x"]]) {
      expect(parseMetricPeriod(raw)).toBe("7d");
    }
  });
});

describe("metric query schemas", () => {
  it("default the low-stock threshold to 5 and the list to 10 rows", () => {
    expect(lowStockQuerySchema.parse({})).toEqual({ threshold: 5, limit: 10 });
    expect(lowStockQuerySchema.parse({ threshold: 1000, limit: 50 })).toEqual({
      threshold: 1000,
      limit: 50,
    });
  });

  it("refuse thresholds and limits outside their ranges or not whole", () => {
    for (const input of [
      { threshold: 0 },
      { threshold: 1001 },
      { threshold: 2.5 },
      { limit: 51 },
    ]) {
      expect(lowStockQuerySchema.safeParse(input).success).toBe(false);
    }
    expect(topProductsQuerySchema.parse({})).toEqual({ limit: 5 });
    expect(topProductsQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
  });
});
