import { NotFoundError } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dispose = vi.fn(async () => {});
const createRequestScope = vi.fn(() => ({ cradle: { marker: "cradle" }, dispose }));

vi.mock("./container", () => ({ createRequestScope: () => createRequestScope() }));

const { loadWithRequestScope } = await import("./load-with-request-scope");

describe("loadWithRequestScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the data from the request scope and disposes it", async () => {
    const result = await loadWithRequestScope({ page: "/" }, async (cradle) => cradle);
    expect(result).toEqual({ kind: "ok", data: { marker: "cradle" } });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("maps NotFoundError to not-found without logging", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await loadWithRequestScope({ page: "/products/[slug]", slug: "x" }, () =>
      Promise.reject(new NotFoundError()),
    );
    expect(result).toEqual({ kind: "not-found" });
    expect(log).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("logs any other error with context and returns the error state", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await loadWithRequestScope({ page: "/products", slug: "coffee" }, () =>
      Promise.reject(new Error("connection refused")),
    );
    expect(result).toEqual({ kind: "error" });
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      level: "error",
      page: "/products",
      slug: "coffee",
      error: { message: "connection refused" },
    });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("returns the error state when no request scope can be created (e.g. invalid env)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createRequestScope.mockImplementationOnce(() => {
      throw new Error("Invalid environment");
    });
    const load = vi.fn();
    await expect(loadWithRequestScope({ page: "/" }, load)).resolves.toEqual({ kind: "error" });
    expect(load).not.toHaveBeenCalled();
    expect(dispose).not.toHaveBeenCalled();
  });
});
