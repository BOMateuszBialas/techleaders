import type { CopilotAnswerDto, FallbackReason } from "@commerceos/ai";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { CopilotAnswerView } from "@/components/admin/copilot/copilot-answer-view";
import {
  FALLBACK_REASON_TEXT,
  RULE_BASED_DESCRIPTION,
} from "@/components/admin/copilot/copilot-copy";
import { answerNotice } from "@/components/admin/copilot/copilot-fallback";
import { AnswerNoticeView } from "@/components/admin/copilot/copilot-fallback-view";

/**
 * Patterns / Copilot / Failed states. Real views with fixed answers: the AI call failed or was
 * refused, and the owner still gets the rule-based answer. No network, no provider, no database.
 * The figures are the fictional demo store's.
 */

const PERIOD = {
  from: "2026-10-27T22:00:00.000Z",
  to: "2026-11-03T22:00:00.000Z",
  name: "Last 7 days",
  label: "28 Oct–3 Nov 2026",
  timeZone: "Europe/Warsaw",
};

/** A rule-based answer whose AI call failed: the reason is the only thing that differs. */
function failedAnswer(fallbackReason: FallbackReason): CopilotAnswerDto {
  return {
    answerId: null,
    kind: "answered",
    intent: "focus",
    question: "What should I focus on to improve sales this week?",
    origin: "rules",
    fallbackReason,
    model: null,
    period: PERIOD,
    summary: "Paid orders in the last 7 days: 29 (fictional demo store).",
    summaryEvidence: [
      { metric: "Paid orders", value: "29", period: "Last 7 days", source: "getSalesSummary" },
    ],
    recommendations: [],
    limitations: [],
    definitions: [],
  };
}

/** The AI provider failed: a warning notice says so, and the rule-based summary still shows. */
const LLM_ERROR_ANSWER = failedAnswer("provider_error");

/** Every fallback reason the server can send, in the order of the state map. */
const REASONS: FallbackReason[] = [
  "not_configured",
  "timeout",
  "rate_limited",
  "provider_error",
  "auth",
  "refused",
  "daily_limit",
  "invalid_output",
];

const meta = {
  title: "Patterns/Copilot/Failed states",
  parameters: { layout: "padded", a11y: { test: "error" } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The AI provider failed: the rule-based answer with its summary and the warning above it. */
export const LlmProviderError: Story = {
  render: () => (
    <div className="max-w-4xl">
      <CopilotAnswerView answer={LLM_ERROR_ANSWER} questions={[]} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(FALLBACK_REASON_TEXT.provider_error)).toBeVisible();
    await expect(canvas.getByText(RULE_BASED_DESCRIPTION)).toBeVisible();
    await expect(
      canvas.getByText("Paid orders in the last 7 days: 29 (fictional demo store)."),
    ).toBeVisible();
  },
};

/**
 * Every fallback reason as its notice. A fallback is information: a rule-based answer still
 * works, so no reason uses `destructive`.
 */
export const AllFallbackReasons: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-3">
      {REASONS.map((reason) => {
        const notice = answerNotice(failedAnswer(reason));
        if (notice === null) throw new Error(`the fallback ${reason} has a notice`);
        return <AnswerNoticeView key={reason} notice={notice} />;
      })}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(FALLBACK_REASON_TEXT.invalid_output)).toBeVisible();
    await expect(canvas.getByText(FALLBACK_REASON_TEXT.daily_limit)).toBeVisible();
  },
};
