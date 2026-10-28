import { formatMoney } from "@commerceos/core";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import {
  DemoBadge,
  OrderOriginBadge,
  OrderStatusBadge,
} from "@/components/admin/orders/order-badges";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { TextLink } from "@/components/ui/text-link";
import {
  EMPTY_ORDERS_MESSAGE,
  EMPTY_ORDERS_PAGE_MESSAGE,
  FIRST_PAGE_LINK,
  NEWER_LINK,
  OLDER_LINK,
  ORDERS_HEADING,
  ORDERS_INTRO,
  formatOrderDateTime,
  orderPath,
  ordersPageHref,
  pageLabel,
} from "@/components/admin/orders/order-copy";
import { ownerLocale } from "@/components/admin/products/stock-copy";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPage } from "@/server/auth/require-admin";
import { AdminPageLoadError } from "../categories/load-categories";
import { loadAdminOrders } from "./load-orders";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{ORDERS_HEADING}</h1>
        <p className="text-sm text-muted-foreground">{ORDERS_INTRO}</p>
      </div>
      <Suspense
        fallback={
          <SkeletonGroup label="Loading orders…">
            <Skeleton className="h-48 rounded-card" />
          </SkeletonGroup>
        }
      >
        <OrderList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrderList({ searchParams }: Pick<PageProps<"/admin/orders">, "searchParams">) {
  await requireAdminPage();
  const result = await loadAdminOrders((await searchParams).page);
  if (result.kind !== "ok") throw new AdminPageLoadError();
  const { rows, page, pageCount, total } = result.data;
  const locale = ownerLocale((await headers()).get("accept-language"));

  if (total === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>{EMPTY_ORDERS_MESSAGE}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>{EMPTY_ORDERS_PAGE_MESSAGE}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <TextLink href={ordersPageHref(1)} variant="standalone">
            {FIRST_PAGE_LINK}
          </TextLink>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableCaption className="sr-only">Orders, newest first</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Items</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <TextLink href={orderPath(order.id)} variant="resource" className="font-mono">
                    {order.reference}
                  </TextLink>
                  {order.isDemo ? <DemoBadge /> : null}
                  <OrderOriginBadge placedWithAccount={order.placedWithAccount} />
                </div>
              </TableCell>
              <TableCell>
                <time dateTime={order.createdAt.toISOString()}>
                  {formatOrderDateTime(order.createdAt, locale)}
                </time>
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(order.total)}</TableCell>
              <TableCell className="text-right tabular-nums">{order.itemCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <nav aria-label="Order pages" className="flex items-center gap-4 text-sm">
        {page > 1 ? (
          <Link href={ordersPageHref(page - 1)} className="underline underline-offset-4">
            {NEWER_LINK}
          </Link>
        ) : null}
        <span className="text-muted-foreground">{pageLabel(page, pageCount)}</span>
        {page < pageCount ? (
          <Link href={ordersPageHref(page + 1)} className="underline underline-offset-4">
            {OLDER_LINK}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
