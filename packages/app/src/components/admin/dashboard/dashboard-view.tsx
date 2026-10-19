import type { Dashboard, MetricDefinition } from "@commerceos/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { productPath } from "@/components/admin/products/product-copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  NOT_COMPARED,
  OUT_OF_STOCK_BADGE,
  RANGE_FORM_LEGEND,
  changeText,
  comparisonHeader,
  comparisonNotes,
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
 * `data-metric` lets the e2e test read one card without depending on the layout. A compared
 * card adds one line against the previous period (date-range spec); `metric-value` keeps only
 * the bare value.
 */
function MetricCard({
  definition,
  value,
  change,
  children,
  className,
}: {
  definition: MetricDefinition;
  value?: string;
  /** The comparison line, or why the metric is not compared. */
  change: string;
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
        <p data-testid="metric-change" className="text-sm font-medium">
          {change}
        </p>
        <CardDescription data-testid="metric-definition">{definition.definition}</CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

/**
 * The custom range: a plain GET form, so the range lives in the URL (`?from=&to=`), works
 * without JavaScript and survives back/forward. The server validates it (date-range spec A6).
 */
function DateRangeForm({ dashboard }: { dashboard: Dashboard }) {
  const { range, rangeError } = dashboard;
  const errorProps = rangeError ? { "aria-invalid": true, "aria-describedby": "range-error" } : {};
  return (
    <form
      method="get"
      action="/admin"
      aria-label={RANGE_FORM_LEGEND}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex w-full flex-col gap-1 sm:w-auto">
        <Label htmlFor="range-from">From</Label>
        <Input
          id="range-from"
          name="from"
          type="date"
          required
          min={range.minDay}
          max={range.maxDay}
          defaultValue={rangeError ? rangeError.from : range.firstDay}
          {...errorProps}
        />
      </div>
      <div className="flex w-full flex-col gap-1 sm:w-auto">
        <Label htmlFor="range-to">To</Label>
        <Input
          id="range-to"
          name="to"
          type="date"
          required
          min={range.minDay}
          max={range.maxDay}
          defaultValue={rangeError ? rangeError.to : range.lastDay}
          {...errorProps}
        />
      </div>
      <Button type="submit" variant="outline">
        Show range
      </Button>
      {rangeError ? (
        <p id="range-error" role="alert" className="w-full text-sm text-destructive">
          {rangeError.message} Showing the preset period instead.
        </p>
      ) : null}
    </form>
  );
}

const count = (value: number) => String(value);

/** Hook-free dashboard body: the period switch and range form, notes and the metric cards. */
export function DashboardView({ dashboard }: { dashboard: Dashboard }) {
  const { period, sales, orders, topProducts, lowStock, definitions, comparison } = dashboard;
  const notes = [
    demoOrdersNote(dashboard.demoOrderCount),
    otherCurrencyNote(sales.otherCurrencyOrders),
  ];
  const breakdown = statusBreakdown(dashboard);
  const countNote = lowStockCountNote(lowStock.rows.length, lowStock.total);
  const amount = (value: number) => formatAmount(value, sales.currency);
  const changes = comparison.changes;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <nav aria-label="Period" className="flex flex-wrap gap-2">
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
          <DateRangeForm dashboard={dashboard} />
        </div>
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

      <section aria-labelledby="comparison-heading" className="flex flex-col gap-1">
        <h2 id="comparison-heading" data-testid="comparison-range" className="text-sm font-medium">
          {comparisonHeader(comparison.period)}
        </h2>
        <p className="text-sm text-muted-foreground">{dashboard.comparisonDefinition}</p>
        {comparisonNotes(dashboard).map((note) => (
          <p key={note} data-testid="comparison-note" className="text-sm text-muted-foreground">
            {note}
          </p>
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          definition={definitions.ordersPlaced}
          value={String(orders.total)}
          change={changeText(changes.ordersPlaced, count)}
        >
          {breakdown.length > 0 ? (
            <ul aria-label="Orders placed by status" className="flex flex-col gap-1 text-sm">
              {breakdown.map((row) => (
                <li key={row.status}>{row.text}</li>
              ))}
            </ul>
          ) : null}
        </MetricCard>
        <MetricCard
          definition={definitions.paidOrders}
          value={String(sales.paidOrders)}
          change={changeText(changes.paidOrders, count)}
        />
        <MetricCard
          definition={definitions.revenue}
          value={amount(sales.revenueMinor)}
          change={changeText(changes.revenue, amount)}
        />
        <MetricCard
          definition={definitions.aov}
          value={formatAov(sales.aovMinor, sales.currency)}
          change={changeText(changes.aov, amount)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCard definition={definitions.topProducts} change={NOT_COMPARED}>
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
        <MetricCard
          definition={definitions.lowStock}
          value={String(lowStock.total)}
          change={NOT_COMPARED}
        >
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
