import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { FieldError, FormMessage, fieldA11y } from "../form-feedback";
import {
  categoryNotice,
  categoryPath,
  categorySavedMessage,
  moreProductsMessage,
  productCountLabel,
  storefrontCategoryHref,
  usedByMessage,
} from "./category-copy";
import { CategoryForm } from "./category-form";
import { CategoryFormView, type CategoryFormCategory } from "./category-form-view";
import { DeleteCategoryForm } from "./delete-category-form";
import {
  DeleteCategoryDialogBody,
  DeleteCategoryView,
  type DeleteCategoryViewProps,
} from "./delete-category-view";

const action = vi.fn();
const serverAction = vi.fn(async (state: ActionState) => state);

const mice: CategoryFormCategory = {
  id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01",
  name: "Mice",
  slug: "mice",
  description: "Gaming mice",
  productCount: 4,
};

function renderForm(
  state: ActionState,
  options: { pending?: boolean; category?: CategoryFormCategory } = {},
) {
  return renderToStaticMarkup(
    createElement(CategoryFormView, {
      action,
      state,
      pending: options.pending ?? false,
      category: options.category,
    }),
  );
}

describe("category copy", () => {
  it("builds admin and store paths", () => {
    expect(categoryPath("c-1")).toBe("/admin/categories/c-1");
    expect(storefrontCategoryHref("mice")).toBe("/products?category=mice");
  });

  it("describes the store effect of a save", () => {
    expect(categorySavedMessage({ slug: "mice", productCount: 4 })).toBe(
      "Saved. Shoppers find it at /products?category=mice and in the home page tabs.",
    );
    expect(categorySavedMessage({ slug: "streaming", productCount: 0 })).toBe(
      "Saved. Shoppers find it at /products?category=streaming; it has no products yet.",
    );
  });

  it("counts products in words", () => {
    expect(productCountLabel(1)).toBe("1 product");
    expect(productCountLabel(0)).toBe("0 products");
    expect(usedByMessage(12)).toBe("Used by 12 products");
    expect(moreProductsMessage(12, 10)).toBe("and 2 more");
    expect(moreProductsMessage(4, 4)).toBeNull();
  });

  it("maps only known notices", () => {
    expect(categoryNotice("created")).toBe("Category created.");
    expect(categoryNotice("deleted")).toBe("Category deleted.");
    expect(categoryNotice("<script>")).toBeNull();
    expect(categoryNotice(["created"])).toBeNull();
    expect(categoryNotice(undefined)).toBeNull();
  });
});

describe("form feedback", () => {
  it("renders an alert for errors, a status for success and nothing when idle", () => {
    expect(
      renderToStaticMarkup(
        createElement(FormMessage, { state: { status: "error", message: "No." } }),
      ),
    ).toBe('<p role="alert" class="text-sm text-destructive">No.</p>');
    expect(
      renderToStaticMarkup(
        createElement(FormMessage, { state: { status: "success", message: "Saved." } }),
      ),
    ).toContain('role="status"');
    expect(renderToStaticMarkup(createElement(FormMessage, { state: IDLE_ACTION_STATE }))).toBe("");
  });

  it("renders field errors only when there are messages", () => {
    expect(
      renderToStaticMarkup(createElement(FieldError, { id: "e", messages: ["A.", "B."] })),
    ).toBe('<p id="e" class="text-sm text-destructive">A. B.</p>');
    expect(renderToStaticMarkup(createElement(FieldError, { id: "e", messages: [] }))).toBe("");
    expect(renderToStaticMarkup(createElement(FieldError, { id: "e", messages: undefined }))).toBe(
      "",
    );
  });

  it("links an input to its hints and error", () => {
    expect(fieldA11y("e", ["Bad."], ["h"])).toEqual({
      "aria-invalid": true,
      "aria-describedby": "h e",
    });
    expect(fieldA11y("e", [])).toEqual({ "aria-invalid": false, "aria-describedby": undefined });
    expect(fieldA11y("e", undefined, ["h"])).toEqual({
      "aria-invalid": false,
      "aria-describedby": "h",
    });
  });
});

describe("CategoryFormView", () => {
  it("renders an empty create form when idle", () => {
    const html = renderForm(IDLE_ACTION_STATE);
    expect(html).toContain('name="name"');
    expect(html).toContain('value=""');
    expect(html).not.toContain('name="id"');
    expect(html).toContain(">Create category<");
    expect(html).toContain("Leave blank to derive it from the name.");
    expect(html).not.toContain("old links stop working");
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('role="status"');
  });

  it("keeps the typed values of a new category after a failed submit", () => {
    const html = renderForm({
      status: "error",
      message: "Check the highlighted fields.",
      values: { name: "Streaming", slug: "", description: "" },
    });
    expect(html).toContain('value="Streaming"');
    expect(html).not.toContain('name="id"');
  });

  it("labels an edit that is pending", () => {
    const html = renderForm(IDLE_ACTION_STATE, { pending: true, category: mice });
    expect(html).toContain(">Saving…</button>");
    expect(html).not.toContain(">Save changes<");
  });

  it("disables the button while pending", () => {
    const html = renderForm(IDLE_ACTION_STATE, { pending: true });
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Saving…<\/button>/);
  });

  it("shows field errors, the form error and the typed values after a failed submit", () => {
    const html = renderForm(
      {
        status: "error",
        message: "Check the highlighted fields.",
        fieldErrors: {
          name: ["Use at most 80 characters."],
          slug: ["This slug is already used by another category."],
          description: ["Keep it under the limit.", "Remove the emoji."],
        },
        values: { name: "Mice 2", slug: "mice", description: "Typed" },
      },
      { category: mice },
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("This slug is already used by another category.");
    expect(html).toContain('value="Mice 2"');
    expect(html).toContain(">Typed</textarea>");
    expect(html).toContain("Keep it under the limit. Remove the emoji.");
    expect(html).toContain("Use at most 80 characters.");
    expect(html).toContain('aria-describedby="category-description-error"');
    expect(html).toMatch(/id="category-slug"[^>]*aria-invalid="true"/);
    expect(html).toContain(
      'aria-describedby="category-slug-hint category-slug-warning category-slug-error"',
    );
  });

  it("edits a used category: hidden id, stored values, the slug warning and the success message", () => {
    const html = renderForm(
      { status: "success", message: "Saved. Shoppers find it at /products?category=mice." },
      { category: mice },
    );
    expect(html).toContain(`name="id" value="${mice.id}"`);
    expect(html).toContain('value="Mice"');
    expect(html).toContain(">Gaming mice</textarea>");
    expect(html).toContain("Changing the slug changes the store URL; old links stop working.");
    expect(html).toContain('role="status"');
    expect(html).toContain(">Save changes<");
  });

  it("leaves out the slug warning for an empty category and handles a missing description", () => {
    const html = renderForm(IDLE_ACTION_STATE, {
      category: { ...mice, productCount: 0, description: null },
    });
    expect(html).not.toContain("old links stop working");
    expect(html).toContain('aria-describedby="category-slug-hint"');
    expect(html).toMatch(/<textarea[^>]*><\/textarea>/);
  });
});

/** The confirmation body needs its dialog root (Base UI context); SSR renders the root inline. */
function renderDialogBody(props: DeleteCategoryViewProps) {
  return renderToStaticMarkup(
    createElement(AlertDialog, { open: true }, createElement(DeleteCategoryDialogBody, props)),
  );
}

describe("DeleteCategoryView", () => {
  const products = Array.from({ length: 10 }, (_, index) => ({
    id: `p-${index}`,
    slug: `product-${index}`,
    name: `Product ${index}`,
  }));
  const idle: ActionState = { status: "idle" };

  function renderDelete(category: Partial<DeleteCategoryViewProps["category"]> = {}) {
    return renderToStaticMarkup(
      createElement(DeleteCategoryView, {
        action,
        state: idle,
        pending: false,
        category: { id: mice.id, name: mice.name, productCount: 0, products: [], ...category },
      }),
    );
  }

  it("shows usage, up to 10 names, the rest as a count, and a disabled trigger with the reason", () => {
    const html = renderDelete({ productCount: 12, products });
    expect(html).toContain("Used by 12 products");
    expect(html.match(/<li>/g)).toHaveLength(10);
    expect(html).toContain("and 2 more");
    expect(html).toContain("cannot be deleted");
    expect(html).toContain('id="delete-category-refused"');
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*aria-describedby="delete-category-refused"[^>]*>Delete category<\/button>/,
    );
  });

  it("shows no count line when every product of a used category is listed", () => {
    const html = renderDelete({ productCount: 2, products: products.slice(0, 2) });
    expect(html).toContain("Used by 2 products");
    expect(html).not.toContain("more</p>");
  });

  it("offers the confirmation trigger for an empty category and explains its effect", () => {
    const html = renderDelete();
    expect(html).toContain("No products use this category.");
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("delete-category-refused");
    expect(html).toMatch(/<button[^>]*>Delete category<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Delete category<\/button>/);
  });

  it("renders the confirmation body with the category name, the hidden id and the buttons", () => {
    const html = renderDialogBody({
      action,
      state: idle,
      pending: false,
      category: { id: mice.id, name: mice.name, productCount: 0, products: [] },
    });
    expect(html).toContain("Delete category Mice?");
    expect(html).toContain("This removes the category from the store navigation.");
    expect(html).toContain(`name="id" value="${mice.id}"`);
    expect(html).toContain(">Cancel<");
    expect(html).toMatch(/<button[^>]*>Delete category<\/button>/);
    expect(html).not.toContain('role="alert"');
  });

  it("shows the server's refusal in the dialog and the pending state", () => {
    const html = renderDialogBody({
      action,
      state: { status: "error", message: "Category is still in use." },
      pending: true,
      category: { id: mice.id, name: mice.name, productCount: 0, products: [] },
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Category is still in use.");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Deleting…<\/button>/);
  });
});

describe("client wrappers", () => {
  it("render the category form in its initial state", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryForm, { action: serverAction, category: mice }),
    );
    expect(html).toContain('value="Mice"');
    expect(html).toContain(">Save changes<");
    expect(html).not.toContain('role="alert"');
  });

  it("render the delete form in its initial state", () => {
    const html = renderToStaticMarkup(
      createElement(DeleteCategoryForm, {
        action: serverAction,
        category: { id: mice.id, name: mice.name, productCount: 0, products: [] },
      }),
    );
    expect(html).toContain(">Delete category<");
  });
});
