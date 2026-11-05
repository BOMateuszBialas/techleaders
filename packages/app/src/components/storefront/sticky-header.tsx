"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createHeaderController, headerClassName } from "./sticky-header-state";

/**
 * The storefront header, kept at the top of the page (owner request, 2026-11-04). It slides out of
 * view while the reader scrolls down and slides back in when they scroll up. Only the connection
 * lives here; the rule is in `sticky-header-state.ts`. Its children are the server-rendered header.
 */
export function StickyHeader({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [controller] = useState(() => createHeaderController(setVisible));
  useEffect(controller.subscribe, [controller]);

  return <header className={headerClassName(visible)}>{children}</header>;
}
