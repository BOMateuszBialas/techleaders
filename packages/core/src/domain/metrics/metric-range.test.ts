import { describe, expect, it } from "vitest";
import {
  STORE_TIME_ZONE,
  countDays,
  formatIsoDay,
  isIsoDay,
  periodCalendarDays,
  periodDays,
  previousPeriod,
  previousRange,
  resolveCustomPeriod,
  resolvePeriod,
  storeToday,
} from "./metric-period";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Custom ranges and the length-based previous period (date-range spec). */
describe("resolveCustomPeriod", () => {
  it("covers whole Warsaw days, both ends included, as a half-open range", () => {
    expect(resolveCustomPeriod("2026-10-01", "2026-10-14")).toEqual({
      preset: "custom",
      from: new Date("2026-09-30T22:00:00.000Z"),
      to: new Date("2026-10-14T22:00:00.000Z"),
      label: "1–14 Oct 2026",
      timeZone: STORE_TIME_ZONE,
    });
  });

  it("covers a single day and names it once", () => {
    const period = resolveCustomPeriod("2026-10-17", "2026-10-17");

    expect(period.to.getTime() - period.from.getTime()).toBe(DAY);
    expect(period.label).toBe("17 Oct 2026");
    expect(periodDays(period)).toBe(1);
  });

  it("keeps local midnights across both DST switches", () => {
    const autumn = resolveCustomPeriod("2026-10-24", "2026-10-26");
    expect(autumn.from).toEqual(new Date("2026-10-23T22:00:00.000Z"));
    expect(autumn.to).toEqual(new Date("2026-10-26T23:00:00.000Z"));
    expect(autumn.to.getTime() - autumn.from.getTime()).toBe(3 * DAY + HOUR);

    const spring = resolveCustomPeriod("2026-03-28", "2026-03-30");
    expect(spring.from).toEqual(new Date("2026-03-27T23:00:00.000Z"));
    expect(spring.to).toEqual(new Date("2026-03-30T22:00:00.000Z"));
    expect(spring.to.getTime() - spring.from.getTime()).toBe(3 * DAY - HOUR);
    expect(periodDays(spring)).toBe(3);
  });

  it("names both years across New Year and refuses a date that does not exist", () => {
    expect(resolveCustomPeriod("2025-12-25", "2026-01-07").label).toBe("25 Dec 2025 – 7 Jan 2026");
    expect(() => resolveCustomPeriod("2026-02-30", "2026-03-01")).toThrow(/2026-02-30/);
  });
});

describe("previousRange", () => {
  it("is the same number of days ending the day before, keeping the preset", () => {
    const previous = previousRange(resolveCustomPeriod("2026-10-01", "2026-10-14"));

    expect(previous).toEqual({
      preset: "custom",
      from: new Date("2026-09-16T22:00:00.000Z"),
      to: new Date("2026-09-30T22:00:00.000Z"),
      label: "17–30 Sep 2026",
      timeZone: STORE_TIME_ZONE,
    });
    expect(periodDays(previous)).toBe(14);
  });

  it("gives a single day the day before, across the October DST switch", () => {
    const previous = previousRange(resolveCustomPeriod("2026-10-26", "2026-10-26"));

    expect(previous.from).toEqual(new Date("2026-10-24T22:00:00.000Z"));
    expect(previous.to.getTime() - previous.from.getTime()).toBe(DAY + HOUR);
    expect(previous.label).toBe("25 Oct 2026");
  });

  it("equals previousPeriod for every preset", () => {
    for (const preset of ["7d", "30d"] as const) {
      const period = resolvePeriod(preset, new Date("2026-10-27T12:00:00.000Z"));
      expect(previousRange(period)).toEqual(previousPeriod(period));
      expect(periodDays(previousRange(period))).toBe(preset === "7d" ? 7 : 30);
    }
  });

  it("matches periodCalendarDays on both ends", () => {
    const previous = previousRange(resolveCustomPeriod("2026-01-01", "2026-12-31"));
    expect(periodCalendarDays(previous)).toEqual({ firstDay: "2025-01-01", lastDay: "2025-12-31" });
  });
});

describe("calendar-day helpers", () => {
  it("accepts only real YYYY-MM-DD dates", () => {
    for (const valid of ["2026-10-19", "2024-02-29", "2000-01-01"]) {
      expect(isIsoDay(valid)).toBe(true);
    }
    for (const invalid of ["2026-02-29", "2026-13-01", "2026-1-1", "19-10-2026", "abc", ""]) {
      expect(isIsoDay(invalid)).toBe(false);
    }
  });

  it("counts days with both ends included", () => {
    expect(countDays("2026-10-19", "2026-10-19")).toBe(1);
    expect(countDays("2026-01-01", "2026-12-31")).toBe(365);
    expect(countDays("2024-01-01", "2024-12-31")).toBe(366);
    expect(countDays("2026-03-28", "2026-03-30")).toBe(3);
  });

  it("names a day and finds today in Warsaw", () => {
    expect(formatIsoDay("2026-09-06")).toBe("6 Sep 2026");
    // 23:30 UTC on 18 Oct is 01:30 on 19 Oct in Warsaw.
    expect(storeToday(new Date("2026-10-18T23:30:00.000Z"))).toBe("2026-10-19");
  });
});
