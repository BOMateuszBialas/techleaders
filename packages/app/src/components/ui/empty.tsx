import * as React from "react";
import { cn } from "cn";

/**
 * Empty state (design system stage 2, batch 3; B3.20–B3.23 in .ai/design/POSTEP.md). Why a place
 * is empty and the next step. Aligned to the start like the screens (not centered), on `--muted`
 * with the card radius and no outline. The title has the `h3` style; the heading level comes from
 * the caller. No `EmptyMedia` (owner decision: no decorative icon on a colored square, audit) and
 * no variants: "no results for the filters" and "nothing here yet" differ in their words and
 * action. No role: the content is static. The action is a `Button` (`default` or `outline`, never
 * `action`: red is 2.98 : 1 on `--muted` in the dark theme) or a `TextLink`.
 */
function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex w-full min-w-0 flex-col items-start gap-group-item rounded-card bg-muted p-panel text-left type-body text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex max-w-measure flex-col gap-related", className)}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-title" className={cn("type-h3", className)} {...props} />;
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn("flex flex-wrap items-center gap-related", className)}
      {...props}
    />
  );
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent };
