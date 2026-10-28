import type { CopilotAnswerDto } from "@commerceos/ai";
import { productPath } from "@/components/admin/products/product-copy";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { TextLink } from "@/components/ui/text-link";
import {
  EMPTY_STORE_NEXT_STEP,
  EMPTY_STORE_TITLE,
  EVIDENCE_CAPTION,
  PRIORITY_TEXT,
  SUMMARY_EVIDENCE_CAPTION,
  originText,
  periodText,
  type SuggestedQuestion,
} from "./copilot-copy";
import { AnswerNoticeView } from "./copilot-fallback-view";
import { answerNotice } from "./copilot-fallback";
import { EvidenceView } from "./copilot-evidence-view";
import {
  DELETED_PRODUCT_TEXT,
  priorityVariant,
  type RecommendationCardData,
  type RecommendationStatusAction,
} from "./recommendation-copy";
import { RecommendationStatusBadge, RecommendationStatusForm } from "./recommendation-status-form";

function Limitations({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="font-medium">Limitations</h4>
      <ul className="list-disc pl-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One recommendation: every value comes from its evidence rows, rendered as plain text. A stored
 * recommendation (with an id) also shows its status badge in the header and the owner's save,
 * dismiss and complete actions in the body when the page passes the status action (D12).
 */
export function RecommendationCardView({
  recommendation,
  statusAction,
}: {
  recommendation: RecommendationCardData;
  statusAction?: RecommendationStatusAction;
}) {
  return (
    <Card data-testid="copilot-recommendation">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={priorityVariant(recommendation.priority)}>
            {PRIORITY_TEXT[recommendation.priority]}
          </Badge>
          {statusAction && recommendation.id ? (
            <RecommendationStatusBadge id={recommendation.id} status={recommendation.status} />
          ) : null}
        </div>
        <CardTitle>
          <h3>{recommendation.title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div>
          <h4 className="font-medium">What we see</h4>
          <p>{recommendation.observation}</p>
        </div>
        <EvidenceView caption={EVIDENCE_CAPTION} rows={recommendation.evidence} />
        <div>
          <h4 className="font-medium">Why it matters</h4>
          <p>{recommendation.reasoning}</p>
        </div>
        <div>
          <h4 className="font-medium">Suggested next step (your decision)</h4>
          <p>{recommendation.suggestedAction}</p>
        </div>
        <Limitations items={recommendation.limitations ?? []} />
        {recommendation.relatedProducts.length > 0 ? (
          <p>
            Related:{" "}
            {recommendation.relatedProducts.map((product, index) => (
              <span key={product.id}>
                {index > 0 ? ", " : null}
                {product.name === null ? (
                  <span className="text-muted-foreground">{DELETED_PRODUCT_TEXT}</span>
                ) : (
                  <TextLink href={productPath(product.id)}>{product.name}</TextLink>
                )}
              </span>
            ))}
          </p>
        ) : null}
        {statusAction && recommendation.id ? (
          <RecommendationStatusForm
            action={statusAction}
            recommendation={{
              id: recommendation.id,
              status: recommendation.status,
              title: recommendation.title,
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * What the answer has to recommend: the cards, or for an answered question with none an `Empty`
 * with a next step (Q3). Declined and unsupported answers show their limitations, if any.
 */
function RecommendationList({
  answer,
  statusAction,
}: {
  answer: CopilotAnswerDto;
  statusAction?: RecommendationStatusAction;
}) {
  if (answer.recommendations.length > 0) {
    return answer.recommendations.map((recommendation, index) => (
      // A stored id keys the card, so a new answer never inherits an old card's form state.
      <RecommendationCardView
        key={recommendation.id ?? index}
        recommendation={recommendation}
        statusAction={statusAction}
      />
    ));
  }
  if (answer.kind !== "answered") return <Limitations items={answer.limitations} />;
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>
          <h3>{EMPTY_STORE_TITLE}</h3>
        </EmptyTitle>
        <EmptyDescription>{EMPTY_STORE_NEXT_STEP}</EmptyDescription>
      </EmptyHeader>
      <Limitations items={answer.limitations} />
    </Empty>
  );
}

/** Hook-free answer: origin, notice, summary, evidence, recommendations and the definitions used. */
export function CopilotAnswerView({
  answer,
  questions,
  statusAction,
}: {
  answer: CopilotAnswerDto;
  questions: SuggestedQuestion[];
  statusAction?: RecommendationStatusAction;
}) {
  const origin = originText(answer);
  const notice = answerNotice(answer);
  return (
    <section data-testid="copilot-answer" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {origin ? <Badge variant="outline">{origin}</Badge> : null}
        {answer.period ? (
          <span className="text-muted-foreground">{periodText(answer.period)}</span>
        ) : null}
      </div>
      {notice ? <AnswerNoticeView notice={notice} /> : null}
      {answer.question ? (
        <p className="text-sm text-muted-foreground">Question: {answer.question}</p>
      ) : null}
      {/* A declined or unsupported answer shows its summary in the notice above. */}
      {answer.kind === "answered" ? <p data-testid="copilot-summary">{answer.summary}</p> : null}
      {answer.summaryEvidence.length > 0 ? (
        <div data-testid="copilot-summary-evidence" className="text-sm">
          <EvidenceView caption={SUMMARY_EVIDENCE_CAPTION} rows={answer.summaryEvidence} />
        </div>
      ) : null}
      {answer.kind === "unsupported" ? (
        <ul className="list-disc pl-5 text-sm">
          {questions.map((item) => (
            <li key={item.intent}>{item.question}</li>
          ))}
        </ul>
      ) : null}
      <RecommendationList answer={answer} statusAction={statusAction} />
      {answer.definitions.length > 0 ? (
        <Disclosure className="text-sm">
          <DisclosureTrigger>How these numbers are defined</DisclosureTrigger>
          <DisclosureContent>
            <dl className="flex flex-col gap-2">
              {answer.definitions.map((definition) => (
                <div key={definition.id}>
                  <dt className="font-medium">{definition.label}</dt>
                  <dd className="text-muted-foreground">{definition.definition}</dd>
                </div>
              ))}
            </dl>
          </DisclosureContent>
        </Disclosure>
      ) : null}
    </section>
  );
}
