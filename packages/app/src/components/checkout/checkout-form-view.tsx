import { ACCOUNT_COPY, CUSTOMER_SIGN_IN_FROM_CHECKOUT } from "@/components/account/account-copy";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TextLink } from "@/components/ui/text-link";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import { fieldA11y } from "@/lib/field-a11y";
import {
  PLACE_ORDER_BUTTON,
  PLACING_ORDER,
  REVIEW_CART_LINK,
  SHIPPING_COUNTRY_NAME,
} from "./checkout-copy";
import {
  CHECKOUT_AS_FIELD,
  CHECKOUT_SESSION_LOST,
  shownCheckoutMode,
  type CheckoutMode,
} from "./checkout-mode";

/** What the server rendered into the form: never a price the server would trust (A6, A7). */
export type CheckoutFormContext = {
  idempotencyKey: string;
  cartFingerprint: string;
  expectedTotalMinor: number;
  /** The mode this request's session read gave (E07 spec A24). */
  mode: CheckoutMode;
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

/**
 * Checkout fields (spec G6). Personal data: these values are never logged. The label is the
 * text alone; `optional` makes `FieldLabel` print "(optional)" (retrofit Phase 2, C12).
 */
const FIELDS: FieldSpec[] = [
  { name: "customerName", label: "Full name", autoComplete: "name" },
  { name: "customerEmail", label: "Email", autoComplete: "email", type: "email" },
  { name: "shippingLine1", label: "Address", autoComplete: "address-line1" },
  {
    name: "shippingLine2",
    label: "Address line 2",
    autoComplete: "address-line2",
    optional: true,
  },
  { name: "shippingCity", label: "City", autoComplete: "address-level2" },
  { name: "shippingPostalCode", label: "Postal code", autoComplete: "postal-code" },
];

/** The checkout's field names in the form's order (the focus after a failed submit, C3). */
export const CHECKOUT_FIELD_NAMES: readonly string[] = FIELDS.map((field) => field.name);

/**
 * Who the order is placed as (E07 spec A24), right above the submit button: "Buying as <email>"
 * for a confirmed customer session, otherwise "Buying as a guest" with the sign-in link, plus
 * the banner when the sign-in could not be confirmed. Plain text and a link: no JavaScript needed.
 */
function CheckoutModeLine({ mode }: { mode: CheckoutMode }) {
  if (mode.kind === "account") {
    return (
      <div className="flex flex-col gap-1 text-sm" data-testid="checkout-mode">
        <p className="wrap-anywhere">
          {ACCOUNT_COPY.buyingAs} <span className="font-medium">{mode.email}</span>
        </p>
        <p className="text-muted-foreground">{ACCOUNT_COPY.accountOrderNote}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 text-sm" data-testid="checkout-mode">
      {mode.sessionError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{ACCOUNT_COPY.sessionLost}</AlertDescription>
        </Alert>
      ) : null}
      <p>
        {ACCOUNT_COPY.buyingAsGuest}{" "}
        <TextLink href={CUSTOMER_SIGN_IN_FROM_CHECKOUT}>{ACCOUNT_COPY.checkoutSignIn}</TextLink>
      </p>
    </div>
  );
}

/**
 * The checkout form in one given state (cart spec, UI/UX "/checkout"): no hooks, so a unit
 * test renders every state; `CheckoutForm` connects it to `useActionState`. The hidden fields
 * carry what the page rendered (key, cart fingerprint, total) for the staleness and
 * idempotency checks, and the shown mode as `checkoutAs` (E07 A24); the lines themselves come
 * from the cookie. In account mode the email starts as the account's and stays editable: it is
 * only the order's contact snapshot (A16). The country is fixed to Poland (G6). There is no
 * payment field of any kind (R03). `noValidate` lets the server's messages show under each
 * field. A conflict (stock, price, cart changed) links back to the cart.
 */
export function CheckoutFormView({
  action,
  state,
  pending,
  idempotencyKey,
  cartFingerprint,
  expectedTotalMinor,
  mode: pageMode,
}: CheckoutFormViewProps) {
  const mode = shownCheckoutMode(pageMode, state);
  const sessionLost = state.code === CHECKOUT_SESSION_LOST;
  const errors = state.fieldErrors ?? {};
  const isConflict = state.status === "error" && Object.keys(errors).length === 0 && !sessionLost;
  const stored: Record<string, string> =
    mode.kind === "account" ? { customerEmail: mode.email } : {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="cartFingerprint" value={cartFingerprint} />
      <input type="hidden" name="expectedTotalMinor" value={String(expectedTotalMinor)} />
      <input type="hidden" name="shippingCountry" value="PL" />
      <input type="hidden" name={CHECKOUT_AS_FIELD} value={mode.kind} />
      {FIELDS.map((field) => {
        const id = `checkout-${field.name}`;
        const errorId = `${id}-error`;
        return (
          <Field key={field.name}>
            <FieldLabel htmlFor={id} optional={field.optional}>
              {field.label}
            </FieldLabel>
            <Input
              id={id}
              name={field.name}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              required={!field.optional}
              defaultValue={fieldDefault(state, field.name, stored[field.name])}
              {...fieldA11y(errorId, errors[field.name])}
            />
            <FieldError id={errorId}>{errors[field.name]?.join(" ")}</FieldError>
          </Field>
        );
      })}
      <p className="text-sm">
        Country: <span className="font-medium">{SHIPPING_COUNTRY_NAME}</span>
      </p>
      {sessionLost || state.status !== "error" ? null : (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {isConflict ? (
        <TextLink href="/cart" variant="standalone">
          {REVIEW_CART_LINK}
        </TextLink>
      ) : null}
      <CheckoutModeLine mode={mode} />
      <div>
        <Button type="submit" variant="action" disabled={pending} aria-busy={pending}>
          {pending ? PLACING_ORDER : PLACE_ORDER_BUTTON}
        </Button>
      </div>
    </form>
  );
}
