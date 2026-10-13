import Link from "next/link";

/**
 * Admin shell.
 * SECURITY: admin authentication is not implemented yet (next task). Until
 * then this shell must not expose store data or mutations.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b bg-muted/40 md:w-56 md:border-r md:border-b-0">
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
          <Link href="/" className="rounded-md px-2 py-1.5 hover:bg-muted focus-visible:bg-muted">
            View storefront
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
