import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";

/**
 * Text field (design system stage 2, batch 1; B1.2, B1.4, B1.7, B1.19 in .ai/design/POSTEP.md).
 * Outline `--input` (3:1, rule 12); in focus the outline turns `--ring` plus a 2 px ring with a
 * 2 px offset; with an error it stays `--destructive`, also in focus (tokeny.md §5).
 */
const inputClassName =
  "w-full min-w-0 rounded-control border border-input bg-transparent px-3 text-(length:--field-text-size) leading-(--field-text-leading) text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        inputClassName,
        "h-control-md file:inline-flex file:h-full file:border-0 file:bg-transparent file:text-(length:--type-small-size) file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input, inputClassName };
