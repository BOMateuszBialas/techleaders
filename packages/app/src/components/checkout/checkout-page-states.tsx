import Link from "next/link";
import { TRY_AGAIN_LINK } from "@/components/cart/cart-copy";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import {
  CHECKOUT_LOADING_LABEL,
  CHECKOUT_UNAVAILABLE_MESSAGE,
  CHECKOUT_UNAVAILABLE_TITLE,
} from "./checkout-copy";

/** The form fields on the checkout page: the skeleton shows six input-sized blocks. */
const SKELETON_FIELDS = 6;

/**
 * The checkout while its contents load (retrofit B3.16): input-sized blocks for the form and a
 * block for the summary, in the same two-column layout as the page.
 */
export function CheckoutPageSkeleton() {
  return (
    <SkeletonGroup label={CHECKOUT_LOADING_LABEL} className="grid gap-8 md:grid-cols-checkout">
      <div className="flex flex-col gap-4">
        {Array.from({ length: SKELETON_FIELDS }, (_, index) => (
          <Skeleton key={index} className="h-control-md" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-card" />
    </SkeletonGroup>
  );
}

/** The checkout when it cannot be read: a retry link to the same URL (works without JS). */
export function CheckoutPageUnavailable() {
  return (
    <ErrorState
      title={CHECKOUT_UNAVAILABLE_TITLE}
      description={CHECKOUT_UNAVAILABLE_MESSAGE}
      action={
        <Link href="/checkout" className={buttonVariants({ variant: "outline" })}>
          {TRY_AGAIN_LINK}
        </Link>
      }
    />
  );
}
