import Link from "next/link";

/** Storefront shell. The catalog (product listing and detail) arrives in Week 2. */
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <span className="font-semibold tracking-tight">CommerceOS</span>
          <nav aria-label="Main" className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground focus-visible:underline">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Storefront</h1>
        <p className="max-w-prose text-muted-foreground">
          The product catalog is not implemented yet. This page is the storefront shell of the
          CommerceOS foundation.
        </p>
      </main>
    </div>
  );
}
