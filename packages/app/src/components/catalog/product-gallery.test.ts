import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as ReactModule from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  galleryImageUrls,
  nextThumbnailIndex,
  showsThumbnails,
  thumbnailLabel,
} from "./product-gallery-state";

// The gallery keeps its active thumbnail in React state. These tests call the component
// outside a renderer, so `useState` and `useRef` are replaced by plain objects, and the event
// handlers are then invoked from the element tree they return.
const hooks = vi.hoisted(() => ({
  active: 0,
  setActive: vi.fn(),
  refs: { current: [] as unknown[] },
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactModule>();
  return {
    ...actual,
    useState: () => [hooks.active, hooks.setActive],
    useRef: () => hooks.refs,
  };
});

// Imported after the mock so the component sees the replaced hooks.
const { ProductGallery } = await import("./product-gallery");

type Props = { children?: ReactNode; [key: string]: unknown };

function elements(node: ReactNode): ReactElement<Props>[] {
  if (node === null || node === undefined || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => elements(child));
  const element = node as ReactElement<Props>;
  return [element, ...elements(element.props.children)];
}

function renderGallery(imageUrls: string[]): ReactElement<Props> {
  return ProductGallery({ imageUrls, name: "Vortex Wireless Mouse" }) as ReactElement<Props>;
}

function keyEvent(key: string) {
  return { key, preventDefault: vi.fn() };
}

describe("product gallery view logic", () => {
  it("shows the product's one image, or none", () => {
    expect(galleryImageUrls("/demo/products/vortex-wireless-mouse.svg")).toEqual([
      "/demo/products/vortex-wireless-mouse.svg",
    ]);
    expect(galleryImageUrls(null)).toEqual([]);
  });

  it("shows thumbnails only from two images", () => {
    expect(showsThumbnails(0)).toBe(false);
    expect(showsThumbnails(1)).toBe(false);
    expect(showsThumbnails(2)).toBe(true);
    expect(showsThumbnails(3)).toBe(true);
  });

  it("labels each thumbnail by its position", () => {
    expect(thumbnailLabel(0, 3)).toBe("Show image 1 of 3");
    expect(thumbnailLabel(1, 3)).toBe("Show image 2 of 3");
  });

  it("moves between thumbnails with the arrow, Home and End keys, wrapping at the ends", () => {
    expect(nextThumbnailIndex(0, 3, "ArrowRight")).toBe(1);
    expect(nextThumbnailIndex(0, 3, "ArrowDown")).toBe(1);
    expect(nextThumbnailIndex(2, 3, "ArrowRight")).toBe(0);
    expect(nextThumbnailIndex(0, 3, "ArrowLeft")).toBe(2);
    expect(nextThumbnailIndex(0, 3, "ArrowUp")).toBe(2);
    expect(nextThumbnailIndex(1, 3, "ArrowLeft")).toBe(0);
    expect(nextThumbnailIndex(1, 3, "Home")).toBe(0);
    expect(nextThumbnailIndex(0, 3, "End")).toBe(2);
  });

  it("ignores other keys and an empty gallery", () => {
    expect(nextThumbnailIndex(0, 3, "a")).toBeNull();
    expect(nextThumbnailIndex(0, 3, "Enter")).toBeNull();
    expect(nextThumbnailIndex(0, 0, "ArrowRight")).toBeNull();
  });
});

describe("ProductGallery", () => {
  beforeEach(() => {
    hooks.active = 0;
    hooks.setActive.mockClear();
    hooks.refs.current = [];
  });

  it("renders the placeholder and no thumbnails without a photo", () => {
    const html = renderToStaticMarkup(
      createElement(ProductGallery, { imageUrls: [], name: "Vortex Wireless Mouse" }),
    );
    expect(html).toContain("No photo yet");
    expect(html).not.toContain('role="group"');
  });

  it("renders one image and no thumbnail row", () => {
    const html = renderToStaticMarkup(
      createElement(ProductGallery, {
        imageUrls: ["/photos/product-mouse-black.jpg"],
        name: "Vortex Wireless Mouse",
      }),
    );
    expect(html).toContain('alt="Vortex Wireless Mouse"');
    expect(html).toContain('src="/photos/product-mouse-black.jpg"');
    expect(html).not.toContain('role="group"');
  });

  it("renders a labelled thumbnail row with the active image pressed", () => {
    const html = renderToStaticMarkup(
      createElement(ProductGallery, {
        imageUrls: ["/demo/products/a.svg", "/demo/products/b.svg", "/demo/products/c.svg"],
        name: "Vortex Wireless Mouse",
      }),
    );
    expect(html).toContain('aria-label="Product images"');
    expect(html).toContain('aria-label="Show image 1 of 3"');
    expect(html).toContain('aria-label="Show image 3 of 3"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("selects a thumbnail on click and remembers it for the thumbnail refs", () => {
    const imageUrls = ["/demo/products/a.svg", "/demo/products/b.svg"];
    const tree = renderGallery(imageUrls);
    const buttons = elements(tree).filter((el) => el.type === "button");
    expect(buttons).toHaveLength(2);

    const focus = vi.fn();
    for (const button of buttons) {
      (button.props.ref as (element: unknown) => void)({ focus });
    }
    expect(hooks.refs.current).toHaveLength(2);

    (buttons[1]?.props.onClick as () => void)();
    expect(hooks.setActive).toHaveBeenCalledWith(1);
  });

  it("moves to the next thumbnail with the arrow keys and focuses it", () => {
    const imageUrls = ["/demo/products/a.svg", "/demo/products/b.svg"];
    const focus = vi.fn();
    hooks.refs.current = [{ focus: vi.fn() }, { focus }];
    const group = elements(renderGallery(imageUrls)).find((el) => el.props.role === "group");
    const onKeyDown = group?.props.onKeyDown as (event: ReturnType<typeof keyEvent>) => void;

    const event = keyEvent("ArrowRight");
    onKeyDown(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(hooks.setActive).toHaveBeenCalledWith(1);
    expect(focus).toHaveBeenCalled();
  });

  it("ignores keys that do not move the selection", () => {
    const group = elements(renderGallery(["/a.svg", "/b.svg"])).find(
      (el) => el.props.role === "group",
    );
    const onKeyDown = group?.props.onKeyDown as (event: ReturnType<typeof keyEvent>) => void;

    const event = keyEvent("Tab");
    onKeyDown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(hooks.setActive).not.toHaveBeenCalled();
  });
});
