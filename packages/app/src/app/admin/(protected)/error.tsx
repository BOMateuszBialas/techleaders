"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

/**
 * Error boundary for every signed-in admin page (spec UI/UX "States"). The message is
 * generic on purpose: the error's details stay in the server logs. `retry` re-fetches and
 * re-renders the segment. The shape is the design system's `ErrorState` (`role="alert"`).
 */
export default function AdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorState
      className="max-w-xl"
      title={<h1 className="type-h1">Something went wrong</h1>}
      description="This page could not be loaded. Try again; if it keeps failing, check the server logs."
      action={
        <Button type="button" onClick={retry}>
          Try again
        </Button>
      }
    />
  );
}
