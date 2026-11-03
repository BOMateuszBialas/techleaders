import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLink } from "@/components/ui/text-link";
import { Notice, PageHead, ShopperFrame, type ScreenDef } from "../shared";

/*
 * SIMULATED. The lookup finds only the demo order CO-24817 (spec AS-13); sign-up and sign-in never
 * reach a server. States are switched from the review bar, as on the other screens (AS-14, AS-15).
 */

function Loading({ title }: { title: string }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-group">
      <PageHead title={title} />
      <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-group-item">
        <Skeleton className="h-control-lg w-full" />
        <Skeleton className="h-control-lg w-full" />
      </div>
    </div>
  );
}

/** Error block with the screen heading kept, so every state of a screen has an h1. */
function AccountError({ title }: { title: string }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-group">
      <PageHead title={title} />
      <ErrorState
        title="This page could not be loaded."
        description="Try again later."
        action={<Button variant="outline">Try again</Button>}
      />
    </div>
  );
}

/* s08 order lookup (guest). A match opens s07 only for a guest order or the owner of an account order. */
function Lookup({ state }: { state: string }) {
  if (state === "error") return <AccountError title="Find an order" />;
  const malformed = state === "malformed";
  const value =
    state === "malformed" ? "24817" : state === "no-match" ? "CO-00000" : state === "match" || state === "rate-limited" ? "CO-24817" : "";
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-group">
      <PageHead title="Find an order" lead="Guests find an order with its reference only." />
      {state === "rate-limited" ? (
        <Notice variant="warning">Too many lookups. Try again in a minute.</Notice>
      ) : null}
      {state === "no-match" ? <Notice variant="destructive">No order matches that reference.</Notice> : null}
      {state === "match" ? (
        <Notice variant="success" title="Order found">
          <span className="flex flex-col gap-related">
            <span>Order CO-24817 is shown in full on the next page.</span>
            <Button variant="action" render={<a href="#s07" />} className="w-fit">Open order</Button>
          </span>
        </Notice>
      ) : null}
      <form key={state} className="flex flex-col gap-group" onSubmit={(e) => e.preventDefault()}>
        <FieldGroup>
          <Field data-invalid={malformed || undefined}>
            <FieldLabel htmlFor="lk-ref">Order reference</FieldLabel>
            <Input id="lk-ref" name="ref" autoComplete="off" defaultValue={value} aria-invalid={malformed || undefined} />
            {malformed ? <FieldError>Enter a reference such as CO-24817.</FieldError> : null}
          </Field>
        </FieldGroup>
        <Button variant="action" size="lg" type="submit" className="w-full">Find order</Button>
      </form>
      <p className="type-small text-muted-foreground">
        Demo store: only order CO-24817 can be found here. There is no password reset in this demo.
      </p>
    </div>
  );
}

/* s09 customer sign-up. A duplicate of klient-a@demo.test gives a generic error; success signs in customer A. */
function SignUp({ state }: { state: string }) {
  if (state === "loading") return <Loading title="Create an account" />;
  if (state === "error") return <AccountError title="Create an account" />;
  if (state === "created")
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-group">
        <PageHead title="Create an account" />
        <Notice variant="success" title="Account created. You are signed in.">
          <span className="flex flex-col gap-related">
            <span>Your orders will be kept in My orders.</span>
            <Button variant="action" render={<a href="#s11" />} className="w-fit">Go to My orders</Button>
          </span>
        </Notice>
      </div>
    );
  const invalid = state === "field-errors";
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-group">
      <PageHead title="Create an account" />
      <Notice variant="info">Demo store: accounts are fictional. There is no password reset and no email check.</Notice>
      {state === "duplicate-email" ? (
        <Notice variant="destructive">We could not create an account with these details.</Notice>
      ) : null}
      <form key={state} className="flex flex-col gap-group" onSubmit={(e) => e.preventDefault()}>
        <FieldGroup>
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="su-email">Email</FieldLabel>
            <Input
              id="su-email"
              type="email"
              autoComplete="email"
              defaultValue={state === "duplicate-email" ? "klient-a@demo.test" : invalid ? "anna@" : ""}
              aria-invalid={invalid || state === "duplicate-email" || undefined}
            />
            {invalid ? <FieldError>Enter a valid email address.</FieldError> : null}
          </Field>
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="su-pass">Password (8 characters or more)</FieldLabel>
            <Input id="su-pass" type="password" autoComplete="new-password" aria-invalid={invalid || undefined} />
            {invalid ? <FieldError>Use at least 8 characters.</FieldError> : null}
          </Field>
        </FieldGroup>
        <Button variant="action" size="lg" type="submit" className="w-full">Create account</Button>
      </form>
      <p className="type-small">
        <TextLink href="#s05" variant="standalone">Continue as a guest</TextLink>
        {" · "}
        <TextLink href="#s10" variant="standalone">Sign in</TextLink>
      </p>
    </div>
  );
}

/* s10 customer sign-in. Wrong password is generic; success goes to checkout if the cart has items, else My orders. */
function SignIn({ state }: { state: string }) {
  if (state === "error") return <AccountError title="Sign in" />;
  const invalid = state === "field-errors";
  const credentialsWrong = state === "wrong-password";
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-group">
      <PageHead title="Sign in" />
      {credentialsWrong ? <Notice variant="destructive">Email or password is incorrect.</Notice> : null}
      {state === "unavailable" ? <Notice variant="destructive">Sign-in is unavailable. Try again later.</Notice> : null}
      {state === "attempt-limit" ? <Notice variant="warning">Too many attempts. Try again in a few minutes.</Notice> : null}
      {state === "signed-in-cart" ? (
        <Notice variant="success" title="Signed in">
          <span className="flex flex-col gap-related">
            <span>Your cart has items, so checkout comes next.</span>
            <Button variant="action" render={<a href="#s05" />} className="w-fit">Continue to checkout</Button>
          </span>
        </Notice>
      ) : null}
      {state === "signed-in-empty-cart" ? (
        <Notice variant="success" title="Signed in">
          <span className="flex flex-col gap-related">
            <span>Your orders are in My orders.</span>
            <Button variant="action" render={<a href="#s11" />} className="w-fit">Go to My orders</Button>
          </span>
        </Notice>
      ) : null}
      <form key={state} className="flex flex-col gap-group" onSubmit={(e) => e.preventDefault()}>
        <FieldGroup>
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="si-email">Email</FieldLabel>
            <Input
              id="si-email"
              type="email"
              autoComplete="email"
              defaultValue={credentialsWrong || state === "attempt-limit" ? "klient-a@demo.test" : ""}
              aria-invalid={invalid || credentialsWrong || undefined}
            />
            {invalid ? <FieldError>Enter your email.</FieldError> : null}
          </Field>
          <Field data-invalid={invalid || credentialsWrong || undefined}>
            <FieldLabel htmlFor="si-pass">Password</FieldLabel>
            <Input id="si-pass" type="password" autoComplete="current-password" aria-invalid={invalid || credentialsWrong || undefined} />
            {invalid ? <FieldError>Enter your password.</FieldError> : null}
          </Field>
        </FieldGroup>
        <Button variant="action" size="lg" type="submit" className="w-full">Sign in</Button>
      </form>
      <p className="type-small">
        <TextLink href="#s09" variant="standalone">Create an account</TextLink>
      </p>
    </div>
  );
}

function framedAccount(node: ReactNode) {
  return <ShopperFrame>{node}</ShopperFrame>;
}

/** Customer account screens of the key flow (s08 to s10), in the store frame. */
export const accountScreens: ScreenDef[] = [
  {
    id: "s08",
    title: "Order lookup (guest)",
    group: "Shopper",
    states: ["default", "malformed", "rate-limited", "no-match", "match", "error"],
    render: (p) => framedAccount(<Lookup state={p.state} />),
  },
  {
    id: "s09",
    title: "Customer sign-up",
    group: "Shopper",
    states: ["default", "field-errors", "duplicate-email", "created", "loading", "error"],
    render: (p) => framedAccount(<SignUp state={p.state} />),
  },
  {
    id: "s10",
    title: "Customer sign-in",
    group: "Shopper",
    states: ["default", "field-errors", "wrong-password", "unavailable", "attempt-limit", "signed-in-cart", "signed-in-empty-cart", "error"],
    render: (p) => framedAccount(<SignIn state={p.state} />),
  },
];
