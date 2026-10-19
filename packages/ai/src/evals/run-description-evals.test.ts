import { descriptionDraftSchema, type RateLimiterPort } from "@commerceos/core";
import { describe, expect, it } from "vitest";
import { buildDescriptionSources } from "../descriptions/description-sources";
import { DraftProductDescriptionUseCase } from "../descriptions/draft-product-description.use-case";
import { findDescriptionIssues } from "../grounding/find-description-issues";
import type { CopilotLogValue } from "../ports/copilot-log.port";
import {
  DESCRIPTION_EVAL_CASES,
  type DescriptionEvalCase,
  type DescriptionEvalProperty,
} from "./descriptions/description.cases";
import { EVAL_CATEGORY_IDS, evalCategories } from "./descriptions/eval-categories";
import { ScriptedLlmProvider } from "./scripted-llm-provider";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

async function run(evalCase: DescriptionEvalCase) {
  const provider = new ScriptedLlmProvider(evalCase.script);
  const rateLimiter: RateLimiterPort = { consume: async () => ({ allowed: true, remaining: 1 }) };
  const logged: Array<Record<string, CopilotLogValue>> = [];
  const useCase = new DraftProductDescriptionUseCase({
    llmProvider: provider,
    rateLimiter,
    getCategoryUseCase: evalCategories(),
    copilotLog: { info: (_event, data) => logged.push(data) },
    clock: () => new Date("2026-10-19T10:00:00Z"),
  });
  const { category, ...fields } = evalCase.input;
  const input = descriptionDraftSchema.parse({
    ...fields,
    categoryId: category ? EVAL_CATEGORY_IDS[category] : "",
  });
  const result = await useCase.execute(input, { id: "eval" });
  return { result, provider, log: logged[0] ?? {} };
}

/**
 * The description eval set (descriptions spec, step 7; AGENTS.md "Evaluation"), run in the unit
 * suite against scripted models: no case calls a real provider. Each case asserts properties of
 * the result; the properties below hold for every case.
 */
describe("Description evals", () => {
  it("covers every property the eval set must cover", () => {
    const required: DescriptionEvalProperty[] = [
      "grounding",
      "invalid_output",
      "insufficient_data",
      "prompt_injection",
      "provider_failure",
      "demo_labels",
    ];
    const covered = new Set(DESCRIPTION_EVAL_CASES.map((evalCase) => evalCase.covers));
    expect(required.filter((property) => !covered.has(property))).toEqual([]);
    const ids = DESCRIPTION_EVAL_CASES.map((evalCase) => evalCase.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const evalCase of DESCRIPTION_EVAL_CASES) {
    it(`${evalCase.id}: ${evalCase.description}`, async () => {
      const { result, provider, log } = await run(evalCase);
      const { expected } = evalCase;

      expect({
        kind: result.kind,
        reason: result.kind === "unavailable" ? result.reason : undefined,
        llmCalls: provider.requests.length,
      }).toEqual({ kind: expected.kind, reason: expected.reason, llmCalls: expected.llmCalls });
      for (const code of expected.issueCodes ?? []) expect(log.issueCodes).toContain(code);

      const shown = JSON.stringify(result);
      for (const text of expected.absent ?? []) expect(shown).not.toContain(text);

      if (result.kind === "draft") {
        // What is shown passes the checks again, and a demo product is marked exactly once.
        const { category, ...fields } = evalCase.input;
        const sources = buildDescriptionSources(
          { ...fields, categoryId: null, price: Math.round(Number(fields.price) * 100) || null },
          category,
        );
        expect(findDescriptionIssues(result.text, sources)).toEqual([]);
        expect(result.demoMarked).toBe(sources.demo);
        expect(result.text.startsWith("[DEMO] ")).toBe(sources.demo);
        expect(result.text.match(/\[DEMO\]/g)?.length ?? 0).toBe(sources.demo ? 1 : 0);
      } else {
        // Never a partial or unchecked draft.
        expect(result).not.toHaveProperty("text");
      }

      // A1: every request carries the four fields only: no id, SKU or stock.
      for (const request of provider.requests) {
        const sent = JSON.stringify(request.messages);
        expect(sent).not.toMatch(UUID);
        expect(sent).not.toMatch(/sku|stock_quantity|status/i);
      }
      // A13: the log holds no field value and no draft text.
      expect(JSON.stringify(log)).not.toContain(evalCase.input.name);
    });
  }
});
