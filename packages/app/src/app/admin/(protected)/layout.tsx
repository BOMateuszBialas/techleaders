import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/server/auth/auth.action";
import { requireAdminPage } from "@/server/auth/require-admin";

/**
 * Admin shell for every signed-in page. The sidebar is static and prerenders; the
 * session is read only inside the Suspense boundary below, never at the top of the
 * layout (Next 16 cache components). Every page in this group still calls
 * `requireAdminPage()` itself, close to its data.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex flex-col border-b bg-muted/40 md:w-56 md:border-r md:border-b-0">
        <div className="flex h-14 items-center px-4 font-semibold tracking-tight">
          CommerceOS Admin
        </div>
        <nav aria-label="Admin" className="flex gap-1 px-2 pb-2 text-sm md:flex-col">
          <Link
            href="/admin"
            className="rounded-md px-2 py-1.5 hover:bg-muted focus-visible:bg-muted"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/orders"
            className="rounded-md px-2 py-1.5 hover:bg-muted focus-visible:bg-muted"
          >
            Orders
          </Link>
          <Link
            href="/admin/products"
            className="rounded-md px-2 py-1.5 hover:bg-muted focus-visible:bg-muted"
          >
            Products
          </Link>
          <Link
            href="/admin/categories"
            className="rounded-md px-2 py-1.5 hover:bg-muted focus-visible:bg-muted"
          >
            Categories
          </Link>
          <Link href="/" className="rounded-md px-2 py-1.5 hover:bg-muted focus-visible:bg-muted">
            View storefront
          </Link>
        </nav>
        <div className="mt-auto border-t p-4 text-sm">
          <Suspense fallback={<p className="text-muted-foreground">Checking session…</p>}>
            <AdminSessionBadge />
          </Suspense>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}

async function AdminSessionBadge() {
  const admin = await requireAdminPage();
  return (
    <div className="flex flex-col gap-2">
      <p className="truncate text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{admin.email}</span>
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
