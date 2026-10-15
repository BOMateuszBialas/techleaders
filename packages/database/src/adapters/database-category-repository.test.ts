import { afterAll, describe, expect, it, vi } from "vitest";
import { isUniqueFieldConflict } from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseCategoryRepository } from "./database-category-repository";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const MICE_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01";
const mice = { id: MICE_ID, slug: "mice", name: "Mice", description: "[DEMO] Gaming mice." };
const pads = { id: "cat-2", slug: "mousepads", name: "Mousepads", description: undefined };

// The stubs return plain rows shaped like the entities; the ORM's generic signatures
// cannot be satisfied by plain objects, so their results are typed loosely on purpose.
function setup() {
  const em = orm.em.fork();
  const tx = orm.em.fork();
  vi.spyOn(em, "transactional").mockImplementation(((
    callback: (em: EntityManager) => Promise<unknown>,
  ) => callback(tx)) as never);
  return {
    em,
    tx,
    find: vi.spyOn(em, "find"),
    findOne: vi.spyOn(em, "findOne"),
    count: vi.spyOn(em, "count"),
    execute: vi.spyOn(em, "execute"),
    flush: vi.spyOn(em, "flush"),
    repository: new DatabaseCategoryRepository({ em }),
  };
}

describe("DatabaseCategoryRepository", () => {
  it("lists categories by name with their product counts, zero when none", async () => {
    const { find, execute, repository } = setup();
    find.mockResolvedValue([mice, pads] as never);
    execute.mockResolvedValue([{ category_id: MICE_ID, product_count: 4 }] as never);

    expect(await repository.list()).toEqual([
      { ...mice, productCount: 4 },
      { ...pads, description: null, productCount: 0 },
    ]);
    expect(find.mock.calls[0]?.[2]).toEqual({ orderBy: { name: "asc", slug: "asc" } });
  });

  it("finds a category with its product count, or null", async () => {
    const { findOne, count, repository } = setup();
    findOne.mockResolvedValueOnce(mice as never).mockResolvedValueOnce(null);
    count.mockResolvedValue(3);

    expect(await repository.findById(MICE_ID)).toEqual({ ...mice, productCount: 3 });
    expect(count.mock.calls[0]?.[1]).toEqual({ category: MICE_ID });
    expect(await repository.findById("missing")).toBeNull();
  });

  it("lists a category's products by name, limited, as plain refs", async () => {
    const { find, repository } = setup();
    find.mockResolvedValue([{ id: "p-1", slug: "titan", name: "Titan", priceMinor: 1 }] as never);

    expect(await repository.listProducts(MICE_ID, 10)).toEqual([
      { id: "p-1", slug: "titan", name: "Titan" },
    ]);
    expect(find.mock.calls[0]?.[1]).toEqual({ category: MICE_ID });
    expect(find.mock.calls[0]?.[2]).toEqual({
      orderBy: { name: "asc", slug: "asc" },
      limit: 10,
      fields: ["id", "slug", "name"],
    });
  });

  it("creates a category with no products", async () => {
    const { em, flush, repository } = setup();
    const create = vi.spyOn(em, "create").mockReturnValue({ ...mice, id: "new-id" } as never);
    flush.mockResolvedValue(undefined);

    expect(
      await repository.create({ name: "Mice", slug: "mice", description: "[DEMO] Gaming mice." }),
    ).toEqual({ ...mice, id: "new-id", productCount: 0 });
    expect(create.mock.calls[0]?.[1]).toEqual({
      name: "Mice",
      slug: "mice",
      description: "[DEMO] Gaming mice.",
    });
  });

  it("maps a unique violation on flush and rethrows anything else", async () => {
    const { em, flush, repository } = setup();
    vi.spyOn(em, "create").mockReturnValue({ ...mice } as never);
    flush.mockRejectedValueOnce(
      Object.assign(new Error("duplicate"), {
        code: "23505",
        constraint: "categories_slug_unique",
      }),
    );
    const conflict = await repository.create({ name: "M", slug: "mice", description: null }).then(
      () => null,
      (error: unknown) => error,
    );
    expect(isUniqueFieldConflict(conflict)).toBe(true);

    flush.mockRejectedValueOnce(new Error("connection lost"));
    await expect(repository.create({ name: "M", slug: "m", description: null })).rejects.toThrow(
      "connection lost",
    );
  });

  it("updates an existing category and returns null for a missing one", async () => {
    const { em, findOne, count, flush, repository } = setup();
    const entity = { ...mice };
    findOne.mockResolvedValueOnce(entity as never).mockResolvedValueOnce(null);
    const assign = vi
      .spyOn(em, "assign")
      .mockImplementation(((target: object, data: object) => Object.assign(target, data)) as never);
    flush.mockResolvedValue(undefined);
    count.mockResolvedValue(2);

    const values = { name: "Gaming mice", slug: "gaming-mice", description: null };
    expect(await repository.update(MICE_ID, values)).toEqual({
      id: MICE_ID,
      ...values,
      productCount: 2,
    });
    expect(assign.mock.calls[0]?.[1]).toEqual(values);
    expect(await repository.update("missing", values)).toBeNull();
  });

  describe("deleteIfEmpty", () => {
    it("locks the row first and reports a missing category", async () => {
      const { tx, repository } = setup();
      const execute = vi.spyOn(tx, "execute").mockResolvedValueOnce([] as never);

      expect(await repository.deleteIfEmpty(MICE_ID)).toEqual({ kind: "not_found" });
      expect(execute.mock.calls[0]).toEqual([
        "select id from categories where id = ? for update",
        [MICE_ID],
      ]);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it("deletes only when no product references the category", async () => {
      const { tx, repository } = setup();
      const execute = vi
        .spyOn(tx, "execute")
        .mockResolvedValueOnce([{ id: MICE_ID }] as never)
        .mockResolvedValueOnce({ affectedRows: 1 } as never);

      expect(await repository.deleteIfEmpty(MICE_ID)).toEqual({ kind: "deleted" });
      expect(execute.mock.calls[1]).toEqual([
        "delete from categories where id = ? and not exists (select 1 from products where category_id = ?)",
        [MICE_ID, MICE_ID],
        "run",
      ]);
    });

    it("refuses a used category with its product count", async () => {
      const { tx, repository } = setup();
      vi.spyOn(tx, "execute")
        .mockResolvedValueOnce([{ id: MICE_ID }] as never)
        .mockResolvedValueOnce({ affectedRows: 0 } as never);
      const count = vi.spyOn(tx, "count").mockResolvedValue(4);

      expect(await repository.deleteIfEmpty(MICE_ID)).toEqual({ kind: "in_use", productCount: 4 });
      expect(count.mock.calls[0]?.[1]).toEqual({ category: MICE_ID });
    });
  });
});
