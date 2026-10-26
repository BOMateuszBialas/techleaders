import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCOUNT_COPY } from "./account-copy";

export type CustomerAuthMode = "sign-in" | "sign-up";

export type CustomerAuthCardProps = {
  mode: CustomerAuthMode;
  action: (formData: FormData) => void | Promise<void>;
  /** A fixed message chosen from the `error` code, or null. Never request text. */
  error: string | null;
  /** True when the shopper came from checkout (`from=checkout`, spec A17). */
  fromCheckout: boolean;
};

const MODES = {
  "sign-in": {
    title: ACCOUNT_COPY.signInTitle,
    submit: "Sign in",
    passwordAutoComplete: "current-password",
    switchPrompt: "No account yet?",
    switchLabel: "Create an account",
    switchPath: "/account/sign-up",
  },
  "sign-up": {
    title: ACCOUNT_COPY.signUpTitle,
    submit: "Create account",
    passwordAutoComplete: "new-password",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchPath: "/account/sign-in",
  },
} as const;

/**
 * What the auth pages show while the request-time card streams in: a placeholder, not a form,
 * so nobody can submit a form that lacks the request's `from=checkout` code.
 */
export function CustomerAuthCardSkeleton() {
  return (
    <div
      aria-label="Loading"
      className="mx-auto h-96 w-full max-w-sm animate-pulse rounded-xl bg-muted"
    />
  );
}

/**
 * Customer sign-in or sign-up card (E07 spec, UI/UX): email and password only (A7), a generic
 * `role="alert"` error, links between the two pages and "Continue as a guest". A plain form
 * posting to a server action, so it works without client JavaScript; errors come back as fixed
 * `?error=` codes. `from=checkout` travels in a hidden field and in the switch link.
 */
export function CustomerAuthCard({ mode, action, error, fromCheckout }: CustomerAuthCardProps) {
  const copy = MODES[mode];
  const switchHref = fromCheckout ? `${copy.switchPath}?from=checkout` : copy.switchPath;
  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1>{copy.title}</h1>
        </CardTitle>
        <CardDescription>{ACCOUNT_COPY.signInLimitation}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <form action={action} className="flex flex-col gap-4">
          {fromCheckout ? <input type="hidden" name="from" value="checkout" /> : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="customer-email">Email</Label>
            <Input id="customer-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="customer-password">Password</Label>
            <Input
              id="customer-password"
              name="password"
              type="password"
              autoComplete={copy.passwordAutoComplete}
              required
              minLength={8}
              maxLength={128}
            />
          </div>
          <Button type="submit">{copy.submit}</Button>
        </form>
        <p className="text-sm text-muted-foreground">
          {copy.switchPrompt}{" "}
          <Link href={switchHref} className="underline underline-offset-4">
            {copy.switchLabel}
          </Link>
        </p>
        <Link
          href={fromCheckout ? "/checkout" : "/"}
          className="text-sm underline underline-offset-4"
        >
          {ACCOUNT_COPY.continueAsGuest}
        </Link>
      </CardContent>
    </Card>
  );
}
