import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, redact } from "./logger";

describe("redact", () => {
  it("masks sensitive keys at any depth", () => {
    expect(
      redact({ user: { email: "a@b.c", password: "hunter2" }, apiKey: "sk-1", Authorization: "x" }),
    ).toEqual({
      user: { email: "a@b.c", password: "[REDACTED]" },
      apiKey: "[REDACTED]",
      Authorization: "[REDACTED]",
    });
  });

  it("strips credentials from connection strings", () => {
    expect(redact("connect to postgresql://admin:s3cret@db:5432/app failed")).toBe(
      "connect to postgresql://[REDACTED]@db:5432/app failed",
    );
  });

  it("reduces errors to name, message and stack without credentials", () => {
    const result = redact(new Error("postgres://u:p@host refused")) as Record<string, unknown>;
    expect(result.name).toBe("Error");
    expect(result.message).toBe("postgres://[REDACTED]@host refused");
    expect(String(result.stack)).not.toContain("u:p@");
  });

  it("handles errors without a stack trace", () => {
    const error = new Error("no stack");
    error.stack = undefined;
    expect(redact(error)).toEqual({ name: "Error", message: "no stack", stack: undefined });
  });

  it("passes primitives and null through unchanged", () => {
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBeNull();
    expect(redact([true, "postgres://a:b@h"])).toEqual([true, "postgres://[REDACTED]@h"]);
  });

  it("stops at a fixed depth instead of recursing forever", () => {
    const deep = { a: { b: { c: { d: { e: { f: "too deep" } } } } } };
    expect(JSON.stringify(redact(deep))).toContain("[Truncated]");
  });
});

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["info", "warn", "error"] as const)(
    "writes %s entries to the matching console method",
    (level) => {
      const spy = vi.spyOn(console, level).mockImplementation(() => {});
      logger[level]("hello");
      expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({ level, message: "hello" });
    },
  );

  it("writes one JSON line with the redacted context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("payment failed", { orderId: "o-1", token: "secret" });

    expect(spy).toHaveBeenCalledOnce();
    const entry = JSON.parse(String(spy.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(entry).toMatchObject({ level: "error", message: "payment failed", orderId: "o-1" });
    expect(entry.token).toBe("[REDACTED]");
  });
});
