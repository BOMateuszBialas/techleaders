import { describe, expect, it } from "vitest";
import { ConflictError, NotFoundError } from "../../errors/app-error";
import {
  RECOMMENDATION_STATUSES,
  RECOMMENDATION_TRANSITIONS,
  StaleRecommendationStatusError,
  allowedRecommendationTransitions,
  canChangeRecommendationStatus,
  isRecommendationStatus,
  isStaleRecommendationStatusError,
  type RecommendationStatus,
} from "./recommendation-status";

// Copilot spec A14: the only allowed pairs.
const ALLOWED: [RecommendationStatus, RecommendationStatus][] = [
  ["new", "saved"],
  ["new", "dismissed"],
  ["new", "completed"],
  ["saved", "completed"],
  ["saved", "dismissed"],
];

const ALL_PAIRS = RECOMMENDATION_STATUSES.flatMap((from) =>
  RECOMMENDATION_STATUSES.map((to) => [from, to] as [RecommendationStatus, RecommendationStatus]),
);

describe("recommendation status transitions", () => {
  it.each(ALL_PAIRS)("%s → %s is allowed only when the spec lists it", (from, to) => {
    const listed = ALLOWED.some(([a, b]) => a === from && b === to);
    expect(canChangeRecommendationStatus(from, to)).toBe(listed);
  });

  it("makes dismissed and completed terminal", () => {
    expect(allowedRecommendationTransitions("dismissed")).toEqual([]);
    expect(allowedRecommendationTransitions("completed")).toEqual([]);
    expect(allowedRecommendationTransitions("new")).toEqual(RECOMMENDATION_TRANSITIONS.new);
  });

  it("recognises only the stored statuses", () => {
    expect(isRecommendationStatus("saved")).toBe(true);
    expect(isRecommendationStatus("archived")).toBe(false);
    expect(isRecommendationStatus(1)).toBe(false);
  });
});

describe("StaleRecommendationStatusError", () => {
  it("is a conflict that names the current status", () => {
    const error = new StaleRecommendationStatusError("completed");
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.currentStatus).toBe("completed");
    expect(error.message).toBe("This recommendation is already completed. Nothing was changed.");
    expect(isStaleRecommendationStatusError(error)).toBe(true);
  });

  it("is recognised structurally, and only with a known status", () => {
    expect(
      isStaleRecommendationStatusError(
        Object.assign(new Error("x"), { code: "CONFLICT", currentStatus: "saved" }),
      ),
    ).toBe(true);
    expect(
      isStaleRecommendationStatusError(
        Object.assign(new Error("x"), { code: "CONFLICT", currentStatus: "shipped" }),
      ),
    ).toBe(false);
    expect(isStaleRecommendationStatusError(new ConflictError("x"))).toBe(false);
    expect(isStaleRecommendationStatusError(new NotFoundError("x"))).toBe(false);
  });
});
