import { CUSTOMER_ORDER_NOT_FOUND_MESSAGE, NotFoundError } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestScope, getCustomerAuth } from "@/server/container";
import { logger } from "@/server/logger";
import { GET as getOrder } from "./[id]/route";
import { GET as listOrders } from "./route";

const list = vi.fn();
const get = vi.fn();
const dispose = vi.fn(async () => {});
const getSession = vi.fn();

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/server/container", () => ({ getCustomerAuth: vi.fn(), createRequestScope: vi.fn() }));

const A = "c0000000-0000-4000-8000-00000000000a";
const CUSTOMER_A = { id: A, email: "a@x.test", role: "customer", name: "Customer" };
const ORDER = "d0000000-0000-4000-8000-000000000001";

const request = (path: string) => new Request(`http://x${path}`);
const context = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  // Test doubles: the guard uses only api.getSession, the routes only their use cases.
  vi.mocked(getCustomerAuth).mockReturnValue({ api: { getSession } } as never);
  vi.mocked(createRequestScope).mockReturnValue({
    cradle: {
      listCustomerOrdersUseCase: { execute: list },
      getCustomerOrderUseCase: { execute: get },
    },
    dispose,
  } as never);
  getSession.mockResolvedValue({ session: { token: "t" }, user: CUSTOMER_A });
});

describe("GET /api/account/orders and /api/account/orders/<id> (E07 A12)", () => {
  it.each([
    ["no session", null],
    // What the customer instance would return if it ever saw a non-customer user.
    ["a non-customer session", { session: {}, user: { ...CUSTOMER_A, role: "owner" } }],
  ])("answers 401 with %s and resolves no use case", async (_label, session) => {
    getSession.mockResolvedValue(session);
    for (const response of [
      await listOrders(request("/api/account/orders")),
      await getOrder(request(`/api/account/orders/${ORDER}`), context(ORDER)),
    ]) {
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    }
    expect(createRequestScope).not.toHaveBeenCalled();
  });

  it("lists the session customer's orders and disposes the scope", async () => {
    list.mockResolvedValue({ orders: [], capped: false });
    const response = await listOrders(request("/api/account/orders?customerId=someone-else"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { orders: [], capped: false } });
    expect(list).toHaveBeenCalledWith({ customerId: A });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("returns one order of the session customer", async () => {
    get.mockResolvedValue({ id: ORDER, reference: "CO-X" });
    const response = await getOrder(request(`/api/account/orders/${ORDER}`), context(ORDER));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { id: ORDER, reference: "CO-X" } });
    expect(get).toHaveBeenCalledWith({ customerId: A, orderId: ORDER });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("answers a malformed, unknown and foreign id with one identical 404 body", async () => {
    get.mockRejectedValue(new NotFoundError(CUSTOMER_ORDER_NOT_FOUND_MESSAGE));
    const bodies = [];
    for (const id of ["not-a-uuid", "d0000000-0000-4000-8000-0000000000ff", ORDER]) {
      const response = await getOrder(request(`/api/account/orders/${id}`), context(id));
      expect(response.status).toBe(404);
      bodies.push(await response.text());
    }
    expect(new Set(bodies).size).toBe(1);
    expect(JSON.parse(bodies[0] ?? "")).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: CUSTOMER_ORDER_NOT_FOUND_MESSAGE },
    });
  });

  it("answers 500 generic when the session read fails", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => {});
    getSession.mockRejectedValue(new Error("db down"));
    const response = await listOrders(request("/api/account/orders"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("db down");
  });
});
