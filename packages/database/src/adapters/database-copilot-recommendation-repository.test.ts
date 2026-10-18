import { afterAll, describe, expect, it, vi } from "vitest";
import type { NewCopilotAnswer } from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseCopilotRecommendationRepository } from "./database-copilot-recommendation-repository";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const ID = "5c1e7a2d-3b4f-4e6a-8c9d-0e1f2a3b4c5d";
const ANSWER_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const P1 = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const P2 = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e02";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const createdAt = new Date("2026-10-18T09:00:00.000Z");
const changedAt = new Date("2026-10-18T10:00:00.000Z");
const evidence = [{ metric: "Units sold", value: "9", period: "Last 7 days", source: "x" }];

const row = {
  id: ID,
  answerId: ANSWER_ID,
  intent: "focus",
  origin: "llm",
  fallbackReason: null,
  provider: "gemini",
  model: "gemini-flash",
  promptVersion: "v1",
  periodFrom: createdAt,
  periodTo: changedAt,
  title: "Restock Pulse",
  priority: "high",
  observation: "9 sold, 3 left.",
  reasoning: "Best seller.",
  suggestedAction: "Order more.",
  evidence,
  limitations: ["Demo traffic."],
  relatedProductIds: [P1, P2],
  status: "saved",
  statusChangedAt: changedAt,
  createdAt,
  updatedAt: changedAt,
};

const record = {
  id: ID,
  answerId: ANSWER_ID,
  intent: "focus",
  origin: "llm",
  model: "gemini-flash",
  title: "Restock Pulse",
  priority: "high",
  observation: "9 sold, 3 left.",
  evidence,
  reasoning: "Best seller.",
  suggestedAction: "Order more.",
  limitations: ["Demo traffic."],
  relatedProducts: [
    { id: P1, name: "Pulse Ultralight Mouse" },
    { id: P2, name: null },
  ],
  status: "saved",
  statusChangedAt: changedAt,
  createdAt,
};

const ANSWER: NewCopilotAnswer = {
  intent: "focus",
  origin: "rules",
  fallbackReason: "not_configured",
  provider: null,
  model: null,
  promptVersion: null,
  periodFrom: createdAt,
  periodTo: changedAt,
  recommendations: [1, 2].map((n) => ({
    title: `Title ${n}`,
    priority: "medium" as const,
    observation: "o",
    evidence,
    reasoning: "r",
    suggestedAction: "s",
    relatedProductIds: [P1],
    limitations: [],
  })),
};

// The stubs return plain rows shaped like the entity; the ORM's generic signatures cannot be
// satisfied by plain objects, so their results are typed loosely on purpose.
function setup() {
  const em = orm.em.fork();
  const tx = orm.em.fork();
  vi.spyOn(em, "transactional").mockImplementation(((
    callback: (em: EntityManager) => Promise<unknown>,
  ) => callback(tx)) as never);
  return {
    insertMany: vi.spyOn(em, "insertMany"),
    findAndCount: vi.spyOn(em, "findAndCount"),
    execute: vi.spyOn(em, "execute"),
    txExecute: vi.spyOn(tx, "execute"),
    txFindOne: vi.spyOn(tx, "findOne"),
    repository: new DatabaseCopilotRecommendationRepository({ em }),
  };
}

describe("DatabaseCopilotRecommendationRepository.saveAnswer", () => {
  it("inserts every recommendation of one answer in one statement, ids in answer order", async () => {
    const { insertMany, repository } = setup();
    insertMany.mockResolvedValueOnce([] as never);

    const saved = await repository.saveAnswer(ANSWER);

    expect(saved.answerId).toMatch(UUID);
    expect(saved.recommendationIds).toHaveLength(2);
    const rows = insertMany.mock.calls[0]?.[1] as { id: string; answerId: string }[];
    expect(rows.map((inserted) => inserted.id)).toEqual(saved.recommendationIds);
    expect(rows[0]).toEqual({
      id: saved.recommendationIds[0],
      answerId: saved.answerId,
      intent: "focus",
      origin: "rules",
      fallbackReason: "not_configured",
      provider: null,
      model: null,
      promptVersion: null,
      periodFrom: createdAt,
      periodTo: changedAt,
      ...ANSWER.recommendations[0],
    });
    expect(rows[1]?.answerId).toBe(saved.answerId);
  });

  it("sanitizes a driver failure", async () => {
    const { insertMany, repository } = setup();
    insertMany.mockRejectedValueOnce(
      Object.assign(new Error("insert … values ('Title 1')"), { name: "DriverException" }),
    );
    await expect(repository.saveAnswer(ANSWER)).rejects.toThrow(
      /^Copilot answer save failed: DriverException$/,
    );
  });
});

describe("DatabaseCopilotRecommendationRepository.listByStatus", () => {
  it("lists a page newest first and names the related products that still exist", async () => {
    const { findAndCount, execute, repository } = setup();
    findAndCount.mockResolvedValueOnce([
      [row, { ...row, id: "r-2", relatedProductIds: [P1] }],
      21,
    ] as never);
    execute.mockResolvedValueOnce([{ id: P1, name: "Pulse Ultralight Mouse" }] as never);

    const page = await repository.listByStatus(["saved", "completed"], { offset: 20, limit: 20 });

    expect(page.total).toBe(21);
    expect(page.rows[0]).toEqual(record);
    expect(page.rows[1]?.relatedProducts).toEqual([{ id: P1, name: "Pulse Ultralight Mouse" }]);
    expect(findAndCount.mock.calls[0]?.slice(1)).toEqual([
      { status: { $in: ["saved", "completed"] } },
      { orderBy: { createdAt: "desc", id: "desc" }, limit: 20, offset: 20 },
    ]);
    // One query for the distinct product ids of the whole page.
    expect(String(execute.mock.calls[0]?.[0])).toBe(
      "select id, name from products where id in (?, ?)",
    );
    expect(execute.mock.calls[0]?.[1]).toEqual([P1, P2]);
  });

  it("runs no product query when no row names a product, and maps a missing model to null", async () => {
    const { findAndCount, execute, repository } = setup();
    findAndCount.mockResolvedValueOnce([
      [{ ...row, model: undefined, statusChangedAt: undefined, relatedProductIds: [] }],
      1,
    ] as never);

    const page = await repository.listByStatus(["saved"], { offset: 0, limit: 20 });

    expect(page.rows[0]).toMatchObject({ model: null, statusChangedAt: null, relatedProducts: [] });
    expect(execute).not.toHaveBeenCalled();
  });

  it("sanitizes a driver failure", async () => {
    const { findAndCount, repository } = setup();
    findAndCount.mockRejectedValueOnce(
      Object.assign(new Error("boom"), { name: "DriverException" }),
    );
    await expect(repository.listByStatus(["saved"], { offset: 0, limit: 20 })).rejects.toThrow(
      /^Copilot recommendation list failed: DriverException$/,
    );
  });
});

describe("DatabaseCopilotRecommendationRepository.changeStatus", () => {
  it("changes the row only while it is in `from` and returns it fresh", async () => {
    const { txExecute, txFindOne, repository } = setup();
    txExecute
      .mockResolvedValueOnce({ affectedRows: 1 } as never)
      .mockResolvedValueOnce([{ id: P1, name: "Pulse Ultralight Mouse" }] as never);
    txFindOne.mockResolvedValueOnce(row as never);

    const outcome = await repository.changeStatus({ id: ID, from: "new", to: "saved" });

    expect(outcome).toEqual({ kind: "changed", recommendation: record });
    expect(String(txExecute.mock.calls[0]?.[0])).toContain(
      "set status = ?, status_changed_at = now(), updated_at = now()",
    );
    expect(String(txExecute.mock.calls[0]?.[0])).toContain("where id = ? and status = ?");
    expect(txExecute.mock.calls[0]?.slice(1)).toEqual([["saved", ID, "new"], "run"]);
    expect(txFindOne.mock.calls[0]?.slice(1)).toEqual([{ id: ID }, { refresh: true }]);
  });

  it("reports the current status when the row moved on (stale)", async () => {
    const { txExecute, repository } = setup();
    txExecute
      .mockResolvedValueOnce({ affectedRows: 0 } as never)
      .mockResolvedValueOnce([{ status: "completed" }] as never);
    expect(await repository.changeStatus({ id: ID, from: "new", to: "saved" })).toEqual({
      kind: "stale",
      currentStatus: "completed",
    });
  });

  it("reports an unknown row as not found", async () => {
    const { txExecute, repository } = setup();
    txExecute
      .mockResolvedValueOnce({ affectedRows: 0 } as never)
      .mockResolvedValueOnce([] as never);
    expect(await repository.changeStatus({ id: ID, from: "new", to: "saved" })).toEqual({
      kind: "not_found",
    });
  });

  it("fails loudly when a changed row cannot be read back", async () => {
    const { txExecute, txFindOne, repository } = setup();
    txExecute.mockResolvedValueOnce({ affectedRows: 1 } as never);
    txFindOne.mockResolvedValueOnce(null as never);
    await expect(repository.changeStatus({ id: ID, from: "new", to: "saved" })).rejects.toThrow(
      "A changed recommendation could not be read back",
    );
  });
});
