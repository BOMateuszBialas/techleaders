"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IconX } from "@tabler/icons-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

/**
 * Dialog (design system stage 2, batch 4; B4.2–B4.16 in .ai/design/POSTEP.md). Base UI `Dialog`
 * in modal mode: focus is trapped, the page is inert and does not scroll, Escape, a click on the
 * backdrop and the X close it, and focus returns to the trigger. Shared overlay look with
 * Alert dialog (`overlayPopupClassName`): `--popover` surface, `--border` outline, the one
 * overlay shadow, 12 px radius, `--space-panel` padding, the `--backdrop` token without blur.
 * Motion: enter `--duration-slow` ease-out, exit `--duration-base` ease-in; the scale only
 * with `prefers-reduced-motion: no-preference` (tokeny.md §5). Long content scrolls inside
 * `DialogBody` while the header and footer stay visible (B4.9).
 */

/** The backdrop of both dialogs (B4.5): color only, no blur; fades with the popup. */
const overlayBackdropClassName =
  "fixed inset-0 z-50 bg-backdrop transition-opacity duration-(--duration-slow) ease-out data-ending-style:opacity-0 data-ending-style:duration-(--duration-base) data-ending-style:ease-in data-starting-style:opacity-0";

/** Centres the popup with a `--space-gutter` margin and caps its height to the window. */
const overlayViewportClassName = "fixed inset-0 z-50 flex items-center justify-center p-gutter";

/** The popup surface shared by Dialog and Alert dialog (B4.4, B4.7, B4.9, B4.10). */
const overlayPopupClassName =
  "relative flex max-h-full w-full flex-col gap-group-item overflow-hidden rounded-card border border-border bg-popover p-panel type-body text-popover-foreground shadow-overlay outline-none transition duration-(--duration-slow) ease-out data-ending-style:opacity-0 data-ending-style:duration-(--duration-base) data-ending-style:ease-in data-starting-style:opacity-0 motion-safe:data-ending-style:scale-95 motion-safe:data-starting-style:scale-95";

const overlayHeaderClassName = "flex shrink-0 flex-col gap-1";

/** Buttons: a full-width column on a phone (confirmation on top), a right-aligned row from sm. */
const overlayFooterClassName =
  "flex shrink-0 flex-col-reverse gap-related sm:flex-row sm:justify-end max-sm:*:w-full";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  /** The X in the corner (B4.12). Keep it unless the footer has an explicit "Cancel". */
  showCloseButton?: boolean;
}) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogPrimitive.Backdrop data-slot="dialog-overlay" className={overlayBackdropClassName} />
      <DialogPrimitive.Viewport data-slot="dialog-viewport" className={overlayViewportClassName}>
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          data-close-button={showCloseButton ? "" : undefined}
          className={cn(overlayPopupClassName, "group/dialog max-w-lg", className)}
          {...props}
        >
          {children}
          {showCloseButton ? (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-related right-related"
                />
              }
            >
              <IconX aria-hidden="true" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        overlayHeaderClassName,
        "group-data-[close-button]/dialog:pr-(--control-h-sm)",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The scrolling middle of a long dialog (B4.9). It is focusable, so keyboard users can scroll it
 * (WCAG 2.1.1); short dialogs put their content straight in `DialogContent`.
 */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      tabIndex={0}
      className={cn(
        "-m-1 min-h-0 flex-1 overflow-y-auto p-1 outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-footer" className={cn(overlayFooterClassName, className)} {...props} />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("type-h2", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("type-body text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  overlayBackdropClassName,
  overlayFooterClassName,
  overlayHeaderClassName,
  overlayPopupClassName,
  overlayViewportClassName,
};
