import type { CopilotAnswerDto } from "@commerceos/ai";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { CopilotAnswerView } from "@/components/admin/copilot/copilot-answer-view";
import {
  EMPTY_STORE_TITLE,
  RATE_LIMITED_TEXT,
  SUMMARY_EVIDENCE_CAPTION,
  SESSION_ENDED_TEXT,
  UNAVAILABLE_TEXT,
} from "@/components/admin/copilot/copilot-copy";
import { answerNotice, failureNotice } from "@/components/admin/copilot/copilot-fallback";
import {
  AnswerNoticeView,
  FailureNoticeView,
} from "@/components/admin/copilot/copilot-fallback-view";
import { Narrow } from "../../primitives/blocks/state-grid";

/**
 * Patterns / Copilot / Answer states. Real views with fixed answers: no network, no provider, no
 * database. The figures are the fictional demo store's (the same shape as the server's answers).
 */

const PERIOD = {
  from: "2026-10-10T22:00:00.000Z",
  to: "2026-10-17T22:00:00.000Z",
  name: "Last 7 days",
  label: "11–17 Oct 2026",
  timeZone: "Europe/Warsaw",
};

const ANSWER: CopilotAnswerDto = {
  answerId: null,
  kind: "answered",
  intent: "traffic_sources",
  question: "Which traffic source converts best?",
  origin: "rules",
  fallbackReason: "not_configured",
  model: null,
  period: PERIOD,
  summary: "Sessions in the last 7 days: 1,200 (fictional demo traffic).",
  summaryEvidence: [
    { metric: "Paid orders", value: "29", period: "Last 7 days", source: "getSalesSummary" },
    {
      metric: "Sessions",
      value: "1,200",
      period: "Last 7 days",
      source: "getTrafficSummary",
      demo: true,
    },
  ],
  recommendations: [],
  limitations: ["Traffic figures are fictional demo data."],
  definitions: [],
};

const DECLINED: CopilotAnswerDto = {
  ...ANSWER,
  kind: "declined",
  intent: null,
  question: "What is my profit margin per product?",
  fallbackReason: null,
  period: null,
  summary:
    "Copilot can't answer this. It needs product cost data, which this store does not record.",
  missingData: "product cost data",
  summaryEvidence: [],
  limitations: [],
};

const meta = {
  title: "Patterns/Copilot/Answer states",
  parameters: { layout: "padded", a11y: { test: "error" } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A rule-based answer at 1440 px: the notice, the summary and the evidence table. */
export const RuleBasedWide: Story = {
  render: () => (
    <div className="max-w-4xl">
      <CopilotAnswerView answer={ANSWER} questions={[]} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("AI is not configured")).toBeVisible();
    await expect(canvas.getByRole("table", { name: SUMMARY_EVIDENCE_CAPTION })).toBeVisible();
  },
};

/**
 * The same answer at 320 px: the evidence is a labelled list (the table is hidden below the
 * container breakpoint, D6), and the frame does not scroll sideways.
 */
export const RuleBasedNarrow320: Story = {
  render: () => (
    <Narrow>
      <CopilotAnswerView answer={ANSWER} questions={[]} />
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
    await expect(canvas.getByRole("list", { name: SUMMARY_EVIDENCE_CAPTION })).toBeVisible();
    // Hidden elements are excluded from role queries by default, so the table is found with `hidden`.
    await expect(
      canvas.getByRole("table", { name: SUMMARY_EVIDENCE_CAPTION, hidden: true }),
    ).not.toBeVisible();
  },
};

/** A declined question: the server's summary is the info notice; nothing else is offered. */
export const Declined: Story = {
  render: () => (
    <div className="max-w-4xl">
      <CopilotAnswerView answer={DECLINED} questions={[]} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("copilot-summary")).toHaveTextContent("product cost data");
  },
};

/** An answer with no recommendations: the empty state with its next step. */
export const EmptyStore: Story = {
  render: () => (
    <div className="max-w-4xl">
      <CopilotAnswerView answer={{ ...ANSWER, summaryEvidence: [] }} questions={[]} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: EMPTY_STORE_TITLE })).toBeVisible();
  },
};

/** A session that ended: the warning notice with a link to sign in again. */
export const SessionEnded: Story = {
  render: () => {
    const notice = failureNotice("session");
    if (notice === null) throw new Error("a session failure has a notice");
    return (
      <div className="max-w-4xl">
        <FailureNoticeView notice={notice} />
      </div>
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(SESSION_ENDED_TEXT)).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/admin/sign-in",
    );
  },
};

/**
 * The fallback notices (S1 to S13): a rule-based answer says why the AI answer is missing (info
 * for "not configured", warning for a provider error), and a failed question says what to do.
 * Each notice is an `Alert`, never an `ErrorState`.
 */
export const FallbackNotices: Story = {
  render: () => {
    const timeout = answerNotice({ ...ANSWER, origin: "rules", fallbackReason: "timeout" });
    const rateLimited = failureNotice("rate_limited");
    const unavailable = failureNotice("unavailable");
    if (timeout === null || rateLimited === null || unavailable === null) {
      throw new Error("these fallbacks have a notice");
    }
    return (
      <div className="flex max-w-4xl flex-col gap-3">
        <AnswerNoticeView notice={timeout} />
        <FailureNoticeView notice={rateLimited} />
        <FailureNoticeView notice={unavailable} />
      </div>
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(RATE_LIMITED_TEXT)).toBeVisible();
    await expect(canvas.getByText(UNAVAILABLE_TEXT)).toBeVisible();
  },
};
