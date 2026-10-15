import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestScope, disposeRootContainer } from "./container";
import { logger } from "./logger";

// No real Better Auth instance: it would start a background schema check.
vi.mock("./auth/create-auth", () => ({ createAuth: vi.fn(() => ({ stub: "auth" })) }));

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/commerceos";
process.env.BETTER_AUTH_SECRET ??= "unit-test-secret-unit-test-secret-1234";

type ContainerGlobal = {
  __commerceosContainer?: unknown;
  __commerceosContainerOwner?: symbol;
};
const cache = globalThis as typeof globalThis & ContainerGlobal;

/** A container left behind by an older evaluation of container.ts (dev hot reload). */
function plantStaleContainer(dispose: () => Promise<void>) {
  cache.__commerceosContainer = { dispose };
  cache.__commerceosContainerOwner = Symbol("older-module-evaluation");
}

afterEach(async () => {
  await disposeRootContainer();
  vi.restoreAllMocks();
});

describe("composition root after a dev hot reload", () => {
  it("disposes a container built by an older module evaluation and builds a fresh one", async () => {
    const dispose = vi.fn(async () => {});
    plantStaleContainer(dispose);

    const scope = createRequestScope();

    expect(dispose).toHaveBeenCalledTimes(1);
    // The fresh container knows the current registrations.
    expect(typeof scope.cradle.getSystemHealthUseCase.execute).toBe("function");
    await scope.dispose();
  });

  it("keeps serving when the stale container fails to close, and logs it", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    plantStaleContainer(async () => {
      throw new Error("pool already closed");
    });

    const scope = createRequestScope();
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith("A stale DI container could not be disposed", {
        error: expect.any(Error),
      }),
    );
    await scope.dispose();
  });

  it("reuses the container it built itself", () => {
    const first = createRequestScope();
    const second = createRequestScope();
    // Identity via ===: matchers on container objects make Vitest serialise them.
    expect(first.cradle.orm === second.cradle.orm).toBe(true);
  });
});
