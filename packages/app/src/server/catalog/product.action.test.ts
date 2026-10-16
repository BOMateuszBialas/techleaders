import {
  NotFoundError,
  UnauthorizedError,
  UniqueFieldConflictError,
  type AdminProduct,
} from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE } from "@/lib/action-state";
import { requireAdmin } from "../auth/require-admin";
import { createRequestScope } from "../container";
import { logger } from "../logger";
import { createProduct, setProductStatus, updateProduct } from "./product.action";

const PRODUCT_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const MICE_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01";

const createProductUseCase = { execute: vi.fn() };
const updateProductUseCase = { execute: vi.fn() };
const setProductStatusUseCase = { execute: vi.fn() };
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

const { updateTag } = await import("next/cache");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const fields = {
  name: "Phantom Pro Mouse",
  slug: "",
  description: "",
  price: "199,90",
  sku: "demo-mou-009",
  categoryId: MICE_ID,
  imageUrl: "",
  featured: "on",
};

const parsed = {
  name: "Phantom Pro Mouse",
  slug: "phantom-pro-mouse",
  description: "",
  priceMinor: 19990,
  sku: "DEMO-MOU-009",
  categoryId: MICE_ID,
  imageUrl: null,
  featured: true,
};

const saved: AdminProduct = {
  id: PRODUCT_ID,
  slug: "phantom-pro-mouse",
  name: "Phantom Pro Mouse",
  description: "",
  priceMinor: 19990,
  currency: "PLN",
  sku: "DEMO-MOU-009",
  stockQuantity: 5,
  imageUrl: null,
  status: "draft",
  featured: true,
  category: { id: MICE_ID, slug: "mice", name: "Mice" },
  availability: "hidden",
};

const useCases = [createProductUseCase, updateProductUseCase, setProductStatusUseCase];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: "u-1", email: "o@x.test", role: "owner" });
  vi.mocked(createRequestScope).mockReturnValue({
    cradle: { createProductUseCase, updateProductUseCase, setProductStatusUseCase },
    dispose,
  } as never);
  vi.spyOn(logger, "info").mockImplementation(() => {});
});

// Spec, cross-model review: every exported action, invoked without a session, redirects to
// the sign-in page and never resolves a use case.
describe.each([
  ["createProduct", createProduct, form({ ...fields, stockQuantity: "5" })],
  ["updateProduct", updateProduct, form({ id: PRODUCT_ID, ...fields })],
  ["setProductStatus", setProductStatus, form({ id: PRODUCT_ID, status: "published" })],
] as const)("%s without a session", (_name, action, data) => {
  it("redirects to sign-in and runs no use case", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new UnauthorizedError());
    await expect(action(IDLE_ACTION_STATE, data)).rejects.toThrow("NEXT_REDIRECT /admin/sign-in");
    expect(createRequestScope).not.toHaveBeenCalled();
    for (const useCase of useCases) expect(useCase.execute).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("createProduct", () => {
  it("creates from parsed input with its initial status and stock, then opens its page", async () => {
    createProductUseCase.execute.mockResolvedValue(saved);
    await expect(
      createProduct(
        IDLE_ACTION_STATE,
        form({ ...fields, status: "published", stockQuantity: "0", ignored: "x" }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT /admin/products/${PRODUCT_ID}?notice=created`);
    expect(createProductUseCase.execute).toHaveBeenCalledWith({
      ...parsed,
      status: "published",
      stockQuantity: 0,
    });
    expect(updateTag).toHaveBeenCalledWith("catalog");
    expect(logger.info).toHaveBeenCalledWith("catalog.product.created", { id: PRODUCT_ID });
  });

  it("returns field errors and the typed values without calling the use case", async () => {
    const state = await createProduct(
      IDLE_ACTION_STATE,
      form({ ...fields, price: "12.345", stockQuantity: "-1" }),
    );
    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { price: [expect.any(String)], stockQuantity: [expect.any(String)] },
      values: { ...fields, price: "12.345", stockQuantity: "-1", status: "" },
    });
    expect(createProductUseCase.execute).not.toHaveBeenCalled();
  });

  it("shows a taken SKU under its field and keeps the typed values", async () => {
    createProductUseCase.execute.mockRejectedValue(
      new UniqueFieldConflictError("sku", "This SKU is already used by another product."),
    );
    const state = await createProduct(IDLE_ACTION_STATE, form({ ...fields, stockQuantity: "5" }));
    expect(state).toEqual({
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { sku: ["This SKU is already used by another product."] },
      values: { ...fields, slug: "phantom-pro-mouse", status: "", stockQuantity: "5" },
    });
  });
});

describe("updateProduct", () => {
  it("saves the details, never stock or status, and states the effect", async () => {
    updateProductUseCase.execute.mockResolvedValue(saved);
    const state = await updateProduct(
      IDLE_ACTION_STATE,
      form({ id: PRODUCT_ID, ...fields, status: "published", stockQuantity: "0" }),
    );
    expect(updateProductUseCase.execute).toHaveBeenCalledWith({ id: PRODUCT_ID, values: parsed });
    expect(state).toEqual({
      status: "success",
      message:
        "Saved. Hidden: shoppers cannot see or buy it. It is featured, but it will not show in the home page slider until it is published.",
    });
    expect(logger.info).toHaveBeenCalledWith("catalog.product.updated", { id: PRODUCT_ID });
  });

  it("reports a product deleted meanwhile", async () => {
    updateProductUseCase.execute.mockRejectedValue(new NotFoundError("Product not found."));
    const state = await updateProduct(IDLE_ACTION_STATE, form({ id: "x", ...fields }));
    expect(state).toMatchObject({ status: "error", message: "Product not found." });
  });
});

describe("setProductStatus", () => {
  it("publishes and says where shoppers find the product", async () => {
    setProductStatusUseCase.execute.mockResolvedValue({
      ...saved,
      status: "published",
      availability: "available",
    });
    const state = await setProductStatus(
      IDLE_ACTION_STATE,
      form({ id: PRODUCT_ID, status: "published" }),
    );
    expect(setProductStatusUseCase.execute).toHaveBeenCalledWith({
      id: PRODUCT_ID,
      status: "published",
    });
    expect(state).toEqual({
      status: "success",
      message:
        "Published. Visible in the store and can be bought. Shoppers find it at /products/phantom-pro-mouse.",
    });
    expect(logger.info).toHaveBeenCalledWith("catalog.product.status_changed", { id: PRODUCT_ID });
  });

  it("refuses an unknown status without calling the use case", async () => {
    const state = await setProductStatus(
      IDLE_ACTION_STATE,
      form({ id: PRODUCT_ID, status: "archived" }),
    );
    expect(state).toEqual({
      status: "error",
      message: "Choose draft or published.",
      fieldErrors: {},
      values: {},
    });
    expect(setProductStatusUseCase.execute).not.toHaveBeenCalled();
  });
});
