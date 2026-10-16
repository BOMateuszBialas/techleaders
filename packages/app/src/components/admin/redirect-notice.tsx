"use client";

import { useEffect } from "react";
import { REDIRECT_NOTICE_ID, retireRedirectNotice } from "./redirect-notice-url";

/**
 * A fixed success notice shown after a redirect (`?notice=created`, `?notice=deleted`). Once
 * shown it retires itself (`retireRedirectNotice`): the parameter leaves the address bar and
 * the next form submit hides it, so a later save or publish shows only its own message (#41).
 * It has no branches; the page renders it only when there is a notice.
 */
export function RedirectNotice({ message }: { message: string }) {
  useEffect(retireRedirectNotice, []);
  return (
    <p
      id={REDIRECT_NOTICE_ID}
      role="status"
      className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
    >
      {message}
    </p>
  );
}
