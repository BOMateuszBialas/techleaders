import type { UnpaidOrdersSummary } from "@commerceos/core";
import { ordersPageHref } from "@/components/admin/orders/order-copy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import {
  UNPAID_ACTION_NOTE,
  UNPAID_CARD_DESCRIPTION,
  UNPAID_CARD_TITLE,
  UNPAID_COUNT_LABEL,
  UNPAID_EMPTY,
  UNPAID_OLDEST_LABEL,
  UNPAID_STALE_LABEL,
  UNPAID_VIEW_LINK,
  unpaidOldestText,
} from "./dashboard-copy";

/**
 * The unpaid-orders card above the metrics (unpaid-orders visibility): how many orders wait for
 * payment, how many are older than the stale threshold, and the oldest. Hook-free: the owner
 * cancels stale orders by hand on the order page.
 */
export function UnpaidOrdersCard({
  summary,
  locale,
}: {
  summary: UnpaidOrdersSummary;
  locale: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{UNPAID_CARD_TITLE}</CardTitle>
        <CardDescription>{UNPAID_CARD_DESCRIPTION}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary.count === 0 ? (
          <p className="text-sm text-muted-foreground">{UNPAID_EMPTY}</p>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{UNPAID_COUNT_LABEL}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{summary.count}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{UNPAID_STALE_LABEL}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{summary.staleCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{UNPAID_OLDEST_LABEL}</dt>
                <dd>{unpaidOldestText(summary, locale)}</dd>
              </div>
            </dl>
            <p className="text-sm text-muted-foreground">{UNPAID_ACTION_NOTE}</p>
          </>
        )}
        <TextLink href={ordersPageHref(1, "unpaid")} variant="standalone">
          {UNPAID_VIEW_LINK}
        </TextLink>
      </CardContent>
    </Card>
  );
}
