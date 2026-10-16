import {
  NotFoundError,
  StaleStockError,
  UnauthorizedError,
  ValidationError,
  type AdjustStockResult,
  type AdminProduct,
} from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE } from "@/lib/action-state";
import { requireAdmin } from "../auth/require-admin";
import { createRequestScope } from "../container";
import { logger } from "../logger";
import { adjustStock } from "./stock.action";

const PRODUCT_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";

const adjustStockUseCase = { execute: vi.fn() };
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

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const vortex: AdminProduct = {
  id: PRODUCT_ID,
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  description: "[DEMO] A wireless gaming mouse.",
  priceMinor: 24900,
  currency: "PLN",
  sku: "DEMO-MOU-001",
  stockQuantity: 0,
  imageUrl: null,
  status: "published",
  featured: false,
  category: null,
  availability: "out_of_stock",
};

const posted = { productId: PRODUCT_ID, expectedQuantity: "8", newQuantity: "0" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: "u-1", email: "o@x.test", role: "owner" });
  vi.mocked(createRequestScope).mockReturnValue({
    cradle: { adjustStockUseCase },
    dispose,
  } as never);
  vi.spyOn(logger, "info").mockImplementation(() => {});
});

// Spec, cross-model review: the export, invoked without a session, redirects to the sign-in
// page and never resolves a use case.
describe("adjustStock without a session", () => {
  it("redirects to sign-in and runs no use case", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new UnauthorizedError());
    await expect(adjustStock(IDLE_ACTION_STATE, form(posted))).rejects.toThrow(
      "NEXT_REDIRECT /admin/sign-in",
    );
    expect(createRequestScope).not.toHaveBeenCalled();
    expect(adjustStockUseCase.execute).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("adjustStock", () => {
  it("sets the stock, states what shoppers now see and updates the catalog cache", async () => {
    const result: AdjustStockResult = {
      outcome: "updated",
      product: vortex,
      adjustment: {
        id: "adj-1",
        productId: PRODUCT_ID,
        previousQuantity: 8,
        newQuantity: 0,
        delta: -8,
        createdAt: new Date("2026-10-16T09:30:00.000Z"),
      },
    };
    adjustStockUseCase.execute.mockResolvedValue(result);

    const state = await adjustStock(IDLE_ACTION_STATE, form({ ...posted, ignored: "x" }));

    expect(adjustStockUseCase.execute).toHaveBeenCalledWith(posted);
    expect(state).toEqual({
      status: "success",
      message: "Stock set to 0 (was 8). Visible in the store, shown as out of stock.",
    });
    expect(updateTag).toHaveBeenCalledWith("catalog");
    expect(refresh).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith("inventory.stock.adjusted", { id: PRODUCT_ID });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("says an unchanged quantity was not recorded", async () => {
    adjustStockUseCase.execute.mockResolvedValue({
      outcome: "unchanged",
      product: { ...vortex, stockQuantity: 8, availability: "available" },
      adjustment: null,
    });
    const state = await adjustStock(IDLE_ACTION_STATE, form({ ...posted, newQuantity: "8" }));
    expect(state).toEqual({
      status: "success",
      message: "Stock unchanged at 8. Nothing was recorded.",
    });
    expect(logger.info).toHaveBeenCalledWith("inventory.stock.unchanged", { id: PRODUCT_ID });
  });

  it("resets the form to the current quantity when the stock changed meanwhile", async () => {
    adjustStockUseCase.execute.mockRejectedValue(new StaleStockError(5));
    const state = await adjustStock(IDLE_ACTION_STATE, form(posted));
    expect(state).toEqual({
      status: "error",
      message: "Stock changed to 5 since this page loaded. Check it and try again.",
      values: { expectedQuantity: "5", newQuantity: "5" },
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("shows a refused quantity under its field and keeps the typed value", async () => {
    adjustStockUseCase.execute.mockRejectedValue(
      new ValidationError("Check the highlighted fields.", {
        newQuantity: ["Enter a whole number from 0 to 1,000,000."],
      }),
    );
    const state = await adjustStock(IDLE_ACTION_STATE, form({ ...posted, newQuantity: "-1" }));
    expect(state).toEqual({
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { newQuantity: ["Enter a whole number from 0 to 1,000,000."] },
      values: { expectedQuantity: "8", newQuantity: "-1" },
    });
  });

  it("says to reload when the hidden quantity was broken, and keeps a visible field error", async () => {
    adjustStockUseCase.execute.mockRejectedValue(
      new ValidationError("Check the highlighted fields.", {
        expectedQuantity: ["Enter a whole number from 0 to 1,000,000."],
        newQuantity: ["Enter a whole number from 0 to 1,000,000."],
      }),
    );
    const state = await adjustStock(
      IDLE_ACTION_STATE,
      form({ ...posted, expectedQuantity: "<b>x</b>", newQuantity: "-1" }),
    );
    expect(state).toEqual({
      status: "error",
      message: "This form is out of date. Reload the page and try again.",
      fieldErrors: { newQuantity: ["Enter a whole number from 0 to 1,000,000."] },
      values: { newQuantity: "-1" },
    });
  });

  it("says to reload when only the hidden quantity was broken", async () => {
    adjustStockUseCase.execute.mockRejectedValue(
      new ValidationError("Check the highlighted fields.", {
        expectedQuantity: ["Enter a whole number from 0 to 1,000,000."],
      }),
    );
    const data = form(posted);
    data.delete("expectedQuantity");
    const state = await adjustStock(IDLE_ACTION_STATE, data);
    expect(state).toEqual({
      status: "error",
      message: "This form is out of date. Reload the page and try again.",
      values: { newQuantity: "0" },
    });
  });

  it("reports a product deleted meanwhile", async () => {
    adjustStockUseCase.execute.mockRejectedValue(new NotFoundError("Product not found."));
    const state = await adjustStock(IDLE_ACTION_STATE, form(posted));
    expect(state).toMatchObject({ status: "error", message: "Product not found." });
  });
});
