"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "cn";

/**
 * Radio group (design system stage 2, batch 2; B2.12–B2.13 in .ai/design/POSTEP.md, owner
 * decisions Q2, Q3). Base UI `RadioGroup`: one Tab stop, arrow keys move the choice, one hidden
 * input carries the `name`. Each option is a horizontal `Field` with a `FieldLabel`; the group is
 * named by `aria-labelledby` (a `FieldLegend` id) or `aria-label`.
 */
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex w-full flex-col gap-related", className)}
      {...props}
    />
  );
}

/**
 * One option: same size, outline and states as the checkbox (B2.9–B2.10). The circle is the
 * convention of a radio, the one shape exception to P4 (B2.12).
 */
function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "peer relative my-(--choice-offset) inline-flex size-(--control-icon-size) shrink-0 items-center justify-center rounded-full border border-input bg-transparent transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid not-data-checked:aria-invalid:border-destructive not-data-disabled:data-checked:border-primary not-data-disabled:data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:bg-muted",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator data-slot="radio-group-indicator" className="flex">
        <span className="size-2 rounded-full bg-primary-foreground in-data-disabled:bg-muted-foreground" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
