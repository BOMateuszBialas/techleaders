import type { AnchorHTMLAttributes } from "react";

/**
 * Prototype stand-in for `next/link`. The app's components import `next/link`; this prototype
 * has no Next.js runtime, so a link is a plain anchor. Routes are hash links (`#s05`).
 */
export default function Link({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={href} {...props} />;
}
