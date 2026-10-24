"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for the account pages (E07 spec A24, UI/UX): a failed session read is not "no
 * session", so the guard lets it propagate and the page lands here. The message is generic on
 * purpose: the error's details stay in the server logs. `retry` re-fetches the segment.
 */
export default function AccountError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div role="alert" className="flex max-w-xl flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Your account is unavailable</h1>
      <p className="text-sm text-muted-foreground">
        Your account could not be loaded right now. Try again in a moment.
      </p>
      <div>
        <Button type="button" onClick={retry}>
          Try again
        </Button>
      </div>
    </div>
  );
}
