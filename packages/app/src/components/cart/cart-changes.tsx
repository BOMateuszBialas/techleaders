import { Button } from "@/components/ui/button";
import {
  ACCEPT_CART_CHANGES_BUTTON,
  CART_CHANGES_HEADING,
} from "@/components/checkout/checkout-copy";

/**
 * What changed in the cart since it was stored (G12, G13), with a button that stores the
 * corrected cart. A page render cannot set cookies, so this one-click form is how the cookie
 * catches up; until then the checkout stays closed (its lines would not match the cookie).
 */
export function CartChanges({
  notices,
  acceptAction,
}: {
  notices: string[];
  acceptAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <section
      aria-labelledby="cart-changes-heading"
      className="flex flex-col gap-2 rounded-md border bg-muted p-3 text-sm"
    >
      <h2 id="cart-changes-heading" className="font-medium">
        {CART_CHANGES_HEADING}
      </h2>
      <ul role="status" className="flex flex-col gap-1">
        {notices.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
      </ul>
      <form action={acceptAction}>
        <Button type="submit" variant="outline" size="sm">
          {ACCEPT_CART_CHANGES_BUTTON}
        </Button>
      </form>
    </section>
  );
}
