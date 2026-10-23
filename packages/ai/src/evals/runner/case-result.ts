/** The two eval sets (Copilot spec A19; descriptions spec, step 7). */
export const EVAL_SETS = ["copilot", "descriptions"] as const;
export type EvalSet = (typeof EVAL_SETS)[number];

/** `offline`: scripted models (unit suite, `npm run eval`); `live`: the configured provider. */
export type EvalMode = "offline" | "live";

/**
 * One checked property of a case. `detail` is built only from eval-authored constants and enum
 * values, never from the prompt or the model's text (eval-script spec A8).
 */
export type PropertyResult = { property: string; passed: boolean; detail?: string };

/**
 * - `passed` / `failed`: every property held / at least one did not.
 * - `unavailable`: live only; the provider could not answer (timeout, auth, quota). Its
 *   properties are still checked, and a failed property still makes the case `failed`.
 * - `skipped`: live only; not run because of the call budget or an earlier provider failure.
 */
export type CaseStatus = "passed" | "failed" | "unavailable" | "skipped";

export type TokenTotals = { input: number; output: number; thinking: number };

export type CaseResult = {
  set: EvalSet;
  id: string;
  covers: string;
  mode: EvalMode;
  status: CaseStatus;
  /** `llm`, `rules: invalid_output`, `declined`, `draft`, `unavailable: timeout`, `skipped: budget`. */
  outcome: string;
  /** Whether the model's output was shown; `null` when no model output was expected or possible. */
  accepted: boolean | null;
  /** `generateStructured` calls made (retries included). */
  attempts: number;
  /** Sum of the provider-reported latencies of successful calls; `null` without one. */
  latencyMs: number | null;
  tokens: TokenTotals;
  model: string | null;
  /** The provider's own failure reason (`timeout`, `auth`, …); never a budget refusal. */
  providerFailure: string | null;
  /** The failure's short, log-safe cause code (`bad_request`, `finish_max_tokens`, …; #65). */
  providerCause: string | null;
  /** Description checks that rejected an attempt (constants, e.g. `ungrounded_number`). */
  issueCodes: string[];
  properties: PropertyResult[];
};

export function check(property: string, passed: boolean, detail?: string): PropertyResult {
  return passed || detail === undefined ? { property, passed } : { property, passed, detail };
}

/** A case fails on any failed property; otherwise it is unavailable when the provider was. */
export function statusOf(properties: readonly PropertyResult[], unavailable: boolean): CaseStatus {
  if (properties.some((property) => !property.passed)) return "failed";
  return unavailable ? "unavailable" : "passed";
}

/** Quotes eval-authored text for a property detail. */
export function quoted(text: string): string {
  return JSON.stringify(text);
}
