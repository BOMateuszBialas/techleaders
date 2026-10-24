"use client";

import * as React from "react";
import { cn } from "cn";

/**
 * Field label (design system stage 2, batch 1; B1.21 in .ai/design/POSTEP.md): always visible,
 * 14/20 px, 500 in both densities (owner decision Q3); a disabled field greys its label.
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-(length:--label-size) leading-(--label-leading) font-medium text-foreground select-none group-data-[disabled=true]:text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
