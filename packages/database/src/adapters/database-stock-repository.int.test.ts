import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { hasAppErrorCode } from "@commerceos/core";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DEMO_CATALOG, seedCatalog } from "../seeders/DatabaseSeeder";
import "../testing/provided-context";
import { DatabaseProductRepository } from "./database-product-repository";
import { DatabaseStockRepository } from "./database-stock-repository";

const MISSING_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3eff";
/** A seeded demo product (published), reset to 8 in stock before each test. */
const SLUG = "strike-60-keyboard";

describe("DatabaseStockRepository (PostgreSQL)", () => {
  let orm: MikroORM;
  let productId: string;

  const repository = () => new DatabaseStockRepository({ em: orm.em.fork() });

  async function productRow(): Promise<{ stock_quantity: number; updated_at: string }> {
    const rows = await orm.em.fork().execute<{ stock_quantity: number; updated_at: string }[]>(
      // As text: a raw query returns timestamps as strings; compared exactly or via Date.parse.
      "select stock_quantity, updated_at::text as updated_at from products where id = ?",
      [productId],
    );
    const row = rows[0];
    if (!row) throw new Error("product missing");
    return row;
  }

  async function historyCount(): Promise<number> {
    const rows = await orm.em
      .fork()
      .execute<{ count: number }[]>(
        "select count(*)::int as count from stock_adjustments where product_id = ?",
        [productId],
      );
    return rows[0]?.count ?? 0;
  }

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await seedCatalog(orm.em.fork(), DEMO_CATALOG);
    const rows = await orm.em
      .fork()
      .execute<{ id: string }[]>("select id from products where slug = ?", [SLUG]);
    productId = rows[0]!.id;
  });

  beforeEach(async () => {
    const em = orm.em.fork();
    await em.execute("delete from stock_adjustments");
    await em.execute(
      "update products set stock_quantity = 8, updated_at = now() - interval '1 day' where id = ?",
      [productId],
    );
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("sets the stock, records the change and bumps updated_at in one transaction", async () => {
    const before = await productRow();
    const result = await repository().setStock({
      productId,
      expectedQuantity: 8,
      newQuantity: 0,
    });

    expect(result).toEqual({
      kind: "updated",
      adjustment: {
        id: expect.any(String),
        productId,
        previousQuantity: 8,
        newQuantity: 0,
        createdAt: expect.any(Date),
      },
    });
    const after = await productRow();
    expect(after.stock_quantity).toBe(0);
    expect(Date.parse(after.updated_at)).toBeGreaterThan(Date.parse(before.updated_at));
    expect(await historyCount()).toBe(1);
  });

  it("returns the new stock to a product read on the same request EntityManager", async () => {
    const em = orm.em.fork();
    await new DatabaseStockRepository({ em }).setStock({
      productId,
      expectedQuantity: 8,
      newQuantity: 3,
    });
    expect(await new DatabaseProductRepository({ em }).findById(productId)).toMatchObject({
      stockQuantity: 3,
    });
  });

  it("rolls the update back when the history insert fails", async () => {
    const before = await productRow();
    // expected === new passes the update but violates the history's no-op check, so the
    // insert fails after the update ran (the use case never sends this; the DB refuses it).
    await expect(
      repository().setStock({ productId, expectedQuantity: 8, newQuantity: 8 }),
    ).rejects.toThrow(/stock_adjustments_quantity_changed_check/);

    const after = await productRow();
    expect(after.stock_quantity).toBe(8);
    expect(after.updated_at).toBe(before.updated_at);
    expect(await historyCount()).toBe(0);
  });

  it("changes nothing for a stale expected quantity and returns the current one", async () => {
    const before = await productRow();
    expect(await repository().setStock({ productId, expectedQuantity: 5, newQuantity: 0 })).toEqual(
      { kind: "stale", currentQuantity: 8 },
    );

    const after = await productRow();
    expect(after).toEqual(before);
    expect(await historyCount()).toBe(0);
  });

  it("reports an unknown product", async () => {
    expect(
      await repository().setStock({ productId: MISSING_ID, expectedQuantity: 0, newQuantity: 1 }),
    ).toEqual({ kind: "not_found" });
  });

  it("gives one update and one stale result for two concurrent sets from the same page", async () => {
    const results = await Promise.all([
      repository().setStock({ productId, expectedQuantity: 8, newQuantity: 2 }),
      repository().setStock({ productId, expectedQuantity: 8, newQuantity: 5 }),
    ]);

    const kinds = results.map((result) => result.kind).sort();
    expect(kinds).toEqual(["stale", "updated"]);
    const updated = results.find((result) => result.kind === "updated");
    const stale = results.find((result) => result.kind === "stale");
    const stored = (await productRow()).stock_quantity;
    expect(updated?.kind === "updated" && updated.adjustment.newQuantity).toBe(stored);
    expect(stale?.kind === "stale" && stale.currentQuantity).toBe(stored);
    expect(await historyCount()).toBe(1);
  });

  it("maps a negative quantity reaching the database to a field error", async () => {
    const error = await repository()
      .setStock({ productId, expectedQuantity: 8, newQuantity: -1 })
      .catch((caught: unknown) => caught);
    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect(error).toMatchObject({ fieldErrors: { newQuantity: [expect.any(String)] } });
    expect((await productRow()).stock_quantity).toBe(8);
  });

  it("lists the history newest first, limited", async () => {
    const steps: [number, number][] = [
      [8, 6],
      [6, 4],
      [4, 9],
    ];
    for (const [expectedQuantity, newQuantity] of steps) {
      await repository().setStock({ productId, expectedQuantity, newQuantity });
    }

    const history = await repository().listAdjustments(productId, 2);
    expect(history.map((entry) => [entry.previousQuantity, entry.newQuantity])).toEqual([
      [4, 9],
      [6, 4],
    ]);
    expect(await repository().listAdjustments(MISSING_ID, 20)).toEqual([]);
  });

  it("refuses a negative or no-op history row and deletes the history with its product", async () => {
    const em = orm.em.fork();
    await expect(
      em.execute(
        "insert into stock_adjustments (product_id, previous_quantity, new_quantity) values (?, 0, -1)",
        [productId],
      ),
    ).rejects.toThrow(/stock_adjustments_new_quantity_check/);
    await expect(
      em.execute(
        "insert into stock_adjustments (product_id, previous_quantity, new_quantity) values (?, -1, 0)",
        [productId],
      ),
    ).rejects.toThrow(/stock_adjustments_previous_quantity_check/);
    await expect(
      em.execute(
        "insert into stock_adjustments (product_id, previous_quantity, new_quantity) values (?, 3, 3)",
        [productId],
      ),
    ).rejects.toThrow(/stock_adjustments_quantity_changed_check/);

    const [doomed] = await em.execute<{ id: string }[]>(
      "insert into products (name, slug, price_minor, stock_quantity) values ('[DEMO] Doomed pad', 'demo-doomed-pad', 100, 1) returning id",
    );
    await em.execute(
      "insert into stock_adjustments (product_id, previous_quantity, new_quantity) values (?, 1, 0)",
      [doomed!.id],
    );
    await em.execute("delete from products where id = ?", [doomed!.id]);
    const left = await em.execute<{ count: number }[]>(
      "select count(*)::int as count from stock_adjustments where product_id = ?",
      [doomed!.id],
    );
    expect(left[0]?.count).toBe(0);
  });
});
