import { ConflictError, UniqueFieldConflictError, ValidationError } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestScope, type Cradle } from "../container";
import { logger } from "../logger";
import { GENERIC_ACTION_ERROR } from "./action-error-state";
import { runAction } from "./run-action";

const dispose = vi.fn(async () => {});
const cradle = { marker: "request-cradle" } as unknown as Cradle;

vi.mock("../container", () => ({ createRequestScope: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  // Like Next.js: rethrows its own control-flow errors, ignores everything else.
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("NEXT_")) throw error;
  }),
}));

const { refresh } = await import("next/cache");

const values = { productId: "p-1", quantity: "2" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createRequestScope).mockReturnValue({ cradle, dispose } as never);
  vi.spyOn(logger, "info").mockImplementation(() => {});
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

describe("runAction", () => {
  it("runs the handler on a request scope, logs the event and returns its message", async () => {
    const handler = vi.fn(async (received: Cradle) => {
      expect(received === cradle).toBe(true);
      return { event: "cart.line.added", id: "p-1", message: "Added to cart." };
    });

    await expect(runAction("cart.add", values, handler)).resolves.toEqual({
      status: "success",
      message: "Added to cart.",
    });
    expect(logger.info).toHaveBeenCalledWith("cart.line.added", { id: "p-1" });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("maps field errors and client errors to the form state, keeping the values", async () => {
    await expect(
      runAction("cart.update", values, async () => {
        throw new ValidationError("Only 3 left in stock.", { quantity: ["Only 3 left in stock."] });
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Only 3 left in stock.",
      fieldErrors: { quantity: ["Only 3 left in stock."] },
      values,
    });
    await expect(
      runAction("cart.add", values, async () => {
        throw new ConflictError("This product is out of stock.");
      }),
    ).resolves.toEqual({ status: "error", message: "This product is out of stock.", values });
    await expect(
      runAction("cart.add", values, async () => {
        throw new UniqueFieldConflictError("slug", "Taken.");
      }),
    ).resolves.toMatchObject({ fieldErrors: { slug: ["Taken."] } });
    expect(logger.error).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledTimes(3);
  });

  it("hides an unexpected error behind a generic message and logs it with the action", async () => {
    const error = new Error("connection refused");
    await expect(
      runAction("cart.add", values, async () => {
        throw error;
      }),
    ).resolves.toEqual({ status: "error", message: GENERIC_ACTION_ERROR, values });
    expect(logger.error).toHaveBeenCalledWith("Action failed", { action: "cart.add", error });
  });

  it("redirects after the scope is disposed when the handler names a page", async () => {
    await expect(
      runAction("orders.place", values, async () => ({
        event: "order.placed",
        id: "order-1",
        redirectTo: "/checkout/pay/CO-1",
      })),
    ).rejects.toThrow("NEXT_REDIRECT /checkout/pay/CO-1");
    expect(dispose).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith("order.placed", { id: "order-1" });
  });

  it("refreshes the page after a failure only when asked to", async () => {
    const fail = async () => {
      throw new ConflictError("Prices changed.");
    };
    await runAction("orders.place", values, fail);
    expect(refresh).not.toHaveBeenCalled();
    await runAction("orders.place", values, fail, { refreshOnError: true });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("rethrows Next.js control flow and still disposes the scope", async () => {
    await expect(
      runAction("cart.add", values, async () => {
        throw new Error("NEXT_REDIRECT /cart");
      }),
    ).rejects.toThrow("NEXT_REDIRECT /cart");
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("returns the generic error when the request scope cannot be built", async () => {
    vi.mocked(createRequestScope).mockImplementation(() => {
      throw new Error("Invalid environment configuration");
    });
    await expect(runAction("cart.add", values, vi.fn())).resolves.toMatchObject({
      message: GENERIC_ACTION_ERROR,
    });
    expect(dispose).not.toHaveBeenCalled();
  });
});
