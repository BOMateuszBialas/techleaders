import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEnvFileIfPresent, runCreateOwner } from "./run-create-owner";

vi.mock("./run-create-owner", () => ({
  loadEnvFileIfPresent: vi.fn(),
  runCreateOwner: vi.fn(async () => 3),
}));

afterEach(() => {
  process.exitCode = undefined;
});

describe("admin:create entry point", () => {
  it("loads the root .env, runs the CLI with argv, prints via the console and sets the exit code", async () => {
    // The module runs once, on first import.
    const { done } = await import("./create-owner");
    await done;

    expect(vi.mocked(loadEnvFileIfPresent).mock.calls[0]?.[0]).toMatch(/[\\/]\.env$/);
    const deps = vi.mocked(runCreateOwner).mock.calls[0]?.[0];
    expect(deps).toMatchObject({ env: process.env, argv: process.argv.slice(2) });
    expect(process.exitCode).toBe(3);

    const out = vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    deps?.log.info("hello");
    deps?.log.error("oops");
    expect(out).toHaveBeenCalledWith("hello");
    expect(err).toHaveBeenCalledWith("oops");
  });
});
