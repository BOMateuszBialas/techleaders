import * as React from "react";
import { cn } from "cn";
import { inputClassName } from "./input";

/**
 * Multi-line field (design system stage 2, batch 1; B1.20 in .ai/design/POSTEP.md): the same
 * outline, focus, error and disabled states as `Input`, about three lines high, growing with its
 * content where `field-sizing` is supported.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(inputClassName, "flex field-sizing-content min-h-24 resize-y py-2", className)}
      {...props}
    />
  );
}

export { Textarea };
