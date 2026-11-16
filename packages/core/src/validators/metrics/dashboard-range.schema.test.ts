import { describe, expect, it } from "vitest";
import { storeToday } from "../../domain/metrics/metric-period";
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
    [{ from: "0099-01-01", to: "0099-01-02" }, DASHBOARD_RANGE_MESSAGES.tooEarly],
    [{ from: "0001-01-01", to: "0001-01-01" }, DASHBOARD_RANGE_MESSAGES.tooEarly],
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

  it("refills the form only with well-formed dates; anything else is left empty (A7, G6)", () => {
    expect(
      parseDashboardRange({ from: "2026-10-01<script>", to: "2026-09-01" }, TODAY),
    ).toMatchObject({ submitted: { from: "", to: "2026-09-01" } });
    expect(
      parseDashboardRange({ from: "2026-02-30", to: "2026-10-01xxxxxxxxxxxxxxxxxxxxx" }, TODAY),
    ).toMatchObject({ submitted: { from: "", to: "" } });
    expect(parseDashboardRange({ from: "2026-10-01", to: 2026 }, TODAY)).toMatchObject({
      submitted: { from: "2026-10-01", to: "" },
    });
  });

  it("shows the first failure in A7 order when several rules fail at once", () => {
    // Too early and too long: the start-date rule comes first.
    expect(parseDashboardRange({ from: "1998-01-01", to: TODAY }, TODAY)).toMatchObject({
      message: DASHBOARD_RANGE_MESSAGES.tooEarly,
    });
    // Future end and end before start: the future rule comes first.
    expect(parseDashboardRange({ from: "2026-12-01", to: "2026-11-01" }, TODAY)).toMatchObject({
      message: DASHBOARD_RANGE_MESSAGES.future,
    });
    // Too early and end before start: the start-date rule comes first.
    expect(parseDashboardRange({ from: "1999-12-31", to: "1998-01-01" }, TODAY)).toMatchObject({
      message: DASHBOARD_RANGE_MESSAGES.tooEarly,
    });
    // End before start and too long: the order rule comes first.
    expect(parseDashboardRange({ from: "2026-10-19", to: "2025-01-01" }, TODAY)).toMatchObject({
      message: DASHBOARD_RANGE_MESSAGES.endBeforeStart,
    });
  });

  it("checks the boundaries of length and start date (A6)", () => {
    // 366 days, both ends included, is the longest range.
    expect(parseDashboardRange({ from: "2025-10-19", to: TODAY }, TODAY).kind).toBe("custom");
    // 367 days is one too many.
    expect(parseDashboardRange({ from: "2025-10-18", to: TODAY }, TODAY)).toMatchObject({
      message: DASHBOARD_RANGE_MESSAGES.tooLong,
    });
    // 2000-01-01 is the first allowed day; the day before is not.
    expect(parseDashboardRange({ from: "2000-01-01", to: "2000-01-01" }, TODAY).kind).toBe(
      "custom",
    );
    expect(parseDashboardRange({ from: "1999-12-31", to: "1999-12-31" }, TODAY)).toMatchObject({
      message: DASHBOARD_RANGE_MESSAGES.tooEarly,
    });
  });

  it("treats today as the last allowed day in the store time zone (Europe/Warsaw)", () => {
    // 22:30 UTC on 18 Oct is 00:30 on 19 Oct in Warsaw: today is 19 Oct.
    const late = storeToday(new Date("2026-10-18T22:30:00.000Z"));
    expect(late).toBe("2026-10-19");
    expect(parseDashboardRange({ from: late, to: late }, late).kind).toBe("custom");
    expect(parseDashboardRange({ from: late, to: "2026-10-20" }, late)).toMatchObject({
      message: DASHBOARD_RANGE_MESSAGES.future,
    });
    // 21:30 UTC on 18 Oct is still 23:30 on 18 Oct in Warsaw: today is 18 Oct, so 19 Oct is tomorrow.
    const early = storeToday(new Date("2026-10-18T21:30:00.000Z"));
    expect(early).toBe("2026-10-18");
    expect(parseDashboardRange({ from: "2026-10-18", to: "2026-10-19" }, early)).toMatchObject({
      message: DASHBOARD_RANGE_MESSAGES.future,
    });
  });

  it("ignores period without an alert when a valid from and to are present (A8)", () => {
    for (const period of ["abc", "7d", "30d", ["30d", "7d"], undefined]) {
      expect(parseDashboardRange({ period, from: "2026-10-01", to: "2026-10-14" }, TODAY)).toEqual({
        kind: "custom",
        firstDay: "2026-10-01",
        lastDay: "2026-10-14",
      });
    }
  });

  it("uses the first value of each repeated parameter, separately (A8, F-05)", () => {
    // period: the first value wins, even when a later one is valid.
    expect(parseDashboardRange({ period: ["30d", "7d"] }, TODAY)).toEqual({
      kind: "preset",
      preset: "30d",
    });
    expect(parseDashboardRange({ period: ["abc", "30d"] }, TODAY)).toEqual({
      kind: "preset",
      preset: "7d",
    });
    // from: the first value is malformed, so the range is invalid even though a later value is fine.
    expect(
      parseDashboardRange({ from: ["abc", "2026-10-01"], to: ["2026-10-02", "2026-10-03"] }, TODAY),
    ).toMatchObject({ kind: "invalid", submitted: { from: "", to: "2026-10-02" } });
    // to: a later malformed value is ignored because the first one is valid.
    expect(
      parseDashboardRange({ from: ["2026-10-01", "x"], to: ["2026-10-02", "abc"] }, TODAY),
    ).toEqual({ kind: "custom", firstDay: "2026-10-01", lastDay: "2026-10-02" });
  });
});

describe("dashboardRangeSchema", () => {
  it("reports one problem at a time, the first in A7 order", () => {
    const result = dashboardRangeSchema(TODAY).safeParse({ from: "2026-12-01", to: "2026-11-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      DASHBOARD_RANGE_MESSAGES.future,
    ]);
  });
});
