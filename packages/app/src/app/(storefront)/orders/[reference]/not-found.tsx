import Link from "next/link";
import { ORDER_NOT_FOUND_HEADING } from "@/components/checkout/checkout-copy";

/** The same answer for a malformed and an unknown reference: a guess reveals nothing (A8). */
export default function OrderNotFound() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">{ORDER_NOT_FOUND_HEADING}</h1>
      <p className="text-muted-foreground">Check the reference and try again.</p>
      <Link href="/orders/lookup" className="w-fit text-sm underline underline-offset-4">
        Look up an order
      </Link>
    </div>
  );
}
