import Link from "next/link";

/**
 * Storefront shell shared by the home page, the listing and product pages. It reads no
 * request data, so it prerenders. The header leaves room for the cart (spec G22); the
 * cart spec adds it.
 */
export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <p role="note" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
        Demo store. Products and prices are fictional; no real orders or payments.
      </p>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="font-semibold tracking-tight">
            CommerceOS
          </Link>
          <nav aria-label="Main" className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/products" className="hover:text-foreground focus-visible:underline">
              Products
            </Link>
            <Link href="/admin" className="hover:text-foreground focus-visible:underline">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
        {children}
      </main>
    </div>
  );
}
