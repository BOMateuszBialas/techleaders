"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  overlayBackdropClassName,
  overlayFooterClassName,
  overlayHeaderClassName,
  overlayPopupClassName,
  overlayViewportClassName,
} from "@/components/ui/dialog";

/**
 * Alert dialog (design system stage 2, batch 4; B4.9–B4.16 in .ai/design/POSTEP.md): a
 * confirmation before an action that cannot be undone (delete a category, cancel or refund an
 * order). Base UI `AlertDialog` (role `alertdialog`): a click on the backdrop never closes it,
 * Escape works like "Cancel", and the cancel button comes first in the DOM, so focus starts on
 * the safer choice. No X, no media slot and no `sm` size (owner decisions, B4.12–B4.13). The
 * description carries the consequence, so it is `--foreground`, not muted (B4.11). The confirming
 * button is `destructive` or `default`, never `action` (B4.14).
 */
function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogContent({ className, ...props }: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal">
      <AlertDialogPrimitive.Backdrop
        data-slot="alert-dialog-overlay"
        className={overlayBackdropClassName}
      />
      <AlertDialogPrimitive.Viewport
        data-slot="alert-dialog-viewport"
        className={overlayViewportClassName}
      >
        <AlertDialogPrimitive.Popup
          data-slot="alert-dialog-content"
          className={cn(overlayPopupClassName, "max-w-md", className)}
          {...props}
        />
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(overlayHeaderClassName, className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(overlayFooterClassName, className)}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("type-h2", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("type-body text-foreground", className)}
      {...props}
    />
  );
}

/** The confirming button: usually `type="submit"` inside a `<form>` with a server action. */
function AlertDialogAction({
  variant = "destructive",
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" variant={variant} {...props} />;
}

/** Closes without acting; Escape does the same. Name it so it never sounds like the action. */
function AlertDialogCancel({
  variant = "outline",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
