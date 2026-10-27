import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StorefrontErrorView } from "./storefront-error-view";
import {
  STOREFRONT_ERROR_BROWSE_LABEL,
  STOREFRONT_ERROR_DESCRIPTION,
  STOREFRONT_ERROR_RETRY_LABEL,
  STOREFRONT_ERROR_TITLE,
} from "./storefront-copy";

/** Every element in a returned tree, reached through props (the view's components are not run). */
function elementsIn(node: ReactNode, found: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) {
    for (const child of node) elementsIn(child, found);
  } else if (isValidElement(node)) {
    found.push(node);
    for (const value of Object.values(node.props as Record<string, unknown>)) {
      if (isValidElement(value) || Array.isArray(value)) elementsIn(value as ReactNode, found);
    }
  }
  return found;
}

describe("StorefrontErrorView", () => {
  it("renders the title as the only h1, the description and the catalog link", () => {
    const html = renderToStaticMarkup(createElement(StorefrontErrorView, { onRetry: vi.fn() }));

    expect(html).toContain(STOREFRONT_ERROR_TITLE);
    expect(html).toContain(STOREFRONT_ERROR_DESCRIPTION);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('role="alert"');
    expect(html).toContain(`href="/products"`);
    expect(html).toContain(STOREFRONT_ERROR_BROWSE_LABEL);
  });

  it("shows the retry button only when a retry is given", () => {
    const withRetry = renderToStaticMarkup(
      createElement(StorefrontErrorView, { onRetry: vi.fn() }),
    );
    const withoutRetry = renderToStaticMarkup(createElement(StorefrontErrorView, {}));

    expect(withRetry).toContain(`>${STOREFRONT_ERROR_RETRY_LABEL}</button>`);
    expect(withoutRetry).not.toContain("<button");
    expect(withoutRetry).toContain(STOREFRONT_ERROR_BROWSE_LABEL);
  });

  it("passes the retry handler to the button unchanged", () => {
    const onRetry = vi.fn();
    const handlers = elementsIn(StorefrontErrorView({ onRetry }))
      .map((el) => (el.props as { onClick?: unknown }).onClick)
      .filter((handler) => handler !== undefined);

    expect(handlers).toEqual([onRetry]);
  });

  it("shows no server error text, stack or digest", () => {
    const html = renderToStaticMarkup(createElement(StorefrontErrorView, { onRetry: vi.fn() }));

    expect(html).not.toMatch(/digest|stack|Error:|at \w+ \(/i);
  });
});
