import { afterAll, describe, expect, it, vi } from "vitest";
import { createRequestScope, disposeRootContainer } from "./container";

// No database connection is opened: MikroORM connects lazily and these tests
// only resolve registrations.
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/commerceos";

describe("composition root", () => {
  const first = createRequestScope();
  const second = createRequestScope();

  afterAll(async () => {
    await first.dispose();
    await second.dispose();
  });

  it("gives every request its own EntityManager fork", () => {
    expect(first.cradle.em).not.toBe(second.cradle.em);
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

  it("closes the ORM and rebuilds the container after disposal", async () => {
    const orm = first.cradle.orm;
    const close = vi.spyOn(orm, "close");
    await disposeRootContainer();
    expect(close).toHaveBeenCalled();

    const fresh = createRequestScope();
    expect(fresh.cradle.orm).not.toBe(orm);
    await fresh.dispose();
    await disposeRootContainer();
  });

  it("disposing an already disposed container is a no-op", async () => {
    await expect(disposeRootContainer()).resolves.toBeUndefined();
  });
});
