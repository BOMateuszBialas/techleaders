import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/**
 * Badge (design system stage 2, batch 2; B2.14–B2.17 in .ai/design/POSTEP.md). A status in words:
 * 4 px radius (P4), the `small` text style (14 px store, 12 px admin), 2 px from the text to
 * the edge, 1 px border plus 1 px padding (the one exception to the 4 px grid, tokeny.md §3), so
 * 24 px tall in the store and 20 px in the admin. Not interactive: no hover and no invalid state
 * (R04.2); a link is a `TextLink`. A status is never color alone (tokeny.md §7 rule 10); demo data
 * is always `demo`, never `warning` (rule 11). `ghost` is deprecated (the retrofit maps "Hidden"
 * to `outline`); the base `link` variant is removed (B2.16).
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-badge border border-transparent px-2 py-px type-small whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid [&>svg]:pointer-events-none [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success: "bg-success-surface text-success",
        warning: "bg-warning-surface text-warning",
        destructive: "bg-destructive-surface text-destructive",
        demo: "bg-demo-surface text-demo",
        ghost: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
