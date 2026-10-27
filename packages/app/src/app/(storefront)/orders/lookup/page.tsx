import type { Metadata } from "next";
import { LOOKUP_HEADING, SAVE_REFERENCE_NOTE } from "@/components/checkout/checkout-copy";
import { LookupForm } from "@/components/checkout/order-forms";
import { lookupOrder } from "@/server/orders/order.action";

export const metadata: Metadata = { title: "Find your order" };

/** Order lookup by reference (cart spec, Phase 3): the format is checked, then the order page. */
export default function OrderLookupPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{LOOKUP_HEADING}</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        Enter the reference shown after your order. {SAVE_REFERENCE_NOTE}
      </p>
      <LookupForm action={lookupOrder} />
    </>
  );
}
