import { TooManyRequestsError } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestScope, getAuth } from "@/server/container";
import { logger } from "@/server/logger";
import { POST } from "./route";

const execute = vi.fn();
const dispose = vi.fn(async () => {});
const getSession = vi.fn();

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/server/container", () => ({ getAuth: vi.fn(), createRequestScope: vi.fn() }));

const OWNER = { id: "u1", email: "owner@example.com", role: "owner", name: "Store owner" };

function post(body: unknown): Request {
  return new Request("http://x/api/admin/copilot/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Test doubles: the guard uses only api.getSession, the route only the use case.
  vi.mocked(getAuth).mockReturnValue({ api: { getSession } } as never);
  vi.mocked(createRequestScope).mockReturnValue({
    cradle: { askCopilotUseCase: { execute } },
    dispose,
  } as never);
  getSession.mockResolvedValue({ session: { token: "t" }, user: OWNER });
});

describe("POST /api/admin/copilot/answers", () => {
  it("answers 401 without a session and resolves no use case", async () => {
    getSession.mockResolvedValue(null);
    const response = await POST(post({ intent: "focus" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(createRequestScope).not.toHaveBeenCalled();
  });

  it("answers 400 for a body with neither or both fields", async () => {
    for (const body of [{}, { intent: "focus", question: "Hi" }, "not json"]) {
      const response = await POST(post(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns the answer for the signed-in owner and disposes the scope", async () => {
    const answer = { kind: "answered", intent: "focus", recommendations: [] };
    execute.mockResolvedValue(answer);
    const response = await POST(post({ question: "  What should I focus on?  " }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: answer });
    expect(execute).toHaveBeenCalledWith(
      { question: "What should I focus on?" },
      { id: "u1", email: "owner@example.com", role: "owner" },
    );
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("answers 429 when the owner asked too often", async () => {
    execute.mockRejectedValue(new TooManyRequestsError("Slow down."));
    const response = await POST(post({ intent: "focus" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "RATE_LIMITED", message: "Slow down." },
    });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("answers a generic 500 when the database is down, without its message", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    execute.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.1:5432"));
    const response = await POST(post({ intent: "focus" }));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("ECONNREFUSED");
    expect(dispose).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
