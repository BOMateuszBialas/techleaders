import { describe, expect, it } from "vitest";
import {
  DASHBOARD_RANGE_MESSAGES,
  MAX_DASHBOARD_RANGE_DAYS,
  dashboardRangeSchema,
  parseDashboardRange,
} from "./dashboard-range.schema";

const TODAY = "2026-10-19";

describe("parseDashboardRange (date-range spec A6–A8)", () => {
  it("uses the preset when no date is given, falling back to 7 days", () => {
    expect(parseDashboardRange({}, TODAY)).toEqual({ kind: "preset", preset: "7d" });
    expect(parseDashboardRange({ period: "30d" }, TODAY)).toEqual({
      kind: "preset",
      preset: "30d",
    });
    expect(parseDashboardRange({ period: "30d", from: " ", to: "" }, TODAY)).toEqual({
      kind: "preset",
      preset: "30d",
    });
  });

  it("accepts a valid range, which wins over the preset", () => {
    expect(
      parseDashboardRange({ period: "30d", from: "2026-10-01", to: "2026-10-14" }, TODAY),
    ).toEqual({ kind: "custom", firstDay: "2026-10-01", lastDay: "2026-10-14" });
    expect(parseDashboardRange({ from: TODAY, to: TODAY }, TODAY)).toEqual({
      kind: "custom",
      firstDay: TODAY,
      lastDay: TODAY,
    });
  });

  it("takes the first value of a repeated parameter", () => {
    expect(
      parseDashboardRange({ from: ["2026-10-01", "x"], to: ["2026-10-02", "y"] }, TODAY),
    ).toMatchObject({ kind: "custom", firstDay: "2026-10-01", lastDay: "2026-10-02" });
  });

  it.each([
    [{ from: "2026-10-01" }, DASHBOARD_RANGE_MESSAGES.bothRequired],
    [{ to: "2026-10-01" }, DASHBOARD_RANGE_MESSAGES.bothRequired],
    [{ from: 20261001, to: "2026-10-02" }, DASHBOARD_RANGE_MESSAGES.bothRequired],
    [{ from: "2026-13-01", to: "abc" }, DASHBOARD_RANGE_MESSAGES.notADate],
    [{ from: "2026-10-14", to: "2026-10-01" }, DASHBOARD_RANGE_MESSAGES.endBeforeStart],
    [{ from: "2026-10-01", to: "2026-10-20" }, DASHBOARD_RANGE_MESSAGES.future],
    [{ from: "1999-12-31", to: "2000-01-02" }, DASHBOARD_RANGE_MESSAGES.tooEarly],
    [{ from: "2025-10-18", to: TODAY }, DASHBOARD_RANGE_MESSAGES.tooLong],
  ])("falls back to the preset and reports %j", (raw, message) => {
    expect(parseDashboardRange({ period: "30d", ...raw }, TODAY)).toMatchObject({
      kind: "invalid",
      message,
      fallback: "30d",
    });
  });

  it("allows exactly the longest range", () => {
    expect(MAX_DASHBOARD_RANGE_DAYS).toBe(366);
    expect(parseDashboardRange({ from: "2025-10-19", to: TODAY }, TODAY).kind).toBe("custom");
  });

  it("keeps the submitted values, cut to a date's length, to refill the form", () => {
    expect(
      parseDashboardRange({ from: "2026-10-01<script>", to: "2026-09-01" }, TODAY),
    ).toMatchObject({ submitted: { from: "2026-10-01", to: "2026-09-01" } });
  });
});

describe("dashboardRangeSchema", () => {
  it("reports one problem at a time", () => {
    const result = dashboardRangeSchema(TODAY).safeParse({ from: "2026-12-01", to: "2026-11-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      DASHBOARD_RANGE_MESSAGES.endBeforeStart,
    ]);
  });
});
