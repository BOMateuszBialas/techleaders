"use client";

import Link from "next/link";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";
import { cn } from "cn";

/**
 * Tabs (design system stage 2, batch 3; B3.11–B3.15 in .ai/design/POSTEP.md). Two forms with one
 * look (owner decision Q1):
 * - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (Base UI): switch panels on the same page.
 *   `role="tablist"`, arrow keys, one Tab stop; a tab activates on focus by default (B3.14).
 * - `TabsNav`, `TabsNavLink`: switch a view by URL. A `<nav>` of links with `aria-current="page"`,
 *   which works without JavaScript; never `role="tab"` on a link (WAI-ARIA APG).
 * One look, `line` (Q2): `--muted-foreground` text, the active item `--foreground` with a 2 px
 * underline, so the state is a shape too, not only a color. No `default` (gray track with a
 * shadow) and no vertical orientation (B3.12, B3.15, owner decision). The list wraps on a narrow
 * screen instead of scrolling sideways (B3.13).
 */
const TABS_LIST_CLASS = "flex flex-wrap items-stretch border-b border-border";

const tabsTriggerVariants = cva(
  "relative inline-flex h-control-md shrink-0 items-center justify-center gap-related px-(--control-px) text-(length:--type-body-size) leading-(--type-body-leading) font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none select-none not-data-disabled:hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid data-active:text-foreground aria-[current=page]:text-foreground data-disabled:cursor-not-allowed after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 data-active:after:opacity-100 aria-[current=page]:after:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-(--control-icon-size)",
);

function Tabs({ className, ...props }: Omit<TabsPrimitive.Root.Props, "orientation">) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("group/tabs flex flex-col gap-group", className)}
      {...props}
    />
  );
}

function TabsList({ className, activateOnFocus = true, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      activateOnFocus={activateOnFocus}
      className={cn(TABS_LIST_CLASS, className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants(), className)}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "type-body text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        className,
      )}
      {...props}
    />
  );
}

/** Switching a view by URL: a named `<nav>` (`aria-label` from the caller) of `TabsNavLink`s. */
function TabsNav({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav data-slot="tabs-nav" className={cn(TABS_LIST_CLASS, className)} {...props} />;
}

/** One link of a `TabsNav`; `active` marks the current view with `aria-current="page"`. */
function TabsNavLink({
  className,
  active = false,
  ...props
}: React.ComponentProps<typeof Link> & { active?: boolean }) {
  return (
    <Link
      data-slot="tabs-nav-link"
      aria-current={active ? "page" : undefined}
      className={cn(tabsTriggerVariants(), className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsNav, TabsNavLink, tabsTriggerVariants };
