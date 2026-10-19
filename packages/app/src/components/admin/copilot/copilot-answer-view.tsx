import type { CopilotAnswerDto, RecommendationEvidence } from "@commerceos/ai";
import Link from "next/link";
import { productPath } from "@/components/admin/products/product-copy";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEMO_DATA_TAG,
  EVIDENCE_CAPTION,
  PRIORITY_TEXT,
  SUMMARY_EVIDENCE_CAPTION,
  originText,
  periodText,
  type SuggestedQuestion,
} from "./copilot-copy";
import {
  DELETED_PRODUCT_TEXT,
  type RecommendationCardData,
  type RecommendationStatusAction,
} from "./recommendation-copy";
import { RecommendationStatusForm } from "./recommendation-status-form";

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

/** Evidence rows as a table; demo rows carry a text tag, not only a colour (D08, R07). */
function EvidenceTable({ caption, rows }: { caption: string; rows: RecommendationEvidence[] }) {
  return (
    <Table>
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Metric</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          // Evidence rows have no id; the order is fixed by the answer.
          <TableRow key={index}>
            {/* Text cells wrap so the value stays in view on a phone (no sideways scroll). */}
            <TableCell className="min-w-24 whitespace-normal">
              {row.metric}
              {row.demo ? (
                <Badge variant="outline" className="ml-2">
                  {DEMO_DATA_TAG}
                </Badge>
              ) : null}
            </TableCell>
            <TableCell className="tabular-nums">{row.value}</TableCell>
            <TableCell className="whitespace-normal">{row.period}</TableCell>
            <TableCell className="whitespace-normal wrap-anywhere text-muted-foreground">
              {row.source}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * One recommendation: every value comes from its evidence rows, rendered as plain text. A stored
 * recommendation (with an id) also shows its status and the owner's save, dismiss and complete
 * actions when the page passes the status action (Phase 4).
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
          <Badge variant={recommendation.priority === "high" ? "destructive" : "secondary"}>
            {PRIORITY_TEXT[recommendation.priority]}
          </Badge>
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
        <EvidenceTable caption={EVIDENCE_CAPTION} rows={recommendation.evidence} />
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
                  <Link href={productPath(product.id)} className="underline underline-offset-4">
                    {product.name}
                  </Link>
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

/** Hook-free answer: origin, period, summary, recommendations and the definitions used. */
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
  return (
    <section data-testid="copilot-answer" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {origin ? <Badge variant="outline">{origin}</Badge> : null}
        {answer.period ? (
          <span className="text-muted-foreground">{periodText(answer.period)}</span>
        ) : null}
      </div>
      {answer.question ? (
        <p className="text-sm text-muted-foreground">Question: {answer.question}</p>
      ) : null}
      <p data-testid="copilot-summary">{answer.summary}</p>
      {answer.summaryEvidence.length > 0 ? (
        <div data-testid="copilot-summary-evidence" className="text-sm">
          <EvidenceTable caption={SUMMARY_EVIDENCE_CAPTION} rows={answer.summaryEvidence} />
        </div>
      ) : null}
      {answer.kind === "unsupported" ? (
        <ul className="list-disc pl-5 text-sm">
          {questions.map((item) => (
            <li key={item.intent}>{item.question}</li>
          ))}
        </ul>
      ) : null}
      {answer.recommendations.length === 0 ? (
        <div className="text-sm">
          <Limitations items={answer.limitations} />
        </div>
      ) : (
        answer.recommendations.map((recommendation, index) => (
          // A stored id keys the card, so a new answer never inherits an old card's form state.
          <RecommendationCardView
            key={recommendation.id ?? index}
            recommendation={recommendation}
            statusAction={statusAction}
          />
        ))
      )}
      {answer.definitions.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">How these numbers are defined</summary>
          <dl className="mt-2 flex flex-col gap-2">
            {answer.definitions.map((definition) => (
              <div key={definition.id}>
                <dt className="font-medium">{definition.label}</dt>
                <dd className="text-muted-foreground">{definition.definition}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </section>
  );
}
