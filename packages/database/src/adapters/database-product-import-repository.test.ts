import { afterAll, describe, expect, it, vi } from "vitest";
import { isUniqueFieldConflict, type ProductCreate } from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseProductImportRepository } from "./database-product-import-repository";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const MICE_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01";

const phantom: ProductCreate = {
  name: "Phantom Pro Mouse",
  slug: "phantom-pro-mouse",
  description: "",
  priceMinor: 19990,
  sku: "PHM-001",
  categoryId: MICE_ID,
  imageUrl: null,
  featured: false,
  status: "draft",
  stockQuantity: 5,
};

// The stubs return plain rows shaped like the entities; the ORM's generic signatures
// cannot be satisfied by plain objects, so their results are typed loosely on purpose.
function setup() {
  const em = orm.em.fork();
  const tx = orm.em.fork();
  vi.spyOn(em, "transactional").mockImplementation(((
    callback: (em: EntityManager) => Promise<unknown>,
  ) => callback(tx)) as never);
  return {
    find: vi.spyOn(em, "find"),
    create: vi.spyOn(tx, "create"),
    flush: vi.spyOn(tx, "flush").mockResolvedValue(undefined),
    repository: new DatabaseProductImportRepository({ em }),
  };
}

describe("DatabaseProductImportRepository.findExisting", () => {
  it("finds products by slug or SKU, as plain references", async () => {
    const { find, repository } = setup();
    find.mockResolvedValue([
      { id: "p-1", name: "Vortex", slug: "vortex", sku: "VTX-1" },
      { id: "p-2", name: "Pad", slug: "pad", sku: undefined },
    ] as never);

    await expect(
      repository.findExisting({ slugs: ["vortex", "pad"], skus: ["VTX-1"] }),
    ).resolves.toEqual([
      { id: "p-1", name: "Vortex", slug: "vortex", sku: "VTX-1" },
      { id: "p-2", name: "Pad", slug: "pad", sku: null },
    ]);
    expect(find).toHaveBeenCalledWith(
      expect.anything(),
      { $or: [{ slug: { $in: ["vortex", "pad"] } }, { sku: { $in: ["VTX-1"] } }] },
      expect.objectContaining({ fields: ["id", "name", "slug", "sku"] }),
    );
  });

  it("leaves out an empty key list, and queries nothing without keys", async () => {
    const { find, repository } = setup();
    find.mockResolvedValue([] as never);

    await repository.findExisting({ slugs: ["pad"], skus: [] });
    expect(find.mock.calls[0]?.[1]).toEqual({ $or: [{ slug: { $in: ["pad"] } }] });

    await expect(repository.findExisting({ slugs: [], skus: [] })).resolves.toEqual([]);
    expect(find).toHaveBeenCalledTimes(1);
  });
});

describe("DatabaseProductImportRepository.createMany", () => {
  it("creates every product in one transaction and one flush", async () => {
    const { create, flush, repository } = setup();
    create.mockImplementation(((_schema: unknown, values: { name: string; status: string }) => ({
      id: `id-${values.name}`,
      ...values,
    })) as never);

    await expect(
      repository.createMany([phantom, { ...phantom, name: "Pad", status: "published" }]),
    ).resolves.toEqual([
      { id: "id-Phantom Pro Mouse", name: "Phantom Pro Mouse", status: "draft" },
      { id: "id-Pad", name: "Pad", status: "published" },
    ]);
    const { categoryId: _categoryId, ...values } = phantom;
    expect(create).toHaveBeenCalledWith(expect.anything(), { ...values, category: MICE_ID });
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("maps a constraint violation like a form write, and rethrows anything else", async () => {
    const { create, flush, repository } = setup();
    create.mockReturnValue({} as never);
    flush.mockRejectedValueOnce(
      Object.assign(new Error("duplicate"), { code: "23505", constraint: "products_sku_unique" }),
    );
    const error = await repository.createMany([phantom]).catch((caught: unknown) => caught);
    expect(isUniqueFieldConflict(error) && error.field).toBe("sku");

    const failure = new Error("connection lost");
    flush.mockRejectedValueOnce(failure);
    await expect(repository.createMany([phantom])).rejects.toBe(failure);
  });
});
