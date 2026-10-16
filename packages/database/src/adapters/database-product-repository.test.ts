import { afterAll, describe, expect, it, vi } from "vitest";
import { isUniqueFieldConflict, type ProductWrite } from "@commerceos/core";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseProductRepository } from "./database-product-repository";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const PRODUCT_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const mice = { id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01", slug: "mice", name: "Mice" };
const vortex = {
  id: PRODUCT_ID,
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  description: "[DEMO] A wireless gaming mouse.",
  priceMinor: 24990,
  currency: "PLN",
  sku: "DEMO-MOU-001",
  stockQuantity: 8,
  imageUrl: "/demo/products/vortex-wireless-mouse.svg",
  status: "published",
  featured: true,
  category: { ...mice, description: "[DEMO] Gaming mice." },
};
const vortexRecord = { ...vortex, category: mice };

const write: ProductWrite = {
  name: "Phantom Pro Mouse",
  slug: "phantom-pro-mouse",
  description: "",
  priceMinor: 19990,
  sku: null,
  categoryId: null,
  imageUrl: null,
  featured: false,
};

// The stubs return plain rows shaped like the entities; the ORM's generic signatures
// cannot be satisfied by plain objects, so their results are typed loosely on purpose.
function setup() {
  const em = orm.em.fork();
  return {
    em,
    find: vi.spyOn(em, "find"),
    findOne: vi.spyOn(em, "findOne"),
    flush: vi.spyOn(em, "flush").mockResolvedValue(undefined),
    populate: vi.spyOn(em, "populate").mockResolvedValue([] as never),
    assign: vi
      .spyOn(em, "assign")
      .mockImplementation(((target: object, data: object) => Object.assign(target, data)) as never),
    repository: new DatabaseProductRepository({ em }),
  };
}

describe("DatabaseProductRepository", () => {
  it("lists every product by name with its category, as plain records", async () => {
    const { find, repository } = setup();
    find.mockResolvedValue([
      vortex,
      { ...vortex, id: "p-2", sku: undefined, imageUrl: undefined, category: undefined },
    ] as never);

    expect(await repository.list()).toEqual([
      vortexRecord,
      { ...vortexRecord, id: "p-2", sku: null, imageUrl: null, category: null },
    ]);
    expect(find.mock.calls[0]?.[1]).toEqual({});
    expect(find.mock.calls[0]?.[2]).toEqual({
      populate: ["category"],
      orderBy: { name: "asc", slug: "asc" },
    });
  });

  it("finds a product with its category, or null", async () => {
    const { findOne, repository } = setup();
    findOne.mockResolvedValueOnce(vortex as never).mockResolvedValueOnce(null);

    expect(await repository.findById(PRODUCT_ID)).toEqual(vortexRecord);
    expect(findOne.mock.calls[0]?.slice(1)).toEqual([
      { id: PRODUCT_ID },
      { populate: ["category"] },
    ]);
    expect(await repository.findById("missing")).toBeNull();
  });

  it("creates a product with its initial status and stock, then loads its category", async () => {
    const { em, populate, repository } = setup();
    const created = { ...vortex, ...write, id: "new-id", category: undefined, stockQuantity: 0 };
    const create = vi.spyOn(em, "create").mockReturnValue(created as never);

    expect(
      await repository.create({ ...write, categoryId: mice.id, status: "draft", stockQuantity: 0 }),
    ).toMatchObject({ id: "new-id", name: "Phantom Pro Mouse", stockQuantity: 0, category: null });
    expect(create.mock.calls[0]?.[1]).toEqual({
      name: "Phantom Pro Mouse",
      slug: "phantom-pro-mouse",
      description: "",
      priceMinor: 19990,
      sku: null,
      category: mice.id,
      imageUrl: null,
      featured: false,
      status: "draft",
      stockQuantity: 0,
    });
    expect(populate.mock.calls[0]?.[1]).toEqual(["category"]);
  });

  it("maps a unique violation on flush and rethrows anything else", async () => {
    const { em, flush, repository } = setup();
    vi.spyOn(em, "create").mockReturnValue({ ...vortex } as never);
    flush.mockRejectedValueOnce(
      Object.assign(new Error("duplicate"), { code: "23505", constraint: "products_sku_unique" }),
    );
    const input = { ...write, status: "draft" as const, stockQuantity: 1 };
    const conflict = await repository.create(input).then(
      () => null,
      (error: unknown) => error,
    );
    expect(isUniqueFieldConflict(conflict)).toBe(true);
    expect(conflict).toMatchObject({ field: "sku" });

    flush.mockRejectedValueOnce(new Error("connection lost"));
    await expect(repository.create(input)).rejects.toThrow("connection lost");
  });

  it("updates the details without touching stock or status, and null when missing", async () => {
    const { findOne, assign, repository } = setup();
    findOne.mockResolvedValueOnce({ ...vortex } as never).mockResolvedValueOnce(null);

    expect(await repository.update(PRODUCT_ID, { ...write, categoryId: mice.id })).toMatchObject({
      name: "Phantom Pro Mouse",
      stockQuantity: 8,
      status: "published",
    });
    const assigned = assign.mock.calls[0]?.[1];
    expect(assigned).toEqual({
      name: "Phantom Pro Mouse",
      slug: "phantom-pro-mouse",
      description: "",
      priceMinor: 19990,
      sku: null,
      category: mice.id,
      imageUrl: null,
      featured: false,
    });
    expect(assigned).not.toHaveProperty("stockQuantity");
    expect(await repository.update("missing", write)).toBeNull();
  });

  it("sets the status, and null when missing", async () => {
    const { findOne, assign, repository } = setup();
    findOne.mockResolvedValueOnce({ ...vortex } as never).mockResolvedValueOnce(null);

    expect(await repository.setStatus(PRODUCT_ID, "draft")).toEqual({
      ...vortexRecord,
      status: "draft",
    });
    expect(assign.mock.calls[0]?.[1]).toEqual({ status: "draft" });
    expect(await repository.setStatus("missing", "published")).toBeNull();
  });
});
