import { NotFoundError } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/server/logger";

const listAdminOrders = vi.fn();
const getAdminOrder = vi.fn();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: {
      listAdminOrdersUseCase: { execute: listAdminOrders },
      getAdminOrderUseCase: { execute: getAdminOrder },
    },
    dispose,
  }),
}));

const { firstQueryValue, loadAdminOrder, loadAdminOrders } = await import("./orders/load-orders");

const ORDER_ID = "0d2f1d6e-5b1c-4a55-9e2a-3f1b6c0d9a01";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

describe("admin order loaders", () => {
  it("passes the first page value to the use case and disposes the scope", async () => {
    const list = { rows: [], page: 2, pageCount: 2, total: 30 };
    listAdminOrders.mockResolvedValue(list);
    await expect(loadAdminOrders(["2", "3"])).resolves.toEqual({ kind: "ok", data: list });
    expect(listAdminOrders).toHaveBeenCalledWith({ page: "2" });
    await loadAdminOrders(undefined);
    expect(listAdminOrders).toHaveBeenLastCalledWith({ page: undefined });
    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it("reads the first value of a query parameter", () => {
    expect(firstQueryValue("4")).toBe("4");
    expect(firstQueryValue(["5", "6"])).toBe("5");
    expect(firstQueryValue(undefined)).toBeUndefined();
  });

  it("loads one order, or reports not-found", async () => {
    getAdminOrder.mockResolvedValueOnce({ id: ORDER_ID });
    await expect(loadAdminOrder(ORDER_ID)).resolves.toEqual({
      kind: "ok",
      data: { id: ORDER_ID },
    });
    expect(getAdminOrder).toHaveBeenCalledWith({ id: ORDER_ID });

    getAdminOrder.mockRejectedValueOnce(new NotFoundError());
    await expect(loadAdminOrder("missing")).resolves.toEqual({ kind: "not-found" });
  });

  it("turns a failure into the error state and logs the page, never the order", async () => {
    getAdminOrder.mockRejectedValue(new Error("database down"));
    await expect(loadAdminOrder(ORDER_ID)).resolves.toEqual({ kind: "error" });
    const context = vi.mocked(logger.error).mock.calls[0]?.[1];
    expect(context).toMatchObject({ page: "/admin/orders/[id]" });
    expect(Object.keys(context ?? {}).sort()).toEqual(["error", "page"]);
  });
});
