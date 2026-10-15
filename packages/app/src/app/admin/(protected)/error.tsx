"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for every signed-in admin page (spec UI/UX "States"). The message is
 * generic on purpose: the error's details stay in the server logs. `retry` re-fetches and
 * re-renders the segment.
 */
export default function AdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div role="alert" className="flex max-w-xl flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        This page could not be loaded. Try again; if it keeps failing, check the server logs.
      </p>
      <div>
        <Button type="button" onClick={retry}>
          Try again
        </Button>
      </div>
    </div>
  );
}
