"use client";

import { IconShoppingCart } from "@tabler/icons-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cartLinkLabel } from "./cart-copy";
import { useCartDrawer } from "./cart-drawer-context";
import { openDrawerOnPlainClick } from "./cart-drawer-state";

/**
 * The header's cart link with the item count (cart spec G9, storefront spec G13). The count
 * comes from the cookie only (no database read); `null` while it loads shows "Cart" alone.
 * It is a real link to `/cart`, so it works without JavaScript. With JavaScript a plain click
 * opens the cart drawer instead (storefront v2, Phase 2); a modified click still follows the link.
 */
export function CartLink({ itemCount }: { itemCount: number | null }) {
  const drawer = useCartDrawer();
  return (
    <Link
      href="/cart"
      onClick={drawer ? openDrawerOnPlainClick(drawer.dispatch) : undefined}
      aria-label={itemCount === null ? "Cart" : cartLinkLabel(itemCount)}
      className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
    >
      <IconShoppingCart aria-hidden="true" className="size-4" /> Cart
      {itemCount === null ? null : (
        <span
          data-testid="cart-count"
          className="min-w-5 rounded-full bg-primary px-1.5 text-center text-xs font-medium text-primary-foreground tabular-nums"
        >
          {itemCount}
        </span>
      )}
    </Link>
  );
}
