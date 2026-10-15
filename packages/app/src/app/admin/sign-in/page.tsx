import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/server/auth/auth.action";
import { getCurrentAdmin } from "@/server/auth/require-admin";
import { signInErrorMessage } from "@/server/auth/sign-in-errors";
import { ADMIN_HOME } from "@/server/auth/sign-in";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Owner sign-in. A plain form posting to a server action: it works without client
 * JavaScript, and errors come back as a fixed `?error=` code (see sign-in-errors.ts).
 */
export default function SignInPage({ searchParams }: PageProps<"/admin/sign-in">) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Sign in to CommerceOS Admin</h1>
          </CardTitle>
          <CardDescription>The store owner&apos;s panel of this demo store.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Suspense fallback={null}>
            <SignInError searchParams={searchParams} />
          </Suspense>
          <form action={signIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={128}
              />
            </div>
            <Button type="submit">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

async function SignInError({ searchParams }: Pick<PageProps<"/admin/sign-in">, "searchParams">) {
  const message = signInErrorMessage((await searchParams).error);
  return message ? (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

async function RedirectIfSignedIn() {
  if (await getCurrentAdmin()) redirect(ADMIN_HOME);
  return null;
}
