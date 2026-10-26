import { createHash } from "node:crypto";
import {
  DEMO_ORDER_REFERENCE_PREFIX,
  TRAFFIC_SOURCES,
  type OrderStatus,
  type TrafficSource,
} from "@commerceos/core";

/**
 * The demo store's order history and fictional traffic (orders spec Phase 2, E04-S03; decision
 * D08). Pure and deterministic: the same seed date and products always give the same rows, so
 * every run produces the same history relative to its date. The seeder writes the result.
 *
 * - 35 calendar days (store time zone) ending on the seed date; 3–6 orders a day; times between
 *   08:00 and 22:00 local, never after the seed instant.
 * - References `DEMO-0001…` in time order; fictional customers with `example.com` emails.
 * - Status mix: older than 7 days shipped, the last 7 days processing (3–6 days old) and paid
 *   (0–2 days), two cancelled (never paid), one refunded. No `pending_payment` order (A15): an
 *   unpaid order would hold stock that a cancel returns and a re-seed never takes back.
 * - Scenarios (spec table): Pulse is the best seller of the last 7 days; Titan sold only in the
 *   window's first two weeks; Drift has many views and few sales; Vortex and Glide sell
 *   steadily; Arena sells rarely.
 * - Traffic rows are derived upward from the orders, so sessions ≥ product views ≥
 *   add-to-carts ≥ checkouts started ≥ orders per day, and each product's views ≥ its units
 *   sold that day, by construction.
 */

export const DEMO_STORE_TIME_ZONE = "Europe/Warsaw";
export const DEMO_WINDOW_DAYS = 35;
/** The PRNG seed: fixed, so the generated history never changes between runs. */
export const DEMO_STORE_SEED = 20261016;

/** A demo product as the seeder found it in the database (insert-only catalog, A18). */
export type DemoStoreProduct = {
  slug: string;
  id: string;
  name: string;
  sku: string | null;
  priceMinor: number;
};

export type DemoOrderRow = {
  id: string;
  publicReference: string;
  idempotencyKey: string;
  requestFingerprint: string;
  status: Exclude<OrderStatus, "pending_payment">;
  customerName: string;
  customerEmail: string;
  shippingLine1: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: "PL";
  currency: "PLN";
  subtotalMinor: number;
  shippingMinor: 0;
  totalMinor: number;
  paymentProvider: "demo" | null;
  paymentReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DemoOrderItemRow = {
  orderId: string;
  productId: string;
  productName: string;
  productSku: string | null;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
};

export type DemoTrafficRow = {
  /** `YYYY-MM-DD` in the store time zone. */
  date: string;
  source: TrafficSource;
  sessions: number;
  productViews: number;
  addToCarts: number;
  checkoutsStarted: number;
};

export type DemoProductViewRow = {
  date: string;
  productId: string;
  views: number;
  addToCarts: number;
};

export type DemoStore = {
  orders: DemoOrderRow[];
  items: DemoOrderItemRow[];
  trafficRows: DemoTrafficRow[];
  productViewRows: DemoProductViewRow[];
};

/** A deterministic PRNG in [0, 1) (mulberry32): seed data only, never for anything secret. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------
// Calendar days in the store time zone

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

const zoneParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: DEMO_STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function wallClock(instant: Date): { date: string; minutes: number; asUtc: number } {
  const parts = Object.fromEntries(
    zoneParts.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const [year, month, day, hour, minute] = ["year", "month", "day", "hour", "minute"].map((key) =>
    Number(parts[key]),
  ) as [number, number, number, number, number];
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + minute,
    asUtc: Date.UTC(year, month - 1, day, hour, minute),
  };
}

/** The calendar day of an instant in the store time zone, `YYYY-MM-DD`. */
export function storeDate(instant: Date): string {
  return wallClock(instant).date;
}

/** `date` plus `days` calendar days. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The instant of a local wall-clock time (minutes after midnight) on a store-time-zone day. */
export function storeInstant(date: string, minutes: number): Date {
  const wall = Date.parse(`${date}T00:00:00Z`) + minutes * MINUTE_MS;
  const offset = (instant: number) =>
    wallClock(new Date(instant)).asUtc - Math.floor(instant / MINUTE_MS) * MINUTE_MS;
  // Two passes settle the offset also on a DST switch day.
  const first = wall - offset(wall);
  return new Date(wall - offset(first));
}

// ---------------------------------------------------------------------------------------------
// Fictional customers (never real people: invented names, reserved `example.com` domain)

const FIRST_NAMES = ["Anna", "Piotr", "Kasia", "Marek", "Ola", "Tomek", "Ewa", "Jan"];
const SURNAMES = ["Nowak", "Lis", "Wójcik", "Zając", "Mazur", "Krawiec"];
const CITIES: readonly [city: string, postalCode: string][] = [
  ["Warszawa", "00-950"],
  ["Kraków", "30-001"],
  ["Gdańsk", "80-827"],
  ["Wrocław", "50-001"],
  ["Poznań", "60-101"],
  ["Łódź", "90-001"],
];
const CUSTOMER_COUNT = 24;

function customer(index: number) {
  const number = String(index + 1).padStart(2, "0");
  const [city, postalCode] = CITIES[index % CITIES.length] as [string, string];
  return {
    customerName: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${SURNAMES[index % SURNAMES.length]}`,
    customerEmail: `demo.shopper${number}@example.com`,
    shippingLine1: `ul. Demo ${index + 1}`,
    shippingCity: city,
    shippingPostalCode: postalCode,
  };
}

// ---------------------------------------------------------------------------------------------
// Scenarios

const PULSE = "pulse-ultralight-mouse";
const TITAN = "titan-mmo-mouse";
const DRIFT = "drift-wireless-headset";
const VORTEX = "vortex-wireless-mouse";
const GLIDE = "glide-xl-mousepad";
const ARENA = "arena-fight-stick";

/** Titan sells only in the window's first two weeks (14 days), then is out of stock. */
const TITAN_LAST_SALE_AGE = DEMO_WINDOW_DAYS - 14;

/** How likely a product is picked for an order line, by its age in days before the seed day. */
function weight(slug: string, age: number): number {
  switch (slug) {
    case PULSE:
      return age < 7 ? 6 : 2;
    case TITAN:
      return age >= TITAN_LAST_SALE_AGE ? 3 : 0;
    case DRIFT:
      return 0.4;
    case ARENA:
      return 0.3;
    case VORTEX:
    case GLIDE:
      return 4;
    default:
      return 1.2;
  }
}

/** Orders with an overridden status: [age in days, index of the order that day]. */
const CANCELLED_ORDERS: readonly (readonly [number, number])[] = [
  [20, 1],
  [4, 1],
];
const REFUNDED_ORDER = [11, 1] as const;

function statusFor(age: number, index: number): DemoOrderRow["status"] {
  if (CANCELLED_ORDERS.some(([a, i]) => a === age && i === index)) return "cancelled";
  if (REFUNDED_ORDER[0] === age && REFUNDED_ORDER[1] === index) return "refunded";
  if (age >= 7) return "shipped";
  return age >= 3 ? "processing" : "paid";
}

// ---------------------------------------------------------------------------------------------
// Helpers

function uuidV4(random: () => number): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(random() * 256));
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A weighted pick; `null` when no entry has weight. Rounding never falls off the end. */
export function pickWeighted<T>(
  entries: readonly (readonly [T, number])[],
  random: () => number,
): T | null {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return null;
  let roll = random() * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll < 0) return value;
  }
  return (entries.findLast(([, w]) => w > 0) as readonly [T, number])[0];
}

/** Splits `total` into integer parts by `shares` (largest remainder; ties to the first). */
export function splitByShares(total: number, shares: readonly number[]): number[] {
  const sum = shares.reduce((a, b) => a + b, 0);
  const exact = shares.map((share) => (total * share) / sum);
  const parts = exact.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index);
  for (const { index } of order) {
    if (left === 0) break;
    parts[index] = (parts[index] as number) + 1;
    left -= 1;
  }
  return parts;
}

/** Source shares on a window day: social grows from 15 % to 25 % over the window. */
function sourceShares(dayIndex: number): number[] {
  const social = 0.15 + (0.1 * dayIndex) / (DEMO_WINDOW_DAYS - 1);
  const rest = 1 - social;
  // direct 30 %, organic 30 %, email 10 %, paid 10 % of the non-social traffic, scaled.
  return [0.375 * rest, 0.375 * rest, social, 0.125 * rest, 0.125 * rest];
}

// ---------------------------------------------------------------------------------------------
// Generator

export function generateDemoStore(input: {
  seedDate: Date;
  products: readonly DemoStoreProduct[];
  random?: () => number;
}): DemoStore {
  const random = input.random ?? mulberry32(DEMO_STORE_SEED);
  const products = [...input.products].sort((a, b) => a.slug.localeCompare(b.slug));
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const today = storeDate(input.seedDate);
  // Leave 15 minutes before the seed instant for the payment that follows an order.
  const lastMinuteToday = Math.min(22 * 60, wallClock(input.seedDate).minutes - 15);

  const orders: DemoOrderRow[] = [];
  const items: DemoOrderItemRow[] = [];
  const unitsByDay = new Map<string, Map<string, number>>();
  const ordersByDay = new Map<string, number>();

  for (let dayIndex = 0; dayIndex < DEMO_WINDOW_DAYS; dayIndex += 1) {
    const age = DEMO_WINDOW_DAYS - 1 - dayIndex;
    const date = addDays(today, -age);
    const count = 3 + Math.floor(random() * 4);
    const fractions = Array.from({ length: count }, () => random()).sort((a, b) => a - b);
    const endMinute = age === 0 ? lastMinuteToday : 22 * 60;
    const dayUnits = new Map<string, number>();
    unitsByDay.set(date, dayUnits);

    fractions.forEach((fraction, index) => {
      const lineCount = 1 + (random() < 0.35 ? 1 : 0) + (random() < 0.1 ? 1 : 0);
      const lines = new Map<string, number>();
      // The best seller of the last 7 days: every day's first order carries two Pulse mice.
      if (age < 7 && index === 0 && bySlug.has(PULSE)) lines.set(PULSE, 2);
      while (lines.size < lineCount) {
        const slug = pickWeighted(
          products
            .filter((product) => !lines.has(product.slug))
            .map((product) => [product.slug, weight(product.slug, age)] as const),
          random,
        );
        if (slug === null) break;
        lines.set(slug, random() < 0.8 ? 1 : 2);
      }
      const customerIndex = Math.floor(random() * CUSTOMER_COUNT);
      const paymentMinutes = 1 + Math.floor(random() * 9);
      const id = uuidV4(random);
      const idempotencyKey = uuidV4(random);
      // Today's orders fit between 08:00 and 15 minutes before the seed instant.
      if (endMinute <= 8 * 60 || lines.size === 0) return;

      const createdAt = storeInstant(date, 8 * 60 + Math.floor(fraction * (endMinute - 8 * 60)));
      const status = statusFor(age, index);
      const paidAt =
        status === "cancelled" ? null : new Date(createdAt.getTime() + paymentMinutes * MINUTE_MS);
      const orderItems = [...lines].map(([slug, quantity]) => {
        const product = bySlug.get(slug) as DemoStoreProduct;
        dayUnits.set(slug, (dayUnits.get(slug) ?? 0) + quantity);
        return {
          orderId: id,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unitPriceMinor: product.priceMinor,
          quantity,
          lineTotalMinor: product.priceMinor * quantity,
        };
      });
      const totalMinor = orderItems.reduce((sum, item) => sum + item.lineTotalMinor, 0);
      const settled = { cancelled: 1, paid: 0, processing: 1, shipped: 2, refunded: 5 }[status];
      const updatedAt = new Date(
        Math.min(
          (paidAt ?? createdAt).getTime() + settled * DAY_MS,
          input.seedDate.getTime(),
          // A status change never predates the payment it follows.
        ),
      );
      items.push(...orderItems);
      ordersByDay.set(date, (ordersByDay.get(date) ?? 0) + 1);
      orders.push({
        id,
        publicReference: "",
        idempotencyKey,
        requestFingerprint: "",
        status,
        ...customer(customerIndex),
        shippingCountry: "PL",
        currency: "PLN",
        subtotalMinor: totalMinor,
        shippingMinor: 0,
        totalMinor,
        paymentProvider: paidAt ? "demo" : null,
        paymentReference: paidAt ? `DEMO-PAY-${id}` : null,
        paidAt,
        createdAt,
        updatedAt: new Date(Math.max(updatedAt.getTime(), (paidAt ?? createdAt).getTime())),
      });
    });
  }

  orders.forEach((order, index) => {
    order.publicReference = `${DEMO_ORDER_REFERENCE_PREFIX}${String(index + 1).padStart(4, "0")}`;
    order.requestFingerprint = createHash("sha256")
      .update(`demo-seed:${order.publicReference}`)
      .digest("hex");
  });

  const trafficRows: DemoTrafficRow[] = [];
  const productViewRows: DemoProductViewRow[] = [];
  for (let dayIndex = 0; dayIndex < DEMO_WINDOW_DAYS; dayIndex += 1) {
    const age = DEMO_WINDOW_DAYS - 1 - dayIndex;
    const date = addDays(today, -age);
    const dayUnits = unitsByDay.get(date) as Map<string, number>;
    let views = 0;
    let addToCarts = 0;
    for (const product of products) {
      const units = dayUnits.get(product.slug) ?? 0;
      // An out-of-stock product cannot be added to a cart; others get a few abandoned adds.
      const soldOut = product.slug === TITAN && age < TITAN_LAST_SALE_AGE;
      const extraAdds = soldOut ? 0 : Math.floor(random() * 3) + (product.slug === DRIFT ? 3 : 0);
      const productAdds = units + extraAdds;
      const productViews =
        productAdds * (3 + Math.floor(random() * 3)) +
        8 +
        Math.floor(random() * 15) +
        (product.slug === DRIFT ? 60 + Math.floor(random() * 40) : 0);
      views += productViews;
      addToCarts += productAdds;
      productViewRows.push({
        date,
        productId: product.id,
        views: productViews,
        addToCarts: productAdds,
      });
    }
    const dayOrders = ordersByDay.get(date) ?? 0;
    // Every order is at least one unit, so add-to-carts ≥ orders and this never undercuts them.
    const checkouts = Math.min(addToCarts, dayOrders + Math.floor(random() * 4));
    const sessions = views + Math.floor(views * (0.25 + random() * 0.2));

    // Split top-down, so each source's funnel stays ordered: checkouts, then the extra
    // add-to-carts, views and sessions on top of the level below.
    const shares = sourceShares(dayIndex);
    const checkoutsBy = splitByShares(checkouts, shares);
    const addsBy = splitByShares(addToCarts - checkouts, shares).map(
      (extra, i) => extra + (checkoutsBy[i] as number),
    );
    const viewsBy = splitByShares(views - addToCarts, shares).map(
      (extra, i) => extra + (addsBy[i] as number),
    );
    const sessionsBy = splitByShares(sessions - views, shares).map(
      (extra, i) => extra + (viewsBy[i] as number),
    );
    TRAFFIC_SOURCES.forEach((source, i) => {
      trafficRows.push({
        date,
        source,
        sessions: sessionsBy[i] as number,
        productViews: viewsBy[i] as number,
        addToCarts: addsBy[i] as number,
        checkoutsStarted: checkoutsBy[i] as number,
      });
    });
  }

  return { orders, items, trafficRows, productViewRows };
}
