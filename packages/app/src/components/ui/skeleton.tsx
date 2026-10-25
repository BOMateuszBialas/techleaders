import * as React from "react";
import { cn } from "cn";

/**
 * Skeleton (design system stage 2, batch 3; B3.16–B3.19 in .ai/design/POSTEP.md). The shape of
 * what is loading, in `--muted` with the control radius (`rounded-card` for cards and tiles). The
 * pulse is the one allowed loop (tokeny.md §5); reduced motion stops it in globals.css. No size
 * variants: the size comes from what it replaces (`h-control-md`, `h-lh`, `aspect-square`).
 * A skeleton is hidden from screen readers; `SkeletonGroup` (owner decision Q3) names the loading
 * state once with `role="status"` and a hidden `label` ("Loading products…").
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      // The default radius has zero specificity (`:where`), so a caller's `rounded-card` wins:
      // `cn` does not merge the project's token classes (`rounded-control` vs `rounded-card`).
      className={cn("animate-pulse bg-muted [:where(&)]:rounded-control", className)}
      {...props}
    />
  );
}

function SkeletonGroup({
  className,
  label,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "role"> & { label: string }) {
  return (
    <div data-slot="skeleton-group" role="status" className={className} {...props}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export { Skeleton, SkeletonGroup };
