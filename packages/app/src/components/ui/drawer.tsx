"use client";

import * as React from "react";
import { Dialog as DrawerPrimitive } from "@base-ui/react/dialog";
import { IconX } from "@tabler/icons-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { overlayBackdropClassName, overlayHeaderClassName } from "@/components/ui/dialog";

/**
 * Drawer (storefront v2, owner decision 3; spec 2026-10-26-storefront-design-implementation,
 * Phase 2): a right-side sheet on Base UI `Dialog` in modal mode. Focus is trapped, the page is
 * inert, Escape, a click on the backdrop and the X close it, and focus returns to the element
 * the `finalFocus` ref points at (or the default, Base UI's behaviour). Full width below `sm`
 * (448 px), at most `max-w-md` from `sm`. The overlay backdrop is shared with `Dialog`. The
 * slide and fade are removed with `motion-reduce:transition-none` (tokeny.md §5).
 *
 * The X is the first focusable element in the DOM, so opening the drawer focuses it. Long lines
 * scroll inside `DrawerBody`; the header and the footer stay visible.
 */

/** The side sheet surface: fixed to the right edge, full height, a 1 px left border. */
const drawerPopupClassName =
  "fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col gap-group overflow-hidden border-l border-border bg-popover p-panel text-popover-foreground shadow-overlay outline-none transition duration-(--duration-slow) ease-out motion-reduce:transition-none data-ending-style:translate-x-full data-ending-style:duration-(--duration-base) data-ending-style:ease-in data-starting-style:translate-x-full";

const drawerFooterClassName = "flex shrink-0 flex-col gap-related border-t border-border pt-panel";

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DrawerPrimitive.Popup.Props & {
  /** The X in the corner. Keep it unless the drawer has another explicit way to close. */
  showCloseButton?: boolean;
}) {
  return (
    // No positioning viewport: the popup is fixed to the edges, so it is full width below sm.
    <DrawerPrimitive.Portal data-slot="drawer-portal">
      <DrawerPrimitive.Backdrop data-slot="drawer-overlay" className={overlayBackdropClassName} />
      <DrawerPrimitive.Popup
        data-slot="drawer-content"
        data-close-button={showCloseButton ? "" : undefined}
        className={cn(drawerPopupClassName, "group/drawer", className)}
        {...props}
      >
        {showCloseButton ? (
          <DrawerPrimitive.Close
            data-slot="drawer-close"
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
          </DrawerPrimitive.Close>
        ) : null}
        {children}
      </DrawerPrimitive.Popup>
    </DrawerPrimitive.Portal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        overlayHeaderClassName,
        "shrink-0 group-data-[close-button]/drawer:pr-(--control-h-sm)",
        className,
      )}
      {...props}
    />
  );
}

/** The scrolling middle of the drawer. Focusable, so the keyboard can scroll it (WCAG 2.1.1). */
function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      tabIndex={0}
      className={cn(
        "-m-1 flex min-h-0 flex-1 flex-col gap-group overflow-y-auto p-1 outline-none focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid",
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="drawer-footer" className={cn(drawerFooterClassName, className)} {...props} />
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("type-h2", className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("type-body text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
};
