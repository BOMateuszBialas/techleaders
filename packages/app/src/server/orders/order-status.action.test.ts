import {
  NotFoundError,
  StaleOrderStatusError,
  UnauthorizedError,
  ValidationError,
  type AdminOrderView,
  type ChangeOrderStatusResult,
  type OrderStatus,
} from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE } from "@/lib/action-state";
import { requireAdmin } from "../auth/require-admin";
import { createRequestScope } from "../container";
import { logger } from "../logger";
import { changeOrderStatus } from "./order-status.action";

const ORDER_ID = "0d2f1d6e-5b1c-4a55-9e2a-3f1b6c0d9a01";

const changeOrderStatusUseCase = { execute: vi.fn() };
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

function result(
  from: OrderStatus,
  to: OrderStatus,
  statusLabel: string,
  restockedUnits = 0,
): ChangeOrderStatusResult {
  return {
    order: { id: ORDER_ID, status: to, statusLabel } as AdminOrderView,
    from,
    to,
    restockedUnits,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: "u-1", email: "o@x.test", role: "owner" });
  vi.mocked(createRequestScope).mockReturnValue({
    cradle: { changeOrderStatusUseCase },
    dispose,
  } as never);
  vi.spyOn(logger, "info").mockImplementation(() => {});
});

// Spec, Phase 1 step 4: the export, invoked without a session, redirects to the sign-in page
// and never resolves a use case.
describe("changeOrderStatus without a session", () => {
  it("redirects to sign-in and runs no use case", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new UnauthorizedError());
    await expect(
      changeOrderStatus(
        IDLE_ACTION_STATE,
        form({ orderId: ORDER_ID, from: "pending_payment", to: "cancelled", confirm: "yes" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT /admin/sign-in");
    expect(createRequestScope).not.toHaveBeenCalled();
    expect(changeOrderStatusUseCase.execute).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("changeOrderStatus", () => {
  it("marks an order shipped, logs the order id only and refreshes the page", async () => {
    changeOrderStatusUseCase.execute.mockResolvedValue(result("processing", "shipped", "Shipped"));
    const state = await changeOrderStatus(
      IDLE_ACTION_STATE,
      form({ orderId: ORDER_ID, from: "processing", to: "shipped", extra: "x" }),
    );

    expect(changeOrderStatusUseCase.execute).toHaveBeenCalledWith({
      orderId: ORDER_ID,
      from: "processing",
      to: "shipped",
    });
    expect(state).toEqual({ status: "success", message: "Order marked as shipped." });
    expect(logger.info).toHaveBeenCalledWith("orders.status.changed", { id: ORDER_ID });
    expect(updateTag).toHaveBeenCalledWith("catalog");
    expect(refresh).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("cancels a confirmed unpaid order and says how many items went back to stock", async () => {
    changeOrderStatusUseCase.execute.mockResolvedValue(
      result("pending_payment", "cancelled", "Cancelled", 3),
    );
    const state = await changeOrderStatus(
      IDLE_ACTION_STATE,
      form({ orderId: ORDER_ID, from: "pending_payment", to: "cancelled", confirm: "yes" }),
    );
    expect(state).toEqual({
      status: "success",
      message: "Order cancelled. Stock was returned for 3 items.",
    });
  });

  it("records a confirmed refund and says no money moved", async () => {
    changeOrderStatusUseCase.execute.mockResolvedValue(result("shipped", "refunded", "Refunded"));
    const state = await changeOrderStatus(
      IDLE_ACTION_STATE,
      form({ orderId: ORDER_ID, from: "shipped", to: "refunded", confirm: "yes" }),
    );
    expect(state).toEqual({
      status: "success",
      message: "Order marked as refunded. This is a record only; no money was moved.",
    });
  });

  it.each([
    ["pending_payment", "cancelled", undefined],
    ["shipped", "refunded", "on"],
  ])("refuses %s → %s without the confirmation tick", async (from, to, confirm) => {
    const state = await changeOrderStatus(
      IDLE_ACTION_STATE,
      form({ orderId: ORDER_ID, from, to, ...(confirm ? { confirm } : {}) }),
    );
    expect(state).toEqual({
      status: "error",
      message: "Tick the confirmation box first, then try again.",
      fieldErrors: {},
      values: {},
    });
    expect(changeOrderStatusUseCase.execute).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("reports a stale page and refreshes it, so it shows the current status", async () => {
    changeOrderStatusUseCase.execute.mockRejectedValue(new StaleOrderStatusError("paid"));
    const state = await changeOrderStatus(
      IDLE_ACTION_STATE,
      form({ orderId: ORDER_ID, from: "pending_payment", to: "cancelled", confirm: "yes" }),
    );
    expect(state).toEqual({
      status: "error",
      message: "This order changed to Paid in the meantime. Review it and try again.",
      values: {},
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("reports a disallowed change and a missing order without refreshing", async () => {
    changeOrderStatusUseCase.execute.mockRejectedValueOnce(
      new ValidationError("This status change is not allowed."),
    );
    expect(
      await changeOrderStatus(
        IDLE_ACTION_STATE,
        form({ orderId: ORDER_ID, from: "paid", to: "shipped" }),
      ),
    ).toMatchObject({ status: "error", message: "This status change is not allowed." });

    changeOrderStatusUseCase.execute.mockRejectedValueOnce(new NotFoundError("Order not found."));
    expect(
      await changeOrderStatus(IDLE_ACTION_STATE, form({ from: "paid", to: "processing" })),
    ).toMatchObject({ status: "error", message: "Order not found." });
    expect(changeOrderStatusUseCase.execute).toHaveBeenLastCalledWith({
      orderId: "",
      from: "paid",
      to: "processing",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
