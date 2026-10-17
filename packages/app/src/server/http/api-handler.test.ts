import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
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
    [new TooManyRequestsError(), 429, "RATE_LIMITED"],
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

  // Regression (#36): Next.js can bundle `@commerceos/core` into more than one server chunk,
  // so an error may come from another copy of its classes and fail `instanceof`. These
  // errors only carry the stable `code` and must map to the same status and body as today.
  function foreignError(code: string, message: string, extra: object = {}): Error {
    return Object.assign(new Error(message), { code }, extra);
  }

  it.each([
    [new ValidationError("Invalid"), foreignError("VALIDATION_FAILED", "Invalid"), 400],
    [new UnauthorizedError(), foreignError("UNAUTHORIZED", "Authentication is required."), 401],
    [
      new ForbiddenError(),
      foreignError("FORBIDDEN", "You are not allowed to perform this operation."),
      403,
    ],
    [new NotFoundError(), foreignError("NOT_FOUND", "The requested resource was not found."), 404],
    [
      new ConflictError(),
      foreignError("CONFLICT", "The request conflicts with the current state."),
      409,
    ],
    [
      new TooManyRequestsError(),
      foreignError("RATE_LIMITED", "Too many requests. Try again in a few minutes."),
      429,
    ],
  ])("maps an error from another class identity like %o", async (genuine, foreign, status) => {
    expect(foreign).not.toBeInstanceOf(AppError);
    const expected = await failingWith(genuine)();
    const actual = await failingWith(foreign)();

    expect(actual.status).toBe(status);
    expect(expected.status).toBe(status);
    expect(await actual.text()).toBe(await expected.text());
  });

  it("reads field errors structurally from a foreign validation error", async () => {
    const fieldErrors = { slug: ["Taken"], "items.0.qty": ["Too many", "Must be positive"] };
    const genuine = await failingWith(new ValidationError("Invalid", fieldErrors))();
    const foreign = await failingWith(
      foreignError("VALIDATION_FAILED", "Invalid", { fieldErrors }),
    )();

    expect(foreign.status).toBe(400);
    expect(await foreign.text()).toBe(await genuine.text());
  });

  it.each([
    ["not an object", "slug: Taken"],
    ["a non-array value", { slug: "Taken" }],
    ["a non-string message", { slug: [42] }],
  ])("replaces malformed field errors (%s) with an empty object", async (_label, fieldErrors) => {
    const response = await failingWith(
      foreignError("VALIDATION_FAILED", "Invalid", { fieldErrors }),
    )();
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "VALIDATION_FAILED", message: "Invalid", fieldErrors: {} },
    });
  });

  it.each([
    ["an unknown code", foreignError("PAYMENT_DECLINED", "Card declined")],
    ["a non-Error object with a client code", { code: "NOT_FOUND", message: "Missing" }],
    ["a thrown string", "NOT_FOUND"],
  ])("hides %s behind a generic 500", async (_label, error) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await failingWith(error)();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
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
