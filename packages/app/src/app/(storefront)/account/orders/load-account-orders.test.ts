import { NotFoundError } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/server/logger";

const list = vi.fn();
const get = vi.fn();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: {
      listCustomerOrdersUseCase: { execute: list },
      getCustomerOrderUseCase: { execute: get },
    },
    dispose,
  }),
}));

const { loadAccountOrder, loadAccountOrders } = await import("./load-account-orders");

const CUSTOMER = "c0000000-0000-4000-8000-00000000000a";
const ORDER = "d0000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("account order loaders (E07 A12, A14)", () => {
  it("lists the guard's customer's orders", async () => {
    list.mockResolvedValue({ orders: [], capped: false });
    expect(await loadAccountOrders(CUSTOMER)).toEqual({
      kind: "ok",
      data: { orders: [], capped: false },
    });
    expect(list).toHaveBeenCalledWith({ customerId: CUSTOMER });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("reads one order for the guard's customer, and maps not found and failures", async () => {
    get.mockResolvedValueOnce({ id: ORDER });
    expect(await loadAccountOrder(CUSTOMER, ORDER)).toEqual({ kind: "ok", data: { id: ORDER } });
    expect(get).toHaveBeenCalledWith({ customerId: CUSTOMER, orderId: ORDER });

    get.mockRejectedValueOnce(new NotFoundError("Order not found."));
    expect(await loadAccountOrder(CUSTOMER, "not-a-uuid")).toEqual({ kind: "not-found" });

    vi.spyOn(logger, "error").mockImplementation(() => {});
    list.mockRejectedValueOnce(new Error("db down"));
    expect(await loadAccountOrders(CUSTOMER)).toEqual({ kind: "error" });
  });
});
