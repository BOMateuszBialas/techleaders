import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "./alert";

/**
 * Error state (design system stage 2, batch 3; B3.24–B3.25 in .ai/design/POSTEP.md): a page or a
 * section that failed to load. A thin `Alert variant="destructive"` (owner decision Q4) with a
 * fixed `role="alert"`, a required title (what happened) and description (what to do), and an
 * optional action (`Button` "Try again" or `TextLink` "Back to …"). No new styles: look, icon and
 * outline come from Alert. The title is a `div`; pass a heading element when the page needs one
 * (`title={<h1>…</h1>}`). Focus does not move: the role announces it. Never technical details.
 * Not for: a field (`FieldError`), a form after submit (`Alert`), "not found" (`Empty`), the
 * Copilot fallback without an LLM (`Alert` `info` or `warning`).
 */
function ErrorState({
  title,
  description,
  action,
  ...props
}: Omit<React.ComponentProps<"div">, "title" | "role" | "children"> & {
  title: React.ReactNode;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Alert variant="destructive" role="alert" {...props}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {action ? <div className="flex flex-wrap items-center gap-related">{action}</div> : null}
      </AlertDescription>
    </Alert>
  );
}

export { ErrorState };
