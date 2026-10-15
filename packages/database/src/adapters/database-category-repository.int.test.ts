import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { hasAppErrorCode, isUniqueFieldConflict } from "@commerceos/core";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DEMO_CATALOG, seedCatalog } from "../seeders/DatabaseSeeder";
import { E2E_CATALOG } from "../testing/catalog-fixtures";
import "../testing/provided-context";
import { toCatalogWriteError } from "./catalog-write-error";
import { DatabaseCategoryRepository } from "./database-category-repository";

describe("DatabaseCategoryRepository (PostgreSQL)", () => {
  let orm: MikroORM;

  const repository = () => new DatabaseCategoryRepository({ em: orm.em.fork() });

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await seedCatalog(orm.em.fork(), DEMO_CATALOG);
    await seedCatalog(orm.em.fork(), E2E_CATALOG);
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  async function idOf(slug: string): Promise<string> {
    const rows = await orm.em.fork().execute("select id from categories where slug = ?", [slug]);
    const id: unknown = rows[0]?.id;
    if (typeof id !== "string") throw new Error(`category ${slug} missing`);
    return id;
  }

  async function rejection(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
      () => {
        throw new Error("expected a rejection");
      },
      (error: unknown) => error,
    );
  }

  // Spike (spec step 3): MikroORM 7 copies the pg error's own properties onto its
  // DriverException, so the SQLSTATE and the constraint name are readable structurally.
  it("exposes the SQLSTATE and the constraint name on a unique violation", async () => {
    const error = await rejection(
      orm.em.fork().execute("insert into categories (name, slug) values ('Dup', 'mice')"),
    );
    expect(error).toMatchObject({ code: "23505", constraint: "categories_slug_unique" });
    expect(isUniqueFieldConflict(toCatalogWriteError(error))).toBe(true);
  });

  it("maps the real foreign-key and check constraint names to field errors", async () => {
    const fk = await rejection(
      orm.em
        .fork()
        .execute(
          "insert into products (name, slug, price_minor, category_id) values ('X', 'fk-probe', 1, gen_random_uuid())",
        ),
    );
    expect(fk).toMatchObject({ code: "23503", constraint: "products_category_id_foreign" });
    expect(toCatalogWriteError(fk)).toMatchObject({
      fieldErrors: { categoryId: expect.any(Array) },
    });

    const check = await rejection(
      orm.em
        .fork()
        .execute("insert into products (name, slug, price_minor) values ('X', 'check-probe', -1)"),
    );
    expect(check).toMatchObject({ code: "23514", constraint: "products_price_minor_check" });
    expect(toCatalogWriteError(check)).toMatchObject({ fieldErrors: { price: expect.any(Array) } });
  });

  it("lists categories by name with their product counts, drafts included", async () => {
    const categories = await repository().list();
    expect(categories.map(({ slug, productCount }) => [slug, productCount])).toEqual([
      ["controllers", 3],
      ["headsets", 3],
      ["keyboards", 3],
      ["mice", 4],
      ["mousepads", 3],
      ["e2e-drafts-only", 1],
      ["e2e-empty", 0],
    ]);
    expect(categories[3]).toMatchObject({
      name: "Mice",
      description: "[DEMO] Gaming mice: wired, wireless and MMO.",
    });
  });

  it("finds a category with its count, and lists its products by name", async () => {
    const miceId = await idOf("mice");
    expect(await repository().findById(miceId)).toMatchObject({ slug: "mice", productCount: 4 });
    expect(await repository().findById("6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2dff")).toBeNull();

    const products = await repository().listProducts(miceId, 2);
    // The database collation sorts letters before the "[" of "[E2E] Draft Vortex mouse".
    expect(products).toEqual([
      { id: expect.any(String), slug: "pulse-ultralight-mouse", name: "Pulse Ultralight Mouse" },
      { id: expect.any(String), slug: "titan-mmo-mouse", name: "Titan MMO Mouse" },
    ]);
  });

  it("creates and updates a category, keeping its product count", async () => {
    const created = await repository().create({
      name: "Streaming gear",
      slug: "streaming-gear",
      description: null,
    });
    expect(created).toEqual({
      id: expect.any(String),
      name: "Streaming gear",
      slug: "streaming-gear",
      description: null,
      productCount: 0,
    });

    const updated = await repository().update(created.id, {
      name: "Streaming",
      slug: "streaming",
      description: "Cameras and microphones.",
    });
    expect(updated).toMatchObject({ slug: "streaming", description: "Cameras and microphones." });
    expect(await repository().findById(created.id)).toMatchObject({ name: "Streaming" });

    const mice = await repository().update(await idOf("mice"), {
      name: "Mice",
      slug: "mice",
      description: "[DEMO] Gaming mice: wired, wireless and MMO.",
    });
    expect(mice?.productCount).toBe(4);
    expect(
      await repository().update("6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2dff", {
        name: "X",
        slug: "x",
        description: null,
      }),
    ).toBeNull();
  });

  it("raises a slug conflict on create and on update, from the database constraint", async () => {
    const onCreate = await rejection(
      repository().create({ name: "Mice 2", slug: "mice", description: null }),
    );
    expect(isUniqueFieldConflict(onCreate)).toBe(true);
    expect(onCreate).toMatchObject({ field: "slug" });

    const onUpdate = await rejection(
      repository().update(await idOf("keyboards"), {
        name: "Keyboards",
        slug: "headsets",
        description: null,
      }),
    );
    expect(onUpdate).toMatchObject({ field: "slug" });
  });

  it("deletes an empty category, refuses a used one and reports a missing one", async () => {
    const empty = await repository().create({ name: "Temp", slug: "temp", description: null });
    expect(await repository().deleteIfEmpty(empty.id)).toEqual({ kind: "deleted" });
    expect(await repository().findById(empty.id)).toBeNull();
    expect(await repository().deleteIfEmpty(empty.id)).toEqual({ kind: "not_found" });

    const miceId = await idOf("mice");
    expect(await repository().deleteIfEmpty(miceId)).toEqual({ kind: "in_use", productCount: 4 });
    expect(await repository().findById(miceId)).not.toBeNull();
  });

  it("never un-categorizes a product written while the category is being deleted", async () => {
    const category = await repository().create({ name: "Race", slug: "race", description: null });

    // A product insert into the category stays open: its FK check holds a key-share lock.
    const writer = orm.em.fork();
    await writer.begin();
    await writer.execute(
      "insert into products (name, slug, price_minor, category_id) values ('Race product', 'race-product', 100, ?)",
      [category.id],
    );
    const deleting = repository().deleteIfEmpty(category.id);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await writer.commit();

    // The delete waited for the lock and then saw the committed product.
    expect(await deleting).toEqual({ kind: "in_use", productCount: 1 });
    const rows = await orm.em
      .fork()
      .execute("select category_id from products where slug = 'race-product'");
    expect(rows[0]?.category_id).toBe(category.id);

    // The other order: once the empty category is gone, a product write fails its FK.
    const gone = await repository().create({ name: "Gone", slug: "gone", description: null });
    expect(await repository().deleteIfEmpty(gone.id)).toEqual({ kind: "deleted" });
    const late = await rejection(
      orm.em
        .fork()
        .execute(
          "insert into products (name, slug, price_minor, category_id) values ('Late', 'late-product', 100, ?)",
          [gone.id],
        ),
    );
    expect(hasAppErrorCode(toCatalogWriteError(late), "VALIDATION_FAILED")).toBe(true);
  });
});
