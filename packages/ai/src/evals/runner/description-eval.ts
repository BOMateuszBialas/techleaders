import { descriptionDraftSchema, type RateLimiterPort } from "@commerceos/core";
import type { DescriptionDraftDto } from "../../descriptions/description-draft.dto";
import { buildDescriptionSources } from "../../descriptions/description-sources";
import { DraftProductDescriptionUseCase } from "../../descriptions/draft-product-description.use-case";
import { findDescriptionIssues } from "../../grounding/find-description-issues";
import type { CopilotLogValue } from "../../ports/copilot-log.port";
import type { LlmProviderPort, StructuredGenerationRequest } from "../../ports/llm-provider.port";
import type { DescriptionEvalCase } from "../descriptions/description.cases";
import { EVAL_CATEGORY_IDS, evalCategories } from "../descriptions/eval-categories";
import { ScriptedLlmProvider } from "../scripted-llm-provider";
import {
  check,
  quoted,
  statusOf,
  type CaseResult,
  type EvalMode,
  type PropertyResult,
} from "./case-result";
import { UUID } from "./copilot-eval";
import { type CallBudget, RecordingLlmProvider } from "./recording-llm-provider";

export type DescriptionLog = Record<string, CopilotLogValue>;

/** Runs one description case with the given provider; returns the result and its one log event. */
export async function executeDescriptionCase(
  evalCase: DescriptionEvalCase,
  provider: LlmProviderPort,
): Promise<{ result: DescriptionDraftDto; log: DescriptionLog }> {
  const rateLimiter: RateLimiterPort = { consume: async () => ({ allowed: true, remaining: 1 }) };
  // The use case writes exactly one `description.draft` event per draft (descriptions spec A13).
  let log: DescriptionLog = {};
  const useCase = new DraftProductDescriptionUseCase({
    llmProvider: provider,
    rateLimiter,
    getCategoryUseCase: evalCategories(),
    copilotLog: {
      info: (_event, data) => {
        log = data;
      },
    },
    clock: () => new Date("2026-10-19T10:00:00Z"),
  });
  const { category, ...fields } = evalCase.input;
  const input = descriptionDraftSchema.parse({
    ...fields,
    categoryId: category ? EVAL_CATEGORY_IDS[category] : "",
  });
  const result = await useCase.execute(input, { id: "eval" });
  return { result, log };
}

/** `draft`, or `unavailable: <reason>`. */
export function describeDescriptionOutcome(result: DescriptionDraftDto): string {
  return result.kind === "draft" ? "draft" : `unavailable: ${result.reason}`;
}

/** Whether a draft was shown; `null` when no model output was possible (input, provider). */
export function descriptionAccepted(result: DescriptionDraftDto): boolean | null {
  if (result.kind === "draft") return true;
  return result.reason === "invalid_output" ? false : null;
}

/** The issue codes the `description.draft` log lists (constants, never text). */
export function issueCodesOf(log: DescriptionLog): string[] {
  return Array.isArray(log.issueCodes) ? log.issueCodes : [];
}

/**
 * The properties of one description result (descriptions spec, step 7). Offline, the outcome
 * (kind, reason, calls) and the rejected attempts' issue codes must match the case; live, they
 * are only reported (eval-script spec A4).
 */
export function checkDescriptionResult(
  evalCase: DescriptionEvalCase,
  mode: EvalMode,
  result: DescriptionDraftDto,
  requests: readonly StructuredGenerationRequest<unknown>[],
  log: DescriptionLog,
): PropertyResult[] {
  const { expected } = evalCase;
  const properties: PropertyResult[] = [];

  if (mode === "offline") {
    const wanted = expected.reason ? `${expected.kind}: ${expected.reason}` : expected.kind;
    properties.push(
      check(
        "outcome",
        result.kind === expected.kind &&
          (result.kind === "unavailable" ? result.reason : undefined) === expected.reason &&
          requests.length === expected.llmCalls,
        `expected ${wanted} · ${expected.llmCalls} call(s), got ${describeDescriptionOutcome(result)} · ${requests.length} call(s)`,
      ),
    );
    if (expected.issueCodes) {
      const logged = issueCodesOf(log);
      const missing = expected.issueCodes.filter((code) => !logged.includes(code));
      properties.push(
        check(
          "issue_codes",
          missing.length === 0,
          `the log misses issue codes: ${missing.join(", ")}`,
        ),
      );
    }
  }

  if (expected.absent) {
    const shown = JSON.stringify(result);
    const found = expected.absent.filter((text) => shown.includes(text));
    properties.push(
      check(
        "absent_text",
        found.length === 0,
        `the shown result contains a forbidden string: ${found.map(quoted).join(", ")}`,
      ),
    );
  }

  if (result.kind === "draft") {
    // What is shown passes the checks again, and a demo product is marked exactly once.
    const { category, ...fields } = evalCase.input;
    const sources = buildDescriptionSources(
      { ...fields, categoryId: null, price: Math.round(Number(fields.price) * 100) || null },
      category,
    );
    const issues = findDescriptionIssues(result.text, sources).map((issue) => issue.code);
    properties.push(
      check(
        "draft_rechecked",
        issues.length === 0,
        `the shown draft fails the checks: ${[...new Set(issues)].join(", ")}`,
      ),
    );
    properties.push(
      check(
        "demo_marked",
        result.demoMarked === sources.demo &&
          result.text.startsWith("[DEMO] ") === sources.demo &&
          (result.text.match(/\[DEMO\]/g)?.length ?? 0) === (sources.demo ? 1 : 0),
        sources.demo
          ? "a demo product's draft is not marked [DEMO] exactly once"
          : "a draft of a non-demo product carries [DEMO]",
      ),
    );
  } else {
    // Never a partial or unchecked draft.
    properties.push(
      check("no_partial_draft", !("text" in result), "an unavailable result carries draft text"),
    );
  }

  // A1: every request carries the four fields only: no id, SKU or stock.
  properties.push(
    check(
      "no_ids_sent",
      requests.every((request) => {
        const sent = JSON.stringify(request.messages);
        return !UUID.test(sent) && !/sku|stock_quantity|status/i.test(sent);
      }),
      "a request to the model carries an id, a SKU, stock or a status",
    ),
  );
  // A13: the log holds no field value and no draft text.
  properties.push(
    check(
      "log_has_no_values",
      !JSON.stringify(log).includes(evalCase.input.name),
      "the description.draft log carries the product name",
    ),
  );
  return properties;
}

/**
 * Runs and checks one description case. Offline the case's script answers; live `liveProvider`
 * does, through the run's call budget.
 */
export async function runDescriptionCase(
  evalCase: DescriptionEvalCase,
  options:
    { mode: "offline" } | { mode: "live"; liveProvider: LlmProviderPort; budget: CallBudget },
): Promise<CaseResult> {
  const provider =
    options.mode === "offline"
      ? new RecordingLlmProvider(new ScriptedLlmProvider(evalCase.script))
      : new RecordingLlmProvider(options.liveProvider, options.budget);
  const { result, log } = await executeDescriptionCase(evalCase, provider);
  const properties = checkDescriptionResult(evalCase, options.mode, result, provider.requests, log);
  return {
    set: "descriptions",
    id: evalCase.id,
    covers: evalCase.covers,
    mode: options.mode,
    status: statusOf(properties, options.mode === "live" && provider.providerFailure !== null),
    outcome: describeDescriptionOutcome(result),
    accepted: descriptionAccepted(result),
    attempts: provider.requests.length,
    latencyMs: provider.latencyMs,
    tokens: provider.tokens,
    model: provider.model,
    providerFailure: provider.providerFailure,
    issueCodes: issueCodesOf(log),
    properties,
  };
}
