import type { ReactNode } from "react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ErrorState } from "@/components/ui/error-state";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TextLink } from "@/components/ui/text-link";
import { METRIC_DEFINITIONS } from "@core/domain/metrics/metric-definitions";
import { formatPln, orders, recommendations } from "../fixtures";
import { Notice, OwnerFrame, PageHead, type ScreenDef } from "../shared";

const SUGGESTED = [
  "Which products should I restock?",
  "How did paid orders change this week?",
  "Which products sold best in the last 7 days?",
  "Which products are low on stock?",
  "What is the average order value?",
  "How are visits from each source converting?",
  "What should I do first this week?",
];

function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-group-item @md:grid-cols-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Paid" || status === "Shipped" ? "success" : status === "Cancelled" ? "destructive" : status === "Pending payment" ? "warning" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

/* s13 owner sign-in (not the store frame, R09) */
function OwnerSignIn({ state }: { state: string }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-group px-gutter py-panel">
      <PageHead title="Admin sign-in" lead="For the store owner only. Customer accounts cannot use this area." />
      {state === "wrong-password" ? (
        <Notice variant="destructive">Sign-in failed. Check the email and password.</Notice>
      ) : null}
      {state === "attempt-limit" ? (
        <Notice variant="warning">Too many attempts. Try again in 15 minutes.</Notice>
      ) : null}
      {state === "customer-session" ? (
        <Notice variant="info" title="You are signed in as a customer">Sign out of your customer account first to use the admin area.</Notice>
      ) : null}
      <form className="flex flex-col gap-group" onSubmit={(e) => e.preventDefault()}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="o-email">Email</FieldLabel>
            <Input id="o-email" type="email" autoComplete="username" />
          </Field>
          <Field>
            <FieldLabel htmlFor="o-pass">Password</FieldLabel>
            <Input id="o-pass" type="password" autoComplete="current-password" aria-invalid={state === "wrong-password" || undefined} />
          </Field>
        </FieldGroup>
        <Button variant="default" size="lg" type="submit">Sign in</Button>
      </form>
    </div>
  );
}

/* s14 dashboard: definitions come from METRIC_DEFINITIONS (R05) */
function Dashboard({ state }: { state: string }) {
  if (state === "loading") return <Loading />;
  if (state === "error")
    return (
      <ErrorState
        title="Dashboard metrics are unavailable."
        description="Try again in a moment."
        action={<Button variant="outline">Try again</Button>}
      />
    );
  if (state === "empty-store")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No orders yet</EmptyTitle>
          <EmptyDescription>Orders will appear here after the first checkout.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  const noData = state === "not-enough-data";
  const values: Record<string, string> = noData
    ? { revenue: formatPln(0), paidOrders: "0", aov: "Not enough data", topProducts: "Not enough data", lowStock: "3" }
    : { revenue: formatPln(481200), paidOrders: "27", aov: formatPln(17822), topProducts: "Keyboard K7, Vortex 2, Headset H3", lowStock: "2" };
  const cards: [keyof typeof values, string][] = [
    ["revenue", "Revenue"],
    ["paidOrders", "Paid orders"],
    ["aov", "Average order value"],
    ["topProducts", "Top products"],
    ["lowStock", "Low stock"],
  ];
  const key = (id: string) => METRIC_DEFINITIONS[id as keyof typeof METRIC_DEFINITIONS];
  return (
    <div className="flex flex-col gap-group">
      <div className="flex flex-wrap items-center justify-between gap-related">
        <h1 className="font-heading type-h1">Dashboard</h1>
        <Tabs defaultValue={state === "30-days" ? "30" : "7"}>
          <TabsList aria-label="Period">
            <TabsTrigger value="7">Last 7 days</TabsTrigger>
            <TabsTrigger value="30">Last 30 days</TabsTrigger>
            <TabsTrigger value="custom">Custom range</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <p className="type-small text-muted-foreground">Period: 9–16 Oct 2026 (last 7 days). Times Europe/Warsaw.</p>
      {state === "invalid-range" ? (
        <Notice variant="destructive" title="The end date is before the start date">Showing the last 7 days instead.</Notice>
      ) : null}
      {noData ? <Notice variant="info" title="Not enough data">There are no paid orders in this period yet.</Notice> : null}
      <div className="grid gap-group-item @md:grid-cols-2 @3xl:grid-cols-3">
        {cards.map(([id, label]) => (
          <Card key={id}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="font-heading type-h2">{values[id]}</CardTitle>
            </CardHeader>
            <CardContent>
              <Disclosure>
                <DisclosureTrigger>How this number is defined</DisclosureTrigger>
                <DisclosureContent>
                  <p className="type-small text-muted-foreground">{key(id)?.definition}</p>
                </DisclosureContent>
              </Disclosure>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* s15 orders list: Demo / Account / Guest marking (R07) */
function OrdersList({ state }: { state: string }) {
  if (state === "loading") return <Loading rows={3} />;
  if (state === "error")
    return <ErrorState title="Orders are unavailable." description="Try again in a moment." action={<Button variant="outline">Try again</Button>} />;
  if (state === "empty")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No orders yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  return (
    <div className="flex flex-col gap-group">
      <h1 className="font-heading type-h1">Orders</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Placed</TableHead>
            <TableHead>Buyer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.reference}>
              <TableCell>
                <a href="#s16" className="font-mono text-link">{o.reference}</a>{" "}
                {o.owner === "Demo seed" ? <Badge variant="warning">Demo</Badge> : null}
              </TableCell>
              <TableCell>{o.date}</TableCell>
              <TableCell>
                <Badge variant="outline">{o.owner === "Demo seed" ? "Demo" : o.owner === "Account" ? "Account" : "Guest"}</Badge>
              </TableCell>
              <TableCell><StatusBadge status={o.status} /></TableCell>
              <TableCell className="text-right">{formatPln(o.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <nav aria-label="Paging" className="flex justify-between">
        <TextLink href="#s15" variant="standalone">Newer</TextLink>
        <TextLink href="#s15" variant="standalone">Older</TextLink>
      </nav>
    </div>
  );
}

/* s16 order detail and status workflow (A3, A4: only the allowed transitions) */
function OrderDetail({ state }: { state: string }) {
  if (state === "not-found")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Order not found</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  const status = state === "paid" ? "Paid" : state === "terminal" ? "Refunded" : state === "conflict" ? "Paid" : "Pending payment";
  const actions: string[] =
    status === "Pending payment" ? [] : status === "Paid" ? ["Mark as processing", "Mark as shipped", "Mark as refunded (record only)"] : status === "Refunded" ? [] : [];
  return (
    <div className="flex flex-col gap-group">
      <div className="flex flex-wrap items-center gap-related">
        <h1 className="font-heading type-h1 font-mono">DEMO-2026-0412</h1>
        <StatusBadge status={status} />
      </div>
      {state === "conflict" ? (
        <Notice variant="destructive" title="This order changed to Paid in the meantime">Reload to see the current status before you change it.</Notice>
      ) : null}
      {state === "terminal" ? <Notice variant="info">No further status changes.</Notice> : null}
      <Notice variant="info">Refunded is a record only. No money moves and stock is not returned.</Notice>
      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product (snapshot)</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Wireless mouse Vortex 2 [DEMO]</TableCell>
                <TableCell>2</TableCell>
                <TableCell className="text-right">{formatPln(49800)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Mechanical keyboard K7 (deleted product)</TableCell>
                <TableCell>1</TableCell>
                <TableCell className="text-right">{formatPln(44900)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-related">
        {actions.map((a) => (
          <Button key={a} variant={a.includes("refunded") ? "outline" : "default"}>{a}</Button>
        ))}
        {status === "Pending payment" ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive">Cancel order…</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                <AlertDialogDescription>The order is cancelled and its stock is returned to the products. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep order</AlertDialogCancel>
                <AlertDialogAction>Cancel order</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </div>
  );
}

/* s17 Copilot question (Copilot suggests; the merchant decides) */
function CopilotAsk({ state }: { state: string }) {
  if (state === "waiting")
    return (
      <div aria-busy="true" className="flex flex-col gap-group-item">
        <p className="type-small text-muted-foreground">Analysing your store data…</p>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  return (
    <div className="flex flex-col gap-group">
      <PageHead title="Commerce Copilot" />
      <Notice variant="info" title="Copilot suggests; you decide">It does not change prices, products, stock or orders.</Notice>
      {state === "rate-limited" ? <Notice variant="warning">You asked many questions. Try again later.</Notice> : null}
      {state === "unavailable" ? (
        <ErrorState
          title="Copilot is temporarily unavailable."
          description="Your question was not answered. You can ask again."
          action={<Button variant="outline">Ask again</Button>}
        />
      ) : null}
      <form className="flex flex-col gap-group" onSubmit={(e) => e.preventDefault()}>
        <Field data-invalid={state === "empty-question-error" || undefined}>
          <FieldLabel htmlFor="q">Your question</FieldLabel>
          <Textarea id="q" maxLength={500} aria-invalid={state === "empty-question-error" || undefined} />
          {state === "empty-question-error" ? <FieldError>Type a question first.</FieldError> : <FieldDescription>0 / 500</FieldDescription>}
        </Field>
        <Button variant="default" size="lg" type="submit" className="self-start">Ask</Button>
      </form>
      <section aria-label="Suggested questions" className="flex flex-col gap-related">
        <h2 className="font-heading type-h2">Suggested questions</h2>
        <div className="flex flex-wrap gap-related">
          {SUGGESTED.map((s) => (
            <Button key={s} variant="outline" size="sm" className="h-auto max-w-full min-h-(--control-h-sm) py-related text-left whitespace-normal">{s}</Button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* s18 Copilot answer, layouts A / B / C (mapa-ekranow.md §3) */
function CopilotAnswer({ state, layout }: { state: string; layout: string }) {
  const sourceLine: Record<string, [string, "info" | "warning" | "demo"]> = {
    ai: ["Source: AI-generated (model: demo-model-1). Checked against store data.", "info"],
    "not-configured": ["Source: rule-based insights. AI is not configured for this store.", "info"],
    "timed-out": ["Source: rule-based insights. The AI answer timed out.", "warning"],
    "daily-limit": ["Source: rule-based insights. The daily AI limit was reached.", "warning"],
    "failed-checks": ["Source: rule-based insights. The AI answer failed our checks.", "warning"],
  };
  if (state === "unavailable")
    return (
      <ErrorState
        title="Copilot is temporarily unavailable."
        description="Your question was not answered. You can ask again."
        action={<Button variant="outline">Ask again</Button>}
      />
    );
  if (state === "empty-store")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Not enough data yet: no paid orders and no traffic in this period.</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <TextLink href="#s17" variant="standalone">Back to questions</TextLink>
        </EmptyContent>
      </Empty>
    );
  if (state === "refusal" || state === "outside-list")
    return (
      <div className="flex flex-col gap-group">
        <PageHead title="Commerce Copilot" />
        <Notice variant="info" title={state === "refusal" ? "Copilot cannot give a margin answer" : "This question is outside the list"}>
          {state === "refusal"
            ? "The store has no cost data, so margin is not evaluated. Try: Which products sold best?"
            : "Copilot answers seven fixed questions. Pick one from the list."}
        </Notice>
      </div>
    );

  const source = sourceLine[state];
  const sourceBanner = source ? <Notice variant={source[1]}>{source[0]}</Notice> : null;
  const period = <p className="type-small text-muted-foreground">Period: 9–16 Oct 2026 (last 7 days). Limits: {recommendations[0].limitation}</p>;
  const evidence = (rows: string[][]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Metric</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([m, v]) => (
          <TableRow key={m}>
            <TableCell>{m}</TableCell>
            <TableCell className="text-right">{v}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
  const card = (r: (typeof recommendations)[number]) => (
    <Card key={r.id}>
      <CardHeader>
        <CardDescription>
          {r.id} · Priority: {r.priority}
        </CardDescription>
        <CardTitle>{r.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-group-item">
        <p>{r.observation}</p>
        <p className="type-small text-muted-foreground">Reasoning: the figures show a pattern in this period; they do not prove a cause. Limits: {r.limitation}</p>
        {evidence(r.evidence)}
      </CardContent>
    </Card>
  );

  if (layout === "B")
    return (
      <div className="flex flex-col gap-group">
        <PageHead title="Commerce Copilot: answer" />
        {sourceBanner}
        {period}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recommendation</TableHead>
              <TableHead>Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendations.map((r) => (
              <TableRow key={r.id}>
                <TableCell><a href={`#${r.id}`}>{r.title}</a></TableCell>
                <TableCell>{r.priority}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {recommendations.map(card)}
      </div>
    );
  if (layout === "C")
    return (
      <div className="flex flex-col gap-group">
        <PageHead title="Commerce Copilot: answer" />
        {sourceBanner}
        {period}
        <Tabs defaultValue="R1">
          <TabsList aria-label="Recommendations">
            {recommendations.map((r) => (
              <TabsTrigger key={r.id} value={r.id}>{r.id}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {recommendations.slice(0, 1).map(card)}
      </div>
    );
  return (
    <div className="flex flex-col gap-group">
      <PageHead title="Commerce Copilot: answer" />
      {sourceBanner}
      {period}
      {recommendations.map(card)}
    </div>
  );
}

/* s19 recommendation decisions (Copilot A14: new → saved or dismissed; saved → completed or dismissed) */
function Decisions({ state }: { state: string }) {
  if (state === "empty")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Saved recommendations appear here.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  const rows = recommendations.map((r, i) => ({
    ...r,
    status: state === "completed" && i === 0 ? "Completed" : state === "dismissed" && i === 1 ? "Dismissed" : "Saved",
  }));
  return (
    <div className="flex flex-col gap-group">
      <h1 className="font-heading type-h1">Your recommendations</h1>
      {state === "conflict" ? (
        <Notice variant="warning" title="This recommendation changed in another tab">Reload to see its current status.</Notice>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recommendation</TableHead>
            <TableHead>Status</TableHead>
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.title}</TableCell>
              <TableCell><Badge variant={r.status === "Completed" ? "success" : r.status === "Dismissed" ? "outline" : "secondary"}>{r.status}</Badge></TableCell>
              <TableCell>
                <div className="flex flex-wrap justify-end gap-related">
                  {r.status === "Saved" ? (
                    <>
                      <Button size="sm" variant="outline">Mark completed</Button>
                      <Button size="sm" variant="ghost">Dismiss</Button>
                    </>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function owner(id: string, title: string, states: string[], render: (p: { state: string; layout: string }) => ReactNode, layouts?: string[]): ScreenDef {
  return { id, title, group: "Owner", states, layouts, render };
}

export const ownerScreens: ScreenDef[] = [
  { id: "s13", title: "Owner sign-in", group: "Owner", states: ["default", "wrong-password", "attempt-limit", "customer-session"], render: (p) => <OwnerSignIn state={p.state} /> },
  owner("s14", "Dashboard", ["7-days", "30-days", "invalid-range", "not-enough-data", "empty-store", "loading", "error"], (p) => <OwnerFrame current="s14"><Dashboard state={p.state} /></OwnerFrame>),
  owner("s15", "Orders", ["list", "empty", "loading", "error"], (p) => <OwnerFrame current="s15"><OrdersList state={p.state} /></OwnerFrame>),
  owner("s16", "Order detail", ["paid", "pending", "terminal", "conflict", "not-found"], (p) => <OwnerFrame current="s15"><OrderDetail state={p.state} /></OwnerFrame>),
  owner("s17", "Copilot question", ["default", "empty-question-error", "waiting", "rate-limited", "unavailable"], (p) => <OwnerFrame current="s17"><CopilotAsk state={p.state} /></OwnerFrame>),
  owner("s18", "Copilot answer", ["ai", "not-configured", "timed-out", "daily-limit", "failed-checks", "refusal", "outside-list", "empty-store", "unavailable"], (p) => <OwnerFrame current="s17"><CopilotAnswer state={p.state} layout={p.layout} /></OwnerFrame>, ["A", "B", "C"]),
  owner("s19", "Recommendation decisions", ["saved", "empty", "completed", "dismissed", "conflict"], (p) => <OwnerFrame current="s17"><Decisions state={p.state} /></OwnerFrame>),
];

