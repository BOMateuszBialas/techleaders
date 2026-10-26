import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ACCEPT_CART_CHANGES_BUTTON,
  CART_CHANGES_HEADING,
} from "@/components/checkout/checkout-copy";

/**
 * What changed in the cart since it was stored (G12, G13), with a button that stores the
 * corrected cart. A page render cannot set cookies, so this one-click form is how the cookie
 * catches up; until then the checkout stays closed (its lines would not match the cookie).
 * Retrofit Phase 1 (OA-3): a `warning` alert with `role="status"`; the heading is an `h2`.
 */
export function CartChanges({
  notices,
  acceptAction,
}: {
  notices: string[];
  acceptAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <Alert variant="warning" role="status">
      <AlertTitle>
        <h2 id="cart-changes-heading" className="font-semibold">
          {CART_CHANGES_HEADING}
        </h2>
      </AlertTitle>
      <AlertDescription>
        <ul className="flex flex-col gap-1">
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
        <form action={acceptAction}>
          <Button type="submit" variant="outline" size="sm">
            {ACCEPT_CART_CHANGES_BUTTON}
          </Button>
        </form>
      </AlertDescription>
    </Alert>
  );
}
