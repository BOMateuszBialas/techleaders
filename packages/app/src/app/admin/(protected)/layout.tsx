import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
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
    <div data-density="admin" className="flex flex-1 flex-col md:flex-row">
      <aside className="flex flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:w-56 md:border-r md:border-b-0">
        <div className="flex h-14 items-center px-4 font-semibold tracking-tight">
          CommerceOS Admin
        </div>
        <AdminNav />
        <div className="mt-auto flex flex-col gap-4 border-t border-sidebar-border p-4 text-sm">
          <ThemeToggle />
          <Suspense
            fallback={
              <SkeletonGroup label="Checking session" className="flex flex-col gap-2">
                <Skeleton className="h-control-md w-full" />
              </SkeletonGroup>
            }
          >
            <AdminSessionBadge />
          </Suspense>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}

async function AdminSessionBadge() {
  const admin = await requireAdminPage();
  return (
    <div className="flex flex-col gap-2">
      <p className="truncate text-sidebar-muted-foreground">
        Signed in as <span className="font-medium text-sidebar-foreground">{admin.email}</span>
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
