import type { CopilotAnswerDto, FallbackReason } from "@commerceos/ai";
import type { CopilotIntentId } from "@commerceos/core";
import type { ApiResult } from "@/server/http/api-result";

/** Client-safe: the panel imports it, so it holds no server code. */
export const COPILOT_PATH = "/admin/copilot";
export const COPILOT_ANSWERS_URL = "/api/admin/copilot/answers";

export const ADVISORY_TEXT =
  "Copilot suggests; you decide. It reads your store's orders, products and stock and never changes anything. Recommendations can be incomplete.";
export const PENDING_TEXT = "Analysing your store data…";
export const RATE_LIMITED_TEXT =
  "You asked many questions in a short time. Try again in a few minutes.";
export const SESSION_ENDED_TEXT = "Your session has ended. Sign in again to ask Copilot.";
export const UNAVAILABLE_TEXT = "Copilot is temporarily unavailable.";
export const RULE_BASED_LABEL = "Rule-based insights";

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

/** What the panel shows: the last answer or error, and the question typed, kept after submit. */
export type CopilotPanelState = {
  status: "idle" | "answer" | "error";
  answer?: CopilotAnswerDto;
  message?: string;
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

/** "Last 7 days: 11–17 Oct 2026 (Europe/Warsaw)". */
export function periodText(period: NonNullable<CopilotAnswerDto["period"]>): string {
  return `${period.name}: ${period.label} (${period.timeZone})`;
}

function errorText(status: number, result: ApiResult<CopilotAnswerDto> | null): string {
  if (status === 400 && result && !result.ok) {
    // A field message ("Type a question.") is more useful than the generic form-level one.
    const [first] = Object.values(result.error.fieldErrors ?? {}).flat();
    return first ?? result.error.message;
  }
  if (status === 401) return SESSION_ENDED_TEXT;
  if (status === 429) return RATE_LIMITED_TEXT;
  return UNAVAILABLE_TEXT;
}

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
      return { status: "error", message: UNAVAILABLE_TEXT, question };
    }
    const result = await readResult(response);
    if (response.ok && result?.ok) return { status: "answer", answer: result.data, question };
    return { status: "error", message: errorText(response.status, result), question };
  };
}
