"use client";

import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { REDIRECT_NOTICE_ID, retireRedirectNotice } from "./redirect-notice-url";

/**
 * A fixed success notice shown after a redirect (`?notice=created`, `?notice=deleted`). Once
 * shown it retires itself (`retireRedirectNotice`): the parameter leaves the address bar and
 * the next form submit hides it, so a later save or publish shows only its own message (#41).
 * It is the DS `Alert` in the `success` variant with `role="status"` (B2.20). It has no branches;
 * the page renders it only when there is a notice.
 */
export function RedirectNotice({ message }: { message: string }) {
  useEffect(retireRedirectNotice, []);
  return (
    <Alert id={REDIRECT_NOTICE_ID} variant="success" role="status">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
