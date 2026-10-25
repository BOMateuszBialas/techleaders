"use client";

import * as React from "react";
import Link from "next/link";
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { IconChevronDown } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import { cn } from "cn";

/**
 * Navigation menu (megamenu) (design system stage 2, batch 4; owner change to Q1, B4.21–B4.32 in
 * .ai/design/POSTEP.md). Base UI `NavigationMenu`: a `<nav>` with top-level items; a trigger opens
 * one panel of links under it. Store header use: one "Shop" trigger with "Shop all" and every
 * category (B4.22). Desktop only (from `md`); phones keep the Disclosure menu (B4.28).
 *
 * - Without JavaScript the trigger is a plain link to its `href` (spec G13); with JavaScript a
 *   plain click opens the panel instead, and modified clicks still open the link (B4.25).
 * - Opens on click, Enter, Space, ArrowDown, or a 200 ms hover (Base UI ignores hover on touch and
 *   keeps a safe triangle to the panel); closes 300 ms after the pointer leaves, on Escape and on
 *   focus out (WCAG 1.4.13, B4.24).
 * - Panel: overlay surface (`--popover`, `--border`, overlay shadow), 12 px radius, `z-50`, no
 *   backdrop; content stays in the server HTML (`keepMounted`, hidden until open).
 * - Hover is an underline, never a background (`--accent` on `--popover` is 1.00 : 1 in dark).
 */

/** Look of a top-level item: the trigger, or a plain link next to it. Inherits the text color, so
 * it works on the light header and on the dark frame; the focus outline uses the same color. */
const navigationMenuTriggerStyle = cva(
  "group/navigation-menu-trigger inline-flex h-control-md w-max items-center gap-related rounded-control px-3 type-body font-medium text-current underline-offset-4 outline-none select-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current focus-visible:outline-solid data-popup-open:underline [&_svg]:pointer-events-none [&_svg]:shrink-0",
);

function NavigationMenu({
  className,
  children,
  align = "start",
  delay = 200,
  closeDelay = 300,
  ...props
}: NavigationMenuPrimitive.Root.Props & Pick<NavigationMenuPrimitive.Positioner.Props, "align">) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      delay={delay}
      closeDelay={closeDelay}
      className={cn("relative flex items-center", className)}
      {...props}
    >
      {children}
      <NavigationMenuPrimitive.Portal>
        <NavigationMenuPrimitive.Positioner
          data-slot="navigation-menu-positioner"
          side="bottom"
          align={align}
          sideOffset={8}
          collisionPadding={16}
          className="z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width)"
        >
          <NavigationMenuPrimitive.Popup
            data-slot="navigation-menu-popup"
            className="relative h-(--popup-height) w-(--popup-width) overflow-hidden rounded-card border border-border bg-popover text-popover-foreground shadow-overlay outline-none transition duration-(--duration-base) ease-out data-ending-style:opacity-0 data-ending-style:duration-(--duration-fast) data-ending-style:ease-in data-starting-style:opacity-0 motion-safe:data-ending-style:-translate-y-2 motion-safe:data-starting-style:-translate-y-2"
          >
            <NavigationMenuPrimitive.Viewport
              data-slot="navigation-menu-viewport"
              className="relative size-full overflow-hidden"
            />
          </NavigationMenuPrimitive.Popup>
        </NavigationMenuPrimitive.Positioner>
      </NavigationMenuPrimitive.Portal>
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({ className, ...props }: NavigationMenuPrimitive.List.Props) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("flex list-none items-center gap-related", className)}
      {...props}
    />
  );
}

function NavigationMenuItem({ className, ...props }: NavigationMenuPrimitive.Item.Props) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

const noSubscription = () => () => {};

/** `false` in the server HTML and during hydration, `true` after it (no hydration mismatch). */
function useHydrated() {
  return React.useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/** A plain left click without modifier keys; anything else keeps the browser's link behavior. */
function isPlainClick(event: React.MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function NavigationMenuTrigger({
  className,
  children,
  href,
  onClick,
  ...props
}: Omit<NavigationMenuPrimitive.Trigger.Props, "render" | "nativeButton"> & {
  /** Where the trigger goes without JavaScript, or with a modified click (spec G13, B4.25). */
  href: string;
}) {
  const hydrated = useHydrated();
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      nativeButton={false}
      // Server HTML (and so a browser without JavaScript) gets a plain link: Base UI's button role
      // and expanded state are added only once React has hydrated and the panel can open.
      render={({ role, "aria-expanded": expanded, ...linkProps }) => (
        <Link
          {...linkProps}
          href={href}
          role={hydrated ? role : undefined}
          aria-expanded={hydrated ? expanded : undefined}
        />
      )}
      className={cn(navigationMenuTriggerStyle(), className)}
      onClick={(event) => {
        if (isPlainClick(event)) event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
      <IconChevronDown
        aria-hidden="true"
        className="size-(--control-icon-size) motion-safe:transition-transform motion-safe:duration-(--duration-base) group-data-popup-open/navigation-menu-trigger:rotate-180"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({
  className,
  keepMounted = true,
  ...props
}: NavigationMenuPrimitive.Content.Props) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      keepMounted={keepMounted}
      className={cn("flex w-max max-w-3xl flex-col gap-related p-group-item", className)}
      {...props}
    />
  );
}

/** The grid of links inside the panel: 2 columns, 3 from `lg` (B4.23). */
function NavigationMenuGrid({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="navigation-menu-grid"
      className={cn("grid list-none grid-cols-2 gap-related lg:grid-cols-3", className)}
      {...props}
    />
  );
}

function NavigationMenuLink({
  className,
  children,
  description,
  href,
  ...props
}: Omit<NavigationMenuPrimitive.Link.Props, "render" | "href"> & {
  href: string;
  /** One line under the name, `--muted-foreground` (pair 11). */
  description?: React.ReactNode;
}) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      render={<Link href={href} />}
      closeOnClick
      className={cn(
        "group/navigation-menu-link flex min-h-control-md w-60 flex-col justify-center gap-1 rounded-control px-group-item py-related text-popover-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        className,
      )}
      {...props}
    >
      <span className="type-body font-semibold underline-offset-4 group-hover/navigation-menu-link:underline group-data-active/navigation-menu-link:underline group-data-active/navigation-menu-link:decoration-2">
        {children}
      </span>
      {description ? (
        <span className="type-small font-normal text-muted-foreground">{description}</span>
      ) : null}
    </NavigationMenuPrimitive.Link>
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuGrid,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
};
