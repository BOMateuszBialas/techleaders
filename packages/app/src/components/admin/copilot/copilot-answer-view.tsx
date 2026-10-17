import type { CopilotAnswerDto, CopilotAnswerRecommendation } from "@commerceos/ai";
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
import { PRIORITY_TEXT, originText, periodText, type SuggestedQuestion } from "./copilot-copy";

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

/** One recommendation: every value comes from its evidence rows, rendered as plain text. */
export function RecommendationCardView({
  recommendation,
}: {
  recommendation: CopilotAnswerRecommendation;
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
        <Table>
          <TableCaption>Evidence from this store&apos;s data</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendation.evidence.map((row, index) => (
              // Evidence rows have no id; the order is fixed by the answer.
              <TableRow key={index}>
                <TableCell>
                  {row.metric}
                  {row.demo ? (
                    <Badge variant="outline" className="ml-2">
                      Fictional demo data
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="tabular-nums">{row.value}</TableCell>
                <TableCell>{row.period}</TableCell>
                <TableCell className="text-muted-foreground">{row.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
                <Link href={productPath(product.id)} className="underline underline-offset-4">
                  {product.name}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Hook-free answer: origin, period, summary, recommendations and the definitions used. */
export function CopilotAnswerView({
  answer,
  questions,
}: {
  answer: CopilotAnswerDto;
  questions: SuggestedQuestion[];
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
          <RecommendationCardView key={index} recommendation={recommendation} />
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
