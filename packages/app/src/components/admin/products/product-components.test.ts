import type { AdminProduct } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { ImagePreview, markImageFailed } from "./image-preview";
import { ImagePreviewView } from "./image-preview-view";
import { FeaturedBadge, StoreAvailabilityBadge } from "./product-badges";
import {
  featuredNote,
  productNotice,
  productPath,
  productSavedMessage,
  publishHelp,
  statusChangedMessage,
  storefrontProductHref,
} from "./product-copy";
import { ProductForm } from "./product-form";
import { ProductFormView, type ProductFormProduct } from "./product-form-view";
import { PublishControl } from "./publish-control";
import { PublishControlView } from "./publish-control-view";

const action = vi.fn();
const serverAction = vi.fn(async (state: ActionState) => state);
const categories = [
  { id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01", name: "Mice" },
  { id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d02", name: "Mousepads" },
];

const vortex: ProductFormProduct = {
  id: "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01",
  name: "Vortex Wireless Mouse",
  slug: "vortex-wireless-mouse",
  description: "[DEMO] A wireless gaming mouse.",
  priceMinor: 24990,
  currency: "PLN",
  sku: "DEMO-MOU-001",
  stockQuantity: 8,
  imageUrl: "https://images.example.com/vortex.png",
  status: "published",
  featured: true,
  categoryId: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d02",
};

const adminProduct: AdminProduct = {
  ...vortex,
  category: { id: "c-1", slug: "mice", name: "Mice" },
  availability: "available",
};

function renderForm(
  state: ActionState,
  options: { pending?: boolean; product?: ProductFormProduct } = {},
) {
  return renderToStaticMarkup(
    createElement(ProductFormView, {
      action,
      state,
      pending: options.pending ?? false,
      categories,
      product: options.product,
    }),
  );
}

describe("product copy", () => {
  it("builds admin and store paths", () => {
    expect(productPath("p-1")).toBe("/admin/products/p-1");
    expect(storefrontProductHref("vortex")).toBe("/products/vortex");
  });

  it("states the featured effect for published products, drafts and unfeatured ones", () => {
    expect(featuredNote({ featured: true, status: "published" })).toBe(
      "It is in the home page slider, which shows up to 12 featured products by name.",
    );
    expect(featuredNote({ featured: true, status: "draft" })).toBe(
      "It is featured, but it will not show in the home page slider until it is published.",
    );
    expect(featuredNote({ featured: false, status: "published" })).toBeNull();
  });

  it("describes the store effect of a save", () => {
    expect(productSavedMessage(adminProduct)).toBe(
      "Saved. Visible in the store and can be bought. It is in the home page slider, which shows up to 12 featured products by name.",
    );
    expect(
      productSavedMessage({ ...adminProduct, featured: false, availability: "out_of_stock" }),
    ).toBe("Saved. Visible in the store, shown as out of stock.");
  });

  it("describes publish and unpublish", () => {
    expect(statusChangedMessage(adminProduct)).toBe(
      "Published. Visible in the store and can be bought. Shoppers find it at /products/vortex-wireless-mouse.",
    );
    expect(statusChangedMessage({ ...adminProduct, status: "draft", availability: "hidden" })).toBe(
      "Unpublished. Hidden: shoppers cannot see or buy it. Existing orders are not affected.",
    );
    expect(publishHelp({ slug: "vortex", stockQuantity: 3 })).toBe(
      "Publish: shoppers will see it at /products/vortex.",
    );
    expect(publishHelp({ slug: "titan", stockQuantity: 0 })).toBe(
      "Publish: shoppers will see it at /products/titan and it will show as out of stock.",
    );
  });

  it("maps only known notices", () => {
    expect(productNotice("created")).toBe("Product created.");
    expect(productNotice("deleted")).toBeNull();
    expect(productNotice(["created"])).toBeNull();
    expect(productNotice(undefined)).toBeNull();
  });
});

describe("product badges", () => {
  it.each([
    ["available", "Available"],
    ["out_of_stock", "Out of stock"],
    ["hidden", "Hidden"],
  ] as const)("labels %s as %s", (availability, label) => {
    const html = renderToStaticMarkup(createElement(StoreAvailabilityBadge, { availability }));
    expect(html).toContain(`>${label}<`);
  });

  it("labels featured products", () => {
    expect(renderToStaticMarkup(createElement(FeaturedBadge))).toContain(">Featured<");
  });
});

describe("ProductFormView", () => {
  it("renders an empty create form with status and initial stock when idle", () => {
    const html = renderForm(IDLE_ACTION_STATE);
    expect(html).not.toContain('name="id"');
    expect(html).toContain("Price (PLN)");
    expect(html).toContain('name="status"');
    expect(html).toMatch(/<option value="draft" selected="">/);
    expect(html).toMatch(/name="stockQuantity"[^>]*value="0"/);
    expect(html).toContain('<option value="" selected="">No category</option>');
    expect(html).toContain(">Mousepads</option>");
    expect(html).toContain("Featured on home page");
    expect(html).toContain("Shown in the home page slider when the product is published.");
    expect(html).not.toMatch(/name="featured"[^>]*checked/);
    expect(html).not.toContain("old links stop working");
    expect(html).not.toContain("<img");
    expect(html).toContain(">Create product<");
    expect(html).not.toContain("role=");
  });

  it("shows an error under the Featured checkbox", () => {
    const html = renderForm({
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { featured: ["Invalid input"] },
      values: { featured: "yes" },
    });
    expect(html).toMatch(/id="product-featured"[^>]*aria-invalid="true"/);
    expect(html).toContain('aria-describedby="product-featured-hint product-featured-error"');
    expect(html).toContain('id="product-featured-error"');
  });

  it("disables the button while pending", () => {
    expect(renderForm(IDLE_ACTION_STATE, { pending: true })).toMatch(
      /<button[^>]*disabled=""[^>]*>Saving…<\/button>/,
    );
  });

  it("keeps the typed values, including Featured and the status, after a failed create", () => {
    const html = renderForm({
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: {
        sku: ["This SKU is already used by another product."],
        stockQuantity: ["Enter a whole number from 0 to 1,000,000."],
      },
      values: {
        name: "Phantom",
        slug: "phantom",
        description: "Typed",
        price: "19,90",
        sku: "demo-mou-001",
        categoryId: categories[0]?.id ?? "",
        imageUrl: "",
        featured: "on",
        status: "published",
        stockQuantity: "-1",
      },
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain("This SKU is already used by another product.");
    expect(html).toContain('value="demo-mou-001"');
    expect(html).toContain('value="19,90"');
    expect(html).toMatch(/<option value="published" selected="">/);
    expect(html).toMatch(/<option value="[^"]+2d01" selected="">Mice/);
    expect(html).toMatch(/name="featured"[^>]*checked=""/);
    expect(html).toMatch(/id="product-sku"[^>]*aria-invalid="true"/);
    expect(html).toContain('aria-describedby="product-sku-hint product-sku-error"');
    expect(html).toContain('aria-describedby="product-stock-hint product-stock-error"');
  });

  it("edits a published product: stored values, read-only stock, the slug warning and the preview", () => {
    const html = renderForm(
      { status: "success", message: "Saved. Visible in the store and can be bought." },
      { product: vortex },
    );
    expect(html).toContain(`name="id" value="${vortex.id}"`);
    expect(html).toContain('value="249.90"');
    expect(html).toContain('value="DEMO-MOU-001"');
    expect(html).toMatch(/<option value="[^"]+2d02" selected="">Mousepads/);
    expect(html).toMatch(/name="featured"[^>]*checked=""/);
    expect(html).toContain("Stock: 8");
    expect(html).toContain("Stock is set when the product is created.");
    expect(html).not.toContain('name="stockQuantity"');
    expect(html).not.toContain('name="status"');
    expect(html).toContain("Changing the slug changes the store URL; old links stop working.");
    expect(html).toContain('src="https://images.example.com/vortex.png"');
    expect(html).toContain('role="status"');
    expect(html).toContain(">Save changes<");
  });

  it("edits a draft without category, SKU or image: no warning, no preview", () => {
    const html = renderForm(IDLE_ACTION_STATE, {
      product: {
        ...vortex,
        status: "draft",
        featured: false,
        sku: null,
        imageUrl: null,
        categoryId: null,
      },
    });
    expect(html).not.toContain("old links stop working");
    expect(html).toContain('aria-describedby="product-slug-hint"');
    expect(html).toContain('<option value="" selected="">No category</option>');
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/name="featured"[^>]*checked/);
    expect(html).toContain("Price (PLN)");
  });
});

describe("ImagePreviewView", () => {
  it("shows a remote image without a referrer, lazily, with its size and the name as alt", () => {
    const html = renderToStaticMarkup(
      createElement(ImagePreviewView, {
        url: "https://images.example.com/x.png",
        name: "Phantom",
        failed: false,
        onError: vi.fn(),
      }),
    );
    expect(html).toMatch(/<img[^>]*referrerPolicy="no-referrer"/i);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('width="96"');
    expect(html).toContain('alt="Phantom"');
  });

  it("shows a local demo image through next/image", () => {
    const html = renderToStaticMarkup(
      createElement(ImagePreviewView, {
        url: "/demo/products/vortex-wireless-mouse.svg",
        name: "Vortex",
        failed: false,
        onError: vi.fn(),
      }),
    );
    expect(html).toContain('src="/demo/products/vortex-wireless-mouse.svg"');
    expect(html).not.toContain("no-referrer");
  });

  it("says when the image could not be loaded", () => {
    const html = renderToStaticMarkup(
      createElement(ImagePreviewView, {
        url: "https://x.test/a.png",
        name: "X",
        failed: true,
        onError: vi.fn(),
      }),
    );
    expect(html).toContain("Image could not be loaded.");
    expect(html).not.toContain("<img");
  });

  it("stays failed once an image failed to load", () => {
    expect(markImageFailed()).toBe(true);
  });
});

describe("PublishControlView", () => {
  const draft = { id: vortex.id, slug: "vortex", status: "draft" as const, stockQuantity: 0 };

  it("publishes a draft and says what shoppers will see before the click", () => {
    const html = renderToStaticMarkup(
      createElement(PublishControlView, {
        action,
        state: IDLE_ACTION_STATE,
        pending: false,
        product: draft,
      }),
    );
    expect(html).toContain('name="status" value="published"');
    expect(html).toContain(
      "Publish: shoppers will see it at /products/vortex and it will show as out of stock.",
    );
    expect(html).toMatch(/aria-describedby="publish-help"[^>]*>Publish<\/button>/);
  });

  it("unpublishes a published product, with the pending state and the result", () => {
    const html = renderToStaticMarkup(
      createElement(PublishControlView, {
        action,
        state: { status: "success", message: "Published." },
        pending: true,
        product: { ...draft, status: "published" },
      }),
    );
    expect(html).toContain('name="status" value="draft"');
    expect(html).toContain("Unpublish: shoppers will no longer see or buy it.");
    expect(html).toContain('role="status"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Unpublishing…<\/button>/);
  });
});

describe("client wrappers", () => {
  it("render the product form in its initial state", () => {
    const html = renderToStaticMarkup(
      createElement(ProductForm, { action: serverAction, categories, product: vortex }),
    );
    expect(html).toContain('value="Vortex Wireless Mouse"');
    expect(html).toContain(">Save changes<");
  });

  it("render the publish control in its initial state", () => {
    const html = renderToStaticMarkup(
      createElement(PublishControl, {
        action: serverAction,
        product: { id: vortex.id, slug: vortex.slug, status: "published", stockQuantity: 8 },
      }),
    );
    expect(html).toContain(">Unpublish<");
  });

  it("render the image preview before any load error", () => {
    const html = renderToStaticMarkup(
      createElement(ImagePreview, { url: "https://x.test/a.png", name: "X" }),
    );
    expect(html).toContain('src="https://x.test/a.png"');
  });
});
