import * as React from "react";
import { cn } from "cn";

/**
 * Card (design system stage 2, batch 2; B2.25–B2.29 in .ai/design/POSTEP.md). A panel that groups
 * related content: `--card` surface, a decorative `--border` outline (in the dark theme the only
 * edge: the card is 1.08 : 1 to the page), 12 px radius and no shadow (A01, `--shadow-card: none`).
 * Padding `--space-panel` (24 px store, 16 px admin); `size="sm"` uses `--space-group-item`. The
 * title has the `h2` style; the heading level comes from the caller (an `<h1>` or `<h3>` inside).
 * The product tile in the catalog is not a Card (one `--surface-product` surface, rule 7).
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-group-item overflow-hidden rounded-card border border-border bg-card py-panel type-body text-card-foreground shadow-card has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:py-group-item data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-card *:[img:last-child]:rounded-b-card",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-panel group-data-[size=sm]/card:px-group-item has-data-[slot=card-action]:grid-cols-card-header [.border-b]:pb-panel",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-title" className={cn("type-h2", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("type-body text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-panel group-data-[size=sm]/card:px-group-item", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-border p-panel group-data-[size=sm]/card:p-group-item",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
