import { describe, expect, it } from "vitest";
import {
  DEMO_ORDER_REFERENCE_LIKE,
  DEMO_ORDER_REFERENCE_PREFIX,
  isDemoOrderReference,
} from "./demo-order";
import { generateOrderReference } from "./order-reference";

describe("demo order references", () => {
  it("recognises seeded references by their prefix only", () => {
    expect(isDemoOrderReference("DEMO-0001")).toBe(true);
    expect(isDemoOrderReference("CO-7K3MQ-9XZ2A-H4TPC-W8R1N")).toBe(false);
    expect(isDemoOrderReference("demo-0001")).toBe(false);
    expect(isDemoOrderReference("CO-DEMO-0001")).toBe(false);
  });

  it("builds the SQL pattern from the same prefix, with no LIKE wildcard inside it", () => {
    expect(DEMO_ORDER_REFERENCE_LIKE).toBe(`${DEMO_ORDER_REFERENCE_PREFIX}%`);
    expect(DEMO_ORDER_REFERENCE_PREFIX).not.toMatch(/[%_\\]/);
  });

  it("is never produced by checkout, whatever the random bytes", () => {
    for (const fill of [0, 13, 255]) {
      const reference = generateOrderReference((length) => new Uint8Array(length).fill(fill));
      expect(isDemoOrderReference(reference)).toBe(false);
    }
  });
});
