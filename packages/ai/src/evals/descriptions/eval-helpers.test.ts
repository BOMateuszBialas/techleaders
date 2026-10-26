import { describe, expect, it } from "vitest";
import { seededEvalInput } from "./description.cases";
import { EVAL_CATEGORY_IDS, evalCategories, evalCategoryRepository } from "./eval-categories";

describe("description eval helpers", () => {
  it("resolves the seeded categories by id and never writes", async () => {
    const categories = evalCategories();
    expect((await categories.execute({ id: EVAL_CATEGORY_IDS.Keyboards })).name).toBe("Keyboards");
    await expect(
      categories.execute({ id: "0b6c5c1e-1a11-4c6e-9d70-0000000000ff" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses every write and lists the five categories", async () => {
    const repository = evalCategoryRepository();
    expect(await repository.list()).toHaveLength(5);
    expect(await repository.listProducts(EVAL_CATEGORY_IDS.Mice, 10)).toEqual([]);
    const write = { name: "X", slug: "x", description: null };
    await expect(repository.create(write)).rejects.toThrow("never write");
    await expect(repository.update(EVAL_CATEGORY_IDS.Mice, write)).rejects.toThrow("never write");
    await expect(repository.deleteIfEmpty(EVAL_CATEGORY_IDS.Mice)).rejects.toThrow("never write");
  });

  it("builds form input from a seeded product, and refuses an unknown slug", () => {
    expect(seededEvalInput("retro-wired-controller")).toEqual({
      name: "Retro Wired Controller",
      category: "Controllers",
      price: "99.00",
      notes:
        "Classic-layout wired controller with a precise D-pad for platformers and emulated games.",
      sku: "DEMO-CON-002",
    });
    expect(() => seededEvalInput("missing")).toThrow("No seeded product missing");
  });
});
