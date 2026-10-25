import * as React from "react";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconFlask,
  IconInfoCircle,
  type Icon,
} from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/**
 * Alert (design system stage 2, batch 2; B2.18–B2.24 in .ai/design/POSTEP.md). A message about a
 * page or a form: info, success, warning, error (`destructive`) or demo data. Each variant has its
 * own surface, a 1 px outline in its color (the surface alone is 1.10–1.28 : 1 to the page) and a
 * built-in icon, so a status is never color alone (tokeny.md §7 rule 10). The description stays
 * `--foreground`. No default role (owner decision Q4): the caller sets `role="alert"` for an error
 * after an action, `role="status"` for a success, and nothing for a standing note. No dismiss
 * button (`AlertAction` removed, B2.23): an action goes inside as a `Button` or `TextLink`.
 */
const alertVariants = cva(
  "group/alert flex w-full items-start gap-related rounded-control border p-group-item text-left type-body text-foreground",
  {
    variants: {
      variant: {
        info: "border-border bg-card",
        success: "border-success bg-success-surface",
        warning: "border-warning-border bg-warning-surface",
        destructive: "border-destructive bg-destructive-surface",
        demo: "border-demo bg-demo-surface",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

/** Icon and title take the variant color; the description stays `--foreground` (B2.20). */
const ACCENT =
  "text-foreground group-data-[variant=success]/alert:text-success group-data-[variant=warning]/alert:text-warning group-data-[variant=destructive]/alert:text-destructive group-data-[variant=demo]/alert:text-demo";

const ALERT_ICONS: Record<AlertVariant, Icon> = {
  info: IconInfoCircle,
  success: IconCircleCheck,
  warning: IconAlertTriangle,
  destructive: IconAlertCircle,
  demo: IconFlask,
};

function Alert({
  className,
  variant,
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const resolved: AlertVariant = variant ?? "info";
  const AlertIcon = ALERT_ICONS[resolved];
  return (
    <div
      data-slot="alert"
      data-variant={resolved}
      className={cn(alertVariants({ variant: resolved }), className)}
      {...props}
    >
      <span className={cn("flex h-lh shrink-0 items-center", ACCENT)}>
        <AlertIcon aria-hidden="true" className="size-(--control-icon-size)" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    </div>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="alert-title" className={cn("font-semibold", ACCENT, className)} {...props} />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("max-w-measure text-foreground [&_p:not(:last-child)]:mb-related", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle, alertVariants };
