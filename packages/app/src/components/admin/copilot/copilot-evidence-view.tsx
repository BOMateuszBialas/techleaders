import type { RecommendationEvidence } from "@commerceos/ai";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_DATA_TAG } from "./copilot-copy";

/** The demo tag (D9): a text badge on demo rows, never a colour alone (D08, tokeny rule 11). */
function DemoTag({ demo }: { demo?: boolean }) {
  if (!demo) return null;
  return (
    <Badge variant="demo" className="ml-2">
      {DEMO_DATA_TAG}
    </Badge>
  );
}

/** The wide shape: a table with a caption and four columns. */
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
              <DemoTag demo={row.demo} />
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

/** One field of a narrow row: the term and its value on one line when there is room. */
function EvidenceField({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="wrap-anywhere">{children}</dd>
    </div>
  );
}

/**
 * Evidence for a summary or a recommendation (Phase 2, D6, Q1). Both shapes are in the DOM and a
 * container query picks one: the table from 36 rem of the evidence's container (`@xl`), the list
 * below it. The container is the outer `@container`, one element up from the switch, so the
 * query reads the content column and not the viewport (the sidebar leaves it narrower from 768 px).
 */
export function EvidenceView({
  caption,
  rows,
}: {
  caption: string;
  rows: RecommendationEvidence[];
}) {
  return (
    <div className="@container">
      <div className="hidden @xl:block">
        <EvidenceTable caption={caption} rows={rows} />
      </div>
      <div className="flex flex-col gap-related @xl:hidden">
        <p className="font-medium">{caption}</p>
        <ul aria-label={caption} className="flex flex-col gap-related">
          {rows.map((row, index) => (
            <li key={index} className="rounded-control border border-border p-group-item">
              <dl className="flex flex-col gap-1">
                <EvidenceField term="Metric">
                  {row.metric}
                  <DemoTag demo={row.demo} />
                </EvidenceField>
                <EvidenceField term="Value">
                  <span className="font-semibold tabular-nums">{row.value}</span>
                </EvidenceField>
                {row.period ? <EvidenceField term="Period">{row.period}</EvidenceField> : null}
                <EvidenceField term="Source">
                  <span className="text-muted-foreground">{row.source}</span>
                </EvidenceField>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
