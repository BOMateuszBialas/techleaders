import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@commerceos/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiHandler, parseRequestBody } from "./api-handler";
import { jsonOk } from "./api-result";

function failingWith(error: unknown) {
  return apiHandler("test-route", async () => {
    throw error;
  });
}

describe("apiHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes successful responses through", async () => {
    const response = await apiHandler("test-route", async () => jsonOk({ id: "p-1" }))();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { id: "p-1" } });
  });

  it.each([
    [new ValidationError("Invalid"), 400, "VALIDATION_FAILED"],
    [new UnauthorizedError(), 401, "UNAUTHORIZED"],
    [new ForbiddenError(), 403, "FORBIDDEN"],
    [new NotFoundError(), 404, "NOT_FOUND"],
    [new ConflictError(), 409, "CONFLICT"],
  ])("maps %o to HTTP %i", async (error, status, code) => {
    const response = await failingWith(error)();
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ ok: false, error: { code } });
  });

  it("returns field errors for validation failures", async () => {
    const response = await failingWith(new ValidationError("Invalid", { slug: ["Taken"] }))();
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "VALIDATION_FAILED", message: "Invalid", fieldErrors: { slug: ["Taken"] } },
    });
  });

  it.each([
    ["an unexpected error", new Error("connection refused: postgres://u:p@db-host")],
    ["an internal AppError", new AppError("INVALID_MONEY", "Amount must be an integer")],
  ])("hides %s behind a generic 500 and logs it", async (_label, error) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await failingWith(error)();

    expect(response.status).toBe(500);
    const body = JSON.stringify(await response.json());
    expect(body).toContain("INTERNAL_ERROR");
    expect(body).not.toContain(error.message);
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0]?.[0])).not.toContain("u:p@");
  });
});

describe("parseRequestBody", () => {
  const schema = z.object({ name: z.string().min(1), priceMinor: z.number().int().min(0) });

  function request(body: string): Request {
    return new Request("http://localhost/api/test", { method: "POST", body });
  }

  it("returns the parsed body when it matches the schema", async () => {
    await expect(
      parseRequestBody(request('{"name":"Kettle","priceMinor":100}'), schema),
    ).resolves.toEqual({ name: "Kettle", priceMinor: 100 });
  });

  it("rejects invalid JSON with a ValidationError", async () => {
    await expect(parseRequestBody(request("{not json"), schema)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("reports per-field problems", async () => {
    const error = await parseRequestBody(request('{"name":"","priceMinor":-1}'), schema).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(ValidationError);
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : {};
    expect(Object.keys(fieldErrors).sort()).toEqual(["name", "priceMinor"]);
  });
});
