import { formatMoney, type Money } from "@commerceos/core";
import { SHIPPING_FREE } from "./checkout-copy";

export type SummaryItem = { name: string; unitPrice: Money; quantity: number; lineTotal: Money };

/**
 * Items and totals, all from the server (cart spec R04): the checkout shows the cart priced
 * from the catalog, the order pages the stored snapshots. Shipping 0 reads "free (demo store)"
 * (G5); there is no tax line.
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
    <section aria-label="Order summary" className="flex flex-col gap-3 rounded-lg border p-4">
      <ul className="flex flex-col divide-y text-sm">
        {items.map((item) => (
          <li key={item.name} className="flex justify-between gap-4 py-2">
            <span>
              {item.name} × {item.quantity}
              <span className="block text-muted-foreground">
                {formatMoney(item.unitPrice)} each
              </span>
            </span>
            <span className="font-medium tabular-nums">{formatMoney(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t pt-3 text-sm">
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
  );
}
