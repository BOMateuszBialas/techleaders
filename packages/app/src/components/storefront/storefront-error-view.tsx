import Link from "next/link";
import { productsHref } from "@/components/catalog/catalog-copy";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import {
  STOREFRONT_ERROR_BROWSE_LABEL,
  STOREFRONT_ERROR_DESCRIPTION,
  STOREFRONT_ERROR_RETRY_LABEL,
  STOREFRONT_ERROR_TITLE,
} from "./storefront-copy";

/**
 * The store error page's content (retrofit checkout Phase 4, C10, OA-6). Hook-free, so a unit test
 * renders it without the client boundary. `onRetry` is the boundary's `reset`; without it only the
 * catalog link is shown. Shows no error message, stack trace or digest from the server (A23).
 */
export function StorefrontErrorView({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      className="max-w-xl"
      title={<h1 className="type-h1">{STOREFRONT_ERROR_TITLE}</h1>}
      description={STOREFRONT_ERROR_DESCRIPTION}
      action={
        <>
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              {STOREFRONT_ERROR_RETRY_LABEL}
            </Button>
          ) : null}
          <Link href={productsHref()} className={buttonVariants({ variant: "outline" })}>
            {STOREFRONT_ERROR_BROWSE_LABEL}
          </Link>
        </>
      }
    />
  );
}
