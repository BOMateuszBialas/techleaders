import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RedirectNotice } from "./redirect-notice";
import { addressWithoutNotice, dropNoticeFromAddressBar } from "./redirect-notice-url";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("addressWithoutNotice", () => {
  it("drops only the notice parameter and keeps the rest of the address", () => {
    expect(addressWithoutNotice("http://localhost:3000/admin/products/p-1?notice=created")).toBe(
      "/admin/products/p-1",
    );
    expect(addressWithoutNotice("http://localhost/admin/categories?a=1&notice=deleted#top")).toBe(
      "/admin/categories?a=1#top",
    );
  });

  it("returns null when there is no notice", () => {
    expect(addressWithoutNotice("http://localhost/admin/products/p-1?a=1")).toBeNull();
  });
});

describe("dropNoticeFromAddressBar", () => {
  function stubWindow(href: string) {
    const replaceState = vi.fn();
    vi.stubGlobal("window", { location: { href }, history: { state: { key: 1 }, replaceState } });
    return replaceState;
  }

  it("replaces the address, keeping the history state", () => {
    const replaceState = stubWindow("http://localhost/admin/products/p-1?notice=created");
    dropNoticeFromAddressBar();
    expect(replaceState).toHaveBeenCalledWith({ key: 1 }, "", "/admin/products/p-1");
  });

  it("leaves an address without a notice alone", () => {
    const replaceState = stubWindow("http://localhost/admin/products/p-1");
    dropNoticeFromAddressBar();
    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe("RedirectNotice", () => {
  it("renders the notice as a status message", () => {
    expect(
      renderToStaticMarkup(createElement(RedirectNotice, { message: "Product created." })),
    ).toBe(
      '<p role="status" class="text-sm font-medium text-emerald-700 dark:text-emerald-400">Product created.</p>',
    );
  });
});
