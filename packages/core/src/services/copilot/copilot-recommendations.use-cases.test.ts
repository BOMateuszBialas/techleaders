import { describe, expect, it, vi } from "vitest";
import {
  RECOMMENDATION_STATUSES,
  isStaleRecommendationStatusError,
  type RecommendationStatus,
} from "../../domain/copilot/recommendation-status";
import { hasAppErrorCode, isNotFoundError } from "../../errors/app-error";
import type {
  ChangeRecommendationStatusOutcome,
  CopilotRecommendationRecord,
  CopilotRecommendationRepositoryPort,
  NewCopilotAnswer,
} from "../../ports/copilot-recommendation-repository.port";
import {
  COPILOT_RECOMMENDATIONS_PAGE_SIZE,
  RECOMMENDATION_CHANGE_NOT_ALLOWED_MESSAGE,
  RECOMMENDATION_NOT_FOUND_MESSAGE,
} from "../../validators/copilot/recommendation-status-change.schema";
import { ChangeRecommendationStatusUseCase } from "./change-recommendation-status.use-case";
import {
  LISTED_RECOMMENDATION_STATUSES,
  ListCopilotRecommendationsUseCase,
} from "./list-copilot-recommendations.use-case";
import { SaveCopilotAnswerUseCase } from "./save-copilot-answer.use-case";

const ID = "5c1e7a2d-3b4f-4e6a-8c9d-0e1f2a3b4c5d";
const ANSWER_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const PRODUCT_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";

function record(overrides: Partial<CopilotRecommendationRecord> = {}): CopilotRecommendationRecord {
  return {
    id: ID,
    answerId: ANSWER_ID,
    intent: "focus",
    origin: "rules",
    model: null,
    title: "Restock Pulse Ultralight Mouse",
    priority: "high",
    observation: "9 units sold in the last 7 days; 3 left in stock.",
    evidence: [
      { metric: "Units sold", value: "9", period: "Last 7 days", source: "getTopProducts" },
    ],
    reasoning: "It is a best seller.",
    suggestedAction: "Order a new batch.",
    limitations: [],
    relatedProducts: [{ id: PRODUCT_ID, name: "Pulse Ultralight Mouse" }],
    status: "saved",
    statusChangedAt: new Date("2026-10-18T10:00:00.000Z"),
    createdAt: new Date("2026-10-18T09:00:00.000Z"),
    ...overrides,
  };
}

function fakePort(
  overrides: Partial<CopilotRecommendationRepositoryPort> = {},
): CopilotRecommendationRepositoryPort {
  return {
    saveAnswer: vi.fn(async () => ({ answerId: ANSWER_ID, recommendationIds: [ID] })),
    listByStatus: vi.fn(async () => ({ rows: [], total: 0 })),
    changeStatus: vi.fn(async (): Promise<ChangeRecommendationStatusOutcome> => ({
      kind: "not_found",
    })),
    ...overrides,
  };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: unknown) => error,
  );
}

const ANSWER: NewCopilotAnswer = {
  intent: "focus",
  origin: "rules",
  fallbackReason: "not_configured",
  provider: null,
  model: null,
  promptVersion: null,
  periodFrom: new Date("2026-10-10T22:00:00.000Z"),
  periodTo: new Date("2026-10-17T22:00:00.000Z"),
  recommendations: [
    {
      title: "Restock Pulse Ultralight Mouse",
      priority: "high",
      observation: "9 units sold; 3 left.",
      evidence: [{ metric: "Units sold", value: "9", source: "getTopProducts" }],
      reasoning: "It is a best seller.",
      suggestedAction: "Order a new batch.",
      relatedProductIds: [PRODUCT_ID],
      limitations: [],
    },
  ],
};

describe("SaveCopilotAnswerUseCase", () => {
  it("stores an answer's recommendations and returns their ids", async () => {
    const port = fakePort();
    const saved = await new SaveCopilotAnswerUseCase({
      copilotRecommendationRepository: port,
    }).execute(ANSWER);
    expect(saved).toEqual({ answerId: ANSWER_ID, recommendationIds: [ID] });
    expect(port.saveAnswer).toHaveBeenCalledWith(ANSWER);
  });

  it("stores nothing for an answer without recommendations", async () => {
    const port = fakePort();
    const saved = await new SaveCopilotAnswerUseCase({
      copilotRecommendationRepository: port,
    }).execute({ ...ANSWER, recommendations: [] });
    expect(saved).toEqual({ answerId: null, recommendationIds: [] });
    expect(port.saveAnswer).not.toHaveBeenCalled();
  });
});

describe("ListCopilotRecommendationsUseCase", () => {
  it("lists saved and completed recommendations, 20 per page, newest first", async () => {
    const port = fakePort({
      listByStatus: vi.fn(async () => ({ rows: [record()], total: 41 })),
    });
    const list = await new ListCopilotRecommendationsUseCase({
      copilotRecommendationRepository: port,
    }).execute({ page: "2" });
    expect(LISTED_RECOMMENDATION_STATUSES).toEqual(["saved", "completed"]);
    expect(port.listByStatus).toHaveBeenCalledWith(["saved", "completed"], {
      offset: COPILOT_RECOMMENDATIONS_PAGE_SIZE,
      limit: 20,
    });
    expect(list).toEqual({ rows: [record()], page: 2, pageCount: 3, total: 41 });
  });

  it("falls back to page 1 for anything that is not a page number and has one page when empty", async () => {
    const port = fakePort();
    const list = await new ListCopilotRecommendationsUseCase({
      copilotRecommendationRepository: port,
    }).execute();
    expect(port.listByStatus).toHaveBeenCalledWith(LISTED_RECOMMENDATION_STATUSES, {
      offset: 0,
      limit: 20,
    });
    expect(list).toEqual({ rows: [], page: 1, pageCount: 1, total: 0 });
  });
});

describe("ChangeRecommendationStatusUseCase", () => {
  const ALLOWED: [RecommendationStatus, RecommendationStatus][] = [
    ["new", "saved"],
    ["new", "dismissed"],
    ["new", "completed"],
    ["saved", "completed"],
    ["saved", "dismissed"],
  ];
  const DISALLOWED = RECOMMENDATION_STATUSES.flatMap((from) =>
    RECOMMENDATION_STATUSES.map((to) => [from, to] as [RecommendationStatus, RecommendationStatus]),
  ).filter(([from, to]) => !ALLOWED.some(([a, b]) => a === from && b === to));

  it.each(ALLOWED)("applies %s → %s through the port", async (from, to) => {
    const changed = record({ status: to });
    const port = fakePort({
      changeStatus: vi.fn(async () => ({ kind: "changed" as const, recommendation: changed })),
    });
    const result = await new ChangeRecommendationStatusUseCase({
      copilotRecommendationRepository: port,
    }).execute({ recommendationId: ` ${ID} `, from, to });
    expect(result).toEqual({ recommendation: changed, from, to });
    expect(port.changeStatus).toHaveBeenCalledWith({ id: ID, from, to });
  });

  it.each(DISALLOWED)("refuses %s → %s before reaching the port", async (from, to) => {
    const port = fakePort();
    const error = await rejection(
      new ChangeRecommendationStatusUseCase({ copilotRecommendationRepository: port }).execute({
        recommendationId: ID,
        from,
        to,
      }),
    );
    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect((error as Error).message).toBe(RECOMMENDATION_CHANGE_NOT_ALLOWED_MESSAGE);
    expect(port.changeStatus).not.toHaveBeenCalled();
  });

  it("refuses unknown status values with the same message", async () => {
    const port = fakePort();
    const error = await rejection(
      new ChangeRecommendationStatusUseCase({ copilotRecommendationRepository: port }).execute({
        recommendationId: ID,
        from: "new",
        to: "archived",
      }),
    );
    expect((error as Error).message).toBe(RECOMMENDATION_CHANGE_NOT_ALLOWED_MESSAGE);
    expect(port.changeStatus).not.toHaveBeenCalled();
  });

  it("treats a malformed id as not found without querying", async () => {
    const port = fakePort();
    const error = await rejection(
      new ChangeRecommendationStatusUseCase({ copilotRecommendationRepository: port }).execute({
        recommendationId: "not-a-uuid",
        from: "new",
        to: "saved",
      }),
    );
    expect(isNotFoundError(error)).toBe(true);
    expect((error as Error).message).toBe(RECOMMENDATION_NOT_FOUND_MESSAGE);
    expect(port.changeStatus).not.toHaveBeenCalled();
  });

  it("reports an unknown recommendation as not found", async () => {
    const error = await rejection(
      new ChangeRecommendationStatusUseCase({
        copilotRecommendationRepository: fakePort(),
      }).execute({ recommendationId: ID, from: "new", to: "saved" }),
    );
    expect(isNotFoundError(error)).toBe(true);
  });

  it("reports a stale page as a conflict naming the current status", async () => {
    const port = fakePort({
      changeStatus: vi.fn(async () => ({
        kind: "stale" as const,
        currentStatus: "dismissed" as const,
      })),
    });
    const error = await rejection(
      new ChangeRecommendationStatusUseCase({ copilotRecommendationRepository: port }).execute({
        recommendationId: ID,
        from: "new",
        to: "saved",
      }),
    );
    expect(isStaleRecommendationStatusError(error)).toBe(true);
    expect(hasAppErrorCode(error, "CONFLICT")).toBe(true);
  });
});
