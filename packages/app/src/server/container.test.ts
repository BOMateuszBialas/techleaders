import { afterAll, describe, expect, it } from "vitest";
import { createRequestScope } from "./container";

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
});
