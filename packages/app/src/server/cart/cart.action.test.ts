import { ConflictError } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE } from "@/lib/action-state";
import { createRequestScope } from "../container";
import { logger } from "../logger";
import { addToCart, removeCartLine, updateCartLine } from "./cart.action";
import { readCartLines, writeCartLines } from "./cart-cookie";

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const stored = [{ productId: VORTEX_ID, quantity: 1 }];
const next = [{ productId: VORTEX_ID, quantity: 2 }];

const addToCartUseCase = { execute: vi.fn() };
const updateCartLineUseCase = { execute: vi.fn() };
const removeCartLineUseCase = { execute: vi.fn() };
const dispose = vi.fn(async () => {});

vi.mock("../container", () => ({ createRequestScope: vi.fn() }));
vi.mock("./cart-cookie", () => ({ readCartLines: vi.fn(), writeCartLines: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createRequestScope).mockReturnValue({
    cradle: { addToCartUseCase, updateCartLineUseCase, removeCartLineUseCase },
    dispose,
  } as never);
  vi.mocked(readCartLines).mockResolvedValue(stored);
  vi.spyOn(logger, "info").mockImplementation(() => {});
});

describe("cart actions (public shopper actions, no session)", () => {
  it("addToCart adds to the stored lines and writes the result", async () => {
    addToCartUseCase.execute.mockResolvedValue({
      lines: next,
      itemCount: 2,
      productName: "Vortex",
    });

    await expect(addToCart(IDLE_ACTION_STATE, form({ productId: VORTEX_ID }))).resolves.toEqual({
      status: "success",
      message: "Added to cart.",
    });
    // A missing quantity field arrives as "" and the use case defaults it to 1.
    expect(addToCartUseCase.execute).toHaveBeenCalledWith({
      lines: stored,
      request: { productId: VORTEX_ID, quantity: "" },
    });
    expect(writeCartLines).toHaveBeenCalledWith(next);
    expect(logger.info).toHaveBeenCalledWith("cart.line.added", { id: VORTEX_ID });
  });

  it("addToCart leaves the cookie alone when the product cannot be added", async () => {
    addToCartUseCase.execute.mockRejectedValue(new ConflictError("This product is out of stock."));
    await expect(
      addToCart(IDLE_ACTION_STATE, form({ productId: VORTEX_ID, quantity: "1" })),
    ).resolves.toEqual({
      status: "error",
      message: "This product is out of stock.",
      values: { productId: VORTEX_ID, quantity: "1" },
    });
    expect(writeCartLines).not.toHaveBeenCalled();
  });

  it("updateCartLine sets the posted quantity and writes the result", async () => {
    updateCartLineUseCase.execute.mockResolvedValue({ lines: next, itemCount: 2 });
    await expect(
      updateCartLine(IDLE_ACTION_STATE, form({ productId: VORTEX_ID, quantity: "2" })),
    ).resolves.toEqual({ status: "success", message: "Cart updated." });
    expect(updateCartLineUseCase.execute).toHaveBeenCalledWith({
      lines: stored,
      request: { productId: VORTEX_ID, quantity: "2" },
    });
    expect(writeCartLines).toHaveBeenCalledWith(next);
  });

  it("removeCartLine removes the posted product and writes the result", async () => {
    removeCartLineUseCase.execute.mockResolvedValue({ lines: [], itemCount: 0 });
    await expect(
      removeCartLine(IDLE_ACTION_STATE, form({ productId: VORTEX_ID })),
    ).resolves.toEqual({ status: "success", message: "Removed from your cart." });
    expect(removeCartLineUseCase.execute).toHaveBeenCalledWith({
      lines: stored,
      request: { productId: VORTEX_ID },
    });
    expect(writeCartLines).toHaveBeenCalledWith([]);
  });
});
