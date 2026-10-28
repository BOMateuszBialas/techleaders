"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ADMIN_NAV_LINK_CLASS } from "./admin-nav-classes";

/**
 * Whether `href` is the current admin page. `exact` matches the address only: the dashboard
 * (`/admin`) would otherwise match every admin page. Other links match their own page and the
 * pages under it. Trailing slashes are not normalised here: Next.js serves one form only.
 */
export function isCurrentAdminRoute(
  pathname: string | null,
  href: string,
  exact: boolean = false,
): boolean {
  if (pathname === null) return false;
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * A link in the admin navigation with `aria-current="page"` on the current page (spec phase 1,
 * Q1). A client component because the admin layout is static (cache components): only this
 * link reads the pathname. The 3 px `--sidebar-primary` bar is the active marker; it is a
 * decorative span, so the state is also carried by `aria-current` and the accent background.
 */
export function AdminNavLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  exact?: boolean;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const current = isCurrentAdminRoute(pathname, href, exact);
  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={ADMIN_NAV_LINK_CLASS}>
      {current ? (
        <span
          aria-hidden="true"
          data-slot="admin-nav-marker"
          className="absolute inset-y-1 left-0 w-0.75 rounded-full bg-sidebar-primary"
        />
      ) : null}
      {children}
    </Link>
  );
}
