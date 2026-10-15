import { UnauthorizedError } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuth } from "../container";
import {
  adminApiHandler,
  getCurrentAdmin,
  requireAdmin,
  requireAdminPage,
  SIGN_IN_PAGE,
} from "./require-admin";

const requestHeaders = new Headers({ cookie: "better-auth.session_token=abc" });
const getSession = vi.fn();

vi.mock("next/headers", () => ({ headers: vi.fn(async () => requestHeaders) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("../container", () => ({ getAuth: vi.fn() }));

const ownerSession = {
  session: { id: "s1", token: "secret-token", userId: "u1" },
  user: { id: "u1", email: "owner@example.com", role: "owner", name: "Store owner" },
};

beforeEach(() => {
  getSession.mockReset();
  // Test double: the guard uses only api.getSession, so a full Better Auth instance is not built.
  vi.mocked(getAuth).mockReturnValue({ api: { getSession } } as never);
});

describe("getCurrentAdmin", () => {
  it("passes this request's headers explicitly and returns a narrow principal", async () => {
    getSession.mockResolvedValue(ownerSession);
    await expect(getCurrentAdmin()).resolves.toEqual({
      id: "u1",
      email: "owner@example.com",
      role: "owner",
    });
    expect(getSession).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it("returns null without a session or with an unknown role", async () => {
    getSession.mockResolvedValueOnce(null);
    await expect(getCurrentAdmin()).resolves.toBeNull();
    getSession.mockResolvedValueOnce({
      ...ownerSession,
      user: { ...ownerSession.user, role: "staff" },
    });
    await expect(getCurrentAdmin()).resolves.toBeNull();
  });

  it("lets a session lookup failure propagate (a 500 or the error boundary)", async () => {
    getSession.mockRejectedValue(new Error("connection refused"));
    await expect(getCurrentAdmin()).rejects.toThrow("connection refused");
  });
});

describe("requireAdminPage", () => {
  it("returns the admin or redirects to the sign-in page", async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    await expect(requireAdminPage()).resolves.toMatchObject({ id: "u1" });
    getSession.mockResolvedValueOnce(null);
    await expect(requireAdminPage()).rejects.toThrow(`NEXT_REDIRECT ${SIGN_IN_PAGE}`);
  });
});

describe("requireAdmin", () => {
  it("returns the admin or throws UnauthorizedError", async () => {
    getSession.mockResolvedValueOnce(ownerSession);
    await expect(requireAdmin()).resolves.toMatchObject({ role: "owner" });
    getSession.mockResolvedValueOnce(null);
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("adminApiHandler", () => {
  const route = adminApiHandler(
    "GET /api/admin/test",
    async (_request, admin, context: { id: string }) =>
      Response.json({ admin: admin.id, id: context.id }),
  );

  it("runs the handler with the admin and the route context", async () => {
    getSession.mockResolvedValue(ownerSession);
    const response = await route(new Request("http://x/api/admin/test"), { id: "42" });
    expect(await response.json()).toEqual({ admin: "u1", id: "42" });
  });

  it("answers 401 in the ApiResult envelope without a session", async () => {
    getSession.mockResolvedValue(null);
    const response = await route(new Request("http://x/api/admin/test"), { id: "42" });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  });
});
