import type { CopilotRecommendationList } from "@commerceos/core";
import Link from "next/link";
import { pageLabel } from "../orders/order-copy";
import { RecommendationCardView } from "./copilot-answer-view";
import {
  EMPTY_RECOMMENDATIONS_PAGE_TEXT,
  EMPTY_RECOMMENDATIONS_TEXT,
  RECOMMENDATIONS_UNAVAILABLE_TEXT,
  YOUR_RECOMMENDATIONS_HEADING,
  YOUR_RECOMMENDATIONS_INTRO,
  recommendationsPageHref,
  storedOnText,
  toRecommendationCard,
  type RecommendationStatusAction,
} from "./recommendation-copy";

function Body({
  list,
  statusAction,
}: {
  list: CopilotRecommendationList | null;
  statusAction: RecommendationStatusAction;
}) {
  if (!list) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {RECOMMENDATIONS_UNAVAILABLE_TEXT}
      </p>
    );
  }
  const { rows, page, pageCount, total } = list;
  if (total === 0)
    return <p className="text-sm text-muted-foreground">{EMPTY_RECOMMENDATIONS_TEXT}</p>;
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {EMPTY_RECOMMENDATIONS_PAGE_TEXT}{" "}
        <Link href={recommendationsPageHref(1)} className="underline underline-offset-4">
          Go to the first page
        </Link>
      </p>
    );
  }
  return (
    <>
      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">
              <time dateTime={row.createdAt.toISOString()}>{storedOnText(row.createdAt)}</time>
            </p>
            <RecommendationCardView
              recommendation={toRecommendationCard(row)}
              statusAction={statusAction}
            />
          </li>
        ))}
      </ul>
      <nav aria-label="Recommendation pages" className="flex items-center gap-4 text-sm">
        {page > 1 ? (
          <Link href={recommendationsPageHref(page - 1)} className="underline underline-offset-4">
            Newer
          </Link>
        ) : null}
        <span className="text-muted-foreground">{pageLabel(page, pageCount)}</span>
        {page < pageCount ? (
          <Link href={recommendationsPageHref(page + 1)} className="underline underline-offset-4">
            Older
          </Link>
        ) : null}
      </nav>
    </>
  );
}

/**
 * "Your recommendations" (Copilot spec, UI/UX; #26): the owner's saved and completed
 * recommendations, newest first, 20 per page, each with its status actions. Hook-free, so a unit
 * test renders every state: not loaded (`list` null), empty, a page past the last, and a list.
 */
export function SavedRecommendationsView({
  list,
  statusAction,
}: {
  list: CopilotRecommendationList | null;
  statusAction: RecommendationStatusAction;
}) {
  return (
    <section
      aria-labelledby="your-recommendations-heading"
      data-testid="your-recommendations"
      className="flex flex-col gap-3"
    >
      <div>
        <h2 id="your-recommendations-heading" className="text-xl font-semibold tracking-tight">
          {YOUR_RECOMMENDATIONS_HEADING}
        </h2>
        <p className="text-sm text-muted-foreground">{YOUR_RECOMMENDATIONS_INTRO}</p>
      </div>
      <Body list={list} statusAction={statusAction} />
    </section>
  );
}
