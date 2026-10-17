import { describe, expect, it } from "vitest";
import {
  DEMO_ORDER_REFERENCE_LIKE,
  DEMO_ORDER_REFERENCE_PREFIX,
  isDemoOrderReference,
} from "./demo-order";
import { ORDER_STATUSES, type OrderStatus } from "./order";
import { generateOrderReference } from "./order-reference";
import {
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  allowedTransitions,
  canTransition,
  isOrderStatus,
  isRecordOnlyStatus,
  restocksOnTransition,
} from "./order-status";

/** The A4 table, written out pair by pair so a change to the rule shows up here. */
const ALLOWED: ReadonlySet<string> = new Set([
  "pending_payment→cancelled",
  "paid→processing",
  "paid→refunded",
  "processing→shipped",
  "processing→refunded",
  "shipped→refunded",
]);

const PAIRS: [OrderStatus, OrderStatus][] = ORDER_STATUSES.flatMap((from) =>
  ORDER_STATUSES.map((to): [OrderStatus, OrderStatus] => [from, to]),
);

describe("order status transitions (A4)", () => {
  it("covers all 36 pairs of the 6×6 matrix", () => {
    expect(PAIRS).toHaveLength(36);
  });

  it.each(PAIRS)("%s → %s follows the transition table", (from, to) => {
    expect(canTransition(from, to)).toBe(ALLOWED.has(`${from}→${to}`));
  });

  it("never lets the admin mark an order paid (A3) or leave a terminal status", () => {
    for (const from of ORDER_STATUSES) expect(canTransition(from, "paid")).toBe(false);
    expect(allowedTransitions("cancelled")).toEqual([]);
    expect(allowedTransitions("refunded")).toEqual([]);
  });

  it("never cancels a paid order: it can only be marked refunded", () => {
    for (const from of ["paid", "processing", "shipped"] as const) {
      expect(canTransition(from, "cancelled")).toBe(false);
      expect(canTransition(from, "refunded")).toBe(true);
    }
  });

  it("lists the allowed targets in workflow order", () => {
    expect(allowedTransitions("paid")).toEqual(["processing", "refunded"]);
    expect(allowedTransitions("processing")).toEqual(["shipped", "refunded"]);
    expect(allowedTransitions("pending_payment")).toBe(ORDER_TRANSITIONS.pending_payment);
  });

  it.each(PAIRS)("%s → %s restocks only for pending_payment → cancelled", (from, to) => {
    expect(restocksOnTransition(from, to)).toBe(from === "pending_payment" && to === "cancelled");
  });

  it("marks only refunded as a record-only status", () => {
    expect(ORDER_STATUSES.filter(isRecordOnlyStatus)).toEqual(["refunded"]);
  });

  it("labels every status", () => {
    expect(ORDER_STATUSES.map((status) => ORDER_STATUS_LABELS[status])).toEqual([
      "Awaiting payment",
      "Paid",
      "Processing",
      "Shipped",
      "Cancelled",
      "Refunded",
    ]);
  });

  it.each([
    ["paid", true],
    ["refunded", true],
    ["PAID", false],
    ["", false],
    [undefined, false],
    [1, false],
  ])("isOrderStatus(%j) is %s", (value, expected) => {
    expect(isOrderStatus(value)).toBe(expected);
  });
});

/** PostgreSQL `like` semantics for the patterns used here (`%` = any run, `_` = one char). */
function sqlLike(value: string, pattern: string): boolean {
  const regex = pattern
    .split("")
    .map((char) => {
      if (char === "%") return ".*";
      if (char === "_") return ".";
      return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${regex}$`, "s").test(value);
}

describe("demo order references (A13)", () => {
  it.each([
    ["DEMO-0001", true],
    ["DEMO-0150", true],
    ["CO-7K3MQ-9XZ2A-H4TPC-W8R1N", false],
    ["demo-0001", false],
    ["XDEMO-0001", false],
  ])("%s is a demo reference: %s, in TypeScript and in SQL alike", (reference, expected) => {
    expect(isDemoOrderReference(reference)).toBe(expected);
    expect(sqlLike(reference, DEMO_ORDER_REFERENCE_LIKE)).toBe(expected);
  });

  it("builds the SQL pattern from the prefix, which needs no like-escaping", () => {
    expect(DEMO_ORDER_REFERENCE_LIKE).toBe(`${DEMO_ORDER_REFERENCE_PREFIX}%`);
    expect(DEMO_ORDER_REFERENCE_PREFIX).not.toMatch(/[%_\\]/);
  });

  it("is never produced by checkout's reference generator, whatever the random bytes", () => {
    // Every byte value at every position: the body maps each to a base32 character after "CO-".
    for (let byte = 0; byte < 256; byte += 1) {
      const reference = generateOrderReference((length) => new Uint8Array(length).fill(byte));
      expect(reference.startsWith("CO-")).toBe(true);
      expect(isDemoOrderReference(reference)).toBe(false);
    }
  });
});
