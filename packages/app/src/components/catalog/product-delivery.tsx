import { DetailTable } from "./product-detail-table";

/** The store's delivery and returns rules (labelled as the example policy, Q7, OA-5). */
const STORE_RULES = [
  { label: "Delivery time", value: "1–3 working days, by courier" },
  { label: "Delivery cost", value: "Free" },
  { label: "Returns", value: "14 days from delivery, unused and in the original packaging" },
  { label: "Warranty", value: "24 months from delivery" },
];

/**
 * The "Delivery and returns" tab (storefront visual polish, 2026-11-05): the store's rules as a
 * table, and one row for this product's stock. The rules are the example policy of the demo store;
 * the stock row comes from the product itself.
 */
export function ProductDelivery({ inStock }: { inStock: boolean }) {
  const thisProduct = inStock
    ? "In stock. The order is confirmed at checkout and sent from the store's stock."
    : "Out of stock. It cannot be ordered until stock returns.";
  return (
    <div className="flex flex-col gap-related">
      <p className="type-small text-muted-foreground">Example policy for the demo store.</p>
      <DetailTable
        caption="Delivery and returns"
        rows={[...STORE_RULES, { label: "This product", value: thisProduct }]}
      />
    </div>
  );
}
