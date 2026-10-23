import {
  FILE_TOO_LARGE_MESSAGE,
  MAX_IMPORT_FILE_BYTES,
  NOT_UTF8_MESSAGE,
  ProductImportConflictError,
  UnauthorizedError,
  type ProductImportPreview,
} from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHOOSE_FILE_MESSAGE,
  IMPORT_CHANGED_MESSAGE,
} from "@/components/admin/products/product-import-copy";
import { IDLE_ACTION_STATE } from "@/lib/action-state";
import { requireAdmin } from "../auth/require-admin";
import { createRequestScope } from "../container";
import { logger } from "../logger";
import { submitProductImport } from "./product-import.action";

const previewProductImportUseCase = { execute: vi.fn() };
const importProductsUseCase = { execute: vi.fn() };
const dispose = vi.fn(async () => {});

vi.mock("../auth/require-admin", () => ({
  SIGN_IN_PAGE: "/admin/sign-in",
  requireAdmin: vi.fn(),
}));
vi.mock("../container", () => ({ createRequestScope: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("NEXT_")) throw error;
  }),
}));

const { refresh, updateTag } = await import("next/cache");

const CSV = "name;price\nSecret Mouse;199,90\nOld Pad;49\n";

const preview: ProductImportPreview = {
  rows: [
    {
      line: 2,
      name: "Secret Mouse",
      slug: "secret-mouse",
      sku: "",
      category: "",
      price: "199,90",
      status: "draft",
      stock: "0",
      outcome: "create",
      reason: null,
      errors: [],
    },
    {
      line: 3,
      name: "Old Pad",
      slug: "old-pad",
      sku: "",
      category: "",
      price: "49",
      status: "draft",
      stock: "0",
      outcome: "skip",
      reason: 'Already in the catalog: "Old Pad" uses this slug. Not changed.',
      errors: [],
    },
  ],
  counts: { create: 1, skip: 1, error: 0 },
  publishedCount: 0,
  fingerprint: "abcd1234abcd1234",
};

function uploadForm(file: File | string | null, intent?: string): FormData {
  const data = new FormData();
  if (intent !== undefined) data.set("intent", intent);
  if (file !== null) data.set("file", file);
  return data;
}

function importForm(): FormData {
  const data = new FormData();
  data.set("intent", "import");
  data.set("csv", CSV);
  data.set("fingerprint", preview.fingerprint);
  data.set("fileName", "products.csv");
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: "u-1", email: "o@x.test", role: "owner" });
  vi.mocked(createRequestScope).mockReturnValue({
    cradle: { previewProductImportUseCase, importProductsUseCase },
    dispose,
  } as never);
  vi.spyOn(logger, "info").mockImplementation(() => {});
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

// Spec, step 5: the export, invoked without a session, redirects to the sign-in page and
// never resolves a use case, for both intents.
describe("submitProductImport without a session", () => {
  it.each([
    ["preview", () => uploadForm(new File([CSV], "products.csv"), "preview")],
    ["import", importForm],
  ])("redirects to sign-in and runs no use case (%s)", async (_intent, build) => {
    vi.mocked(requireAdmin).mockRejectedValue(new UnauthorizedError());
    await expect(submitProductImport(IDLE_ACTION_STATE, build())).rejects.toThrow(
      "NEXT_REDIRECT /admin/sign-in",
    );
    expect(createRequestScope).not.toHaveBeenCalled();
    expect(previewProductImportUseCase.execute).not.toHaveBeenCalled();
    expect(importProductsUseCase.execute).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("submitProductImport, preview", () => {
  it("checks the uploaded file and returns the preview without writing or refreshing", async () => {
    previewProductImportUseCase.execute.mockResolvedValue(preview);
    const state = await submitProductImport(
      IDLE_ACTION_STATE,
      uploadForm(new File([`﻿${CSV}`], "products.csv"), "preview"),
    );

    expect(previewProductImportUseCase.execute).toHaveBeenCalledWith({ csv: CSV });
    expect(state).toEqual({
      status: "success",
      message: "2 rows: 1 will be created, 1 skipped, 0 with errors.",
      preview,
      csv: CSV,
      fileName: "products.csv",
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("logs counts only, never cell content", async () => {
    previewProductImportUseCase.execute.mockResolvedValue(preview);
    await submitProductImport(
      IDLE_ACTION_STATE,
      uploadForm(new File([CSV], "products.csv"), "preview"),
    );
    expect(logger.info).toHaveBeenCalledWith("catalog.product.import.previewed", {
      create: 1,
      skip: 1,
      error: 0,
      rows: 2,
      id: "product-import",
    });
    expect(JSON.stringify(vi.mocked(logger.info).mock.calls)).not.toContain("Secret Mouse");
  });

  it("treats any intent other than import as a preview and cuts a long file name", async () => {
    previewProductImportUseCase.execute.mockResolvedValue(preview);
    const state = await submitProductImport(
      IDLE_ACTION_STATE,
      uploadForm(new File([CSV], `${"a".repeat(300)}.csv`), "unknown"),
    );
    expect(state.fileName).toHaveLength(200);
    expect(importProductsUseCase.execute).not.toHaveBeenCalled();
  });

  it.each([
    ["no file field", null],
    ["a text field instead of a file", "name;price"],
    ["an empty file input", new File([], "")],
  ])("asks for a file when there is %s", async (_case, file) => {
    const state = await submitProductImport(IDLE_ACTION_STATE, uploadForm(file));
    expect(state).toMatchObject({ status: "error", message: CHOOSE_FILE_MESSAGE });
    expect(state.preview).toBeUndefined();
    expect(previewProductImportUseCase.execute).not.toHaveBeenCalled();
  });

  it("refuses an oversized file before reading it", async () => {
    const file = new File(["x"], "big.csv");
    Object.defineProperty(file, "size", { value: MAX_IMPORT_FILE_BYTES + 1 });
    const arrayBuffer = vi.spyOn(file, "arrayBuffer");
    const state = await submitProductImport(IDLE_ACTION_STATE, uploadForm(file));
    expect(state).toMatchObject({ status: "error", message: FILE_TOO_LARGE_MESSAGE });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(previewProductImportUseCase.execute).not.toHaveBeenCalled();
  });

  it("refuses a file that is not UTF-8", async () => {
    const state = await submitProductImport(
      IDLE_ACTION_STATE,
      uploadForm(new File([new Uint8Array([0x6e, 0xff, 0xfe])], "cp1250.csv")),
    );
    expect(state).toMatchObject({ status: "error", message: NOT_UTF8_MESSAGE });
  });
});

describe("submitProductImport, import", () => {
  it("imports the confirmed rows, updates the catalog cache and lists the new products", async () => {
    const created = [{ id: "p-1", name: "Secret Mouse", status: "draft" as const }];
    importProductsUseCase.execute.mockResolvedValue({ kind: "imported", created, preview });

    const state = await submitProductImport(IDLE_ACTION_STATE, importForm());

    expect(importProductsUseCase.execute).toHaveBeenCalledWith({
      csv: CSV,
      fingerprint: preview.fingerprint,
    });
    expect(state).toEqual({
      status: "success",
      message:
        "Imported 1 product: 1 draft, 0 published. 1 row skipped because it is already in the catalog.",
      created,
    });
    expect(updateTag).toHaveBeenCalledWith("catalog");
    expect(refresh).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith("catalog.product.imported", {
      created: 1,
      skipped: 1,
      id: "product-import",
    });
  });

  it("returns the new preview as an error and writes nothing when the file or catalog changed", async () => {
    const changed = { ...preview, fingerprint: "ffff0000ffff0000" };
    importProductsUseCase.execute.mockResolvedValue({ kind: "changed", preview: changed });

    const state = await submitProductImport(IDLE_ACTION_STATE, importForm());

    expect(state).toEqual({
      status: "error",
      message: IMPORT_CHANGED_MESSAGE,
      preview: changed,
      csv: CSV,
      fileName: "products.csv",
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("catalog.product.import.refused", {
      create: 1,
      skip: 1,
      error: 0,
      rows: 2,
      id: "product-import",
    });
  });

  it("reports a write conflict as one import-level message", async () => {
    importProductsUseCase.execute.mockRejectedValue(new ProductImportConflictError());
    const state = await submitProductImport(IDLE_ACTION_STATE, importForm());
    expect(state).toMatchObject({
      status: "error",
      message:
        "The catalog changed while importing, so this import was stopped and rolled back. Check the file again.",
    });
    expect(state.created).toBeUndefined();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("returns the fresh preview of the same text with a write conflict", async () => {
    importProductsUseCase.execute.mockRejectedValue(new ProductImportConflictError());
    const fresh = { ...preview, counts: { create: 0, skip: 2, error: 0 } };
    previewProductImportUseCase.execute.mockResolvedValue(fresh);
    const state = await submitProductImport(IDLE_ACTION_STATE, importForm());
    expect(previewProductImportUseCase.execute).toHaveBeenCalledWith({ csv: CSV });
    expect(state).toMatchObject({
      status: "error",
      preview: fresh,
      csv: CSV,
      fileName: "products.csv",
    });
  });

  it("keeps the conflict message when the re-check after a conflict fails too", async () => {
    importProductsUseCase.execute.mockRejectedValue(new ProductImportConflictError());
    previewProductImportUseCase.execute.mockRejectedValue(new Error("connection refused"));
    const state = await submitProductImport(IDLE_ACTION_STATE, importForm());
    expect(state).toMatchObject({
      status: "error",
      message: expect.stringMatching(/^The catalog/),
    });
    expect(state.preview).toBeUndefined();
  });

  it("shows a generic message for an unexpected failure", async () => {
    importProductsUseCase.execute.mockRejectedValue(new Error("connection refused"));
    const state = await submitProductImport(IDLE_ACTION_STATE, importForm());
    expect(state).toMatchObject({ status: "error", message: "Something went wrong. Try again." });
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
