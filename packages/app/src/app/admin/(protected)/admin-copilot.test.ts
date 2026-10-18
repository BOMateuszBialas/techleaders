import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/server/logger";

const listCopilotRecommendations = vi.fn();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: { listCopilotRecommendationsUseCase: { execute: listCopilotRecommendations } },
    dispose,
  }),
}));

const { loadCopilotRecommendations } = await import("./copilot/load-copilot");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

describe("Copilot recommendations loader", () => {
  it("passes the first page value to the use case and disposes the scope", async () => {
    const list = { rows: [], page: 2, pageCount: 2, total: 21 };
    listCopilotRecommendations.mockResolvedValue(list);
    await expect(loadCopilotRecommendations(["2", "3"])).resolves.toEqual({
      kind: "ok",
      data: list,
    });
    expect(listCopilotRecommendations).toHaveBeenCalledWith({ page: "2" });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("turns a failure into the error state and logs the page only", async () => {
    listCopilotRecommendations.mockRejectedValue(new Error("database down"));
    await expect(loadCopilotRecommendations(undefined)).resolves.toEqual({ kind: "error" });
    expect(vi.mocked(logger.error).mock.calls[0]?.[1]).toMatchObject({ page: "/admin/copilot" });
  });
});
