import type { CopilotAnswerDto } from "@commerceos/ai";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EMPTY_STORE_NEXT_STEP, EMPTY_STORE_TITLE, RULE_BASED_DESCRIPTION } from "./copilot-copy";
import { CopilotAnswerView } from "./copilot-answer-view";

const QUESTIONS = [{ intent: "focus" as const, question: "What should I focus on?" }];

const BASE: CopilotAnswerDto = {
  answerId: null,
  kind: "answered",
  intent: "focus",
  question: "What should I focus on?",
  origin: "rules",
  fallbackReason: "not_configured",
  model: null,
  period: null,
  summary: "In the last 7 days: paid orders 0.",
  summaryEvidence: [],
  recommendations: [],
  limitations: ["Traffic figures are fictional demo data."],
  definitions: [],
};

function render(answer: CopilotAnswerDto): string {
  return renderToStaticMarkup(createElement(CopilotAnswerView, { answer, questions: QUESTIONS }));
}

describe("CopilotAnswerView states", () => {
  it("shows an answer with no recommendations as an empty store, with its limitations", () => {
    const html = render(BASE);
    expect(html).toContain(EMPTY_STORE_TITLE);
    expect(html).toContain(EMPTY_STORE_NEXT_STEP);
    expect(html).toContain("Traffic figures are fictional demo data.");
    expect(html).toContain(RULE_BASED_DESCRIPTION);
    expect(html).toContain('data-testid="copilot-summary"');
  });

  it("shows no fallback notice for an AI answer, only the empty state", () => {
    const html = render({ ...BASE, origin: "llm", fallbackReason: null, model: "m-1" });
    expect(html).not.toContain(RULE_BASED_DESCRIPTION);
    expect(html).toContain(EMPTY_STORE_TITLE);
  });

  it("puts a declined answer's summary in the info notice, with its limitations only if any", () => {
    const html = render({
      ...BASE,
      kind: "declined",
      intent: null,
      question: null,
      fallbackReason: null,
      summary: "Copilot cannot answer this.",
      limitations: [],
    });
    expect(html).toContain('data-testid="copilot-summary"');
    expect(html).toContain("Copilot cannot answer this.");
    expect(html).not.toContain(EMPTY_STORE_TITLE);
    expect(html).not.toContain("Limitations");
  });

  it("lists the questions and shows limitations for an unsupported answer", () => {
    const html = render({
      ...BASE,
      kind: "unsupported",
      intent: null,
      fallbackReason: null,
      summary: "It can answer these:",
    });
    expect(html).toContain("<li>What should I focus on?</li>");
    expect(html).toContain("Traffic figures are fictional demo data.");
    expect(html).not.toContain(EMPTY_STORE_TITLE);
  });

  it("names the definitions in a disclosure", () => {
    const html = render({
      ...BASE,
      definitions: [{ id: "paidOrders", label: "Paid orders", definition: "Paid orders." }],
    });
    expect(html).toContain("How these numbers are defined");
    expect(html).toContain("<details");
  });
});
