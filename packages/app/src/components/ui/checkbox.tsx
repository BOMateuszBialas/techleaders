"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { IconCheck } from "@tabler/icons-react";
import { cn } from "cn";

/**
 * Checkbox (design system stage 2, batch 2; B2.8–B2.10 in .ai/design/POSTEP.md, owner decision
 * Q2). Base UI `Checkbox`: a `<span role="checkbox">` plus a hidden `<input>` that the form
 * submits; the `id` prop goes to that hidden input, so `<label htmlFor>` keeps working. The box
 * follows the density icon size (20 px store, 16 px admin); checked is `--primary`, never
 * `--action` (tokeny.md §7 rules 2, 4); disabled is a color, never opacity (rule 14). The
 * `after:` area keeps the target at least 24 px (WCAG 2.5.8); a horizontal `Field` makes the
 * whole row the target.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative my-(--choice-offset) inline-flex size-(--control-icon-size) shrink-0 items-center justify-center rounded-sm border border-input bg-transparent text-primary-foreground transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid not-data-checked:aria-invalid:border-destructive not-data-disabled:data-checked:border-primary not-data-disabled:data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:bg-muted data-disabled:text-muted-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex size-full items-center justify-center text-current"
      >
        <IconCheck aria-hidden="true" stroke={3} className="size-full" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
