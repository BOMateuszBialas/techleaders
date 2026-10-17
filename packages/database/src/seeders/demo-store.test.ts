import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEMO_CATALOG } from "./DatabaseSeeder";
import {
  DEMO_WINDOW_DAYS,
  addDays,
  generateDemoStore,
  mulberry32,
  pickWeighted,
  splitByShares,
  storeDate,
  storeInstant,
  type DemoStore,
  type DemoStoreProduct,
} from "./demo-store";

/** The demo catalog as the seeder finds it, with stable fake ids. */
const PRODUCTS: DemoStoreProduct[] = DEMO_CATALOG.products.map((product, index) => ({
  slug: product.slug,
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  name: product.name,
  sku: product.sku,
  priceMinor: product.priceMinor,
}));
const idOf = (slug: string) => PRODUCTS.find((product) => product.slug === slug)?.id ?? "";

/** A Friday afternoon in October (UTC+2 in Warsaw). */
const SEED_DATE = new Date("2026-10-16T14:00:00.000Z");
const TODAY = "2026-10-16";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const store = generateDemoStore({ seedDate: SEED_DATE, products: PRODUCTS });

function paid(demo: DemoStore) {
  return demo.orders.filter((order) => order.paidAt !== null);
}

/** Units per product in orders paid within the last `days` store days (today included). */
function unitsSold(demo: DemoStore, days: number, today = TODAY): Map<string, number> {
  const from = addDays(today, -(days - 1));
  const orderIds = new Set(
    paid(demo)
      .filter((order) => storeDate(order.createdAt) >= from)
      .map((order) => order.id),
  );
  const units = new Map<string, number>();
  for (const item of demo.items.filter((line) => orderIds.has(line.orderId))) {
    units.set(item.productId, (units.get(item.productId) ?? 0) + item.quantity);
  }
  return units;
}

function ranking(units: Map<string, number>): string[] {
  return [...units].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

describe("mulberry32", () => {
  it("is deterministic per seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const values = Array.from({ length: 1000 }, () => a());
    expect(values).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(mulberry32(43)()).not.toBe(values[0]);
  });
});

describe("store calendar helpers", () => {
  it("reads the store day of an instant and adds days across months", () => {
    expect(storeDate(new Date("2026-10-16T22:30:00Z"))).toBe("2026-10-17");
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it.each([
    ["2026-10-16", 8 * 60, "2026-10-16T06:00:00.000Z"], // summer time, UTC+2
    ["2026-11-02", 8 * 60, "2026-11-02T07:00:00.000Z"], // winter time, UTC+1
    ["2026-10-25", 12 * 60, "2026-10-25T11:00:00.000Z"], // the October switch day, after it
    ["2026-03-29", 12 * 60, "2026-03-29T10:00:00.000Z"], // the March switch day, after it
    ["2026-03-29", 60, "2026-03-29T00:00:00.000Z"], // before the March switch
  ])("maps %s at minute %d to %s", (date, minutes, iso) => {
    expect(storeInstant(date, minutes).toISOString()).toBe(iso);
  });
});

describe("pickWeighted", () => {
  it("picks by weight, skips zero weights and returns null when nothing can be picked", () => {
    const entries = [
      ["a", 1],
      ["b", 0],
      ["c", 3],
    ] as const;
    expect(pickWeighted(entries, () => 0)).toBe("a");
    expect(pickWeighted(entries, () => 0.5)).toBe("c");
    // A roll at the very top (floating-point rounding) still picks the last weighted entry.
    expect(pickWeighted([...entries, ["d", 0]] as const, () => 1)).toBe("c");
    expect(pickWeighted([["x", 0]] as const, () => 0.5)).toBeNull();
    expect(pickWeighted([], () => 0.5)).toBeNull();
  });
});

describe("splitByShares", () => {
  it("splits exactly, by the largest remainder, ties to the first", () => {
    expect(splitByShares(10, [0.3, 0.3, 0.2, 0.1, 0.1])).toEqual([3, 3, 2, 1, 1]);
    expect(splitByShares(7, [1, 1, 1])).toEqual([3, 2, 2]);
    expect(splitByShares(0, [1, 2])).toEqual([0, 0]);
  });
});

describe("generateDemoStore", () => {
  it("is deterministic for the same date and products, whatever their order", () => {
    expect(generateDemoStore({ seedDate: SEED_DATE, products: [...PRODUCTS].reverse() })).toEqual(
      store,
    );
  });

  it(`covers ${DEMO_WINDOW_DAYS} store days ending on the seed date, 08:00–22:00, never after the seed instant`, () => {
    const days = new Set(store.orders.map((order) => storeDate(order.createdAt)));
    expect([...days].sort()[0]).toBe(addDays(TODAY, -(DEMO_WINDOW_DAYS - 1)));
    expect(days.size).toBeGreaterThanOrEqual(DEMO_WINDOW_DAYS - 1);
    for (const order of store.orders) {
      const local = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Warsaw",
          hour: "2-digit",
          hourCycle: "h23",
        }).format(order.createdAt),
      );
      expect(local).toBeGreaterThanOrEqual(8);
      expect(local).toBeLessThan(22);
      for (const at of [order.createdAt, order.paidAt, order.updatedAt]) {
        if (at) expect(at.getTime()).toBeLessThanOrEqual(SEED_DATE.getTime());
      }
    }
    expect(store.orders.length).toBeGreaterThanOrEqual(3 * (DEMO_WINDOW_DAYS - 1));
    expect(store.orders.length).toBeLessThanOrEqual(6 * DEMO_WINDOW_DAYS);
  });

  it("numbers references DEMO-0001… in time order, with valid keys and fingerprints", () => {
    store.orders.forEach((order, index) => {
      expect(order.publicReference).toBe(`DEMO-${String(index + 1).padStart(4, "0")}`);
      expect(order.id).toMatch(UUID_V4);
      expect(order.idempotencyKey).toMatch(UUID_V4);
      expect(order.requestFingerprint).toBe(
        createHash("sha256").update(`demo-seed:${order.publicReference}`).digest("hex"),
      );
      const previous = store.orders[index - 1];
      if (previous) expect(order.createdAt >= previous.createdAt).toBe(true);
    });
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(store.orders.map((order) => order.id))).toBe(true);
    expect(unique(store.orders.map((order) => order.idempotencyKey))).toBe(true);
  });

  it("keeps E02's money and payment rules on every order", () => {
    for (const order of store.orders) {
      const lines = store.items.filter((item) => item.orderId === order.id);
      expect(lines.length).toBeGreaterThan(0);
      expect(new Set(lines.map((line) => line.productId)).size).toBe(lines.length);
      for (const line of lines) {
        expect(line.lineTotalMinor).toBe(line.unitPriceMinor * line.quantity);
        expect(line.quantity).toBeGreaterThanOrEqual(1);
        expect(line.quantity).toBeLessThanOrEqual(99);
      }
      expect(order.subtotalMinor).toBe(lines.reduce((sum, line) => sum + line.lineTotalMinor, 0));
      expect(order.totalMinor).toBe(order.subtotalMinor + order.shippingMinor);
      expect(order.shippingMinor).toBe(0);
      expect(order.currency).toBe("PLN");
      if (order.status === "cancelled") {
        expect([order.paidAt, order.paymentProvider, order.paymentReference]).toEqual([
          null,
          null,
          null,
        ]);
      } else {
        expect(order.paidAt).not.toBeNull();
        expect(order.paymentProvider).toBe("demo");
        expect(order.paymentReference).toBe(`DEMO-PAY-${order.id}`);
        expect(storeDate(order.paidAt as Date)).toBe(storeDate(order.createdAt));
        expect((order.paidAt as Date) > order.createdAt).toBe(true);
      }
      expect(order.updatedAt >= (order.paidAt ?? order.createdAt)).toBe(true);
    }
  });

  it("uses the seed catalog's names, SKUs and prices as snapshots", () => {
    for (const item of store.items) {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
      expect(item).toMatchObject({
        productName: product?.name,
        productSku: product?.sku,
        unitPriceMinor: product?.priceMinor,
      });
    }
  });

  it("mixes statuses: shipped history, recent paid and processing, two cancelled, one refunded, none pending", () => {
    const count = (status: string) =>
      store.orders.filter((order) => order.status === status).length;
    expect(count("pending_payment")).toBe(0);
    expect(count("cancelled")).toBe(2);
    expect(count("refunded")).toBe(1);
    expect(count("paid")).toBeGreaterThan(0);
    expect(count("processing")).toBeGreaterThan(0);
    const weekAgo = addDays(TODAY, -6);
    for (const order of store.orders) {
      if (order.status === "cancelled" || order.status === "refunded") continue;
      const recent = storeDate(order.createdAt) >= weekAgo;
      expect(recent ? ["paid", "processing"] : ["shipped"]).toContain(order.status);
    }
  });

  it("marks every customer as fictional", () => {
    for (const order of store.orders) {
      expect(order.customerName).toMatch(/^\[DEMO] /);
      expect(order.customerEmail).toMatch(/^demo\.shopper\d{2}@example\.com$/);
      expect(order.shippingLine1).toMatch(/^ul\. Demo \d+$/);
      expect(order.shippingPostalCode).toMatch(/^\d{2}-\d{3}$/);
      expect(order.shippingCountry).toBe("PL");
    }
  });

  it("makes Pulse the best seller of the last 7 days", () => {
    expect(ranking(unitsSold(store, 7))[0]).toBe(idOf("pulse-ultralight-mouse"));
  });

  it("sells Titan only in the window's first two weeks", () => {
    const titan = idOf("titan-mmo-mouse");
    expect(unitsSold(store, 21).get(titan) ?? 0).toBe(0);
    expect(unitsSold(store, DEMO_WINDOW_DAYS).get(titan) ?? 0).toBeGreaterThan(0);
  });

  it("puts Vortex and Glide among the top three over 30 days, and sells Arena rarely", () => {
    const top3 = ranking(unitsSold(store, 30)).slice(0, 3);
    expect(top3).toContain(idOf("vortex-wireless-mouse"));
    expect(top3).toContain(idOf("glide-xl-mousepad"));
    const arena = unitsSold(store, DEMO_WINDOW_DAYS).get(idOf("arena-fight-stick")) ?? 0;
    expect(arena).toBeGreaterThan(0);
    expect(arena).toBeLessThanOrEqual(8);
  });

  it("gives Drift many views and few sales", () => {
    const drift = idOf("drift-wireless-headset");
    const views = store.productViewRows
      .filter((row) => row.productId === drift)
      .reduce((sum, row) => sum + row.views, 0);
    const sold = unitsSold(store, DEMO_WINDOW_DAYS).get(drift) ?? 0;
    expect(views).toBeGreaterThan(50 * Math.max(sold, 1));
    const otherViews = store.productViewRows
      .filter((row) => row.productId === idOf("glide-xl-mousepad"))
      .reduce((sum, row) => sum + row.views, 0);
    expect(views).toBeGreaterThan(otherViews);
  });

  it("holds the D08 traffic invariants per day and per product", () => {
    const days = [...new Set(store.trafficRows.map((row) => row.date))].sort();
    expect(days).toHaveLength(DEMO_WINDOW_DAYS);
    expect(days.at(-1)).toBe(TODAY);
    for (const date of days) {
      const rows = store.trafficRows.filter((row) => row.date === date);
      expect(rows.map((row) => row.source)).toEqual([
        "direct",
        "organic",
        "social",
        "email",
        "paid",
      ]);
      for (const row of rows) {
        expect(row.sessions).toBeGreaterThanOrEqual(row.productViews);
        expect(row.productViews).toBeGreaterThanOrEqual(row.addToCarts);
        expect(row.addToCarts).toBeGreaterThanOrEqual(row.checkoutsStarted);
        expect(row.checkoutsStarted).toBeGreaterThanOrEqual(0);
      }
      const sum = (key: "sessions" | "productViews" | "addToCarts" | "checkoutsStarted") =>
        rows.reduce((total, row) => total + row[key], 0);
      const paidThatDay = paid(store).filter(
        (order) => storeDate(order.paidAt as Date) === date,
      ).length;
      expect(sum("checkoutsStarted")).toBeGreaterThanOrEqual(paidThatDay);
      expect(sum("addToCarts")).toBeGreaterThanOrEqual(sum("checkoutsStarted"));

      const productRows = store.productViewRows.filter((row) => row.date === date);
      expect(productRows).toHaveLength(PRODUCTS.length);
      expect(sum("productViews")).toBe(productRows.reduce((total, row) => total + row.views, 0));
      expect(sum("addToCarts")).toBe(productRows.reduce((total, row) => total + row.addToCarts, 0));
      const soldThatDay = new Map<string, number>();
      const paidIds = new Set(
        paid(store)
          .filter((order) => storeDate(order.paidAt as Date) === date)
          .map((order) => order.id),
      );
      for (const item of store.items.filter((line) => paidIds.has(line.orderId))) {
        soldThatDay.set(item.productId, (soldThatDay.get(item.productId) ?? 0) + item.quantity);
      }
      for (const row of productRows) {
        expect(row.views).toBeGreaterThanOrEqual(row.addToCarts);
        expect(row.views).toBeGreaterThanOrEqual(soldThatDay.get(row.productId) ?? 0);
        expect(row.addToCarts).toBeGreaterThanOrEqual(soldThatDay.get(row.productId) ?? 0);
      }
    }
  });

  it("grows the social share over the window", () => {
    const share = (date: string) => {
      const rows = store.trafficRows.filter((row) => row.date === date);
      const social = rows.find((row) => row.source === "social")?.sessions ?? 0;
      return social / rows.reduce((total, row) => total + row.sessions, 0);
    };
    expect(share(TODAY)).toBeGreaterThan(share(addDays(TODAY, -(DEMO_WINDOW_DAYS - 1))));
  });

  it("re-anchors to a later seed date with the same shape", () => {
    const later = generateDemoStore({
      seedDate: new Date("2026-11-20T14:00:00.000Z"),
      products: PRODUCTS,
    });
    expect(later.orders).toHaveLength(store.orders.length);
    expect(later.orders.map((order) => order.status)).toEqual(
      store.orders.map((order) => order.status),
    );
    expect(storeDate(later.orders.at(-1)?.createdAt as Date)).toBe("2026-11-20");
  });

  it("leaves today's orders out when the seed runs before the shop opens", () => {
    const early = generateDemoStore({
      seedDate: new Date("2026-10-16T05:30:00.000Z"), // 07:30 in Warsaw
      products: PRODUCTS,
    });
    expect(early.orders.some((order) => storeDate(order.createdAt) === TODAY)).toBe(false);
    expect(early.orders.length).toBeLessThan(store.orders.length);
    for (const order of early.orders) {
      expect(order.createdAt.getTime()).toBeLessThan(new Date("2026-10-16T05:30:00Z").getTime());
    }
  });

  it("skips scenario products that are missing, and makes nothing from no products", () => {
    const withoutPulse = generateDemoStore({
      seedDate: SEED_DATE,
      products: PRODUCTS.filter((product) => product.slug !== "pulse-ultralight-mouse"),
    });
    expect(
      withoutPulse.items.some((item) => item.productId === idOf("pulse-ultralight-mouse")),
    ).toBe(false);
    expect(withoutPulse.orders.length).toBeGreaterThan(0);

    const empty = generateDemoStore({ seedDate: SEED_DATE, products: [] });
    expect(empty.orders).toEqual([]);
    expect(empty.productViewRows).toEqual([]);
    expect(empty.trafficRows.every((row) => row.sessions === 0)).toBe(true);
  });
});
