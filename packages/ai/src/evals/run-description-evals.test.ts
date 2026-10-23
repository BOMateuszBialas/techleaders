import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_EVAL_CASES,
  type DescriptionEvalProperty,
} from "./descriptions/description.cases";
import { runDescriptionCase } from "./runner/description-eval";

/**
 * The description eval set (descriptions spec, step 7; AGENTS.md "Evaluation"), run in the unit
 * suite against scripted models: no case calls a real provider. The properties each case must
 * have are checked by `checkDescriptionResult` (`runner/description-eval.ts`), which
 * `npm run eval` uses too.
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
      const result = await runDescriptionCase(evalCase, { mode: "offline" });
      expect(result.properties.filter((property) => !property.passed)).toEqual([]);
      expect(result.status).toBe("passed");
      const names = result.properties.map((property) => property.property);
      for (const name of ["outcome", "no_ids_sent", "log_has_no_values"]) {
        expect(names).toContain(name);
      }
      expect(names).toContain(result.outcome === "draft" ? "draft_rechecked" : "no_partial_draft");
    });
  }
});
