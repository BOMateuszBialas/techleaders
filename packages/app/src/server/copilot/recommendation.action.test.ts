import {
  NotFoundError,
  StaleRecommendationStatusError,
  UnauthorizedError,
  ValidationError,
  type ChangeRecommendationStatusResult,
  type CopilotRecommendationRecord,
} from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_RECOMMENDATION_STATUS_STATE } from "@/components/admin/copilot/recommendation-copy";
import { requireAdmin } from "../auth/require-admin";
import { createRequestScope } from "../container";
import { logger } from "../logger";
import { changeRecommendationStatus } from "./recommendation.action";

const ID = "5c1e7a2d-3b4f-4e6a-8c9d-0e1f2a3b4c5d";

const changeRecommendationStatusUseCase = { execute: vi.fn() };
const dispose = vi.fn(async () => {});

vi.mock("../auth/require-admin", () => ({
  SIGN_IN_PAGE: "/admin/sign-in",
  requireAdmin: vi.fn(),
}));
vi.mock("../container", () => ({ createRequestScope: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("NEXT_")) throw error;
  }),
}));

const { refresh } = await import("next/cache");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function result(to: "saved" | "dismissed" | "completed"): ChangeRecommendationStatusResult {
  return {
    recommendation: { id: ID, status: to } as CopilotRecommendationRecord,
    from: "new",
    to,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: "u-1", email: "o@x.test", role: "owner" });
  vi.mocked(createRequestScope).mockReturnValue({
    cradle: { changeRecommendationStatusUseCase },
    dispose,
  } as never);
  vi.spyOn(logger, "info").mockImplementation(() => {});
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

// Copilot spec, Phase 4 step 18: the export, invoked without a session, redirects to the
// sign-in page and never resolves a use case.
describe("changeRecommendationStatus without a session", () => {
  it("redirects to sign-in and runs no use case", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new UnauthorizedError());
    await expect(
      changeRecommendationStatus(
        IDLE_RECOMMENDATION_STATUS_STATE,
        form({ recommendationId: ID, from: "new", to: "saved" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT /admin/sign-in");
    expect(createRequestScope).not.toHaveBeenCalled();
    expect(changeRecommendationStatusUseCase.execute).not.toHaveBeenCalled();
  });
});

describe("changeRecommendationStatus", () => {
  it.each([
    ["saved", "Recommendation saved."],
    ["dismissed", "Recommendation dismissed."],
    [
      "completed",
      "Recommendation marked as completed. Copilot did not change anything in your store.",
    ],
  ] as const)("records %s, logs the id only and refreshes the page", async (to, message) => {
    changeRecommendationStatusUseCase.execute.mockResolvedValue(result(to));
    const state = await changeRecommendationStatus(
      IDLE_RECOMMENDATION_STATUS_STATE,
      form({ recommendationId: ID, from: "new", to, extra: "ignored" }),
    );
    expect(changeRecommendationStatusUseCase.execute).toHaveBeenCalledWith({
      recommendationId: ID,
      from: "new",
      to,
    });
    expect(state).toEqual({ status: "success", message, currentStatus: to });
    expect(logger.info).toHaveBeenCalledWith("copilot.recommendation.status.changed", { id: ID });
    expect(refresh).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("reports a stale page with the current status and refreshes the page itself", async () => {
    changeRecommendationStatusUseCase.execute.mockRejectedValue(
      new StaleRecommendationStatusError("completed"),
    );
    const state = await changeRecommendationStatus(
      IDLE_RECOMMENDATION_STATUS_STATE,
      form({ recommendationId: ID, from: "saved", to: "dismissed" }),
    );
    expect(state).toEqual({
      status: "error",
      message: "This recommendation is already completed. Nothing was changed.",
      values: {},
      currentStatus: "completed",
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it.each([
    ["a transition outside the table", new ValidationError("This status change is not allowed.")],
    ["an unknown recommendation", new NotFoundError("This recommendation does not exist.")],
  ])("shows the message of %s without a status or a refresh", async (_label, error) => {
    changeRecommendationStatusUseCase.execute.mockRejectedValue(error);
    const state = await changeRecommendationStatus(
      IDLE_RECOMMENDATION_STATUS_STATE,
      form({ recommendationId: ID, from: "completed", to: "saved" }),
    );
    expect(state).toMatchObject({ status: "error", message: error.message });
    expect(state.currentStatus).toBeUndefined();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reads missing fields as empty strings and shows a generic message for an unexpected failure", async () => {
    changeRecommendationStatusUseCase.execute.mockRejectedValue(new Error("db down"));
    const state = await changeRecommendationStatus(IDLE_RECOMMENDATION_STATUS_STATE, form({}));
    expect(changeRecommendationStatusUseCase.execute).toHaveBeenCalledWith({
      recommendationId: "",
      from: "",
      to: "",
    });
    expect(state.status).toBe("error");
    expect(state.message).not.toContain("db down");
  });
});
