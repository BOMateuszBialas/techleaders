import { NotFoundError } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/server/logger";
import AdminError from "./error";
import AdminNotFound from "./not-found";

const listCategories = vi.fn();
const getCategory = vi.fn();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: {
      listCategoriesUseCase: { execute: listCategories },
      getCategoryUseCase: { execute: getCategory },
    },
    dispose,
  }),
}));

const { AdminPageLoadError, loadAdminCategories, loadAdminCategory } =
  await import("./categories/load-categories");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

describe("admin category loaders", () => {
  it("lists categories and disposes the scope", async () => {
    listCategories.mockResolvedValue([]);
    await expect(loadAdminCategories()).resolves.toEqual({ kind: "ok", data: [] });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("loads one category by id, or reports not-found", async () => {
    getCategory.mockResolvedValueOnce({ id: "c-1", products: [] });
    await expect(loadAdminCategory("c-1")).resolves.toEqual({
      kind: "ok",
      data: { id: "c-1", products: [] },
    });
    expect(getCategory).toHaveBeenCalledWith({ id: "c-1" });

    getCategory.mockRejectedValueOnce(new NotFoundError());
    await expect(loadAdminCategory("missing")).resolves.toEqual({ kind: "not-found" });
  });

  it("turns a failure into the error state and logs the page", async () => {
    listCategories.mockRejectedValue(new Error("database down"));
    await expect(loadAdminCategories()).resolves.toEqual({ kind: "error" });
    expect(logger.error).toHaveBeenCalledWith(
      "Page data could not be loaded",
      expect.objectContaining({ page: "/admin/categories" }),
    );
  });

  it("has a generic load error for the error boundary", () => {
    const error = new AdminPageLoadError();
    expect(error.name).toBe("AdminPageLoadError");
    expect(error.message).toBe("Admin page data could not be loaded.");
  });
});

describe("admin error boundary", () => {
  it("shows a generic message and a retry button, never the error's text", () => {
    const html = renderToStaticMarkup(
      createElement(AdminError, { error: new Error("SQL: secret detail"), retry: () => {} }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Something went wrong");
    expect(html).toContain(">Try again<");
    expect(html).not.toContain("secret detail");
  });
});

describe("admin not-found page", () => {
  it("says the record was not found and links back to the dashboard", () => {
    const html = renderToStaticMarkup(createElement(AdminNotFound));
    expect(html).toContain(">Not found<");
    expect(html).toContain('href="/admin"');
  });
});
