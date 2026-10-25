import * as React from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "cn";

/**
 * Disclosure (design system stage 2, batch 3; B3.26–B3.28 in .ai/design/POSTEP.md): extra content
 * that opens in place. Native `<details>` / `<summary>` (owner decision Q5): it works without
 * JavaScript and the browser gives the button role, the expanded state and the keyboard. The
 * trigger has the `body` text at 500, no browser marker, a chevron in `--muted-foreground` that
 * turns 180° (`--duration-base`), an underline on hover and the 2 px focus outline. No height
 * animation. A button-shaped trigger (the store menu) adds `buttonVariants({ variant: "outline" })`
 * through `className`. Never hide information needed for a decision (a price, an error) in it.
 */
function Disclosure({ className, ...props }: React.ComponentProps<"details">) {
  return (
    <details
      data-slot="disclosure"
      className={cn("group/disclosure type-body text-foreground", className)}
      {...props}
    />
  );
}

function DisclosureTrigger({ className, children, ...props }: React.ComponentProps<"summary">) {
  return (
    <summary
      data-slot="disclosure-trigger"
      className={cn(
        "inline-flex min-h-control-sm cursor-pointer list-none items-center gap-related font-medium underline-offset-4 outline-none select-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid [&::-webkit-details-marker]:hidden",
        className,
      )}
      {...props}
    >
      {children}
      <IconChevronDown
        aria-hidden="true"
        className="size-(--control-icon-size) shrink-0 text-muted-foreground transition-transform duration-(--duration-base) group-open/disclosure:rotate-180"
      />
    </summary>
  );
}

function DisclosureContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="disclosure-content" className={cn("mt-related", className)} {...props} />;
}

export { Disclosure, DisclosureTrigger, DisclosureContent };
