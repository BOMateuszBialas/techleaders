import type { CopilotRecommendationList } from "@commerceos/core";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { ErrorState } from "@/components/ui/error-state";
import { TextLink } from "@/components/ui/text-link";
import { pageLabel } from "../orders/order-copy";
import { RecommendationCardView } from "./copilot-answer-view";
/** Pager links reach 44 px below 768 px (spec A3); the standalone link is 24 px. */
const PAGER_TARGET = "max-md:min-h-11 max-md:items-center";
import {
  EMPTY_RECOMMENDATIONS_PAGE_TEXT,
  EMPTY_RECOMMENDATIONS_TEXT,
  RECOMMENDATIONS_UNAVAILABLE_DESCRIPTION,
  RECOMMENDATIONS_UNAVAILABLE_TITLE,
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
      <ErrorState
        title={RECOMMENDATIONS_UNAVAILABLE_TITLE}
        description={RECOMMENDATIONS_UNAVAILABLE_DESCRIPTION}
      />
    );
  }
  const { rows, page, pageCount, total } = list;
  if (total === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>{EMPTY_RECOMMENDATIONS_TEXT}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {EMPTY_RECOMMENDATIONS_PAGE_TEXT}{" "}
        <TextLink href={recommendationsPageHref(1)}>Go to the first page</TextLink>
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
          <TextLink href={recommendationsPageHref(page - 1)} className={PAGER_TARGET}>
            Newer
          </TextLink>
        ) : null}
        <span className="text-muted-foreground">{pageLabel(page, pageCount)}</span>
        {page < pageCount ? (
          <TextLink href={recommendationsPageHref(page + 1)} className={PAGER_TARGET}>
            Older
          </TextLink>
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
