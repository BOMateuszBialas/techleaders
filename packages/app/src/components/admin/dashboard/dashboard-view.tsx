import type { Dashboard, MetricDefinition } from "@commerceos/core";
import type { ReactNode } from "react";
import { PRODUCTS_PATH, productPath } from "@/components/admin/products/product-copy";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsNav, TabsNavLink } from "@/components/ui/tabs";
import { TextLink } from "@/components/ui/text-link";
import {
  EMPTY_LOW_STOCK,
  EMPTY_PERIOD_ACTION,
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
          <p data-testid="metric-value" className="type-display">
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
      <Field className="w-full sm:w-auto">
        <FieldLabel htmlFor="range-from">From</FieldLabel>
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
      </Field>
      <Field className="w-full sm:w-auto">
        <FieldLabel htmlFor="range-to">To</FieldLabel>
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
      </Field>
      <Button type="submit" variant="outline">
        Show range
      </Button>
      {rangeError ? (
        <Alert id="range-error" variant="destructive" role="alert" className="w-full">
          <AlertDescription>
            {rangeError.message} Showing the preset period instead.
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}

const count = (value: number) => String(value);

/** Suspense fallback for the metrics: the shape of the period nav, the cards and the tables. */
export function MetricsSkeleton() {
  return (
    <SkeletonGroup label="Loading metrics" className="flex flex-col gap-6">
      <Skeleton className="h-(--control-h-md) w-full max-w-md rounded-control" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-32 rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    </SkeletonGroup>
  );
}

/** Suspense fallback for the system status card. */
export function StatusSkeleton() {
  return (
    <SkeletonGroup label="Checking system status">
      <Skeleton className="h-24 rounded-card" />
    </SkeletonGroup>
  );
}

/** Hook-free dashboard body: the period switch and range form, notes and the metric cards. */
export function DashboardView({ dashboard }: { dashboard: Dashboard }) {
  const { period, sales, orders, topProducts, lowStock, definitions, comparison } = dashboard;
  const demoNote = demoOrdersNote(dashboard.demoOrderCount);
  const otherNote = otherCurrencyNote(sales.otherCurrencyOrders);
  const breakdown = statusBreakdown(dashboard);
  const countNote = lowStockCountNote(lowStock.rows.length, lowStock.total);
  const amount = (value: number) => formatAmount(value, sales.currency);
  const changes = comparison.changes;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <TabsNav aria-label="Period">
            {periodLinks(period.preset).map((link) => (
              <TabsNavLink key={link.preset} href={link.href} active={link.current}>
                {link.label}
              </TabsNavLink>
            ))}
          </TabsNav>
          <DateRangeForm dashboard={dashboard} />
        </div>
        <p data-testid="period-range" className="text-sm text-muted-foreground">
          {periodRangeLabel(period)}
        </p>
        {demoNote === null ? null : (
          <Alert variant="demo" data-testid="dashboard-note">
            <AlertDescription>{demoNote}</AlertDescription>
          </Alert>
        )}
        {otherNote === null ? null : (
          <p data-testid="dashboard-note" className="text-sm text-muted-foreground">
            {otherNote}
          </p>
        )}
        {isEmptyPeriod(dashboard) ? (
          <Empty>
            <EmptyHeader>
              <EmptyDescription>{EMPTY_PERIOD_HINT}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <TextLink href={PRODUCTS_PATH} variant="standalone">
                {EMPTY_PERIOD_ACTION}
              </TextLink>
            </EmptyContent>
          </Empty>
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                      <TextLink href={productPath(row.id)} variant="resource">
                        {row.name}
                      </TextLink>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.stockQuantity}
                      {row.stockQuantity === 0 ? (
                        <Badge variant="warning" className="ml-2">
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
