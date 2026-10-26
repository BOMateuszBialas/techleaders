import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import {
  CART_LOADING_LABEL,
  CART_UNAVAILABLE_MESSAGE,
  CART_UNAVAILABLE_TITLE,
  TRY_AGAIN_LINK,
} from "./cart-copy";

/** The cart page while its contents load: two rows the size of a cart line (retrofit B3.16). */
export function CartPageSkeleton() {
  return (
    <SkeletonGroup label={CART_LOADING_LABEL} className="flex flex-col gap-3">
      <Skeleton className="h-20 rounded-card" />
      <Skeleton className="h-20 rounded-card" />
    </SkeletonGroup>
  );
}

/** The cart page when the cart cannot be read: a retry link to the same URL (works without JS). */
export function CartPageUnavailable() {
  return (
    <ErrorState
      title={CART_UNAVAILABLE_TITLE}
      description={CART_UNAVAILABLE_MESSAGE}
      action={
        <Link href="/cart" className={buttonVariants({ variant: "outline" })}>
          {TRY_AGAIN_LINK}
        </Link>
      }
    />
  );
}
