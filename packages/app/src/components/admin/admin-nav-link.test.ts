import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminNavLink, isCurrentAdminRoute } from "./admin-nav-link";

const nav = vi.hoisted(() => ({ pathname: "/admin" as string | null }));

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

beforeEach(() => {
  nav.pathname = "/admin";
});

describe("isCurrentAdminRoute", () => {
  it("is never current without a pathname", () => {
    expect(isCurrentAdminRoute(null, "/admin/orders")).toBe(false);
    expect(isCurrentAdminRoute(null, "/admin", true)).toBe(false);
  });

  it("matches the dashboard only at its own address when exact", () => {
    expect(isCurrentAdminRoute("/admin", "/admin", true)).toBe(true);
    expect(isCurrentAdminRoute("/admin/orders", "/admin", true)).toBe(false);
  });

  it("matches a section on its own page and on the pages under it", () => {
    expect(isCurrentAdminRoute("/admin/orders", "/admin/orders")).toBe(true);
    expect(isCurrentAdminRoute("/admin/orders/ord-1", "/admin/orders")).toBe(true);
    expect(isCurrentAdminRoute("/admin/products", "/admin/orders")).toBe(false);
  });

  it("does not match a section whose name only starts the same way", () => {
    expect(isCurrentAdminRoute("/admin/ordersx", "/admin/orders")).toBe(false);
  });

  it("is not current on an admin page for the storefront link", () => {
    expect(isCurrentAdminRoute("/admin/orders", "/")).toBe(false);
    expect(isCurrentAdminRoute("/", "/")).toBe(true);
  });
});

describe("AdminNavLink", () => {
  it("marks the current page with aria-current and a decorative marker", () => {
    nav.pathname = "/admin/orders/ord-1";
    const html = renderToStaticMarkup(
      createElement(AdminNavLink, { href: "/admin/orders" }, "Orders"),
    );
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('data-slot="admin-nav-marker"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("bg-sidebar-primary");
    expect(html).toContain(">Orders<");
  });

  it("renders a plain link when another page is current", () => {
    nav.pathname = "/admin/products";
    const html = renderToStaticMarkup(
      createElement(AdminNavLink, { href: "/admin/orders" }, "Orders"),
    );
    expect(html).not.toContain("aria-current");
    expect(html).not.toContain("admin-nav-marker");
    expect(html).toContain('href="/admin/orders"');
  });

  it("uses exact matching for the dashboard", () => {
    nav.pathname = "/admin/orders";
    const html = renderToStaticMarkup(
      createElement(AdminNavLink, { href: "/admin", exact: true }, "Dashboard"),
    );
    expect(html).not.toContain("aria-current");
  });
});
