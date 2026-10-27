"use client";

import { ADMIN_NAV_CLASS, ADMIN_NAV_ITEMS } from "./admin-nav-classes";
import { AdminNavLink } from "./admin-nav-link";

/**
 * The admin navigation with the current page marked. It reads the pathname, so it renders inside
 * a Suspense boundary in `AdminNav` (cache components: the layout prerenders with the fallback).
 */
export function AdminNavCurrent() {
  return (
    <nav aria-label="Admin" className={ADMIN_NAV_CLASS}>
      {ADMIN_NAV_ITEMS.map((item) => (
        <AdminNavLink key={item.href} href={item.href} exact={item.exact}>
          {item.label}
        </AdminNavLink>
      ))}
    </nav>
  );
}
