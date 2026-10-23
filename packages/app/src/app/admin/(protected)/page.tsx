import type { Metadata } from "next";
import { Suspense } from "react";
import { DASHBOARD_UNAVAILABLE_MESSAGE } from "@/components/admin/dashboard/dashboard-copy";
import { DashboardView } from "@/components/admin/dashboard/dashboard-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/server/auth/require-admin";
import { loadDashboard } from "./load-dashboard";
import { loadSystemHealth } from "./load-system-health";

export const metadata: Metadata = { title: "Admin" };

/**
 * Store metrics for `?period=7d|30d` or a custom `?from=YYYY-MM-DD&to=YYYY-MM-DD`, compared with
 * the previous period (orders spec Phase 3, date-range spec), then the system status.
 */
export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Orders, revenue and stock from this store&apos;s own data. Every number states how it is
          counted.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading metrics…</p>}>
        <StoreMetrics searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Checking…</p>}>
        <SystemStatus />
      </Suspense>
    </div>
  );
}

/** Everything that needs the request: the admin check first, then the data. */
async function StoreMetrics({
  searchParams,
}: {
  searchParams: PageProps<"/admin">["searchParams"];
}) {
  await requireAdminPage();
  const { period, from, to } = await searchParams;
  const result = await loadDashboard({ period, from, to });

  if (result.kind !== "ok") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {DASHBOARD_UNAVAILABLE_MESSAGE}
      </p>
    );
  }
  return <DashboardView dashboard={result.data} />;
}

async function SystemStatus() {
  await requireAdminPage();
  const health = await loadSystemHealth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>Live result of the same checks as GET /api/health.</CardDescription>
      </CardHeader>
      <CardContent>
        {health ? (
          <ul className="flex flex-col gap-2 text-sm">
            {health.components.map((component) => (
              <li key={component.name} className="flex items-center gap-2">
                <Badge variant={component.status === "up" ? "default" : "destructive"}>
                  {component.status}
                </Badge>
                <span className="capitalize">{component.name}</span>
                <span className="text-muted-foreground">{component.latencyMs} ms</span>
              </li>
            ))}
          </ul>
        ) : (
          <p role="alert" className="text-sm text-destructive">
            Status unavailable. Check the server configuration (.env) and logs.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
