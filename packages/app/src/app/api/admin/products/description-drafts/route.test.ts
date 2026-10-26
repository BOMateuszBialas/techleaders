import { TooManyRequestsError, ValidationError } from "@commerceos/core";
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
const MICE_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01";
const BODY = { name: " Vortex ", categoryId: MICE_ID, price: "249,90", notes: " 26,000 DPI " };

function post(body: unknown): Request {
  return new Request("http://x/api/admin/products/description-drafts", {
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
    cradle: { draftProductDescriptionUseCase: { execute } },
    dispose,
  } as never);
  getSession.mockResolvedValue({ session: { token: "t" }, user: OWNER });
});

describe("POST /api/admin/products/description-drafts", () => {
  it("answers 401 without a session and resolves no use case", async () => {
    getSession.mockResolvedValue(null);
    const response = await POST(post(BODY));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(createRequestScope).not.toHaveBeenCalled();
  });

  it("answers 400 with field errors for an invalid body", async () => {
    const response = await POST(post({ name: " ", price: "12.345", categoryId: "mice" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        fieldErrors: {
          name: ["Enter a name."],
          price: [expect.stringContaining("Enter a price")],
          categoryId: ["Choose an existing category."],
        },
      },
    });
    expect((await POST(post("not json"))).status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it("answers 400 on categoryId for an unknown category", async () => {
    execute.mockRejectedValue(
      new ValidationError("Choose an existing category.", {
        categoryId: ["Choose an existing category."],
      }),
    );
    const response = await POST(post(BODY));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { fieldErrors: { categoryId: ["Choose an existing category."] } },
    });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("passes the parsed form values to the use case and returns a draft", async () => {
    const draft = {
      kind: "draft",
      text: "A wireless mouse.",
      model: "m",
      promptVersion: "v",
      fieldsUsed: ["name"],
      demoMarked: false,
    };
    execute.mockResolvedValue(draft);
    const response = await POST(post(BODY));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: draft });
    expect(execute).toHaveBeenCalledWith(
      { name: "Vortex", categoryId: MICE_ID, price: 24990, notes: "26,000 DPI", sku: "" },
      { id: "u1", email: "owner@example.com", role: "owner" },
    );
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("returns an AI failure as a 200 with the reason", async () => {
    execute.mockResolvedValue({ kind: "unavailable", reason: "not_configured" });
    const response = await POST(post(BODY));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { kind: "unavailable", reason: "not_configured" },
    });
  });

  it("answers 429 when the owner asked for too many drafts", async () => {
    execute.mockRejectedValue(new TooManyRequestsError("Slow down."));
    const response = await POST(post(BODY));
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
    const response = await POST(post(BODY));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("ECONNREFUSED");
    expect(dispose).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
