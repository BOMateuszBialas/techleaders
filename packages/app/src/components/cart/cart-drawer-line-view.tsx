import Link from "next/link";
import { IconMinus, IconPlus, IconTrash } from "@tabler/icons-react";
import { formatMoney, type PricedCartLine } from "@commerceos/core";
import { ProductThumbnail } from "@/components/catalog/product-thumbnail";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";
import { CartFormMessage } from "./cart-form-message";
import { REMOVE_BUTTON } from "./cart-copy";
import { lineMessage } from "./cart-line-view";
import { QuantityStepperView } from "./quantity-stepper-view";

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
 * One cart line in the drawer, in one given state (storefront v2, Phase 2): the photo, the name,
 * and a row with the quantity ("−" and "+", without borders), the line total and the trash button
 * in one line. "−" stops at 1 (the trash button is the way to empty a line). "+" is sent to the
 * server, which refuses a quantity above the stock under the line ("Only N left in stock.").
 * No hooks: `CartDrawerLine` connects both forms to `useActionState`.
 */
export function CartDrawerLineView({ line, update, remove }: CartDrawerLineViewProps) {
  const name = line.name;
  const errorId = `drawer-quantity-${line.productId}-error`;
  return (
    <li className="flex items-start gap-related py-related">
      <ProductThumbnail imageUrl={line.imageUrl} name={name} widthClassName="w-20" />
      <div className="flex min-w-0 flex-1 flex-col gap-related">
        <div className="flex flex-col gap-related">
          <Link href={`/products/${line.slug}`} className="font-medium hover:underline">
            {name}
          </Link>
          <p className="text-sm font-medium tabular-nums" data-testid="line-total">
            {formatMoney(line.lineTotal)}
          </p>
          <div className="flex items-center justify-between gap-related">
            <QuantityStepperView
              label={`Quantity of ${name}`}
              quantity={line.quantity}
              decrease={
                <form action={update.action}>
                  <input type="hidden" name="productId" value={line.productId} />
                  <input type="hidden" name="quantity" value={line.quantity - 1} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 sm:size-8"
                    aria-label={`Decrease quantity of ${name}`}
                    disabled={line.quantity <= 1 || update.pending}
                  >
                    <IconMinus aria-hidden="true" />
                  </Button>
                </form>
              }
              increase={
                <form action={update.action}>
                  <input type="hidden" name="productId" value={line.productId} />
                  <input type="hidden" name="quantity" value={line.quantity + 1} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 sm:size-8"
                    aria-label={`Increase quantity of ${name}`}
                    disabled={update.pending}
                  >
                    <IconPlus aria-hidden="true" />
                  </Button>
                </form>
              }
            />
            <form action={remove.action}>
              <input type="hidden" name="productId" value={line.productId} />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="size-11 text-foreground"
                disabled={remove.pending}
                aria-label={`${REMOVE_BUTTON} ${name}`}
                title={REMOVE_BUTTON}
              >
                <IconTrash aria-hidden="true" />
              </Button>
            </form>
          </div>
        </div>
        <FieldError id={errorId}>{update.state.fieldErrors?.quantity?.join(" ")}</FieldError>
        <CartFormMessage state={lineMessage(update.state, remove.state)} />
      </div>
    </li>
  );
}
