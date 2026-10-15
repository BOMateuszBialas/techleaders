import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuth } from "@/server/container";
import { GET } from "./route";

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/server/container", () => ({ getAuth: vi.fn() }));

const getSession = vi.fn();

beforeEach(() => {
  getSession.mockReset();
  // Test double: the guard uses only api.getSession.
  vi.mocked(getAuth).mockReturnValue({ api: { getSession } } as never);
});

describe("GET /api/admin/me", () => {
  it("returns the signed-in owner without session details", async () => {
    getSession.mockResolvedValue({
      session: { token: "secret-token" },
      user: { id: "u1", email: "owner@example.com", role: "owner", name: "Store owner" },
    });
    const response = await GET(new Request("http://x/api/admin/me"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      ok: true,
      data: { id: "u1", email: "owner@example.com", role: "owner" },
    });
    expect(JSON.stringify(body)).not.toContain("secret-token");
  });

  it("answers 401 without a session", async () => {
    getSession.mockResolvedValue(null);
    const response = await GET(new Request("http://x/api/admin/me"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  });
});
