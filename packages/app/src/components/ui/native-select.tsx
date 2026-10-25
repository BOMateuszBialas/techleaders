import * as React from "react";
import { IconSelector } from "@tabler/icons-react";
import { cn } from "cn";

/**
 * Select (design system stage 2, batch 2; B2.4–B2.7 in .ai/design/POSTEP.md, owner decision Q1).
 * The shadcn `base-nova` `native-select`: a real `<select>`, so a phone shows the system list,
 * forms submit it without JavaScript and the role and state come from the browser. Same shape,
 * density and states as `Input`; one size (the base `sm` is removed, B2.5). The option list takes
 * its colors from `color-scheme`, which the theme sets on `<html>` (B2.7).
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div
      className={cn("group/native-select relative w-full", className)}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        className="h-control-md w-full min-w-0 appearance-none rounded-control border border-input bg-transparent pr-10 pl-3 text-(length:--field-text-size) leading-(--field-text-leading) text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        {...props}
      />
      <IconSelector
        aria-hidden="true"
        data-slot="native-select-icon"
        className="pointer-events-none absolute top-1/2 right-3 size-(--control-icon-size) -translate-y-1/2 text-muted-foreground select-none"
      />
    </div>
  );
}

function NativeSelectOption(props: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />;
}

function NativeSelectOptGroup(props: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
