import type { CopilotAnswerDto, CopilotAnswerRecommendation } from "@commerceos/ai";
import type { CopilotRecommendationList, CopilotRecommendationRecord } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CopilotPanelView } from "./copilot-panel-view";
import { RecommendationCardView } from "./copilot-answer-view";
import {
  DELETED_PRODUCT_TEXT,
  EMPTY_RECOMMENDATIONS_TEXT,
  IDLE_RECOMMENDATION_STATUS_STATE,
  NO_SHARED_STATUSES,
  RECOMMENDATIONS_UNAVAILABLE_TEXT,
  ignoreStatusReport,
  recommendationsPageHref,
  recordReportedStatus,
  reportingStatusAction,
  shownRecommendationStatus,
  statusActions,
  statusChangedMessage,
  statusText,
  storedOnText,
  toRecommendationCard,
  type RecommendationStatusState,
} from "./recommendation-copy";
import { RecommendationStatusForm } from "./recommendation-status-form";
import { RecommendationStatusFormView } from "./recommendation-status-form-view";
import {
  RecommendationStatusesContext,
  RecommendationStatusesProvider,
} from "./recommendation-statuses";
import { SavedRecommendationsView } from "./saved-recommendations-view";

const ID = "5c1e7a2d-3b4f-4e6a-8c9d-0e1f2a3b4c5d";
const PULSE_ID = "0b5f2c1e-8d3a-4c6b-9e1f-2a7d4c8b6e01";
const GONE_ID = "2d7b4e3a-af5c-4e8d-9a3b-4c9f6eab8a23";
const TITLE = "Restock Pulse Ultralight Mouse";

const RECOMMENDATION: CopilotAnswerRecommendation = {
  id: ID,
  status: "new",
  title: TITLE,
  priority: "high",
  observation: "9 units sold in the last 7 days; 3 left in stock.",
  evidence: [{ metric: "Units sold", value: "9", period: "Last 7 days", source: "getTopProducts" }],
  reasoning: "It is a best seller.",
  suggestedAction: "Order a new batch.",
  relatedProductIds: [PULSE_ID],
  relatedProducts: [{ id: PULSE_ID, name: "Pulse Ultralight Mouse" }],
  limitations: [],
};

function record(overrides: Partial<CopilotRecommendationRecord> = {}): CopilotRecommendationRecord {
  return {
    id: ID,
    answerId: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    intent: "focus",
    origin: "rules",
    model: null,
    title: TITLE,
    priority: "high",
    observation: "9 units sold.",
    evidence: RECOMMENDATION.evidence,
    reasoning: "It is a best seller.",
    suggestedAction: "Order a new batch.",
    limitations: ["Demo traffic."],
    relatedProducts: [
      { id: PULSE_ID, name: "Pulse Ultralight Mouse" },
      { id: GONE_ID, name: null },
    ],
    status: "saved",
    statusChangedAt: new Date("2026-10-18T10:00:00.000Z"),
    createdAt: new Date("2026-10-18T09:00:00.000Z"),
    ...overrides,
  };
}

function renderForm(
  state: RecommendationStatusState,
  status: CopilotAnswerRecommendation["status"] = "new",
  pending = false,
): string {
  return renderToStaticMarkup(
    createElement(RecommendationStatusFormView, {
      action: vi.fn(),
      state,
      pending,
      recommendation: { id: ID, status, title: TITLE },
    }),
  );
}

function list(overrides: Partial<CopilotRecommendationList> = {}): CopilotRecommendationList {
  return { rows: [record()], page: 1, pageCount: 1, total: 1, ...overrides };
}

function renderList(value: CopilotRecommendationList | null): string {
  return renderToStaticMarkup(
    createElement(SavedRecommendationsView, { list: value, statusAction: vi.fn() }),
  );
}

describe("recommendation copy", () => {
  it("offers the transitions of the workflow and none after a terminal status", () => {
    expect(statusActions("new")).toEqual(["saved", "dismissed", "completed"]);
    expect(statusActions("saved")).toEqual(["completed", "dismissed"]);
    expect(statusActions("dismissed")).toEqual([]);
    expect(statusActions("completed")).toEqual([]);
  });

  it("words each status change and says Copilot changed nothing on completion", () => {
    expect(statusChangedMessage("saved")).toBe("Recommendation saved.");
    expect(statusChangedMessage("dismissed")).toBe("Recommendation dismissed.");
    expect(statusChangedMessage("completed")).toBe(
      "Recommendation marked as completed. Copilot did not change anything in your store.",
    );
    expect(statusText("completed")).toBe("Status: Completed");
  });

  it("builds page links and the date line", () => {
    expect(recommendationsPageHref(1)).toBe("/admin/copilot");
    expect(recommendationsPageHref(3)).toBe("/admin/copilot?page=3");
    expect(storedOnText(new Date("2026-10-18T09:00:00.000Z"))).toBe("Suggested on 2026-10-18");
    // 23:30 UTC on the 17th is already the 18th in Warsaw (store time zone).
    expect(storedOnText(new Date("2026-10-17T23:30:00.000Z"))).toBe("Suggested on 2026-10-18");
  });

  it("turns a stored recommendation into card data without answer-only fields", () => {
    expect(toRecommendationCard(record())).toEqual({
      id: ID,
      status: "saved",
      title: TITLE,
      priority: "high",
      observation: "9 units sold.",
      evidence: RECOMMENDATION.evidence,
      reasoning: "It is a best seller.",
      suggestedAction: "Order a new batch.",
      limitations: ["Demo traffic."],
      relatedProducts: record().relatedProducts,
    });
  });
});

describe("RecommendationStatusFormView", () => {
  it("offers save, dismiss and complete for a new recommendation, posting the shown status", () => {
    const html = renderForm(IDLE_RECOMMENDATION_STATUS_STATE);
    expect(html).toContain("Status: New");
    expect(html).toContain(`name="recommendationId" value="${ID}"`);
    expect(html).toContain('name="from" value="new"');
    expect(html).toContain('value="saved"');
    expect(html).toContain('value="dismissed"');
    expect(html).toContain('value="completed"');
    expect(html).toContain("Mark completed");
    // Each button's accessible name ends with the title, so cards can be told apart.
    expect(html).toContain(`aria-label="Save: ${TITLE}"`);
    expect(html).toContain("Copilot changes nothing in your store");
    expect(html).toContain('aria-busy="false"');
  });

  it("disables the buttons while pending", () => {
    const html = renderForm(IDLE_RECOMMENDATION_STATUS_STATE, "saved", true);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('data-slot="button" value="saved"');
  });

  it("shows the status the server reported and no actions once completed", () => {
    const html = renderForm({
      status: "success",
      message: statusChangedMessage("completed"),
      currentStatus: "completed",
    });
    expect(html).toContain("Status: Completed");
    expect(html).toContain("No further actions.");
    expect(html).not.toContain("<form");
    expect(html).toContain('role="status"');
    expect(html).toContain("Copilot did not change anything in your store.");
  });

  it("shows an error as an alert and keeps the actions", () => {
    const html = renderForm({ status: "error", message: "This status change is not allowed." });
    expect(html).toContain('role="alert"');
    expect(html).toContain("This status change is not allowed.");
    expect(html).toContain("<form");
  });
});

describe("RecommendationStatusForm", () => {
  it("renders the view in its idle state", () => {
    const html = renderToStaticMarkup(
      createElement(RecommendationStatusForm, {
        action: vi.fn(),
        recommendation: { id: ID, status: "new", title: TITLE },
      }),
    );
    expect(html).toContain("Status: New");
  });

  it("shows the status another card of the same recommendation reported (#67)", () => {
    const form = createElement(RecommendationStatusForm, {
      action: vi.fn(),
      recommendation: { id: ID, status: "saved", title: TITLE },
    });
    const html = renderToStaticMarkup(
      createElement(
        RecommendationStatusesContext,
        { value: { statuses: { [ID]: "completed" }, report: vi.fn() } },
        form,
      ),
    );
    expect(html).toContain("Status: Completed");
    expect(html).not.toContain("<form");
    // The page's provider starts with nothing reported: the card shows its own status.
    const provided = renderToStaticMarkup(
      createElement(RecommendationStatusesProvider, null, form),
    );
    expect(provided).toContain("Status: Saved");
    expect(provided).toContain("<form");
  });
});

describe("statuses shared between the cards of one recommendation (#67)", () => {
  it("records the latest reported status per recommendation", () => {
    const once = recordReportedStatus({}, { id: ID, status: "saved" });
    expect(recordReportedStatus(once, { id: ID, status: "completed" })).toEqual({
      [ID]: "completed",
    });
    expect(NO_SHARED_STATUSES.statuses).toEqual({});
    expect(ignoreStatusReport()).toBeUndefined();
  });

  it("reports the status the server returned, and nothing without one", async () => {
    const report = vi.fn();
    const changed: RecommendationStatusState = {
      status: "success",
      message: statusChangedMessage("completed"),
      currentStatus: "completed",
    };
    const action = vi.fn(async () => changed);
    const formData = new FormData();
    const reporting = reportingStatusAction(action, ID, report);
    await expect(reporting(IDLE_RECOMMENDATION_STATUS_STATE, formData)).resolves.toBe(changed);
    expect(action).toHaveBeenCalledWith(IDLE_RECOMMENDATION_STATUS_STATE, formData);
    expect(report).toHaveBeenCalledWith({ id: ID, status: "completed" });

    report.mockClear();
    const failed: RecommendationStatusState = { status: "error", message: "Try again." };
    await reportingStatusAction(async () => failed, ID, report)(changed, formData);
    expect(report).not.toHaveBeenCalled();
  });

  it("prefers the reported status, then the card's own, then the rendered one", () => {
    const saved: RecommendationStatusState = {
      status: "success",
      message: statusChangedMessage("saved"),
      currentStatus: "saved",
    };
    expect(shownRecommendationStatus(IDLE_RECOMMENDATION_STATUS_STATE, "new", undefined)).toEqual({
      status: "new",
      showMessage: true,
    });
    expect(shownRecommendationStatus(saved, "new", undefined)).toEqual({
      status: "saved",
      showMessage: true,
    });
    expect(shownRecommendationStatus(saved, "new", "saved")).toEqual({
      status: "saved",
      showMessage: true,
    });
    // Completed under "Your recommendations" after it was saved in the answer.
    expect(shownRecommendationStatus(saved, "new", "completed")).toEqual({
      status: "completed",
      showMessage: false,
    });
  });

  it("the answer card saved earlier shows Completed without actions or its old message", () => {
    const html = renderToStaticMarkup(
      createElement(RecommendationStatusFormView, {
        action: vi.fn(),
        state: {
          status: "success",
          message: statusChangedMessage("saved"),
          currentStatus: "saved",
        },
        pending: false,
        recommendation: { id: ID, status: "new", title: TITLE },
        reportedStatus: "completed",
      }),
    );
    expect(html).toContain("Status: Completed");
    expect(html).toContain("No further actions.");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("Recommendation saved.");
  });
});

describe("RecommendationCardView", () => {
  it("shows the status actions of a stored recommendation when the page passes the action", () => {
    const html = renderToStaticMarkup(
      createElement(RecommendationCardView, {
        recommendation: RECOMMENDATION,
        statusAction: vi.fn(),
      }),
    );
    expect(html).toContain('data-testid="recommendation-status"');
  });

  it("shows no actions without the action or without a stored id", () => {
    const withoutAction = renderToStaticMarkup(
      createElement(RecommendationCardView, { recommendation: RECOMMENDATION }),
    );
    const withoutId = renderToStaticMarkup(
      createElement(RecommendationCardView, {
        recommendation: { ...RECOMMENDATION, id: null },
        statusAction: vi.fn(),
      }),
    );
    expect(withoutAction).not.toContain("recommendation-status");
    expect(withoutId).not.toContain("recommendation-status");
  });

  it("names a deleted product without a link", () => {
    const html = renderToStaticMarkup(
      createElement(RecommendationCardView, {
        recommendation: toRecommendationCard(record()),
      }),
    );
    expect(html).toContain(`href="/admin/products/${PULSE_ID}"`);
    expect(html).toContain(DELETED_PRODUCT_TEXT);
    expect(html).not.toContain(`href="/admin/products/${GONE_ID}"`);
  });
});

describe("CopilotPanelView with stored recommendations", () => {
  it("passes the status action to every card of the answer", () => {
    const answer: CopilotAnswerDto = {
      answerId: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
      kind: "answered",
      intent: "focus",
      question: "What should I focus on to improve sales this week?",
      origin: "rules",
      fallbackReason: "not_configured",
      model: null,
      period: null,
      summary: "Summary.",
      summaryEvidence: [],
      recommendations: [RECOMMENDATION, { ...RECOMMENDATION, id: GONE_ID, title: "Second" }],
      limitations: [],
      definitions: [],
    };
    const html = renderToStaticMarkup(
      createElement(CopilotPanelView, {
        action: vi.fn(),
        state: { status: "answer", answer, question: "" },
        pending: false,
        questions: [],
        questionLength: 0,
        onQuestionChange: vi.fn(),
        statusAction: vi.fn(),
      }),
    );
    expect(html.match(/data-testid="recommendation-status"/g)).toHaveLength(2);
  });
});

describe("SavedRecommendationsView", () => {
  it("lists saved and completed recommendations with their date and status actions", () => {
    const html = renderList(
      list({ rows: [record(), record({ id: GONE_ID, status: "completed" })] }),
    );
    expect(html).toContain("Your recommendations");
    expect(html).toContain('dateTime="2026-10-18T09:00:00.000Z"');
    expect(html).toContain("Suggested on 2026-10-18");
    expect(html).toContain("Status: Saved");
    expect(html).toContain("Status: Completed");
    expect(html).toContain("Page 1 of 1");
    expect(html).not.toContain("Newer");
    expect(html).not.toContain("Older");
  });

  it("links to newer and older pages in the middle of the list", () => {
    const html = renderList(list({ page: 2, pageCount: 3, total: 50 }));
    expect(html).toContain('href="/admin/copilot"');
    expect(html).toContain('href="/admin/copilot?page=3"');
    expect(html).toContain("Page 2 of 3");
  });

  it("says where saved recommendations appear when there are none", () => {
    expect(renderList(list({ rows: [], total: 0 }))).toContain(EMPTY_RECOMMENDATIONS_TEXT);
  });

  it("offers the first page for a page past the last", () => {
    const html = renderList(list({ rows: [], page: 9, total: 3 }));
    expect(html).toContain("There are no recommendations on this page.");
    expect(html).toContain("Go to the first page");
  });

  it("shows an alert when the list could not be loaded", () => {
    const html = renderList(null);
    expect(html).toContain('role="alert"');
    expect(html).toContain(RECOMMENDATIONS_UNAVAILABLE_TEXT);
  });
});
