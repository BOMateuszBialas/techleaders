import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RedirectNotice } from "./redirect-notice";
import {
  addressWithoutNotice,
  REDIRECT_NOTICE_ID,
  retireRedirectNotice,
} from "./redirect-notice-url";

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

describe("retireRedirectNotice", () => {
  function stubBrowser(href: string, notice: { setAttribute: () => void } | null) {
    const replaceState = vi.fn();
    const listeners: Array<() => void> = [];
    const document = {
      getElementById: vi.fn(() => notice),
      addEventListener: vi.fn((_type: string, listener: () => void) => listeners.push(listener)),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("window", { location: { href }, history: { state: { key: 1 }, replaceState } });
    vi.stubGlobal("document", document);
    return { replaceState, listeners, document };
  }

  it("drops the notice from the address, keeping the history state", () => {
    const { replaceState } = stubBrowser(
      "http://localhost/admin/products/p-1?notice=created",
      null,
    );
    retireRedirectNotice();
    expect(replaceState).toHaveBeenCalledWith({ key: 1 }, "", "/admin/products/p-1");
  });

  it("leaves an address without a notice alone", () => {
    const { replaceState } = stubBrowser("http://localhost/admin/products/p-1", null);
    retireRedirectNotice();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("hides the notice on the next form submit, and stops listening on cleanup", () => {
    const notice = { setAttribute: vi.fn() };
    const { listeners, document } = stubBrowser("http://localhost/admin/categories", notice);
    const cleanup = retireRedirectNotice();

    expect(document.addEventListener).toHaveBeenCalledWith("submit", listeners[0], {
      once: true,
    });
    listeners[0]?.();
    expect(document.getElementById).toHaveBeenCalledWith(REDIRECT_NOTICE_ID);
    expect(notice.setAttribute).toHaveBeenCalledWith("hidden", "");

    cleanup();
    expect(document.removeEventListener).toHaveBeenCalledWith("submit", listeners[0]);
  });

  it("does nothing on submit when the notice is already gone", () => {
    const { listeners } = stubBrowser("http://localhost/admin/categories", null);
    retireRedirectNotice();
    expect(() => listeners[0]?.()).not.toThrow();
  });
});

describe("RedirectNotice", () => {
  it("renders the notice as a status message the effect can find", () => {
    expect(
      renderToStaticMarkup(createElement(RedirectNotice, { message: "Product created." })),
    ).toBe(
      `<p id="${REDIRECT_NOTICE_ID}" role="status" class="text-sm font-medium text-success">Product created.</p>`,
    );
  });
});
