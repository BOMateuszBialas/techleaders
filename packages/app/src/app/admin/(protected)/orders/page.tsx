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
import { TabsNav, TabsNavLink } from "@/components/ui/tabs";
import { TextLink } from "@/components/ui/text-link";
import {
  EMPTY_ORDERS_PAGE_MESSAGE,
  FIRST_PAGE_LINK,
  ORDERS_HEADING,
  ORDER_VIEWS_LABEL,
  emptyOrdersMessage,
  formatOrderDateTime,
  ordersCaption,
  ordersIntro,
  ordersPageHref,
  ordersViewLinks,
  orderPath,
  pageLabel,
  pageNavLabels,
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

/** `/admin/orders`: all orders newest first, or `?view=unpaid` (oldest first), 25 per page. */
export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{ORDERS_HEADING}</h1>
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
  const params = await searchParams;
  const result = await loadAdminOrders(params.page, params.view);
  if (result.kind !== "ok") throw new AdminPageLoadError();
  const { rows, page, pageCount, total, view } = result.data;
  const locale = ownerLocale((await headers()).get("accept-language"));
  const labels = pageNavLabels(view);

  const views = (
    <TabsNav aria-label={ORDER_VIEWS_LABEL}>
      {ordersViewLinks(view).map((link) => (
        <TabsNavLink key={link.view} href={link.href} active={link.current}>
          {link.label}
        </TabsNavLink>
      ))}
    </TabsNav>
  );

  if (total === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{ordersIntro(view)}</p>
        {views}
        <Empty>
          <EmptyHeader>
            <EmptyDescription>{emptyOrdersMessage(view)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{ordersIntro(view)}</p>
        {views}
        <Empty>
          <EmptyHeader>
            <EmptyDescription>{EMPTY_ORDERS_PAGE_MESSAGE}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <TextLink href={ordersPageHref(1, view)} variant="standalone">
              {FIRST_PAGE_LINK}
            </TextLink>
          </EmptyContent>
        </Empty>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{ordersIntro(view)}</p>
      {views}
      <Table>
        <TableCaption className="sr-only">{ordersCaption(view)}</TableCaption>
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
          <Link href={ordersPageHref(page - 1, view)} className="underline underline-offset-4">
            {labels.back}
          </Link>
        ) : null}
        <span className="text-muted-foreground">{pageLabel(page, pageCount)}</span>
        {page < pageCount ? (
          <Link href={ordersPageHref(page + 1, view)} className="underline underline-offset-4">
            {labels.forward}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
