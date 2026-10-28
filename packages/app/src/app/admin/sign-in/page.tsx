import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInFormView } from "@/components/admin/sign-in/sign-in-form-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <CardContent>
          <Suspense fallback={null}>
            <SignInForm searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function SignInForm({ searchParams }: Pick<PageProps<"/admin/sign-in">, "searchParams">) {
  const errorMessage = signInErrorMessage((await searchParams).error);
  return <SignInFormView action={signIn} errorMessage={errorMessage} />;
}

async function RedirectIfSignedIn() {
  if (await getCurrentAdmin()) redirect(ADMIN_HOME);
  return null;
}
