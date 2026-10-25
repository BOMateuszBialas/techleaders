import * as React from "react";
import { IconAlertCircle } from "@tabler/icons-react";
import { cn } from "cn";
import { Label } from "./label";

/**
 * Form field (design system stage 2, batch 1; B1.22–B1.26 in .ai/design/POSTEP.md). Based on the
 * shadcn `base-nova` `field` registry item (4.21.4), trimmed to the parts the product needs: no
 * `FieldSeparator` (it pulls the unplanned `separator`) and no `FieldTitle` (B2.11).
 *
 * Order inside a field: label, control, hint, error (B1.26). The control points at the hint and the
 * error with `aria-describedby` and carries `aria-invalid`; the error is not a live region, because
 * the form already announces one summary with `role="alert"` (B1.23). Required fields are not
 * marked; optional ones say "(optional)" (owner decision Q2).
 *
 * `orientation="horizontal"` (batch 2, B2.11) is for a checkbox or a radio: the control on the left,
 * then `FieldContent` with the label, hint and error; the row is at least `--control-h-sm` tall
 * (44 px on a phone), so the whole row is a comfortable target.
 */
function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "vertical" | "horizontal" }) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "group flex w-full gap-related data-[orientation=horizontal]:min-h-control-sm data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:items-start data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

/** The label, hint and error next to the control of a horizontal field (B2.11). */
function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}
      {...props}
    />
  );
}

/** Fields one after another: `--space-group-item` apart (16 px store, 12 px admin). */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex w-full flex-col gap-group-item", className)}
      {...props}
    />
  );
}

/** A named group of fields (address, contact): `--space-group` from the next group. */
function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn("flex min-w-0 flex-col gap-group-item border-0 p-0", className)}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-related text-foreground data-[variant=label]:text-(length:--label-size) data-[variant=label]:leading-(--label-leading) data-[variant=label]:font-medium data-[variant=legend]:type-h3",
        className,
      )}
      {...props}
    />
  );
}

/** The visible label. `optional` adds "(optional)" in muted text (owner decision Q2). */
function FieldLabel({
  className,
  optional = false,
  children,
  ...props
}: React.ComponentProps<typeof Label> & { optional?: boolean }) {
  return (
    <Label data-slot="field-label" className={cn("w-fit", className)} {...props}>
      {children}
      {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
    </Label>
  );
}

/** A hint under the control, referenced by its `aria-describedby`. */
function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("type-small text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * The error under the control: text, an icon and an `id` for `aria-describedby` (tokeny.md §7
 * rule 5). Renders nothing without children, so a form can always render it.
 */
function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (children === undefined || children === null || children === "") return null;
  return (
    <p
      data-slot="field-error"
      className={cn("flex items-start gap-related type-small text-destructive", className)}
      {...props}
    >
      <span className="flex h-lh shrink-0 items-center">
        <IconAlertCircle aria-hidden="true" className="size-4" />
      </span>
      <span>{children}</span>
    </p>
  );
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
};
