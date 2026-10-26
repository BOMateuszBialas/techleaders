import Link from "next/link";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { formatMoney, type PricedCartLine } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";
import { CartFormMessage } from "./cart-form-message";
import { REMOVE_BUTTON } from "./cart-copy";
import { lineMessage } from "./cart-line-view";

type FormProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
};

export type CartDrawerLineViewProps = {
  line: PricedCartLine;
  update: FormProps;
  remove: FormProps;
};

/**
 * One cart line in the drawer, in one given state (storefront v2, Phase 2): the name, the unit
 * price, the quantity with "−" and "+" buttons (each labelled with the product name), the line
 * total and a remove button. "−" stops at 1 (remove is the way to empty a line). "+" is sent to
 * the server, which refuses a quantity above the stock under the line ("Only N left in stock.").
 * No hooks: `CartDrawerLine` connects both forms to `useActionState`.
 */
export function CartDrawerLineView({ line, update, remove }: CartDrawerLineViewProps) {
  const name = line.name;
  const errorId = `drawer-quantity-${line.productId}-error`;
  return (
    <li className="flex flex-col gap-related py-related">
      <div className="flex items-start justify-between gap-related">
        <Link href={`/products/${line.slug}`} className="font-medium hover:underline">
          {name}
        </Link>
        <p className="font-medium" data-testid="line-total">
          {formatMoney(line.lineTotal)}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-related">
        <div className="flex items-center gap-related">
          <form action={update.action}>
            <input type="hidden" name="productId" value={line.productId} />
            <input type="hidden" name="quantity" value={line.quantity - 1} />
            <Button
              type="submit"
              variant="outline"
              size="icon-sm"
              aria-label={`Decrease quantity of ${name}`}
              disabled={line.quantity <= 1 || update.pending}
            >
              <IconMinus aria-hidden="true" />
            </Button>
          </form>
          <output aria-label={`Quantity of ${name}`} className="min-w-8 text-center tabular-nums">
            {line.quantity}
          </output>
          <form action={update.action}>
            <input type="hidden" name="productId" value={line.productId} />
            <input type="hidden" name="quantity" value={line.quantity + 1} />
            <Button
              type="submit"
              variant="outline"
              size="icon-sm"
              aria-label={`Increase quantity of ${name}`}
              disabled={update.pending}
            >
              <IconPlus aria-hidden="true" />
            </Button>
          </form>
        </div>
        <form action={remove.action}>
          <input type="hidden" name="productId" value={line.productId} />
          <Button
            type="submit"
            variant="link"
            size="sm"
            disabled={remove.pending}
            aria-label={`${REMOVE_BUTTON} ${name}`}
          >
            {REMOVE_BUTTON}
          </Button>
        </form>
      </div>
      <FieldError id={errorId}>{update.state.fieldErrors?.quantity?.join(" ")}</FieldError>
      <CartFormMessage state={lineMessage(update.state, remove.state)} />
    </li>
  );
}
