/**
 * The admin navigation items and classes, shared by the static fallback and the client nav. A
 * plain module (no directive): constants exported from a `"use client"` file cannot be read as
 * values by a Server Component.
 */
export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders", exact: false },
  { href: "/admin/products", label: "Products", exact: false },
  { href: "/admin/categories", label: "Categories", exact: false },
  { href: "/admin/copilot", label: "Copilot", exact: false },
  { href: "/", label: "View storefront", exact: false },
] as const;

export const ADMIN_NAV_CLASS = "flex flex-wrap gap-1 px-2 pb-2 text-sm md:flex-col";

export const ADMIN_NAV_LINK_CLASS =
  "relative rounded-md px-2 py-1.5 text-sidebar-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring focus-visible:outline-solid";
