import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/**
 * Button (design system stage 2, batch 1; decisions B1.2–B1.17 in .ai/design/POSTEP.md).
 * Heights, padding, text and icon sizes come from the density tokens (`--control-*`), states are
 * colors and never opacity (tokeny.md §7 rule 14), and the focus ring is a 2 px outline with a
 * 2 px offset (tokeny.md §5). `disabled` is styled through Base UI's `data-disabled`, which is set
 * with `focusableWhenDisabled` too; `aria-busy` (loading) keeps the variant's colors.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:not-aria-[haspopup]:not-data-disabled:translate-y-px aria-busy:cursor-progress aria-invalid:border-destructive data-disabled:cursor-not-allowed not-aria-busy:data-disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-(--control-icon-size)",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground not-data-disabled:hover:bg-primary-hover aria-expanded:bg-primary-hover not-aria-busy:data-disabled:bg-muted",
        action:
          "bg-action text-action-foreground not-data-disabled:hover:bg-action-hover not-data-disabled:active:bg-action-hover not-aria-busy:data-disabled:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground not-data-disabled:hover:bg-secondary-hover aria-expanded:bg-secondary-hover not-aria-busy:data-disabled:bg-muted",
        outline:
          "border-input bg-background text-foreground not-data-disabled:hover:bg-accent not-data-disabled:hover:text-accent-foreground aria-expanded:bg-accent not-aria-busy:data-disabled:border-transparent not-aria-busy:data-disabled:bg-muted",
        ghost:
          "text-foreground not-data-disabled:hover:bg-accent not-data-disabled:hover:text-accent-foreground aria-expanded:bg-accent",
        destructive:
          "border-destructive bg-background text-destructive not-data-disabled:hover:bg-destructive-surface not-aria-busy:data-disabled:border-transparent not-aria-busy:data-disabled:bg-muted",
        link: "text-link underline underline-offset-4 not-data-disabled:hover:decoration-2",
      },
      size: {
        default:
          "h-control-md px-(--control-px) text-(length:--type-body-size) has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        sm: "h-control-sm px-3 text-(length:--type-small-size) [&_svg:not([class*='size-'])]:size-4",
        lg: "h-control-lg px-(--control-px) text-(length:--type-body-size) has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-control-md",
        "icon-sm": "size-control-sm [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-control-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
