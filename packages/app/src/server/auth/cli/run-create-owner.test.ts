import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConflictError } from "@commerceos/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "../create-auth";
import { createAuthPool } from "../create-auth-pool";
import { createOwner } from "../create-owner";
import { loadEnvFileIfPresent, runCreateOwner, type RunCreateOwnerDeps } from "./run-create-owner";

vi.mock("../create-owner", () => ({ createOwner: vi.fn() }));

const SECRET = "s".repeat(32);
const PASSWORD = "twelve-chars-plus";
const env = {
  DATABASE_URL: "postgresql://u@127.0.0.1:1/db",
  BETTER_AUTH_SECRET: SECRET,
  ADMIN_EMAIL: " Owner@Example.com ",
  ADMIN_PASSWORD: PASSWORD,
};

function deps(overrides: Partial<RunCreateOwnerDeps> = {}) {
  const pool = createAuthPool(env.DATABASE_URL);
  const end = vi.spyOn(pool, "end").mockResolvedValue(undefined);
  const log = { info: vi.fn(), error: vi.fn() };
  const createAuthSpy = vi.fn<typeof createAuth>((authDeps) => createAuth(authDeps));
  const all: RunCreateOwnerDeps = {
    env,
    argv: [],
    createAuth: createAuthSpy,
    createAuthPool: () => pool,
    log,
    ...overrides,
  };
  return { all, log, end, createAuthSpy };
}

const printed = (log: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }) =>
  [...log.info.mock.calls, ...log.error.mock.calls].flat().join("\n");

afterEach(() => vi.mocked(createOwner).mockReset());

describe("runCreateOwner", () => {
  it("creates the owner from env, prints no secret and closes the pool", async () => {
    vi.mocked(createOwner).mockResolvedValue("created");
    const { all, log, end } = deps();
    await expect(runCreateOwner(all)).resolves.toBe(0);
    expect(vi.mocked(createOwner).mock.calls[0]?.[1]).toEqual({
      email: "owner@example.com",
      password: PASSWORD,
      rotate: false,
    });
    expect(log.info).toHaveBeenCalledWith(expect.stringMatching(/Owner account created/));
    expect(printed(log)).not.toMatch(new RegExp(`${PASSWORD}|${SECRET}`));
    expect(end).toHaveBeenCalled();
  });

  it("rotates with --rotate-password", async () => {
    vi.mocked(createOwner).mockResolvedValue("rotated");
    const { all, log } = deps({ argv: ["--rotate-password"] });
    await expect(runCreateOwner(all)).resolves.toBe(0);
    expect(vi.mocked(createOwner).mock.calls[0]?.[1].rotate).toBe(true);
    expect(log.info).toHaveBeenCalledWith(expect.stringMatching(/password changed/));
  });

  it("rejects unknown arguments, so a password is never taken from argv", async () => {
    const { all, log } = deps({ argv: ["--password", "x"] });
    await expect(runCreateOwner(all)).resolves.toBe(2);
    expect(log.error).toHaveBeenCalledWith(expect.stringMatching(/Unknown argument/));
    expect(createOwner).not.toHaveBeenCalled();
  });

  it("rejects a missing email and a password under 12 characters", async () => {
    const { all, log } = deps({
      env: { ...env, ADMIN_EMAIL: undefined, ADMIN_PASSWORD: "short-pass" },
    });
    await expect(runCreateOwner(all)).resolves.toBe(2);
    expect(log.error.mock.calls[0]?.[0]).toMatch(
      /ADMIN_EMAIL[\s\S]*ADMIN_PASSWORD: must be at least 12/,
    );
    expect(createOwner).not.toHaveBeenCalled();
  });

  it("reports a conflict with its own message and exits 1", async () => {
    vi.mocked(createOwner).mockRejectedValue(
      new ConflictError("The owner account already exists."),
    );
    const { all, log, end } = deps();
    await expect(runCreateOwner(all)).resolves.toBe(1);
    expect(log.error).toHaveBeenCalledWith("The owner account already exists.");
    expect(end).toHaveBeenCalled();
  });

  it("reports unexpected failures generically and exits 1", async () => {
    const refused = Object.assign(new Error("connect ECONNREFUSED postgresql://u:secret@h"), {
      code: "ECONNREFUSED",
    });
    vi.mocked(createOwner).mockRejectedValueOnce(refused);
    const first = deps();
    await expect(runCreateOwner(first.all)).resolves.toBe(1);
    expect(first.log.error).toHaveBeenCalledWith(
      "Could not create the owner account (Error ECONNREFUSED). Check DATABASE_URL and that migrations ran.",
    );
    expect(printed(first.log)).not.toContain("secret");

    vi.mocked(createOwner).mockRejectedValueOnce(new TypeError("bad input"));
    const second = deps();
    await expect(runCreateOwner(second.all)).resolves.toBe(1);
    expect(second.log.error).toHaveBeenCalledWith(expect.stringContaining("(TypeError)"));

    vi.mocked(createOwner).mockRejectedValueOnce("boom");
    const third = deps();
    await expect(runCreateOwner(third.all)).resolves.toBe(1);
    expect(third.log.error).toHaveBeenCalledWith(expect.stringContaining("(unknown error)"));
  });

  it("passes only error-level library logs to the CLI output", async () => {
    vi.mocked(createOwner).mockResolvedValue("created");
    const { all, log, createAuthSpy } = deps();
    await runCreateOwner(all);
    const authLog = createAuthSpy.mock.calls[0]?.[0].log;
    authLog?.("warn", "ignored");
    authLog?.("error", "[better-auth] failed");
    expect(log.error).toHaveBeenCalledWith("[better-auth] failed");
    expect(printed(log)).not.toContain("ignored");
  });
});

describe("loadEnvFileIfPresent", () => {
  it("loads an existing file and ignores a missing one", () => {
    const dir = mkdtempSync(join(tmpdir(), "owner-cli-"));
    const file = join(dir, ".env");
    writeFileSync(file, "OWNER_CLI_TEST_VAR=loaded\n");
    try {
      loadEnvFileIfPresent(join(dir, "missing.env"));
      expect(process.env.OWNER_CLI_TEST_VAR).toBeUndefined();
      loadEnvFileIfPresent(file);
      expect(process.env.OWNER_CLI_TEST_VAR).toBe("loaded");
    } finally {
      delete process.env.OWNER_CLI_TEST_VAR;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
