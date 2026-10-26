import { describe, expect, it } from "vitest";
import { DEMO_SKU_LIKE, DEMO_SKU_PREFIX, isDemoSku } from "./demo-sku";

/** The SQL twin `upper(btrim(sku)) like 'DEMO-%'`, evaluated in TypeScript for the same cases. */
function sqlLike(sku: string, pattern: string): boolean {
  const value = sku.replace(/^ +/, "").replace(/ +$/, "").toUpperCase();
  return value.startsWith(pattern.slice(0, -1));
}

describe("demo SKUs", () => {
  it("marks a DEMO- SKU in any letter case and with surrounding spaces", () => {
    for (const sku of ["DEMO-MOU-001", "demo-mou-001", " DEMO-MOU-001 ", "Demo-Key-002"]) {
      expect(isDemoSku(sku), sku).toBe(true);
    }
  });

  it("does not mark an owner SKU, a blank SKU or a SKU that only contains the prefix", () => {
    for (const sku of ["OWN-0001", "", "DEMO", "OWN-DEMO-1", "DEMO0001"]) {
      expect(isDemoSku(sku), sku).toBe(false);
    }
  });

  it("builds the SQL pattern from the same prefix, with no LIKE wildcard inside it", () => {
    expect(DEMO_SKU_LIKE).toBe(`${DEMO_SKU_PREFIX}%`);
    expect(DEMO_SKU_PREFIX).not.toMatch(/[%_\\]/);
  });

  it("agrees with the SQL rule `upper(btrim(sku)) like 'DEMO-%'` on every case", () => {
    for (const sku of ["DEMO-MOU-001", "demo-mou-001", " DEMO-MOU-002", "OWN-0001", "", "DEMO"]) {
      expect(isDemoSku(sku), sku).toBe(sqlLike(sku, DEMO_SKU_LIKE));
    }
  });
});
