import Link from "next/link";
import { formatMoney, type CustomerOrderList } from "@commerceos/core";
import { OrderStatusBadge } from "@/components/checkout/order-forms-view";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACCOUNT_COPY, accountOrderPath, formatAccountDate } from "./account-copy";

export type AccountOrdersViewProps = {
  email: string;
  signOutAction: () => void | Promise<void>;
  /** The customer's orders, or `null` when they could not be read (generic error state). */
  list: CustomerOrderList | null;
};

/**
 * "My orders" for the signed-in customer (E07 spec A13, UI/UX): the signed-in email, "Sign out",
 * then the orders table (reference, date, status, total in PLN), newest first, each row linking
 * to its detail. Empty, error and capped states. Text cells wrap so no column hides at 390 px
 * (lesson 2026-10-19).
 */
export function AccountOrdersView({ email, signOutAction, list }: AccountOrdersViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground wrap-anywhere">
          Signed in as <span className="font-medium text-foreground">{email}</span>
        </p>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            {ACCOUNT_COPY.signOut}
          </Button>
        </form>
      </div>
      <AccountOrdersBody list={list} />
    </div>
  );
}

function AccountOrdersBody({ list }: { list: CustomerOrderList | null }) {
  if (list === null) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {ACCOUNT_COPY.ordersUnavailable}
      </p>
    );
  }
  if (list.orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-md border p-6">
        <p>{ACCOUNT_COPY.ordersEmpty}</p>
        <Link href="/products" className="text-sm underline underline-offset-4">
          {ACCOUNT_COPY.browseCatalog}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableCaption className="sr-only">{ACCOUNT_COPY.ordersTableCaption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="whitespace-normal wrap-anywhere">
                <Link
                  href={accountOrderPath(order.id)}
                  className="font-mono font-medium underline-offset-4 hover:underline"
                >
                  {order.reference}
                </Link>
              </TableCell>
              <TableCell className="whitespace-normal">
                <time dateTime={order.createdAt.toISOString()}>
                  {formatAccountDate(order.createdAt)}
                </time>
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(order.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {list.capped ? (
        <p role="note" className="text-sm text-muted-foreground">
          {ACCOUNT_COPY.ordersCapped}
        </p>
      ) : null}
    </div>
  );
}
