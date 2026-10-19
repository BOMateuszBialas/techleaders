import {
  DASHBOARD_RANGE_MESSAGES,
  METRIC_DEFINITIONS,
  PERIOD_COMPARISON_DEFINITION,
  periodCalendarDays,
  previousRange,
  resolveCustomPeriod,
  resolvePeriod,
} from "@commerceos/core";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { useBrowser } from "./support/browser-test";
import { useOwnerSession } from "./support/sign-in";

const card = (id: string) => `main [data-metric="${id}"]`;
const CHANGE = '[data-testid="metric-change"]';
const RANGE = 'main [data-testid="period-range"]';
const COMPARISON = 'main [data-testid="comparison-range"]';
const COMPARED = ["ordersPlaced", "paidOrders", "revenue", "aov"];
const CHANGE_LINE =
  /^(Up .+ from .+|Down .+ from .+|No change from .+|Not enough data to compare)$/;

/** Seven whole days ending a week ago (store time zone): inside the seeded 35-day history. */
function lastWeekButOne() {
  const days = periodCalendarDays(resolvePeriod("7d", new Date(Date.now() - 7 * 86_400_000)));
  const period = resolveCustomPeriod(days.firstDay, days.lastDay);
  return { ...days, period, previous: previousRange(period) };
}

/**
 * The dashboard's custom range and comparison (date-range spec, step 6). Asserts properties,
 * never seeded numbers. Uses the owner session of the global setup (no sign-in).
 */
describe("admin dashboard date range", () => {
  const browser = useBrowser();

  async function openDashboard(path = "/admin") {
    await browser().open(path);
    await browser().waitForText(METRIC_DEFINITIONS.revenue.label);
  }

  beforeAll(async () => {
    await browser().clearCookies();
    await useOwnerSession(browser());
  });

  it("compares the default period with the previous 7 days on every compared card", async () => {
    await openDashboard();

    const previous = previousRange(resolvePeriod("7d", new Date()));
    expect(await browser().text(COMPARISON)).toBe(
      `Compared with ${previous.label}, the previous 7 days.`,
    );
    expect(await browser().text("main")).toContain(PERIOD_COMPARISON_DEFINITION);
    for (const id of COMPARED) {
      expect(await browser().text(`${card(id)} ${CHANGE}`), id).toMatch(CHANGE_LINE);
    }
    for (const id of ["topProducts", "lowStock"]) {
      expect(await browser().text(`${card(id)} ${CHANGE}`)).toBe(
        "Not compared with the previous period.",
      );
    }
  });

  it("shows a custom range picked in the form, kept in the URL", async () => {
    const { firstDay, lastDay, period, previous } = lastWeekButOne();
    await openDashboard();

    // agent-browser's fill types into a date input in the browser's locale format (dd.mm.yyyy
    // here), so the ISO value is set directly, as the native date picker would.
    expect(await browser().value("#range-from")).toBe(
      periodCalendarDays(resolvePeriod("7d", new Date())).firstDay,
    );
    await browser().evaluate(
      `(() => { document.querySelector("#range-from").value = "${firstDay}"; document.querySelector("#range-to").value = "${lastDay}"; })()`,
    );
    await browser().clickRole("button", "Show range");
    await browser().waitForUrl(`**/admin?from=${firstDay}&to=${lastDay}`);
    await browser().waitForText(`Compared with ${previous.label}`);

    expect(await browser().text(RANGE)).toBe(`Custom range: ${period.label} (Europe/Warsaw)`);
    expect(await browser().count('main nav[aria-label="Period"] a[aria-current="page"]')).toBe(0);
    expect(await browser().value("#range-from")).toBe(firstDay);
    expect(await browser().value("#range-to")).toBe(lastDay);
    for (const id of COMPARED) {
      expect(await browser().text(`${card(id)} ${CHANGE}`), id).toMatch(CHANGE_LINE);
    }
    // A range that ended before today is complete: no "today is not over" note.
    expect(await browser().text("main")).not.toContain("Today is not over yet");

    // A preset link leaves the custom range.
    await browser().clickRole("link", "Last 30 days");
    await browser().waitForUrl("**/admin?period=30d");
    await browser().waitForText(resolvePeriod("30d", new Date()).label);
  });

  it("falls back to the last 7 days with an alert for an invalid range", async () => {
    const { firstDay, lastDay } = lastWeekButOne();
    await openDashboard(`/admin?from=${lastDay}&to=${firstDay}`);

    expect(await browser().text('main [role="alert"]')).toBe(
      `${DASHBOARD_RANGE_MESSAGES.endBeforeStart} Showing the preset period instead.`,
    );
    expect(await browser().text(RANGE)).toBe(
      `${resolvePeriod("7d", new Date()).label} (Europe/Warsaw)`,
    );
    // The form keeps what was submitted, so the owner can correct it.
    expect(await browser().value("#range-from")).toBe(lastDay);
    expect(await browser().value("#range-to")).toBe(firstDay);
  });

  it("keeps the dashboard and its range form within a 390 px screen", async () => {
    const { firstDay, lastDay } = lastWeekButOne();
    await browser().setViewport(390, 844);
    await openDashboard(`/admin?from=${firstDay}&to=${lastDay}`);

    const layout = z
      .object({ scrollWidth: z.number(), innerWidth: z.number(), formRight: z.number() })
      .parse(
        await browser().evaluate(
          '({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, formRight: Math.max(...[...document.querySelectorAll(\'main form[aria-label="Custom range"] input, main form[aria-label="Custom range"] button\')].map((el) => el.getBoundingClientRect().right)) })',
        ),
      );
    expect(layout.innerWidth).toBe(390);
    expect(layout.scrollWidth).toBe(layout.innerWidth);
    expect(layout.formRight).toBeLessThanOrEqual(390);
  });
});
