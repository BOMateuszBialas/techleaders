import { describe, expect, it } from "vitest";
import { ConflictError, UniqueFieldConflictError, ValidationError } from "../../errors/app-error";
import type { ProductCreate } from "../../ports/catalog.port";
import type {
  ExistingProductRef,
  ImportedProductRef,
  ProductImportRepositoryPort,
} from "../../ports/product-import.port";
import {
  InMemoryCategoryRepository,
  MICE_ID,
} from "../categories/in-memory-category-repository.fixture";
import {
  ImportProductsUseCase,
  PRODUCT_IMPORT_CONFLICT_MESSAGE,
  ProductImportConflictError,
} from "./import-products.use-case";
import { PreviewProductImportUseCase } from "./preview-product-import.use-case";
import { fingerprintOf } from "./product-import-plan";

/** A fake that records what it was asked, and fails `createMany` when told to. */
class FakeProductImportRepository implements ProductImportRepositoryPort {
  readonly existing: ExistingProductRef[] = [];
  readonly lookups: { slugs: string[]; skus: string[] }[] = [];
  readonly created: ProductCreate[][] = [];
  failure: unknown = null;

  findExisting(keys: { slugs: string[]; skus: string[] }): Promise<ExistingProductRef[]> {
    this.lookups.push(keys);
    return Promise.resolve(
      this.existing.filter(
        (product) =>
          keys.slugs.includes(product.slug) ||
          (product.sku !== null && keys.skus.includes(product.sku)),
      ),
    );
  }

  createMany(products: ProductCreate[]): Promise<ImportedProductRef[]> {
    if (this.failure) return Promise.reject(this.failure);
    this.created.push(products);
    return Promise.resolve(
      products.map((product, index) => ({
        id: `id-${index + 1}`,
        name: product.name,
        status: product.status,
      })),
    );
  }
}

function setup() {
  const deps = {
    categoryRepository: new InMemoryCategoryRepository(),
    productImportRepository: new FakeProductImportRepository(),
  };
  return {
    repository: deps.productImportRepository,
    preview: new PreviewProductImportUseCase(deps),
    importProducts: new ImportProductsUseCase(deps),
  };
}

const VORTEX: ExistingProductRef = {
  id: "p-1",
  name: "Vortex Wireless Mouse",
  slug: "vortex-wireless-mouse",
  sku: "VTX-001",
};

const FILE = [
  "name;price;sku;category;status;stock",
  "Phantom Pro Mouse;199,90;phm-001;mice;published;5",
  "Glide Pad;49;;Mousepads;;",
].join("\n");

describe("PreviewProductImportUseCase", () => {
  it("previews rows to create with the stored slug, SKU, status and stock", async () => {
    const { preview, repository } = setup();
    const result = await preview.execute({ csv: FILE });

    expect(result.rows).toEqual([
      {
        line: 2,
        name: "Phantom Pro Mouse",
        slug: "phantom-pro-mouse",
        sku: "PHM-001",
        category: "mice",
        price: "199,90",
        status: "published",
        stock: "5",
        outcome: "create",
        reason: null,
        errors: [],
      },
      expect.objectContaining({ line: 3, slug: "glide-pad", sku: "", status: "draft", stock: "0" }),
    ]);
    expect(result.counts).toEqual({ create: 2, skip: 0, error: 0 });
    expect(result.publishedCount).toBe(1);
    expect(result.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(repository.lookups).toEqual([
      { slugs: ["phantom-pro-mouse", "glide-pad"], skus: ["PHM-001"] },
    ]);
  });

  it("skips rows whose slug or SKU is already used, and never plans to change them", async () => {
    const { preview, repository } = setup();
    repository.existing.push(VORTEX, { id: "p-2", name: "Other", slug: "other", sku: null });
    const result = await preview.execute({
      csv: ["name,price,sku", "Vortex Wireless Mouse,1,", "New name,2,vtx-001", "Pad,3,"].join(
        "\n",
      ),
    });

    expect(result.rows.map((row) => [row.outcome, row.reason])).toEqual([
      ["skip", 'Already in the catalog: "Vortex Wireless Mouse" uses this slug. Not changed.'],
      ["skip", 'Already in the catalog: "Vortex Wireless Mouse" uses this SKU. Not changed.'],
      ["create", null],
    ]);
    expect(result.counts).toEqual({ create: 1, skip: 2, error: 0 });
  });

  it("reports a repeated slug or SKU inside the file on the later row", async () => {
    const { preview } = setup();
    const result = await preview.execute({
      csv: [
        "name,price,sku,slug",
        "Pad,1,A-1,",
        "Pad,2,A-1,",
        "Other,3,a-1,pad-2",
        "Pad,4,,pad",
      ].join("\n"),
    });

    expect(result.rows.map((row) => [row.line, row.outcome, row.errors])).toEqual([
      [2, "create", []],
      [3, "error", ["slug: same slug as line 2.", "sku: same SKU as line 2."]],
      [4, "error", ["sku: same SKU as line 2."]],
      [5, "error", ["slug: same slug as line 2."]],
    ]);
  });

  it("compares later rows only with earlier rows that are valid (A18 rule 3)", async () => {
    const { preview } = setup();
    const result = await preview.execute({
      csv: ["name,price,sku", "Pad,1,A-1", "Pad,2,B-2", "Mat,3,B-2"].join("\n"),
    });

    // Line 3 repeats line 2's slug, so it is an error and its SKU B-2 is not "taken".
    expect(result.rows.map((row) => [row.line, row.outcome, row.errors])).toEqual([
      [2, "create", []],
      [3, "error", ["slug: same slug as line 2."]],
      [4, "create", []],
    ]);
  });

  it("treats a repeat of a skipped row as a skip too", async () => {
    const { preview, repository } = setup();
    repository.existing.push(VORTEX);
    const result = await preview.execute({
      csv: ["name,price", "Vortex Wireless Mouse,1", "Vortex Wireless Mouse,2"].join("\n"),
    });
    expect(result.rows.map((row) => row.outcome)).toEqual(["skip", "skip"]);
  });

  it("keeps an invalid row an error even when its slug exists", async () => {
    const { preview, repository } = setup();
    repository.existing.push(VORTEX);
    const result = await preview.execute({
      csv: ["name,price", "Vortex Wireless Mouse,abc"].join("\n"),
    });

    expect(result.rows[0]).toMatchObject({
      outcome: "error",
      slug: "",
      price: "abc",
      errors: [expect.stringMatching(/^price: /)],
    });
    // No valid row: nothing to look up.
    expect(repository.lookups).toEqual([]);
  });

  it("throws a ValidationError for a file problem", async () => {
    const { preview } = setup();
    await expect(preview.execute({ csv: "name,sku\nPad,1" })).rejects.toThrow(
      'The file has no "price" column.',
    );
  });
});

describe("ImportProductsUseCase", () => {
  async function previewed(
    csv: string,
    prepare?: (repository: FakeProductImportRepository) => void,
  ) {
    const context = setup();
    prepare?.(context.repository);
    const preview = await context.preview.execute({ csv });
    return { ...context, preview };
  }

  it("creates every planned row in one call and reports them", async () => {
    const { importProducts, repository, preview } = await previewed(FILE);
    const result = await importProducts.execute({ csv: FILE, fingerprint: preview.fingerprint });

    expect(result).toEqual({
      kind: "imported",
      created: [
        { id: "id-1", name: "Phantom Pro Mouse", status: "published" },
        { id: "id-2", name: "Glide Pad", status: "draft" },
      ],
      preview,
    });
    expect(repository.created).toHaveLength(1);
    expect(repository.created[0]?.[0]).toMatchObject({
      slug: "phantom-pro-mouse",
      priceMinor: 19990,
      categoryId: MICE_ID,
      stockQuantity: 5,
    });
  });

  it("writes nothing when the fingerprint differs from the confirmed one", async () => {
    const { importProducts, repository } = await previewed(FILE);
    const result = await importProducts.execute({ csv: FILE, fingerprint: "0000000000000000" });

    expect(result.kind).toBe("changed");
    expect(repository.created).toEqual([]);
  });

  it("notices a row that now resolves to another category on the same line", async () => {
    const { importProducts, repository, preview } = await previewed(FILE);
    const csv = FILE.replace(";mice;", ";mousepads;");
    const result = await importProducts.execute({ csv, fingerprint: preview.fingerprint });

    expect(result.kind).toBe("changed");
    expect(repository.created).toEqual([]);
  });

  it("writes nothing when a row has errors or nothing is left to create", async () => {
    const withError = await previewed("name,price\nPad,abc");
    expect(
      (
        await withError.importProducts.execute({
          csv: "name,price\nPad,abc",
          fingerprint: withError.preview.fingerprint,
        })
      ).kind,
    ).toBe("changed");

    const allSkipped = await previewed("name,price\nVortex Wireless Mouse,1", (repository) =>
      repository.existing.push(VORTEX),
    );
    const result = await allSkipped.importProducts.execute({
      csv: "name,price\nVortex Wireless Mouse,1",
      fingerprint: allSkipped.preview.fingerprint,
    });
    expect(result).toEqual({ kind: "changed", preview: allSkipped.preview });
    expect(allSkipped.repository.created).toEqual([]);
  });

  it.each([
    new UniqueFieldConflictError("slug", "taken"),
    new ValidationError("bad", { categoryId: ["Choose an existing category."] }),
  ])("turns a field-level write error into one import conflict: %s", async (failure) => {
    const { importProducts, repository, preview } = await previewed(FILE);
    repository.failure = failure;

    const error = await importProducts
      .execute({ csv: FILE, fingerprint: preview.fingerprint })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProductImportConflictError);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toHaveProperty("message", PRODUCT_IMPORT_CONFLICT_MESSAGE);
  });

  it("rethrows any other write failure", async () => {
    const { importProducts, repository, preview } = await previewed(FILE);
    const failure = new Error("connection lost");
    repository.failure = failure;

    await expect(
      importProducts.execute({ csv: FILE, fingerprint: preview.fingerprint }),
    ).rejects.toBe(failure);
  });
});

describe("fingerprintOf", () => {
  it("is stable and changes with the text", () => {
    expect(fingerprintOf("a")).toBe(fingerprintOf("a"));
    expect(fingerprintOf("a")).not.toBe(fingerprintOf("b"));
    expect(fingerprintOf("")).toMatch(/^[0-9a-f]{16}$/);
  });
});
