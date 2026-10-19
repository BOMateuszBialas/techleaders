import type { Dashboard, MetricDefinition } from "@commerceos/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { productPath } from "@/components/admin/products/product-copy";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  EMPTY_LOW_STOCK,
  EMPTY_PERIOD_HINT,
  EMPTY_TOP_PRODUCTS,
  OUT_OF_STOCK_BADGE,
  demoOrdersNote,
  formatAmount,
  formatAov,
  isEmptyPeriod,
  lowStockCountNote,
  otherCurrencyNote,
  periodLinks,
  periodRangeLabel,
  statusBreakdown,
} from "./dashboard-copy";

/**
 * Every card prints its definition under the value, always visible (R05, orders spec UI/UX).
 * `data-metric` lets the e2e test read one card without depending on the layout.
 */
function MetricCard({
  definition,
  value,
  children,
  className,
}: {
  definition: MetricDefinition;
  value?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card data-metric={definition.id} className={className}>
      <CardHeader>
        <CardTitle>
          <h2>{definition.label}</h2>
        </CardTitle>
        {value === undefined ? null : (
          <p data-testid="metric-value" className="text-2xl font-semibold tabular-nums">
            {value}
          </p>
        )}
        <CardDescription data-testid="metric-definition">{definition.definition}</CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

/** Hook-free dashboard body: the period switch, notes and the metric cards. */
export function DashboardView({ dashboard }: { dashboard: Dashboard }) {
  const { period, sales, orders, topProducts, lowStock, definitions } = dashboard;
  const notes = [
    demoOrdersNote(dashboard.demoOrderCount),
    otherCurrencyNote(sales.otherCurrencyOrders),
  ];
  const breakdown = statusBreakdown(dashboard);
  const countNote = lowStockCountNote(lowStock.rows.length, lowStock.total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <nav aria-label="Period" className="flex gap-2">
          {periodLinks(period.preset).map((link) => (
            <Link
              key={link.preset}
              href={link.href}
              aria-current={link.current ? "page" : undefined}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                link.current && "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p data-testid="period-range" className="text-sm text-muted-foreground">
          {periodRangeLabel(period)}
        </p>
        {notes.map((note) =>
          note === null ? null : (
            <p key={note} data-testid="dashboard-note" className="text-sm text-muted-foreground">
              {note}
            </p>
          ),
        )}
        {isEmptyPeriod(dashboard) ? (
          <p className="text-sm text-muted-foreground">{EMPTY_PERIOD_HINT}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard definition={definitions.ordersPlaced} value={String(orders.total)}>
          {breakdown.length > 0 ? (
            <ul aria-label="Orders placed by status" className="flex flex-col gap-1 text-sm">
              {breakdown.map((row) => (
                <li key={row.status}>{row.text}</li>
              ))}
            </ul>
          ) : null}
        </MetricCard>
        <MetricCard definition={definitions.paidOrders} value={String(sales.paidOrders)} />
        <MetricCard
          definition={definitions.revenue}
          value={formatAmount(sales.revenueMinor, sales.currency)}
        />
        <MetricCard
          definition={definitions.aov}
          value={formatAov(sales.aovMinor, sales.currency)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCard definition={definitions.topProducts}>
          {topProducts.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{EMPTY_TOP_PRODUCTS}</p>
          ) : (
            <Table>
              <TableCaption className="sr-only">Top products in {period.label}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.rows.map((row) => (
                  <TableRow key={row.productId ?? `deleted:${row.name}`}>
                    <TableCell className="whitespace-normal">
                      {row.name}
                      {row.productId === null ? (
                        <span className="text-muted-foreground"> (deleted product)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.units}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(row.revenueMinor, topProducts.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </MetricCard>
        <MetricCard definition={definitions.lowStock} value={String(lowStock.total)}>
          {lowStock.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{EMPTY_LOW_STOCK}</p>
          ) : (
            <Table>
              <TableCaption className="sr-only">Low-stock products now</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={productPath(row.id)}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.stockQuantity}
                      {row.stockQuantity === 0 ? (
                        <Badge variant="outline" className="ml-2">
                          {OUT_OF_STOCK_BADGE}
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {countNote ? <p className="mt-2 text-sm text-muted-foreground">{countNote}</p> : null}
        </MetricCard>
      </div>
    </div>
  );
}
