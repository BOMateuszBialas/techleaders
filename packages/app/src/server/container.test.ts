import { afterAll, describe, expect, it, vi } from "vitest";
import { ListCatalogProductsUseCase } from "@commerceos/core";
import { DatabaseCatalogRepository } from "@commerceos/database";
import { createRequestScope, disposeRootContainer, getAuth, logAuthMessage } from "./container";
import { createAuth } from "./auth/create-auth";
import { logger } from "./logger";

// betterAuth() starts initialising (a database schema check) as soon as it is built. This
// test checks wiring only, so it gets a stub and opens no connection.
vi.mock("./auth/create-auth", () => ({ createAuth: vi.fn(() => ({ stub: "auth" })) }));

// No database connection is opened: MikroORM connects lazily and these tests
// only resolve registrations.
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/commerceos";
process.env.BETTER_AUTH_SECRET ??= "unit-test-secret-unit-test-secret-1234";

describe("composition root", () => {
  const first = createRequestScope();
  const second = createRequestScope();

  afterAll(async () => {
    await first.dispose();
    await second.dispose();
  });

  it("gives every request its own EntityManager fork", () => {
    // Identity via ===: a failing-or-negated matcher on ORM objects makes Vitest serialise
    // their metadata, which took seconds in CI (see .ai/lessons.md).
    expect(first.cradle.em === second.cradle.em).toBe(false);
    expect(first.cradle.em).toBe(first.cradle.em);
  });

  it("shares process-wide singletons between requests", () => {
    expect(first.cradle.orm).toBe(second.cradle.orm);
    expect(first.cradle.llmProvider).toBe(second.cradle.llmProvider);
  });

  it("falls back to the unconfigured LLM provider until one is implemented", () => {
    expect(first.cradle.llmProvider.isConfigured).toBe(false);
  });

  it("wires the system health use case with the database check", () => {
    expect(first.cradle.healthChecks.map((check) => check.name)).toEqual(["database"]);
    // Compared by identity: printing a cradle-backed object in a diff would query the container.
    const isShared = first.cradle.getSystemHealthUseCase === second.cradle.getSystemHealthUseCase;
    expect(isShared).toBe(false);
  });

  it("wires the storefront catalog per request on the request's EntityManager", () => {
    const repository = first.cradle.catalogRepository;
    expect(repository instanceof DatabaseCatalogRepository).toBe(true);
    expect(repository === second.cradle.catalogRepository).toBe(false);
    for (const key of [
      "listCatalogCategoriesUseCase",
      "listCatalogProductsUseCase",
      "getCatalogProductUseCase",
    ] as const) {
      expect(first.cradle[key] === second.cradle[key]).toBe(false);
    }
    expect(first.cradle.listCatalogProductsUseCase instanceof ListCatalogProductsUseCase).toBe(
      true,
    );
  });

  it("shares one Better Auth instance and pool, reachable without a request scope", () => {
    expect(first.cradle.auth === second.cradle.auth).toBe(true);
    expect(getAuth() === first.cradle.auth).toBe(true);
    expect(first.cradle.authPool === second.cradle.authPool).toBe(true);
    const deps = vi.mocked(createAuth).mock.calls[0]?.[0];
    expect(deps?.pool === first.cradle.authPool).toBe(true);
    expect(deps?.log).toBe(logAuthMessage);
    expect(deps?.env.BETTER_AUTH_SECRET).toBe(process.env.BETTER_AUTH_SECRET);
  });

  it("routes Better Auth log lines through the server logger", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    logAuthMessage("warn", "[better-auth] Invalid password");
    logAuthMessage("debug", "[better-auth] detail");
    expect(warn).toHaveBeenCalledWith("[better-auth] Invalid password");
    expect(info).toHaveBeenCalledWith("[better-auth] detail");
    warn.mockRestore();
    info.mockRestore();
  });

  it("closes the ORM and the auth pool, and rebuilds the container after disposal", async () => {
    // One disposal of the original container, as before auth existed: closing a second,
    // freshly built ORM without a database took over 5 s in CI.
    const orm = first.cradle.orm;
    const close = vi.spyOn(orm, "close");
    const end = vi.spyOn(first.cradle.authPool, "end");
    await disposeRootContainer();
    expect(close).toHaveBeenCalled();
    expect(end).toHaveBeenCalled();

    const fresh = createRequestScope();
    expect(fresh.cradle.orm === orm).toBe(false);
    await fresh.dispose();
    await disposeRootContainer();
  });

  it("disposing an already disposed container is a no-op", async () => {
    await expect(disposeRootContainer()).resolves.toBeUndefined();
  });
});
