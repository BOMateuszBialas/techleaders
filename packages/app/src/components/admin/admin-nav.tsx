import Link from "next/link";
import { Suspense } from "react";
import { ADMIN_NAV_CLASS, ADMIN_NAV_ITEMS, ADMIN_NAV_LINK_CLASS } from "./admin-nav-classes";
import { AdminNavCurrent } from "./admin-nav-current";

/**
 * The admin navigation in the sidebar (`aria-label="Admin"`, e2e selector). It wraps on a phone:
 * six links do not fit one 390 px row (#56). The current page is marked (`aria-current`) by the
 * client list; until it hydrates, and in the static prerender, the same links render without the
 * mark (cache components: `usePathname` needs a Suspense boundary).
 */
export function AdminNav() {
  return (
    <Suspense fallback={<AdminNavFallback />}>
      <AdminNavCurrent />
    </Suspense>
  );
}

/** The same links without the current-page mark: the static prerender and the first paint. */
export function AdminNavFallback() {
  return (
    <nav aria-label="Admin" className={ADMIN_NAV_CLASS}>
      {ADMIN_NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={ADMIN_NAV_LINK_CLASS}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
