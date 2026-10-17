import type { CopilotAnswerDto, CopilotAnswerRecommendation } from "@commerceos/ai";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  COPILOT_ANSWERS_URL,
  IDLE_COPILOT_STATE,
  RATE_LIMITED_TEXT,
  SESSION_ENDED_TEXT,
  UNAVAILABLE_TEXT,
  createAskCopilotAction,
  originText,
  periodText,
  type CopilotPanelState,
  type SuggestedQuestion,
} from "./copilot-copy";
import { CopilotPanel } from "./copilot-panel";
import { CopilotPanelView } from "./copilot-panel-view";

const PULSE_ID = "0b5f2c1e-8d3a-4c6b-9e1f-2a7d4c8b6e01";
const ECHO_ID = "2d7b4e3a-af5c-4e8d-9a3b-4c9f6eab8a23";

const QUESTIONS: SuggestedQuestion[] = [
  { intent: "focus", question: "What should I focus on to improve sales this week?" },
  { intent: "low_stock", question: "Which products are low on stock?" },
];

const RESTOCK: CopilotAnswerRecommendation = {
  id: null,
  status: "new",
  title: "Restock Pulse Ultralight Mouse",
  priority: "high",
  observation: "9 units sold in the last 7 days; 3 left in stock.",
  evidence: [
    { metric: "Units sold: Pulse", value: "9", period: "Last 7 days", source: "getTopProducts" },
    { metric: "Sessions", value: "120", period: "Last 7 days", source: "demo", demo: true },
  ],
  reasoning: "It is a best seller.",
  suggestedAction: "Order a new batch.",
  relatedProductIds: [PULSE_ID, ECHO_ID],
  relatedProducts: [
    { id: PULSE_ID, name: "Pulse Ultralight Mouse" },
    { id: ECHO_ID, name: "Echo Surround Headset" },
  ],
  limitations: ["Traffic figures are fictional demo data."],
};

const ANSWERED: CopilotAnswerDto = {
  answerId: null,
  kind: "answered",
  intent: "focus",
  question: QUESTIONS[0]?.question ?? null,
  origin: "rules",
  fallbackReason: "not_configured",
  model: null,
  period: {
    from: "2026-10-10T22:00:00.000Z",
    to: "2026-10-17T22:00:00.000Z",
    name: "Last 7 days",
    label: "11–17 Oct 2026",
    timeZone: "Europe/Warsaw",
  },
  summary: "In the last 7 days: paid orders 29.",
  summaryEvidence: [
    { metric: "Paid orders", value: "29", period: "Last 7 days", source: "getSalesSummary" },
  ],
  recommendations: [
    RESTOCK,
    { ...RESTOCK, title: "Low one", priority: "low", relatedProducts: [], limitations: undefined },
  ],
  limitations: ["Traffic figures are fictional demo data."],
  definitions: [{ id: "paidOrders", label: "Paid orders", definition: "Orders that were paid." }],
};

const DECLINED: CopilotAnswerDto = {
  ...ANSWERED,
  kind: "declined",
  intent: null,
  question: null,
  fallbackReason: null,
  period: null,
  summary:
    "Copilot can't answer this. It needs product cost data, which this store does not record.",
  missingData: "product cost data",
  summaryEvidence: [],
  recommendations: [],
  limitations: [],
  definitions: [],
};

function render(state: CopilotPanelState, pending = false): string {
  return renderToStaticMarkup(
    createElement(CopilotPanelView, { action: vi.fn(), state, pending, questions: QUESTIONS }),
  );
}

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function respond(status: number, body: unknown) {
  return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    typeof body === "string" ? new Response(body, { status }) : Response.json(body, { status }),
  );
}

describe("copilot copy", () => {
  it("names the origin and the reason only for answered questions", () => {
    expect(originText(ANSWERED)).toBe("Rule-based insights · AI is not configured");
    expect(originText({ ...ANSWERED, fallbackReason: null })).toBe("Rule-based insights");
    expect(originText({ ...ANSWERED, origin: "llm", fallbackReason: null, model: "m-1" })).toBe(
      "AI-generated · m-1",
    );
    expect(originText(DECLINED)).toBeNull();
    if (!ANSWERED.period) throw new Error("fixture has a period");
    expect(periodText(ANSWERED.period)).toBe("Last 7 days: 11–17 Oct 2026 (Europe/Warsaw)");
  });
});

describe("createAskCopilotAction", () => {
  it("sends the intent of a suggested-question button, not the typed text", async () => {
    const fetcher = respond(200, { ok: true, data: ANSWERED });
    const state = await createAskCopilotAction(fetcher)(
      IDLE_COPILOT_STATE,
      form({ intent: "focus", question: "typed" }),
    );
    expect(state).toEqual({ status: "answer", answer: ANSWERED, question: "typed" });
    expect(fetcher).toHaveBeenCalledWith(COPILOT_ANSWERS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "focus" }),
    });
  });

  it("sends the typed question when no button was used", async () => {
    const fetcher = respond(200, { ok: true, data: DECLINED });
    await createAskCopilotAction(fetcher)(IDLE_COPILOT_STATE, form({ intent: "", question: "Hi" }));
    await createAskCopilotAction(fetcher)(IDLE_COPILOT_STATE, form({}));
    expect(fetcher.mock.calls.map((call) => call[1]?.body)).toEqual([
      JSON.stringify({ question: "Hi" }),
      JSON.stringify({ question: "" }),
    ]);
  });

  it("maps every failure to a message the owner can act on", async () => {
    const cases: [number, unknown, string][] = [
      [
        400,
        { ok: false, error: { code: "VALIDATION_FAILED", message: "Type a question." } },
        "Type a question.",
      ],
      [
        400,
        {
          ok: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "The request is invalid.",
            fieldErrors: { question: ["Type a question."] },
          },
        },
        "Type a question.",
      ],
      [400, "not json", UNAVAILABLE_TEXT],
      [401, { ok: false, error: { code: "UNAUTHORIZED", message: "x" } }, SESSION_ENDED_TEXT],
      [429, { ok: false, error: { code: "RATE_LIMITED", message: "x" } }, RATE_LIMITED_TEXT],
      [500, { ok: false, error: { code: "INTERNAL_ERROR", message: "x" } }, UNAVAILABLE_TEXT],
      [200, { ok: false, error: { code: "X", message: "x" } }, UNAVAILABLE_TEXT],
    ];
    for (const [status, body, message] of cases) {
      const state = await createAskCopilotAction(respond(status, body))(
        IDLE_COPILOT_STATE,
        form({ question: "q" }),
      );
      expect(state).toEqual({ status: "error", message, question: "q" });
    }
  });

  it("reports a network failure as unavailable", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const state = await createAskCopilotAction(fetcher)(
      IDLE_COPILOT_STATE,
      form({ question: "q" }),
    );
    expect(state.message).toBe(UNAVAILABLE_TEXT);
  });
});

describe("CopilotPanelView", () => {
  it("renders the suggested questions and the typed-question field before any answer", () => {
    const html = render({ ...IDLE_COPILOT_STATE, question: "kept text" });
    expect(html).toContain('value="focus"');
    expect(html).toContain('name="intent"');
    expect(html).toContain("Which products are low on stock?");
    expect(html).toContain('maxLength="500"');
    expect(html).toContain("kept text");
    expect(html).not.toContain("copilot-answer");
  });

  it("shows the pending state and disables the buttons", () => {
    const html = render(IDLE_COPILOT_STATE, true);
    expect(html).toContain("Analysing your store data…");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("readOnly");
    expect(html).toContain("disabled");
  });

  it("shows an error as an alert", () => {
    const html = render({ status: "error", message: RATE_LIMITED_TEXT, question: "" });
    expect(html).toContain('role="alert"');
    expect(html).toContain(RATE_LIMITED_TEXT);
  });

  it("renders an answered question: origin, period, evidence table, demo tag and links", () => {
    const html = render({ status: "answer", answer: ANSWERED, question: "" });
    expect(html).toContain("Rule-based insights · AI is not configured");
    expect(html).toContain("Last 7 days: 11–17 Oct 2026 (Europe/Warsaw)");
    expect(html).toContain("Question: What should I focus on to improve sales this week?");
    expect(html).toContain("High priority");
    expect(html).toContain("Low priority");
    expect(html).toContain("<caption");
    expect(html).toContain("Fictional demo data");
    expect(html).toContain("Suggested next step (your decision)");
    expect(html).toContain(`href="/admin/products/${PULSE_ID}"`);
    expect(html).toContain(", <a");
    expect(html).toContain("How these numbers are defined");
    expect(html.match(/data-testid="copilot-recommendation"/g)).toHaveLength(2);
    expect(html).toContain('data-testid="copilot-summary-evidence"');
    expect(html).toContain("Figures in this summary");
  });

  it("renders summary evidence alone, demo rows tagged, for a traffic answer", () => {
    const html = render({
      status: "answer",
      answer: {
        ...ANSWERED,
        intent: "traffic_sources",
        summaryEvidence: [
          { metric: "Sessions (demo)", value: "1000", source: "getTrafficSummary", demo: true },
        ],
        recommendations: [],
      },
      question: "",
    });
    expect(html).toContain("Figures in this summary");
    expect(html).toContain("Fictional demo data");
    expect(html).not.toContain('data-testid="copilot-recommendation"');
  });

  it("renders the answer-level limitations when no recommendation stands out", () => {
    const html = render({
      status: "answer",
      answer: { ...ANSWERED, recommendations: [] },
      question: "",
    });
    expect(html).toContain("Limitations");
    expect(html).toContain("Traffic figures are fictional demo data.");
  });

  it("renders a declined question with its missing data and nothing else", () => {
    const html = render({ status: "answer", answer: DECLINED, question: "" });
    expect(html).toContain("It needs product cost data");
    expect(html).not.toContain("Rule-based insights");
    expect(html).not.toContain("Limitations");
    expect(html).not.toContain("How these numbers are defined");
  });

  it("lists the questions Copilot answers for an unsupported question", () => {
    const html = render({
      status: "answer",
      answer: { ...DECLINED, kind: "unsupported", summary: "It can answer these:" },
      question: "",
    });
    expect(html).toContain("<li>What should I focus on to improve sales this week?</li>");
  });
});

describe("CopilotPanel", () => {
  it("renders the view in its idle state", () => {
    const html = renderToStaticMarkup(createElement(CopilotPanel, { questions: QUESTIONS }));
    expect(html).toContain("Or ask about your store");
  });
});
