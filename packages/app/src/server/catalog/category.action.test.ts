import { NotFoundError, UnauthorizedError, UniqueFieldConflictError } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE } from "@/lib/action-state";
import { requireAdmin } from "../auth/require-admin";
import { createRequestScope } from "../container";
import { logger } from "../logger";
import { createCategory, deleteCategory, updateCategory } from "./category.action";

const CATEGORY_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01";

const createCategoryUseCase = { execute: vi.fn() };
const updateCategoryUseCase = { execute: vi.fn() };
const deleteCategoryUseCase = { execute: vi.fn() };
const dispose = vi.fn(async () => {});

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
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("NEXT_")) throw error;
  }),
}));

const { updateTag } = await import("next/cache");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const saved = {
  id: CATEGORY_ID,
  slug: "gaming-mice",
  name: "Gaming mice",
  description: null,
  productCount: 4,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: "u-1", email: "o@x.test", role: "owner" });
  vi.mocked(createRequestScope).mockReturnValue({
    cradle: { createCategoryUseCase, updateCategoryUseCase, deleteCategoryUseCase },
    dispose,
  } as never);
  vi.spyOn(logger, "info").mockImplementation(() => {});
});

// Spec, cross-model review: every exported action, invoked without a session, redirects to
// the sign-in page and never resolves a use case.
describe.each([
  ["createCategory", createCategory, form({ name: "Mice" })],
  ["updateCategory", updateCategory, form({ id: CATEGORY_ID, name: "Mice" })],
  ["deleteCategory", deleteCategory, form({ id: CATEGORY_ID })],
] as const)("%s without a session", (_name, action, data) => {
  it("redirects to sign-in and runs no use case", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new UnauthorizedError());
    await expect(action(IDLE_ACTION_STATE, data)).rejects.toThrow("NEXT_REDIRECT /admin/sign-in");
    expect(createRequestScope).not.toHaveBeenCalled();
    for (const useCase of [createCategoryUseCase, updateCategoryUseCase, deleteCategoryUseCase]) {
      expect(useCase.execute).not.toHaveBeenCalled();
    }
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("createCategory", () => {
  it("creates from parsed input and opens the new category's page", async () => {
    createCategoryUseCase.execute.mockResolvedValue({ ...saved, productCount: 0 });
    await expect(
      createCategory(
        IDLE_ACTION_STATE,
        form({ name: " Gaming mice ", slug: "", description: "", ignored: "x" }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT /admin/categories/${CATEGORY_ID}?notice=created`);
    expect(createCategoryUseCase.execute).toHaveBeenCalledWith({
      name: "Gaming mice",
      slug: "gaming-mice",
      description: null,
    });
    expect(updateTag).toHaveBeenCalledWith("catalog");
    expect(logger.info).toHaveBeenCalledWith("catalog.category.created", { id: CATEGORY_ID });
  });

  it("returns field errors without calling the use case", async () => {
    const state = await createCategory(IDLE_ACTION_STATE, form({ name: "", slug: "a b" }));
    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { name: ["Enter a name."] },
      values: { name: "", slug: "a b", description: "" },
    });
    expect(createCategoryUseCase.execute).not.toHaveBeenCalled();
  });

  it("shows a taken derived slug in the slug field so the owner can edit it", async () => {
    createCategoryUseCase.execute.mockRejectedValue(
      new UniqueFieldConflictError("slug", "This slug is already used by another category."),
    );
    const state = await createCategory(IDLE_ACTION_STATE, form({ name: "Mice", slug: "" }));
    expect(state).toEqual({
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { slug: ["This slug is already used by another category."] },
      values: { name: "Mice", slug: "mice", description: "" },
    });
  });
});

describe("updateCategory", () => {
  it("saves and describes the store effect, staying on the page", async () => {
    updateCategoryUseCase.execute.mockResolvedValue(saved);
    const state = await updateCategory(
      IDLE_ACTION_STATE,
      form({ id: CATEGORY_ID, name: "Gaming mice", slug: "gaming-mice", description: "" }),
    );
    expect(state).toEqual({
      status: "success",
      message:
        "Saved. Shoppers find it at /products?category=gaming-mice and in the home page tabs.",
    });
    expect(updateCategoryUseCase.execute).toHaveBeenCalledWith({
      id: CATEGORY_ID,
      values: { name: "Gaming mice", slug: "gaming-mice", description: null },
    });
  });

  it("reports a category deleted meanwhile", async () => {
    updateCategoryUseCase.execute.mockRejectedValue(new NotFoundError("Category not found."));
    const state = await updateCategory(IDLE_ACTION_STATE, form({ id: "x", name: "Mice" }));
    expect(state).toMatchObject({ status: "error", message: "Category not found." });
  });
});

describe("deleteCategory", () => {
  it("deletes and returns to the list with a notice", async () => {
    deleteCategoryUseCase.execute.mockResolvedValue(undefined);
    await expect(deleteCategory(IDLE_ACTION_STATE, form({ id: CATEGORY_ID }))).rejects.toThrow(
      "NEXT_REDIRECT /admin/categories?notice=deleted",
    );
    expect(deleteCategoryUseCase.execute).toHaveBeenCalledWith({ id: CATEGORY_ID });
    expect(logger.info).toHaveBeenCalledWith("catalog.category.deleted", { id: CATEGORY_ID });
  });

  it("shows the refusal for a category that products use", async () => {
    deleteCategoryUseCase.execute.mockRejectedValue(
      Object.assign(new Error("4 products still use this category."), { code: "CONFLICT" }),
    );
    const state = await deleteCategory(IDLE_ACTION_STATE, form({ id: CATEGORY_ID }));
    expect(state).toEqual({
      status: "error",
      message: "4 products still use this category.",
      values: {},
    });
  });
});
