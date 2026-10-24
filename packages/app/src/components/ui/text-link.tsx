import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/**
 * Text link (design system stage 2, batch 1; B1.18 in .ai/design/POSTEP.md): navigation, never
 * an action (an action that looks like a link is `<Button variant="link">`). Color `--link` (P1,
 * R04.2). `inline` and `standalone` are always underlined, so color is never the only signal
 * (WCAG 1.4.1); `standalone` also gets a 24 px target (WCAG 2.5.8, tokeny.md §7 rule 16).
 */
const textLinkVariants = cva(
  "text-link underline-offset-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
  {
    variants: {
      variant: {
        inline: "underline hover:decoration-2",
        standalone: "inline-flex min-h-6 w-fit items-center underline hover:decoration-2",
        resource: "font-medium no-underline hover:underline focus-visible:underline",
      },
    },
    defaultVariants: { variant: "inline" },
  },
);

function TextLink({
  className,
  variant = "inline",
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof textLinkVariants>) {
  return (
    <Link
      data-slot="text-link"
      className={cn(textLinkVariants({ variant, className }))}
      {...props}
    />
  );
}

export { TextLink, textLinkVariants };
