import { afterEach, describe, expect, it, vi } from "vitest";
import { STALE_CONTAINER_GRACE_MS, createRequestScope, disposeRootContainer } from "./container";
import { logger } from "./logger";

// No real Better Auth instance: it would start a background schema check.
vi.mock("./auth/create-auth", () => ({ createAuth: vi.fn(() => ({ stub: "auth" })) }));

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/commerceos";
process.env.BETTER_AUTH_SECRET ??= "unit-test-secret-unit-test-secret-1234";

type ContainerGlobal = {
  __commerceosContainer?: unknown;
  __commerceosContainerGeneration?: number;
};
const cache = globalThis as typeof globalThis & ContainerGlobal;

/** A container left behind by an older evaluation of container.ts (dev hot reload). */
function plantStaleContainer(dispose: () => Promise<void>, generation?: number) {
  cache.__commerceosContainer = { dispose };
  cache.__commerceosContainerGeneration = generation;
}

afterEach(async () => {
  await disposeRootContainer();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("composition root after a dev hot reload", () => {
  it("replaces a container built by an older module evaluation, disposing it after a grace period", async () => {
    vi.useFakeTimers();
    const dispose = vi.fn(async () => {});
    plantStaleContainer(dispose, 0);

    const scope = createRequestScope();

    // A request still running on the old container keeps its pools for the grace period.
    expect(dispose).not.toHaveBeenCalled();
    // The fresh container knows the current registrations.
    expect(typeof scope.cradle.getSystemHealthUseCase.execute).toBe("function");
    await vi.advanceTimersByTimeAsync(STALE_CONTAINER_GRACE_MS);
    expect(dispose).toHaveBeenCalledTimes(1);
    await scope.dispose();
  });

  it("keeps serving when the stale container fails to close, and logs it", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    // No generation recorded: treated as the oldest.
    plantStaleContainer(async () => {
      throw new Error("pool already closed");
    });

    const scope = createRequestScope();
    await vi.advanceTimersByTimeAsync(STALE_CONTAINER_GRACE_MS);
    expect(warn).toHaveBeenCalledWith("A stale DI container could not be disposed", {
      error: expect.any(Error),
    });
    await scope.dispose();
  });

  it("reuses the container it built itself", () => {
    const first = createRequestScope();
    const second = createRequestScope();
    // Identity via ===: matchers on container objects make Vitest serialise them.
    expect(first.cradle.orm === second.cradle.orm).toBe(true);
  });
});

describe("composition root in next dev with several server layers (#59)", () => {
  it("lets alternating page and route requests share the newest container", async () => {
    vi.useFakeTimers();
    // `next dev` evaluates container.ts once per layer: route handlers first, then a page.
    vi.resetModules();
    const routeLayer = await import("./container");
    const firstRouteScope = routeLayer.createRequestScope();
    const routeOrm = firstRouteScope.cradle.orm;
    const closeRouteOrm = vi.spyOn(routeOrm, "close");

    vi.resetModules();
    const pageLayer = await import("./container");
    const pageScope = pageLayer.createRequestScope();
    const pageOrm = pageScope.cradle.orm;
    const closePageOrm = vi.spyOn(pageOrm, "close");

    // The newer evaluation builds its own container; the route request in flight keeps its pools.
    expect(pageOrm === routeOrm).toBe(false);
    expect(closeRouteOrm).not.toHaveBeenCalled();

    // Before the fix the older route layer replaced the page layer's container on every
    // alternating request, disposing pools under requests still in flight.
    const nextRouteScope = routeLayer.createRequestScope();
    const nextPageScope = pageLayer.createRequestScope();
    expect(nextRouteScope.cradle.orm === pageOrm).toBe(true);
    expect(nextPageScope.cradle.orm === pageOrm).toBe(true);

    await vi.advanceTimersByTimeAsync(STALE_CONTAINER_GRACE_MS);
    expect(closePageOrm).not.toHaveBeenCalled();
    // Only the container the newer evaluation replaced is closed, once the grace period ends.
    expect(closeRouteOrm).toHaveBeenCalledTimes(1);
    await Promise.all(
      [firstRouteScope, pageScope, nextRouteScope, nextPageScope].map((scope) => scope.dispose()),
    );
  });
});

describe("composition root in a production build (#57)", () => {
  it("shares one container between evaluations of container.ts, one per server layer", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://shop.example");
    try {
      // Route handlers and pages evaluate their own copy of the module in a production build.
      vi.resetModules();
      const routeLayer = await import("./container");
      const routeScope = routeLayer.createRequestScope();
      const orm = routeScope.cradle.orm;
      const close = vi.spyOn(orm, "close");

      vi.resetModules();
      const pageLayer = await import("./container");
      const pageScope = pageLayer.createRequestScope();

      // Before the fix the page layer disposed the route layer's container (and its pools)
      // while the route's request was still using it.
      expect(close).not.toHaveBeenCalled();
      expect(pageScope.cradle.orm === orm).toBe(true);
      await routeScope.dispose();
      await pageScope.dispose();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
