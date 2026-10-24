import { IconShoppingCart } from "@tabler/icons-react";
import Link from "next/link";
import { cartLinkLabel } from "./cart-copy";

/**
 * The header's cart link with the item count (cart spec G9, storefront spec G13). The count
 * comes from the cookie only (no database read); `null` while it loads shows "Cart" alone.
 */
export function CartLink({ itemCount }: { itemCount: number | null }) {
  return (
    <Link
      href="/cart"
      aria-label={itemCount === null ? "Cart" : cartLinkLabel(itemCount)}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-sm hover:bg-muted focus-visible:bg-muted"
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
