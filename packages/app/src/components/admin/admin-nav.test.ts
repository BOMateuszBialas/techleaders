import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminNav, AdminNavFallback } from "./admin-nav";

const nav = vi.hoisted(() => ({ pathname: "/admin" as string | null }));

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

beforeEach(() => {
  nav.pathname = "/admin";
});

describe("AdminNav", () => {
  it("lists the six sections under the Admin label, in order", () => {
    const html = renderToStaticMarkup(createElement(AdminNav));
    expect(html).toContain('aria-label="Admin"');
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
    expect(hrefs).toEqual([
      "/admin",
      "/admin/orders",
      "/admin/products",
      "/admin/categories",
      "/admin/copilot",
      "/",
    ]);
  });

  it("marks only the dashboard as current on the dashboard", () => {
    const html = renderToStaticMarkup(createElement(AdminNav));
    expect(currentHref(html)).toEqual(["/admin"]);
  });

  it("marks the section of a nested page as current", () => {
    nav.pathname = "/admin/categories/cat-1";
    const html = renderToStaticMarkup(createElement(AdminNav));
    expect(currentHref(html)).toEqual(["/admin/categories"]);
  });
});

describe("AdminNavFallback", () => {
  it("renders the same six links without a current-page mark", () => {
    nav.pathname = "/admin/orders";
    const html = renderToStaticMarkup(createElement(AdminNavFallback));
    expect(html).toContain('aria-label="Admin"');
    expect(html).not.toContain("aria-current");
    expect(html.match(/<a\b/g)).toHaveLength(6);
    expect(html).toContain(">View storefront<");
  });
});

/** The `href` of every anchor that carries `aria-current="page"`. */
function currentHref(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((anchor) => anchor.includes('aria-current="page"'))
    .map((anchor) => anchor.replace(/^.*href="([^"]*)".*$/s, "$1"));
}
