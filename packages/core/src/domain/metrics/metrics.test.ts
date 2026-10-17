import { describe, expect, it } from "vitest";
import {
  LOW_STOCK_THRESHOLD,
  METRIC_DEFINITIONS,
  METRIC_IDS,
  PAID_ORDER_STATUSES,
  STORE_CURRENCY,
  TOP_PRODUCTS_LIMIT,
} from "./metric-definitions";
import { STORE_TIME_ZONE, averageOrderValue, previousPeriod, resolvePeriod } from "./metric-period";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe("resolvePeriod", () => {
  it("covers the last 7 whole days in Warsaw, today included, as a half-open range", () => {
    // 12:00 CEST on Saturday 17 Oct 2026.
    const period = resolvePeriod("7d", new Date("2026-10-17T10:00:00.000Z"));

    expect(period).toEqual({
      preset: "7d",
      from: new Date("2026-10-10T22:00:00.000Z"),
      to: new Date("2026-10-17T22:00:00.000Z"),
      label: "11–17 Oct 2026",
      timeZone: STORE_TIME_ZONE,
    });
  });

  it("covers 30 days and names both months when the range spans two", () => {
    const period = resolvePeriod("30d", new Date("2026-10-17T10:00:00.000Z"));

    expect(period.from).toEqual(new Date("2026-09-17T22:00:00.000Z"));
    expect(period.to).toEqual(new Date("2026-10-17T22:00:00.000Z"));
    expect(period.to.getTime() - period.from.getTime()).toBe(30 * DAY);
    expect(period.label).toBe("18 Sep – 17 Oct 2026");
  });

  it("names both years when the range spans New Year", () => {
    const period = resolvePeriod("30d", new Date("2027-01-05T12:00:00.000Z"));

    expect(period.label).toBe("7 Dec 2026 – 5 Jan 2027");
    expect(period.from).toEqual(new Date("2026-12-06T23:00:00.000Z"));
    expect(period.to).toEqual(new Date("2027-01-05T23:00:00.000Z"));
  });

  it("keeps local midnights across the October switch to winter time (one 25-hour day)", () => {
    // 13:00 CET on Tuesday 27 Oct 2026; clocks went back on Sunday 25 Oct.
    const period = resolvePeriod("7d", new Date("2026-10-27T12:00:00.000Z"));

    expect(period.from).toEqual(new Date("2026-10-20T22:00:00.000Z")); // 21 Oct 00:00 CEST
    expect(period.to).toEqual(new Date("2026-10-27T23:00:00.000Z")); // 28 Oct 00:00 CET
    expect(period.to.getTime() - period.from.getTime()).toBe(7 * DAY + HOUR);
    expect(period.label).toBe("21–27 Oct 2026");
  });

  it("ends a period at the right midnight on the switch day itself", () => {
    const period = resolvePeriod("7d", new Date("2026-10-25T12:00:00.000Z"));

    expect(period.to).toEqual(new Date("2026-10-25T23:00:00.000Z")); // 26 Oct 00:00 CET
    expect(period.from).toEqual(new Date("2026-10-18T22:00:00.000Z")); // 19 Oct 00:00 CEST
  });

  it("keeps local midnights across the March switch to summer time (one 23-hour day)", () => {
    // 12:00 CEST on Tuesday 31 Mar 2026; clocks went forward on Sunday 29 Mar.
    const period = resolvePeriod("7d", new Date("2026-03-31T10:00:00.000Z"));

    expect(period.from).toEqual(new Date("2026-03-24T23:00:00.000Z")); // 25 Mar 00:00 CET
    expect(period.to).toEqual(new Date("2026-03-31T22:00:00.000Z")); // 1 Apr 00:00 CEST
    expect(period.to.getTime() - period.from.getTime()).toBe(7 * DAY - HOUR);
    expect(period.label).toBe("25–31 Mar 2026");
  });

  it("starts a new day exactly at local midnight", () => {
    const atMidnight = resolvePeriod("7d", new Date("2026-10-16T22:00:00.000Z"));
    const justBefore = resolvePeriod("7d", new Date("2026-10-16T21:59:59.999Z"));

    expect(atMidnight.label).toBe("11–17 Oct 2026");
    expect(atMidnight.to).toEqual(new Date("2026-10-17T22:00:00.000Z"));
    expect(justBefore.label).toBe("10–16 Oct 2026");
    expect(justBefore.to).toEqual(new Date("2026-10-16T22:00:00.000Z"));
  });
});

describe("previousPeriod", () => {
  it("is the 7 days that end where the current period starts", () => {
    const current = resolvePeriod("7d", new Date("2026-10-17T10:00:00.000Z"));

    expect(previousPeriod(current)).toEqual({
      preset: "7d",
      from: new Date("2026-10-03T22:00:00.000Z"),
      to: current.from,
      label: "4–10 Oct 2026",
      timeZone: STORE_TIME_ZONE,
    });
  });

  it("is the 30 days before a 30-day period, across a month boundary", () => {
    const previous = previousPeriod(resolvePeriod("30d", new Date("2026-10-17T10:00:00.000Z")));

    expect(previous.from).toEqual(new Date("2026-08-18T22:00:00.000Z"));
    expect(previous.to).toEqual(new Date("2026-09-17T22:00:00.000Z"));
    expect(previous.to.getTime() - previous.from.getTime()).toBe(30 * DAY);
    expect(previous.label).toBe("19 Aug – 17 Sep 2026");
  });

  it("keeps local midnights when the previous period holds the switch to winter time", () => {
    // 13:00 CET on Sunday 1 Nov 2026; the current period is 26 Oct – 1 Nov (all CET).
    const current = resolvePeriod("7d", new Date("2026-11-01T12:00:00.000Z"));
    const previous = previousPeriod(current);

    expect(current.from).toEqual(new Date("2026-10-25T23:00:00.000Z")); // 26 Oct 00:00 CET
    expect(previous.from).toEqual(new Date("2026-10-18T22:00:00.000Z")); // 19 Oct 00:00 CEST
    expect(previous.to).toEqual(current.from);
    expect(previous.to.getTime() - previous.from.getTime()).toBe(7 * DAY + HOUR);
    expect(previous.label).toBe("19–25 Oct 2026");
  });

  it("keeps local midnights when the previous period holds the switch to summer time", () => {
    // 12:00 CEST on Sunday 5 Apr 2026: the current period is 30 Mar – 5 Apr.
    const previous = previousPeriod(resolvePeriod("7d", new Date("2026-04-05T10:00:00.000Z")));

    expect(previous.from).toEqual(new Date("2026-03-22T23:00:00.000Z")); // 23 Mar 00:00 CET
    expect(previous.to).toEqual(new Date("2026-03-29T22:00:00.000Z")); // 30 Mar 00:00 CEST
    expect(previous.to.getTime() - previous.from.getTime()).toBe(7 * DAY - HOUR);
    expect(previous.label).toBe("23–29 Mar 2026");
  });
});

describe("averageOrderValue", () => {
  it("is null when there are no paid orders (Not enough data)", () => {
    expect(averageOrderValue(0, 0)).toBeNull();
  });

  it("divides in whole minor units, rounding half up", () => {
    expect(averageOrderValue(0, 1)).toBe(0);
    expect(averageOrderValue(1000, 3)).toBe(333);
    expect(averageOrderValue(2000, 3)).toBe(667);
    expect(averageOrderValue(999, 2)).toBe(500);
    expect(averageOrderValue(1001, 2)).toBe(501);
    expect(averageOrderValue(98_470, 29)).toBe(3396);
  });
});

describe("METRIC_DEFINITIONS", () => {
  it("defines every metric once, under its own id, with a label and text", () => {
    for (const id of METRIC_IDS) {
      const definition = METRIC_DEFINITIONS[id];
      expect(definition.id).toBe(id);
      expect(definition.label).not.toBe("");
      expect(definition.definition.length).toBeGreaterThan(20);
    }
    expect(Object.keys(METRIC_DEFINITIONS).sort()).toEqual([...METRIC_IDS].sort());
  });

  it("names the statuses a paid order may have, and the ones revenue excludes", () => {
    expect(PAID_ORDER_STATUSES).toEqual(["paid", "processing", "shipped"]);
    const paid = METRIC_DEFINITIONS.paidOrders.definition;
    for (const status of PAID_ORDER_STATUSES) expect(paid).toContain(status);
    expect(paid).toContain("payment date");
    expect(paid).toContain(STORE_CURRENCY);

    const revenue = METRIC_DEFINITIONS.revenue.definition;
    expect(revenue).toContain("Cancelled and refunded orders are excluded");
    expect(revenue).toContain("shipping included");
    expect(METRIC_DEFINITIONS.ordersPlaced.definition).toContain("any status");
  });

  it("states the AOV fallback and the limits the code uses", () => {
    expect(METRIC_DEFINITIONS.aov.definition).toContain('"Not enough data"');
    expect(METRIC_DEFINITIONS.aov.definition).toContain("rounded half up");
    expect(METRIC_DEFINITIONS.topProducts.definition).toContain(`top ${TOP_PRODUCTS_LIMIT}`);
    expect(METRIC_DEFINITIONS.lowStock.definition).toContain(`${LOW_STOCK_THRESHOLD} or fewer`);
    expect(METRIC_DEFINITIONS.lowStock.definition).toContain("out-of-stock included");
  });
});
