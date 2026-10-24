import { UnauthorizedError } from "@commerceos/core";
import { connection } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomerAuth } from "../container";
import { logger } from "../logger";
import {
  CUSTOMER_SIGN_IN_PAGE,
  customerApiHandler,
  getCurrentCustomer,
  getCurrentCustomerId,
  isCustomerSignedIn,
  requireCustomer,
  requireCustomerPage,
  toOrderViewer,
} from "./require-customer";

const requestHeaders = new Headers({ cookie: "commerceos-customer.session_token=abc" });
const getSession = vi.fn();

vi.mock("next/headers", () => ({ headers: vi.fn(async () => requestHeaders) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("../container", () => ({ getCustomerAuth: vi.fn() }));

const customerSession = {
  session: { id: "s1", token: "secret-token", userId: "c1" },
  user: { id: "c1", email: "a@shop.example", role: "customer", name: "Customer" },
};
// What an owner-shaped session would look like if one ever reached this instance.
const ownerShaped = { ...customerSession, user: { ...customerSession.user, role: "owner" } };

beforeEach(() => {
  getSession.mockReset();
  vi.mocked(connection).mockClear();
  // Test double: the guard uses only api.getSession, so a full Better Auth instance is not built.
  vi.mocked(getCustomerAuth).mockReturnValue({ api: { getSession } } as never);
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

describe("getCurrentCustomer", () => {
  it("passes this request's headers explicitly and returns a narrow principal", async () => {
    getSession.mockResolvedValue(customerSession);
    await expect(getCurrentCustomer()).resolves.toEqual({
      id: "c1",
      email: "a@shop.example",
      role: "customer",
    });
    expect(getSession).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it("returns null without a session or with any non-customer role", async () => {
    getSession.mockResolvedValueOnce(null);
    await expect(getCurrentCustomer()).resolves.toBeNull();
    getSession.mockResolvedValueOnce(ownerShaped);
    await expect(getCurrentCustomer()).resolves.toBeNull();
  });

  it("lets a session lookup failure propagate (the page's error state or a 500)", async () => {
    getSession.mockRejectedValue(new Error("connection refused"));
    await expect(getCurrentCustomer()).rejects.toThrow("connection refused");
  });
});

describe("getCurrentCustomerId (spec A24)", () => {
  it("returns the customer for a customer session", async () => {
    getSession.mockResolvedValue(customerSession);
    await expect(getCurrentCustomerId()).resolves.toEqual({
      status: "customer",
      customerId: "c1",
      email: "a@shop.example",
    });
    expect(getSession).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it("returns none without a session or with a non-customer session", async () => {
    getSession.mockResolvedValueOnce(null);
    await expect(getCurrentCustomerId()).resolves.toEqual({ status: "none" });
    getSession.mockResolvedValueOnce(ownerShaped);
    await expect(getCurrentCustomerId()).resolves.toEqual({ status: "none" });
  });

  it("returns error, never none, when the session read throws, and logs a safe summary", async () => {
    const driver = Object.assign(new Error("select ... where token = 'secret-token'"), {
      code: "57P01",
    });
    getSession.mockRejectedValue(driver);
    await expect(getCurrentCustomerId()).resolves.toEqual({ status: "error" });
    expect(logger.error).toHaveBeenCalledWith("Customer session read failed", {
      event: "customer_auth.session_error",
      error: { name: "Error", code: "57P01" },
    });
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain("secret-token");
  });
});

describe("toOrderViewer (public order and payment paths, spec A2 and A24)", () => {
  it("is the customer for a customer session, and a guest for no session and for an error", () => {
    expect(toOrderViewer({ status: "customer", customerId: "c-1", email: "a@x.test" })).toEqual({
      customerId: "c-1",
    });
    expect(toOrderViewer({ status: "none" })).toEqual({ customerId: null });
    expect(toOrderViewer({ status: "error" })).toEqual({ customerId: null });
  });
});

describe("isCustomerSignedIn (header, checkout note, sign-in and sign-up pages)", () => {
  it("is true only for a customer session", async () => {
    getSession.mockResolvedValueOnce(customerSession);
    await expect(isCustomerSignedIn()).resolves.toBe(true);
    getSession.mockResolvedValueOnce(null);
    await expect(isCustomerSignedIn()).resolves.toBe(false);
    getSession.mockResolvedValueOnce(ownerShaped);
    await expect(isCustomerSignedIn()).resolves.toBe(false);
  });

  it("treats a session-read failure as signed out and never throws, so the page still renders (A24)", async () => {
    getSession.mockRejectedValueOnce(new Error("connection refused"));
    await expect(isCustomerSignedIn()).resolves.toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      "Customer session read failed",
      expect.objectContaining({ event: "customer_auth.session_error" }),
    );
  });
});

describe("requireCustomerPage", () => {
  it("returns the customer or redirects to the customer sign-in page", async () => {
    getSession.mockResolvedValueOnce(customerSession);
    await expect(requireCustomerPage()).resolves.toMatchObject({ id: "c1" });
    getSession.mockResolvedValueOnce(null);
    await expect(requireCustomerPage()).rejects.toThrow(`NEXT_REDIRECT ${CUSTOMER_SIGN_IN_PAGE}`);
    getSession.mockResolvedValueOnce(ownerShaped);
    await expect(requireCustomerPage()).rejects.toThrow("NEXT_REDIRECT /account/sign-in");
  });

  it("lets a session-read failure propagate instead of redirecting", async () => {
    getSession.mockRejectedValue(new Error("connection refused"));
    await expect(requireCustomerPage()).rejects.toThrow("connection refused");
  });
});

describe("requireCustomer", () => {
  it("returns the customer or throws UnauthorizedError", async () => {
    getSession.mockResolvedValueOnce(customerSession);
    await expect(requireCustomer()).resolves.toMatchObject({ role: "customer" });
    getSession.mockResolvedValueOnce(null);
    await expect(requireCustomer()).rejects.toBeInstanceOf(UnauthorizedError);
    getSession.mockResolvedValueOnce(ownerShaped);
    await expect(requireCustomer()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("customerApiHandler", () => {
  const handler = vi.fn(
    async (_request: Request, customer: { id: string }, context: { id: string }) =>
      Response.json({ customer: customer.id, id: context.id }),
  );
  const route = customerApiHandler("GET /api/account/test", handler);

  beforeEach(() => {
    handler.mockClear();
  });

  it("calls connection() first, then runs the handler with the customer and the route context", async () => {
    getSession.mockResolvedValue(customerSession);
    const response = await route(new Request("http://x/api/account/test"), { id: "42" });
    expect(await response.json()).toEqual({ customer: "c1", id: "42" });
    expect(connection).toHaveBeenCalledTimes(1);
  });

  it("answers 401 in the ApiResult envelope without a customer session, never running the handler", async () => {
    for (const session of [null, ownerShaped]) {
      getSession.mockResolvedValueOnce(session);
      const response = await route(new Request("http://x/api/account/test"), { id: "42" });
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("propagates a prerender rejection of connection() outside the error mapping", async () => {
    vi.mocked(connection).mockRejectedValueOnce(new Error("prerender"));
    await expect(route(new Request("http://x/api/account/test"), { id: "42" })).rejects.toThrow(
      "prerender",
    );
    expect(getSession).not.toHaveBeenCalled();
  });
});
