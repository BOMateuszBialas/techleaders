"use client";

import { useState } from "react";
import { IconMenu2 } from "@tabler/icons-react";
import type { CatalogCategory } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { MenuLinks } from "./header-menu-links";
import { HEADER_MENU_TRIGGER_LABEL } from "./storefront-copy";

/** A link that leaves the page closes the menu: the handler for `onNavigate`. */
export function closeMenuOnNavigate(setOpen: (open: boolean) => void) {
  return (): void => setOpen(false);
}

/**
 * The phone menu (storefront visual polish, 2026-11-05): a burger button that opens the categories
 * in a sheet from the left edge, the same way the cart drawer opens from the right. The sheet
 * closes when a category link is followed, so it is not left open over the next page.
 */
export function MobileCategoriesMenu({ categories }: { categories: CatalogCategory[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={HEADER_MENU_TRIGGER_LABEL}
          >
            <IconMenu2 aria-hidden="true" className="size-6" />
          </Button>
        }
      />
      <DrawerContent side="left" className="storefront-type">
        <DrawerHeader>
          <DrawerTitle>{HEADER_MENU_TRIGGER_LABEL}</DrawerTitle>
        </DrawerHeader>
        <nav aria-label="Main">
          <ul className="flex flex-col gap-3 text-base text-foreground">
            <MenuLinks categories={categories} onNavigate={closeMenuOnNavigate(setOpen)} />
          </ul>
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
