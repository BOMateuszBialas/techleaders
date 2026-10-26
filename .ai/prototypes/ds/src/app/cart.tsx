import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IconMinus, IconPlus, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { overlayBackdropClassName } from "@/components/ui/dialog";
import { TextLink } from "@/components/ui/text-link";
import { cartLines, formatPln, products, type Product } from "./fixtures";

/*
 * Cart drawer (owner decision 3, 2026-10-26). The prototype keeps one live cart in this context:
 * "Add to cart" adds a line and opens the drawer; the header "Cart (n)" opens it too. The /cart
 * page (s04) stays a static state view, as before. Not in the app: see POSTEP.md "Storefront v2".
 */

export type CartLine = { slug: string; qty: number };

export const initialLines: CartLine[] = cartLines.map((l) => ({ slug: l.product.slug, qty: l.qty }));

export type CartStore = {
  lines: CartLine[];
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  /** Review aid for the state select: replace the cart and open or close the drawer. */
  preset: (lines: CartLine[], open: boolean) => void;
};

function productBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

/** Lines with their product; a line whose product is unknown is dropped. */
export function withProduct(lines: CartLine[]): { product: Product; qty: number }[] {
  return lines.flatMap((l) => {
    const product = productBySlug(l.slug);
    return product ? [{ product, qty: l.qty }] : [];
  });
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

/** One cart for the whole prototype. Quantities never exceed stock; a sold-out product cannot be added. */
export function useCartState(): CartStore {
  const [lines, setLines] = useState<CartLine[]>(initialLines);
  const [open, setOpen] = useState(false);

  const add = useCallback((slug: string) => {
    const product = productBySlug(slug);
    if (!product || product.stock === 0) return;
    setLines((prev) => {
      const current = prev.find((l) => l.slug === slug)?.qty ?? 0;
      const next = Math.min(current + 1, product.stock);
      return current > 0
        ? prev.map((l) => (l.slug === slug ? { ...l, qty: next } : l))
        : [...prev, { slug, qty: next }];
    });
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    const product = productBySlug(slug);
    if (!product) return;
    if (qty < 1) {
      setLines((prev) => prev.filter((l) => l.slug !== slug));
      return;
    }
    const next = Math.min(qty, product.stock);
    setLines((prev) => prev.map((l) => (l.slug === slug ? { ...l, qty: next } : l)));
  }, []);

  const remove = useCallback((slug: string) => {
    setLines((prev) => prev.filter((l) => l.slug !== slug));
  }, []);

  const preset = useCallback((next: CartLine[], isOpen: boolean) => {
    setLines(next);
    setOpen(isOpen);
  }, []);

  return { lines, open, setOpen, add, setQty, remove, preset };
}

const CartContext = createContext<CartStore | null>(null);

export function CartProvider({ value, children }: { value: CartStore; children: ReactNode }) {
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartStore {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside CartProvider");
  return cart;
}

/**
 * Side drawer on the Base UI Dialog (modal: focus trap, inert page, Escape and the backdrop close
 * it, focus returns to the trigger). Right side from `sm` up at most `max-w-md`; full width below.
 * Slides in with a transition only when motion is allowed (`motion-reduce:transition-none`).
 */
const drawerPopupClassName =
  "fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col gap-group border-l border-border bg-popover p-panel text-popover-foreground shadow-overlay outline-none transition duration-(--duration-slow) ease-out motion-reduce:transition-none data-ending-style:translate-x-full data-ending-style:duration-(--duration-base) data-ending-style:ease-in data-starting-style:translate-x-full";

export function CartDrawer() {
  const cart = useCart();
  const items = withProduct(cart.lines);
  const count = cartCount(cart.lines);
  const subtotal = items.reduce((sum, l) => sum + l.product.priceMinor * l.qty, 0);

  return (
    <DialogPrimitive.Root open={cart.open} onOpenChange={cart.setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className={overlayBackdropClassName} />
        <DialogPrimitive.Popup data-slot="cart-drawer" className={drawerPopupClassName}>
          <div className="flex shrink-0 items-center justify-between gap-related">
            <DialogPrimitive.Title className="font-heading type-h2">Your cart ({count})</DialogPrimitive.Title>
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon" />}
            >
              <IconX aria-hidden="true" />
              <span className="sr-only">Close cart</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col gap-related py-related">
                <p>Your cart is empty.</p>
                <TextLink href="#s02" variant="standalone">Shop all</TextLink>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {items.map(({ product, qty }) => (
                  <li key={product.slug} className="flex flex-col gap-related py-related">
                    <div className="flex items-start justify-between gap-related">
                      <a href="#s03" className="text-foreground">{product.name}</a>
                      <span className="font-medium">{formatPln(product.priceMinor * qty)}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-related">
                      <div className="flex items-center gap-related">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Decrease quantity of ${product.name}`}
                          onClick={() => cart.setQty(product.slug, qty - 1)}
                        >
                          <IconMinus aria-hidden="true" />
                        </Button>
                        <output aria-label={`Quantity of ${product.name}`} className="min-w-8 text-center">
                          {qty}
                        </output>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Increase quantity of ${product.name}`}
                          disabled={qty >= product.stock}
                          onClick={() => cart.setQty(product.slug, qty + 1)}
                        >
                          <IconPlus aria-hidden="true" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => cart.remove(product.slug)}>
                        Remove
                      </Button>
                    </div>
                    {qty >= product.stock ? (
                      <p className="type-small text-muted-foreground">Only {product.stock} left.</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 ? (
            <div className="flex shrink-0 flex-col gap-related border-t border-border pt-panel">
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{formatPln(subtotal)}</span>
              </div>
              <Button variant="action" size="lg" render={<a href="#s05" />} className="w-full">
                Checkout
              </Button>
              <TextLink href="#s04" variant="standalone">View full cart</TextLink>
            </div>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
