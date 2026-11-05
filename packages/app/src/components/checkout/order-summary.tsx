import { formatMoney, type Money } from "@commerceos/core";
import { ProductThumbnail } from "@/components/catalog/product-thumbnail";
import { Card, CardContent } from "@/components/ui/card";
import { SHIPPING_FREE } from "./checkout-copy";

/** One item of the summary. `imageUrl` is set for a cart (checkout); a stored order has none. */
export type SummaryItem = {
  name: string;
  imageUrl?: string | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
};

/**
 * Items and totals, all from the server (cart spec R04): the checkout shows the cart priced
 * from the catalog, the order pages the stored snapshots. Shipping 0 reads "free"
 * (G5); there is no tax line. The panel is a DS `Card` (retrofit Phase 2, B2.25).
 */
export function OrderSummary({
  items,
  subtotal,
  shipping,
  total,
}: {
  items: SummaryItem[];
  subtotal: Money;
  shipping: Money;
  total: Money;
}) {
  return (
    <Card className="self-start">
      <CardContent>
        <section aria-label="Order summary" className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y text-sm">
            {/* Names are snapshots and need not be unique, so the position is part of the key. */}
            {items.map((item, index) => (
              <li key={`${index}-${item.name}`} className="flex items-center gap-3 py-2">
                <ProductThumbnail imageUrl={item.imageUrl} name={item.name} widthClassName="w-12" />
                <span className="min-w-0 flex-1">
                  {item.name} × {item.quantity}
                  <span className="block text-muted-foreground">
                    {formatMoney(item.unitPrice)} each
                  </span>
                </span>
                <span className="font-medium tabular-nums">{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-dl-label-amount gap-x-4 gap-y-1 border-t pt-3 text-sm">
            <dt>Subtotal</dt>
            <dd className="text-right tabular-nums">{formatMoney(subtotal)}</dd>
            <dt>Shipping</dt>
            <dd className="text-right">
              {shipping.amountMinor === 0 ? SHIPPING_FREE : formatMoney(shipping)}
            </dd>
            <dt className="font-semibold">Total</dt>
            <dd className="text-right font-semibold tabular-nums" data-testid="order-total">
              {formatMoney(total)}
            </dd>
          </dl>
        </section>
      </CardContent>
    </Card>
  );
}
