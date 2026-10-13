import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadSystemHealth } from "./load-system-health";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Store metrics and Commerce Copilot will appear here. Admin authentication is not
          implemented yet.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>Live result of the same checks as GET /api/health.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Checking…</p>}>
            <SystemStatus />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function SystemStatus() {
  await connection();
  const health = await loadSystemHealth();

  if (!health) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Status unavailable. Check the server configuration (.env) and logs.
      </p>
    );
  }

  return (
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
  );
}
