import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { EntityManager } from "@mikro-orm/postgresql";
import { createUnitTestOrm } from "../testing/unit-orm";
import {
  DEMO_CATALOG,
  DatabaseSeeder,
  seedCatalog,
  seedDemoStore,
  type SeedCatalog,
} from "./DatabaseSeeder";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const SEED_DATE = new Date("2026-10-16T14:00:00.000Z");

/**
 * A stubbed EntityManager: query-builder inserts are recorded, `find` answers from `rows` (by
 * slug), and `transactional` runs on a second stubbed fork whose writes are recorded too. The
 * ORM's generic signatures cannot be satisfied by plain objects, so results are typed loosely.
 */
function stubEntityManager(options: { missing?: string[] } = {}) {
  const em = orm.em.fork();
  const tx = orm.em.fork();
  const inserts: { entity: string; rows: Record<string, unknown>[] }[] = [];
  vi.spyOn(em, "createQueryBuilder").mockImplementation(((entity: {
    meta?: { className: string };
  }) => {
    const chain = {
      insert: (rows: Record<string, unknown>[]) => {
        inserts.push({ entity: entity.meta?.className ?? "?", rows });
        return chain;
      },
      onConflict: () => chain,
      ignore: () => chain,
      execute: async () => ({}),
    };
    return chain;
  }) as never);
  const find = vi
    .spyOn(em, "find")
    .mockImplementation((async (_entity: unknown, where: { slug: { $in: string[] } }) =>
      where.slug.$in
        .filter((slug) => !(options.missing ?? []).includes(slug))
        .map((slug) => ({ id: `id-${slug}`, slug }))) as never);
  vi.spyOn(em, "transactional").mockImplementation(((
    callback: (em: EntityManager) => Promise<unknown>,
  ) => callback(tx)) as never);
  const execute = vi.spyOn(tx, "execute").mockResolvedValue([] as never);
  const insertMany = vi.spyOn(tx, "insertMany").mockResolvedValue([] as never);
  return { em, inserts, find, execute, insertMany };
}

describe("seedCatalog (insert-only, A18)", () => {
  let stub: ReturnType<typeof stubEntityManager>;

  beforeEach(() => {
    stub = stubEntityManager();
  });

  it("inserts missing categories and products with on-conflict-ignore and links products to their category", async () => {
    expect(await seedCatalog(stub.em, DEMO_CATALOG)).toEqual({ skipped: [] });

    const [categories, products] = stub.inserts;
    expect(categories?.rows).toHaveLength(DEMO_CATALOG.categories.length);
    expect(products?.rows).toHaveLength(DEMO_CATALOG.products.length);
    expect(products?.rows[0]).toMatchObject({
      slug: "vortex-wireless-mouse",
      category: "id-mice",
      status: "published",
      featured: true,
      currency: "PLN",
      imageUrl: "/demo/products/vortex-wireless-mouse.svg",
      description: expect.stringMatching(/^Wireless gaming mouse/),
    });
  });

  it("marks every demo product with a DEMO- SKU and carries no [DEMO] text (R11)", () => {
    for (const product of DEMO_CATALOG.products) expect(product.sku).toMatch(/^DEMO-/);
    for (const category of DEMO_CATALOG.categories)
      expect(category.description).not.toMatch(/\[DEMO]/);
    for (const product of DEMO_CATALOG.products)
      expect(product.description ?? "").not.toMatch(/\[DEMO]/);
  });

  it("is a gaming-accessories store with an out-of-stock product (decision D10)", () => {
    expect(DEMO_CATALOG.categories.map((category) => category.slug)).toEqual([
      "mice",
      "keyboards",
      "headsets",
      "controllers",
      "mousepads",
    ]);
    expect(DEMO_CATALOG.products.length).toBeGreaterThanOrEqual(15);
    expect(DEMO_CATALOG.products.some((product) => product.stockQuantity === 0)).toBe(true);
    for (const product of DEMO_CATALOG.products)
      expect(product.imageUrl).toBe(`/demo/products/${product.slug}.svg`);
  });

  it("features about six products across at least three categories (spec G9)", () => {
    const featured = DEMO_CATALOG.products.filter((product) => product.featured);
    expect(featured.length).toBeGreaterThanOrEqual(6);
    expect(new Set(featured.map((product) => product.category)).size).toBeGreaterThanOrEqual(3);
    expect(featured.some((product) => product.stockQuantity === 0)).toBe(true);
  });

  it("seeds an explicit status, a generic description and no image when none is given", async () => {
    const [category] = DEMO_CATALOG.categories;
    const draft: SeedCatalog = {
      categories: [category!],
      products: [
        {
          slug: "draft-pad",
          name: "Draft pad",
          category: category!.slug,
          priceMinor: 100,
          stockQuantity: 1,
          sku: "TEST-001",
          status: "draft",
        },
      ],
    };
    await seedCatalog(stub.em, draft);
    expect(stub.inserts[1]?.rows[0]).toMatchObject({
      status: "draft",
      featured: false,
      imageUrl: null,
      description: "Draft pad. Seed data for local development.",
    });
  });

  it("skips, without crashing, a product whose category or row is missing afterwards", async () => {
    const missing = stubEntityManager({ missing: ["mice", "nova-tkl-mechanical-keyboard"] });
    const { skipped } = await seedCatalog(missing.em, DEMO_CATALOG);
    const mice = DEMO_CATALOG.products.filter((product) => product.category === "mice");
    expect(skipped).toEqual([
      ...mice.map((product) => product.slug),
      "nova-tkl-mechanical-keyboard",
    ]);
  });

  it("runs no insert for an empty catalog", async () => {
    expect(await seedCatalog(stub.em, { categories: [], products: [] })).toEqual({ skipped: [] });
    expect(stub.inserts).toEqual([]);
  });
});

describe("seedDemoStore", () => {
  it("replaces the DEMO- orders and the traffic rows in one transaction", async () => {
    const stub = stubEntityManager();
    const result = await seedDemoStore(stub.em, SEED_DATE);

    expect(stub.execute.mock.calls.map((call) => [String(call[0]), call[1]])).toEqual([
      ["delete from orders where public_reference like ?", ["DEMO-%"]],
      ["delete from product_view_daily_stats", undefined],
      ["delete from traffic_daily_stats", undefined],
    ]);
    const [orders, items, views, traffic] = stub.insertMany.mock.calls.map(
      (call) => call[1] as Record<string, unknown>[],
    );
    expect(orders).toHaveLength(result.orders);
    expect(orders?.[0]).toMatchObject({ publicReference: "DEMO-0001", currency: "PLN" });
    expect(items).toHaveLength(result.items);
    expect(items?.[0]).toMatchObject({
      order: orders?.[0]?.id,
      product: expect.stringMatching(/^id-/),
    });
    expect(items?.[0]).not.toHaveProperty("orderId");
    expect(views?.[0]).toMatchObject({ product: expect.stringMatching(/^id-/) });
    expect(traffic).toHaveLength(result.trafficRows);
    expect(result.trafficRows).toBe(35 * 5);
  });

  it("prices lines from the seed catalog and leaves missing products out", async () => {
    const stub = stubEntityManager({ missing: ["pulse-ultralight-mouse"] });
    await seedDemoStore(stub.em, SEED_DATE);
    const items = stub.insertMany.mock.calls[1]?.[1] as {
      product: string;
      unitPriceMinor: number;
    }[];
    expect(items.some((item) => item.product === "id-pulse-ultralight-mouse")).toBe(false);
    const vortex = items.find((item) => item.product === "id-vortex-wireless-mouse");
    expect(vortex?.unitPriceMinor).toBe(
      DEMO_CATALOG.products.find((product) => product.slug === "vortex-wireless-mouse")?.priceMinor,
    );
  });

  it("writes only the deletes and empty traffic when no demo product exists", async () => {
    const stub = stubEntityManager({
      missing: DEMO_CATALOG.products.map((product) => product.slug),
    });
    expect(await seedDemoStore(stub.em, SEED_DATE)).toEqual({
      orders: 0,
      items: 0,
      trafficRows: 35 * 5,
    });
    expect(stub.insertMany).toHaveBeenCalledOnce();
  });
});

describe("DatabaseSeeder", () => {
  it("seeds the catalog, warns about skipped products and regenerates the demo store", async () => {
    const stub = stubEntityManager({ missing: ["titan-mmo-mouse"] });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await new DatabaseSeeder(() => SEED_DATE).run(stub.em);
    expect(warn).toHaveBeenCalledWith(
      'Demo product "titan-mmo-mouse" was skipped: it could not be created or found.',
    );
    expect(stub.insertMany).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("anchors the history on the current time by default", async () => {
    const stub = stubEntityManager();
    vi.useFakeTimers({ now: SEED_DATE, toFake: ["Date"] });
    try {
      await new DatabaseSeeder().run(stub.em);
    } finally {
      vi.useRealTimers();
    }
    const orders = stub.insertMany.mock.calls[0]?.[1] as { createdAt: Date }[];
    expect(orders.at(-1)?.createdAt.getTime()).toBeLessThanOrEqual(SEED_DATE.getTime());
  });
});
