import type { CopilotIntentId } from "@commerceos/core";
import type { FallbackReason } from "../copilot/copilot-answer";
import type { EvalStoreKind } from "./eval-store";
import type { ScriptStep } from "./scripted-llm-provider";

/** What a case is about (AGENTS.md, "Evaluation"; Copilot spec A19). */
export type EvalProperty =
  | "grounding"
  | "invalid_output"
  | "insufficient_data"
  | "prompt_injection"
  | "provider_failure"
  | "declined"
  | "demo_labels";

/**
 * One version-controlled eval case: a store, a question, the scripted model's replies, and the
 * properties the answer must have. Cases assert properties (origin, reason, calls, absent
 * fabrications), never exact wording.
 */
export type EvalCase = {
  id: string;
  covers: EvalProperty;
  /**
   * Also run against the configured model by `npm run eval -- --live` (eval-script spec A3): the
   * input is what is evaluated, not a scripted failure.
   */
  live?: true;
  description: string;
  store: EvalStoreKind;
  request: { intent: CopilotIntentId } | { question: string };
  /** The scripted model's replies, one per call; declined cases have none. */
  script: ScriptStep[];
  expected: {
    kind: "answered" | "declined";
    origin: "llm" | "rules";
    fallbackReason: FallbackReason | null;
    /** How many times the model is called (attempts). */
    llmCalls: number;
    /** Text that must not appear anywhere in the answer: fabricated or injected claims. */
    absent?: string[];
    /**
     * Demo traffic answers (D08): every evidence row is flagged `demo` and the answer carries the
     * "fictional demo data" limitation, whatever the model wrote.
     */
    demoLabelled?: boolean;
    /** Declined cases: the missing data the answer names. */
    missingData?: string;
  };
};
