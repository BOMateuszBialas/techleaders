import type { CopilotAnswerDto, FallbackReason } from "@commerceos/ai";
import type { CopilotIntentId } from "@commerceos/core";
import type { ApiResult } from "@/server/http/api-result";

/** Client-safe: the panel imports it, so it holds no server code. */
export const COPILOT_PATH = "/admin/copilot";
export const COPILOT_ANSWERS_URL = "/api/admin/copilot/answers";

export const ADVISORY_TEXT =
  "Copilot suggests; you decide. It reads your store's orders, products and stock (and fictional demo traffic data) and never changes anything. Recommendations can be incomplete.";
export const EVIDENCE_CAPTION = "Evidence from this store's data";
export const SUMMARY_EVIDENCE_CAPTION = "Figures in this summary";
/** The tag on every evidence row from the seeded, fictional demo traffic (D08). */
export const DEMO_DATA_TAG = "Fictional demo data";
export const PENDING_TEXT = "Analysing your store data…";
export const RATE_LIMITED_TEXT =
  "You asked many questions in a short time. Try again in a few minutes.";
export const SESSION_ENDED_TEXT = "Your session has ended. Sign in again to ask Copilot.";
export const UNAVAILABLE_TEXT = "Copilot is temporarily unavailable.";
export const RULE_BASED_LABEL = "Rule-based insights";
/** The notice under a rule-based answer (Phase 2, approved OA-6). */
export const RULE_BASED_DESCRIPTION = "Showing rule-based insights from your store data.";
/** The notice for an answer with no recommendations (Phase 2, approved OA-6; next step: check). */
export const EMPTY_STORE_TITLE = "Not enough store data yet";
export const EMPTY_STORE_NEXT_STEP =
  "Try another suggested question, or check again after more store activity.";
export const SIGN_IN_TEXT = "Sign in";
export const SIGN_IN_HREF = "/admin/sign-in";

/** Why an answer is rule-based, in the owner's words (Copilot spec, UI/UX "Answer header"). */
export const FALLBACK_REASON_TEXT: Readonly<Record<FallbackReason, string>> = {
  not_configured: "AI is not configured",
  timeout: "AI timed out",
  rate_limited: "The AI provider is busy",
  provider_error: "The AI provider failed",
  auth: "The AI provider rejected the credentials",
  refused: "The AI declined to answer",
  daily_limit: "Daily AI limit reached",
  invalid_output: "The AI answer failed our checks",
};

export const PRIORITY_TEXT = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

/** A suggested-question button: the intent it sends and its D09 wording. */
export type SuggestedQuestion = { intent: CopilotIntentId; question: string };

/**
 * Why a question failed: a field message under the question (400), or a notice (session ended,
 * rate limit, unreachable service). Set with `status: "error"`.
 */
export type PanelFailure = "validation" | "session" | "rate_limited" | "unavailable";

/** What the panel shows: the last answer or error, and the question typed, kept after submit. */
export type CopilotPanelState = {
  status: "idle" | "answer" | "error";
  answer?: CopilotAnswerDto;
  /** The field message for a validation failure, or the notice text for the others. */
  message?: string;
  failure?: PanelFailure;
  question: string;
};

export const IDLE_COPILOT_STATE: CopilotPanelState = { status: "idle", question: "" };

/** "AI-generated · <model>" or "Rule-based insights · AI is not configured". */
export function originText(answer: CopilotAnswerDto): string | null {
  if (answer.kind !== "answered") return null;
  if (answer.origin === "llm") return `AI-generated · ${answer.model}`;
  return answer.fallbackReason
    ? `${RULE_BASED_LABEL} · ${FALLBACK_REASON_TEXT[answer.fallbackReason]}`
    : RULE_BASED_LABEL;
}

/** The question counter under the field, e.g. "120 of 500 characters" (Q5: always visible). */
export function questionLengthText(length: number, max: number): string {
  return `${length} of ${max} characters`;
}

/** "Last 7 days: 11–17 Oct 2026 (Europe/Warsaw)". */
export function periodText(period: NonNullable<CopilotAnswerDto["period"]>): string {
  return `${period.name}: ${period.label} (${period.timeZone})`;
}

/** The failure and its text for an HTTP status (400 to 500, Copilot spec API Contracts). */
function failureOf(
  status: number,
  result: ApiResult<CopilotAnswerDto> | null,
): { failure: PanelFailure; message: string } {
  if (status === 400 && result && !result.ok) {
    // A field message ("Type a question.") is more useful than the generic form-level one.
    const [first] = Object.values(result.error.fieldErrors ?? {}).flat();
    return { failure: "validation", message: first ?? result.error.message };
  }
  if (status === 401) return { failure: "session", message: SESSION_ENDED_TEXT };
  if (status === 429) return { failure: "rate_limited", message: RATE_LIMITED_TEXT };
  return { failure: "unavailable", message: UNAVAILABLE_TEXT };
}

/**
 * After a refused question (400) the focus moves to the question, the first invalid field
 * (admin spec A-2; owner-approved OA-4). The view calls it from the textarea's ref callback, which
 * React runs at commit (not during render), so it needs no effect and no ref in the wrapper.
 */
export function focusRefusedQuestion(
  state: CopilotPanelState,
  field: { focus: () => void } | null,
): void {
  if (state.status !== "error" || state.failure !== "validation" || !field) return;
  // The view's ref callback is a new function on every render, so React calls it again with the
  // same refused state while the error stays on screen. Focus only on the first call per refusal.
  if (focusedRefusals.has(state)) return;
  focusedRefusals.add(state);
  field.focus();
}

/** The refused states that already took the focus (a new submit gives a new state object). */
const focusedRefusals = new WeakSet<CopilotPanelState>();

async function readResult(response: Response): Promise<ApiResult<CopilotAnswerDto> | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * The panel's form action (runs in the browser): a suggested-question button sends its intent,
 * "Ask" sends the typed question, and the JSON route answers. Network and server failures
 * become a message; nothing internal is shown.
 */
export function createAskCopilotAction(fetcher: typeof fetch) {
  return async (_previous: CopilotPanelState, formData: FormData): Promise<CopilotPanelState> => {
    const intent = formData.get("intent");
    const question = String(formData.get("question") ?? "");
    const body = typeof intent === "string" && intent !== "" ? { intent } : { question };
    let response: Response;
    try {
      response = await fetcher(COPILOT_ANSWERS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      return { status: "error", failure: "unavailable", message: UNAVAILABLE_TEXT, question };
    }
    const result = await readResult(response);
    if (response.ok && result?.ok) return { status: "answer", answer: result.data, question };
    return { status: "error", ...failureOf(response.status, result), question };
  };
}
