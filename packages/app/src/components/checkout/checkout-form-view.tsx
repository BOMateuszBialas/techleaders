import Link from "next/link";
import { FieldError, FormMessage, fieldA11y } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import {
  PLACE_ORDER_BUTTON,
  PLACING_ORDER,
  REVIEW_CART_LINK,
  SHIPPING_COUNTRY_NAME,
} from "./checkout-copy";

/** What the server rendered into the form: never a price the server would trust (A6, A7). */
export type CheckoutFormContext = {
  idempotencyKey: string;
  cartFingerprint: string;
  expectedTotalMinor: number;
};

export type CheckoutFormViewProps = CheckoutFormContext & {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
};

type FieldSpec = {
  name: string;
  label: string;
  autoComplete: string;
  type?: string;
  optional?: boolean;
};

/** Guest checkout fields (spec G6). Personal data: these values are never logged. */
const FIELDS: FieldSpec[] = [
  { name: "customerName", label: "Full name", autoComplete: "name" },
  { name: "customerEmail", label: "Email", autoComplete: "email", type: "email" },
  { name: "shippingLine1", label: "Address", autoComplete: "address-line1" },
  {
    name: "shippingLine2",
    label: "Address line 2 (optional)",
    autoComplete: "address-line2",
    optional: true,
  },
  { name: "shippingCity", label: "City", autoComplete: "address-level2" },
  { name: "shippingPostalCode", label: "Postal code", autoComplete: "postal-code" },
];

/**
 * The checkout form in one given state (cart spec, UI/UX "/checkout"): no hooks, so a unit
 * test renders every state; `CheckoutForm` connects it to `useActionState`. The hidden fields
 * carry what the page rendered (key, cart fingerprint, total) for the staleness and
 * idempotency checks; the lines themselves come from the cookie. The country is fixed to Poland
 * (G6). There is no payment field of any kind (R03). `noValidate` lets the server's messages
 * show under each field. A conflict (stock, price, cart changed) links back to the cart.
 */
export function CheckoutFormView({
  action,
  state,
  pending,
  idempotencyKey,
  cartFingerprint,
  expectedTotalMinor,
}: CheckoutFormViewProps) {
  const errors = state.fieldErrors ?? {};
  const isConflict = state.status === "error" && Object.keys(errors).length === 0;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="cartFingerprint" value={cartFingerprint} />
      <input type="hidden" name="expectedTotalMinor" value={String(expectedTotalMinor)} />
      <input type="hidden" name="shippingCountry" value="PL" />
      {FIELDS.map((field) => {
        const id = `checkout-${field.name}`;
        const errorId = `${id}-error`;
        return (
          <div key={field.name} className="flex flex-col gap-2">
            <Label htmlFor={id}>{field.label}</Label>
            <Input
              id={id}
              name={field.name}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              required={!field.optional}
              defaultValue={fieldDefault(state, field.name)}
              {...fieldA11y(errorId, errors[field.name])}
            />
            <FieldError id={errorId} messages={errors[field.name]} />
          </div>
        );
      })}
      <p className="text-sm">
        Country: <span className="font-medium">{SHIPPING_COUNTRY_NAME}</span>
      </p>
      <FormMessage state={state} />
      {isConflict ? (
        <Link href="/cart" className="w-fit text-sm underline underline-offset-4">
          {REVIEW_CART_LINK}
        </Link>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? PLACING_ORDER : PLACE_ORDER_BUTTON}
        </Button>
      </div>
    </form>
  );
}
