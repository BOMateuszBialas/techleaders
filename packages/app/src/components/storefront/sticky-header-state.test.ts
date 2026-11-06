import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHeaderController,
  headerClassName,
  nextVisibility,
  REVEAL_AT_TOP_PX,
  SCROLL_TOLERANCE_PX,
} from "./sticky-header-state";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("nextVisibility", () => {
  it("hides the header when the reader scrolls down past the tolerance", () => {
    expect(nextVisibility(300, 300 + SCROLL_TOLERANCE_PX + 1, true)).toBe(false);
  });

  it("shows the header when the reader scrolls back up past the tolerance", () => {
    expect(nextVisibility(600, 600 - SCROLL_TOLERANCE_PX - 1, false)).toBe(true);
  });

  it("keeps the header as it is for a small movement", () => {
    expect(nextVisibility(300, 303, true)).toBe(true);
    expect(nextVisibility(300, 303, false)).toBe(false);
  });

  it("always shows the header near the top of the page", () => {
    expect(nextVisibility(REVEAL_AT_TOP_PX + 50, REVEAL_AT_TOP_PX, false)).toBe(true);
    expect(nextVisibility(0, 0, false)).toBe(true);
  });
});

describe("createHeaderController", () => {
  it("publishes the visibility for the window's scroll position", () => {
    const setVisible = vi.fn();
    const controller = createHeaderController(setVisible);

    vi.stubGlobal("scrollY", 400);
    controller.update();
    expect(setVisible).toHaveBeenLastCalledWith(false);

    vi.stubGlobal("scrollY", 200);
    controller.update();
    expect(setVisible).toHaveBeenLastCalledWith(true);
  });

  it("listens to scrolling, and stops listening on cleanup", () => {
    const add = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal("addEventListener", add);
    vi.stubGlobal("removeEventListener", remove);
    const controller = createHeaderController(vi.fn());

    const cleanup = controller.subscribe();
    expect(add).toHaveBeenCalledWith("scroll", controller.update, { passive: true });

    cleanup();
    expect(remove).toHaveBeenCalledWith("scroll", controller.update);
  });
});

describe("headerClassName", () => {
  it("slides the header out of view when it is hidden, and keeps it pinned when shown", () => {
    expect(headerClassName(true)).toContain("sticky top-0");
    expect(headerClassName(true)).not.toContain("-translate-y-full");
    expect(headerClassName(false)).toContain("sticky top-0");
    expect(headerClassName(false)).toContain("-translate-y-full");
  });

  it("paints the header as the dark store frame in both themes (owner decision 2026-11-06)", () => {
    expect(headerClassName(true)).toContain("storefront-frame");
    expect(headerClassName(true)).toContain("bg-frame");
    expect(headerClassName(true)).not.toContain("bg-background");
  });
});
