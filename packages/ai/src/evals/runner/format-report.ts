import type { CaseResult } from "./case-result";
import type { EvalReport } from "./run-eval-suite";

export const REPORT_FORMATS = ["text", "markdown", "json"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

const STATUS_LABEL: Record<CaseResult["status"], string> = {
  passed: "PASS",
  failed: "FAIL",
  unavailable: "UNAVAILABLE",
  skipped: "SKIPPED",
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function header(report: EvalReport): string {
  const scope = plural(report.cases.length, "case");
  if (report.mode === "offline") return `CommerceOS evals · offline (scripted models) · ${scope}`;
  return `CommerceOS evals · live · ${report.provider} · ${report.model} · budget ${plural(report.maxCalls ?? 0, "call")} · ${scope}`;
}

/** Outcome, attempts and (live) latency and tokens: never prompt or model text (spec A8). */
function details(result: CaseResult): string {
  const parts = [result.outcome];
  if (result.status !== "skipped") parts.push(plural(result.attempts, "attempt"));
  if (result.mode === "live" && result.status !== "skipped") {
    if (result.latencyMs !== null) parts.push(`${result.latencyMs} ms`);
    const { input, output, thinking } = result.tokens;
    parts.push(`tokens ${input}/${output}/${thinking}`);
  }
  if (result.issueCodes.length > 0) parts.push(`issues: ${result.issueCodes.join(", ")}`);
  return parts.join(" · ");
}

function failures(result: CaseResult): string[] {
  return result.properties
    .filter((property) => !property.passed)
    .map((property) =>
      property.detail ? `${property.property}: ${property.detail}` : property.property,
    );
}

function summaryLines(report: EvalReport): string[] {
  const { summary } = report;
  const counts = [
    `${summary.passed} passed`,
    `${summary.failed} failed`,
    ...(summary.unavailable > 0 ? [`${summary.unavailable} unavailable`] : []),
    ...(summary.skipped > 0 ? [`${summary.skipped} skipped`] : []),
  ];
  const lines = [
    `Summary: ${counts.join(", ")} · properties ${summary.properties.passed}/${summary.properties.total}`,
  ];
  if (report.mode === "live") {
    const { input, output, thinking } = summary.tokens;
    lines.push(
      `Live: ${summary.completed} completed · model output shown ${summary.accepted.shown}/${summary.accepted.of} · calls ${report.callsUsed}/${report.maxCalls} · tokens in ${input}, out ${output}, thinking ${thinking}`,
    );
    if (report.stoppedBy) {
      lines.push(`Stopped after the provider failed (${report.stoppedBy}); later cases skipped.`);
    }
    if (summary.completed === 0) lines.push("No live case completed: nothing was evaluated.");
  }
  return lines;
}

function formatText(report: EvalReport): string {
  const setWidth = Math.max(...report.cases.map((result) => result.set.length), 3);
  const idWidth = Math.max(...report.cases.map((result) => result.id.length), 4);
  const lines = [header(report), ""];
  for (const result of report.cases) {
    lines.push(
      `${result.set.padEnd(setWidth)}  ${result.id.padEnd(idWidth)}  ${STATUS_LABEL[result.status].padEnd(11)}  ${details(result)}`,
    );
    for (const failure of failures(result)) lines.push(`    ✗ ${failure}`);
  }
  return [...lines, "", ...summaryLines(report)].join("\n") + "\n";
}

const cell = (text: string) => text.replaceAll("|", "\\|");

function formatMarkdown(report: EvalReport): string {
  const lines = [
    `### ${header(report)}`,
    "",
    "| Set | Case | Status | Outcome | Failed properties |",
    "| --- | --- | --- | --- | --- |",
    ...report.cases.map(
      (result) =>
        `| ${result.set} | \`${result.id}\` | ${STATUS_LABEL[result.status]} | ${cell(details(result))} | ${cell(failures(result).join("; "))} |`,
    ),
    "",
    ...summaryLines(report).map((line) => `${line}  `),
  ];
  return lines.join("\n") + "\n";
}

/** Renders a report; every format carries the same fields, none carries model text. */
export function formatReport(report: EvalReport, format: ReportFormat): string {
  if (format === "json") return JSON.stringify(report, null, 2) + "\n";
  return format === "markdown" ? formatMarkdown(report) : formatText(report);
}
