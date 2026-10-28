"use client";

import { StorefrontErrorView } from "@/components/storefront/storefront-error-view";

/**
 * Error boundary for the storefront (retrofit checkout Phase 4, C10, OA-6). It renders inside the
 * storefront layout, so the header and footer stay visible. `reset` clears the error and re-renders
 * the segment. The message is generic: the error's details stay out of the page.
 */
export default function StorefrontError({ reset }: { reset: () => void }) {
  return <StorefrontErrorView onRetry={reset} />;
}
