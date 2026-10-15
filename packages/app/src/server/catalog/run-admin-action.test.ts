import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UniqueFieldConflictError,
  ValidationError,
} from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "../auth/require-admin";
import { createRequestScope, type Cradle } from "../container";
import { logger } from "../logger";
import { GENERIC_ACTION_ERROR, runAdminAction } from "./run-admin-action";

const dispose = vi.fn(async () => {});
const cradle = { marker: "request-cradle" } as unknown as Cradle;

vi.mock("../auth/require-admin", () => ({
  SIGN_IN_PAGE: "/admin/sign-in",
  requireAdmin: vi.fn(),
}));
vi.mock("../container", () => ({ createRequestScope: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  // Like Next.js: rethrows its own control-flow errors, ignores everything else.
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("NEXT_")) throw error;
  }),
}));

const { refresh, updateTag } = await import("next/cache");

const values = { name: "Mice", slug: "" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: "u-1", email: "o@x.test", role: "owner" });
  vi.mocked(createRequestScope).mockReturnValue({ cradle, dispose } as never);
  vi.spyOn(logger, "info").mockImplementation(() => {});
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

describe("runAdminAction", () => {
  it("redirects to sign-in without a session, before any request scope or handler", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new UnauthorizedError());
    const handler = vi.fn();

    await expect(runAdminAction("test.action", values, handler)).rejects.toThrow(
      "NEXT_REDIRECT /admin/sign-in",
    );
    expect(handler).not.toHaveBeenCalled();
    expect(createRequestScope).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("treats an UNAUTHORIZED error from another copy of core the same way", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      Object.assign(new Error("Authentication is required."), { code: "UNAUTHORIZED" }),
    );
    await expect(runAdminAction("test.action", values, vi.fn())).rejects.toThrow(
      "NEXT_REDIRECT /admin/sign-in",
    );
  });

  it("runs the handler on the request scope, then updates the catalog and refreshes", async () => {
    const handler = vi.fn(async (received: Cradle) => {
      expect(received === cradle).toBe(true);
      return { event: "catalog.category.updated", id: "c-1", message: "Saved." };
    });

    await expect(runAdminAction("test.action", values, handler)).resolves.toEqual({
      status: "success",
      message: "Saved.",
    });
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith("catalog.category.updated", { id: "c-1" });
    expect(updateTag).toHaveBeenCalledWith("catalog");
    expect(refresh).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("redirects after a successful handler that asks for it, outside the try block", async () => {
    const handler = async () => ({ event: "e", id: "c-1", redirectTo: "/admin/categories/c-1" });

    await expect(runAdminAction("test.action", values, handler)).rejects.toThrow(
      "NEXT_REDIRECT /admin/categories/c-1",
    );
    expect(updateTag).toHaveBeenCalledWith("catalog");
    expect(refresh).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("shows a taken unique value under its field and keeps the typed values", async () => {
    const handler = async () => {
      throw new UniqueFieldConflictError("slug", "This slug is already used by another category.");
    };
    await expect(runAdminAction("test.action", values, handler)).resolves.toEqual({
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { slug: ["This slug is already used by another category."] },
      values,
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("maps validation errors to field errors", async () => {
    const handler = async () => {
      throw new ValidationError("Check the highlighted fields.", { name: ["Enter a name."] });
    };
    await expect(runAdminAction("test.action", values, handler)).resolves.toEqual({
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { name: ["Enter a name."] },
      values,
    });
  });

  it.each([
    new NotFoundError("Category not found."),
    new ConflictError("4 products still use this category."),
  ])("shows the safe message of %o", async (error) => {
    const state = await runAdminAction("test.action", values, async () => {
      throw error;
    });
    expect(state).toEqual({ status: "error", message: error.message, values });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("hides an unexpected error behind a generic message and logs it with the action name", async () => {
    const failure = new Error('relation "categories" does not exist');
    const state = await runAdminAction("catalog.category.update", values, async () => {
      throw failure;
    });

    expect(state).toEqual({ status: "error", message: GENERIC_ACTION_ERROR, values });
    expect(JSON.stringify(state)).not.toContain("relation");
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith("Admin action failed", {
      action: "catalog.category.update",
      error: failure,
    });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("never swallows Next.js control flow thrown inside the handler", async () => {
    const handler = async (): Promise<never> => {
      throw new Error("NEXT_NOT_FOUND");
    };
    await expect(runAdminAction("test.action", values, handler)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(dispose).toHaveBeenCalledOnce();
  });
});
