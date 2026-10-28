import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type SignInFormViewProps = {
  /** The owner sign-in server action (`signIn`), posted as a plain form. */
  action: (formData: FormData) => void | Promise<void>;
  /** Fixed message for the `error` search param (sign-in-errors.ts), or null. */
  errorMessage: string | null;
};

/**
 * Owner sign-in form (spec Phase 6, B2.25). A hook-free view so a unit test can render it
 * with and without an error; the page supplies the action and the message. The field names,
 * hidden inputs and autocomplete values are the contract with the action: do not change them.
 * The error is a form-level result (the action redirects with a code), so it is an `Alert`
 * with `role="alert"` above the fields, not a field error.
 */
export function SignInFormView({ action, errorMessage }: SignInFormViewProps) {
  return (
    <form action={action} className="flex flex-col gap-4">
      {errorMessage ? (
        <Alert variant="destructive" role="alert">
          {errorMessage}
        </Alert>
      ) : null}
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          maxLength={128}
        />
      </Field>
      <div>
        <Button type="submit">Sign in</Button>
      </div>
    </form>
  );
}
