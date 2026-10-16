import { ValidationError } from "../../errors/app-error";
import { money, multiplyMoney, sumMoney, type CurrencyCode, type Money } from "../money";
import { isPurchasable, type ProductStatus } from "../products/product";

/**
 * One cart line as the shopper's cookie stores it (cart spec A2): a product id and a quantity,
 * never a price. Everything else is reloaded from the catalog on every read.
 */
export type CartLine = { productId: string; quantity: number };

/** Bounds the cookie size and the order totals (spec A14). */
export const CART_LIMITS = { maxLines: 20, maxQuantity: 99 } as const;

export const CART_LINES_LIMIT_MESSAGE = `Your cart can hold up to ${CART_LIMITS.maxLines} different products.`;
export const CART_QUANTITY_LIMIT_MESSAGE = `You can have up to ${CART_LIMITS.maxQuantity} of one product in your cart.`;

/** What the cart needs to know about a product, read from the catalog (never from the cookie). */
export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  currency: CurrencyCode;
  stockQuantity: number;
  status: ProductStatus;
  imageUrl: string | null;
};

/** The line for `productId`, if the cart has one. */
export function findLine(lines: readonly CartLine[], productId: string): CartLine | undefined {
  return lines.find((line) => line.productId === productId);
}

/** The number of items: the sum of the quantities (the header badge, spec G9). */
export function cartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((count, line) => count + line.quantity, 0);
}

/**
 * Adds `quantity` of a product: merged into its line when the cart already has one, otherwise
 * appended. Throws `ValidationError` past the limits (spec A14). Stock is checked by the caller.
 */
export function addLine(
  lines: readonly CartLine[],
  productId: string,
  quantity: number,
): CartLine[] {
  const existing = findLine(lines, productId);
  if (existing) {
    const merged = existing.quantity + quantity;
    if (merged > CART_LIMITS.maxQuantity) {
      throw new ValidationError(CART_QUANTITY_LIMIT_MESSAGE, {
        quantity: [CART_QUANTITY_LIMIT_MESSAGE],
      });
    }
    return lines.map((line) => (line === existing ? { productId, quantity: merged } : line));
  }
  if (lines.length >= CART_LIMITS.maxLines) throw new ValidationError(CART_LINES_LIMIT_MESSAGE);
  return [...lines, { productId, quantity }];
}

/** Sets the quantity of an existing line; a product that is not in the cart changes nothing. */
export function setLineQuantity(
  lines: readonly CartLine[],
  productId: string,
  quantity: number,
): CartLine[] {
  return lines.map((line) => (line.productId === productId ? { productId, quantity } : line));
}

/** Removes a product's line; removing an absent line is a no-op. */
export function removeLine(lines: readonly CartLine[], productId: string): CartLine[] {
  return lines.filter((line) => line.productId !== productId);
}

/** A cart line priced from the catalog. */
export type PricedCartLine = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
};

/**
 * The cart as the shopper sees it. `lines` holds only lines that can be bought now; what was
 * dropped or lowered is explained in `notices` (spec G12, G13). `storedLines` is the cart to
 * keep, and `changed` says whether it differs from what was stored.
 */
export type PricedCart = {
  lines: PricedCartLine[];
  /** `null` for an empty cart (it has no currency). */
  subtotal: Money | null;
  itemCount: number;
  canCheckout: boolean;
  notices: string[];
  storedLines: CartLine[];
  changed: boolean;
};

export function unavailableNotice(name: string | null): string {
  return name
    ? `${name} is no longer available and was removed from your cart.`
    : "A product in your cart is no longer available and was removed.";
}

export function lowStockNotice(name: string, stock: number): string {
  return `Only ${stock} left of ${name}; we updated the quantity.`;
}

export function otherCurrencyNotice(name: string): string {
  return `${name} is priced in another currency and was removed from your cart.`;
}

/**
 * Prices the stored lines with the current catalog data (spec Proposed Solution 1):
 * - a product that is missing, unpublished or out of stock is removed (G12);
 * - a quantity above the stock is lowered to it (G13);
 * - a product in another currency than the first line is removed (one currency per cart, A14).
 * The authoritative check stays the conditional decrement at order placement.
 */
export function priceCart(
  stored: readonly CartLine[],
  products: readonly CartProduct[],
): PricedCart {
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines: PricedCartLine[] = [];
  const notices: string[] = [];
  let currency: CurrencyCode | undefined;

  for (const line of stored) {
    const product = byId.get(line.productId);
    if (!product || !isPurchasable(product)) {
      notices.push(unavailableNotice(product?.name ?? null));
      continue;
    }
    if (currency !== undefined && product.currency !== currency) {
      notices.push(otherCurrencyNotice(product.name));
      continue;
    }
    currency = product.currency;
    const quantity = Math.min(line.quantity, product.stockQuantity);
    if (quantity < line.quantity) notices.push(lowStockNotice(product.name, quantity));
    const unitPrice = money(product.priceMinor, product.currency);
    lines.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      unitPrice,
      quantity,
      lineTotal: multiplyMoney(unitPrice, quantity),
    });
  }

  const storedLines = lines.map(({ productId, quantity }) => ({ productId, quantity }));
  return {
    lines,
    subtotal:
      currency === undefined
        ? null
        : sumMoney(
            lines.map((line) => line.lineTotal),
            currency,
          ),
    itemCount: cartItemCount(storedLines),
    canCheckout: lines.length > 0,
    notices,
    storedLines,
    changed: notices.length > 0,
  };
}
