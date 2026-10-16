"use client";

import { useEffect } from "react";
import { dropNoticeFromAddressBar } from "./redirect-notice-url";

/**
 * A fixed success notice shown after a redirect (`?notice=created`, `?notice=deleted`). Once
 * shown it drops the parameter from the address bar, so a later save or publish shows only
 * its own message (#41). It has no branches; the page renders it only when there is a notice.
 */
export function RedirectNotice({ message }: { message: string }) {
  useEffect(dropNoticeFromAddressBar, []);
  return (
    <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
      {message}
    </p>
  );
}
