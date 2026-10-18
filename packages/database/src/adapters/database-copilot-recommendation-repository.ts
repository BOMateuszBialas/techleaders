import { randomUUID } from "node:crypto";
import type {
  ChangeRecommendationStatusCommand,
  ChangeRecommendationStatusOutcome,
  CopilotRecommendationRecord,
  CopilotRecommendationRepositoryPort,
  NewCopilotAnswer,
  RecommendationStatus,
} from "@commerceos/core";
import type { EntityManager, QueryResult } from "@mikro-orm/postgresql";
import {
  CopilotRecommendationSchema,
  type CopilotRecommendation,
} from "../entities/copilot/copilot-recommendation.entity";
import { withSanitizedErrors } from "./sanitize-database-error";

function toRecord(
  row: CopilotRecommendation,
  names: ReadonlyMap<string, string>,
): CopilotRecommendationRecord {
  return {
    id: row.id,
    answerId: row.answerId,
    intent: row.intent,
    origin: row.origin,
    model: row.model ?? null,
    title: row.title,
    priority: row.priority,
    observation: row.observation,
    evidence: row.evidence,
    reasoning: row.reasoning,
    suggestedAction: row.suggestedAction,
    limitations: row.limitations,
    relatedProducts: row.relatedProductIds.map((id) => ({ id, name: names.get(id) ?? null })),
    status: row.status,
    statusChangedAt: row.statusChangedAt ?? null,
    createdAt: row.createdAt,
  };
}

/**
 * Database adapter for `CopilotRecommendationRepositoryPort` (Copilot spec Phase 4). It reads
 * and writes `copilot_recommendations` only: product names for the owner's list are read from
 * `products`, never written (D02). Request-scoped: it works on the request's EntityManager
 * fork. Failures are sanitized like the other adapters', so a driver message never reaches the
 * log with its parameters.
 *
 * - `saveAnswer` inserts every recommendation of one answer in one statement (all or none),
 *   with ids generated here so they come back in the answer's order.
 * - `changeStatus` is a conditional `update … where id = :id and status = :from`: of two tabs
 *   changing one row, exactly one matches; the other gets `stale` and nothing is written.
 */
export class DatabaseCopilotRecommendationRepository implements CopilotRecommendationRepositoryPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async saveAnswer(
    answer: NewCopilotAnswer,
  ): Promise<{ answerId: string; recommendationIds: string[] }> {
    const answerId = randomUUID();
    const rows = answer.recommendations.map((recommendation) => ({
      id: randomUUID(),
      answerId,
      intent: answer.intent,
      origin: answer.origin,
      fallbackReason: answer.fallbackReason,
      provider: answer.provider,
      model: answer.model,
      promptVersion: answer.promptVersion,
      periodFrom: answer.periodFrom,
      periodTo: answer.periodTo,
      ...recommendation,
    }));
    await withSanitizedErrors("Copilot answer save", () =>
      this.deps.em.insertMany(CopilotRecommendationSchema, rows),
    );
    return { answerId, recommendationIds: rows.map((row) => row.id) };
  }

  async listByStatus(
    statuses: readonly RecommendationStatus[],
    page: { offset: number; limit: number },
  ): Promise<{ rows: CopilotRecommendationRecord[]; total: number }> {
    return withSanitizedErrors("Copilot recommendation list", async () => {
      const [rows, total] = await this.deps.em.findAndCount(
        CopilotRecommendationSchema,
        { status: { $in: [...statuses] } },
        { orderBy: { createdAt: "desc", id: "desc" }, limit: page.limit, offset: page.offset },
      );
      const names = await this.productNames(
        this.deps.em,
        rows.flatMap((row) => row.relatedProductIds),
      );
      return { rows: rows.map((row) => toRecord(row, names)), total };
    });
  }

  async changeStatus(
    command: ChangeRecommendationStatusCommand,
  ): Promise<ChangeRecommendationStatusOutcome> {
    return withSanitizedErrors("Copilot recommendation status change", () =>
      this.deps.em.transactional((em) => this.changeStatusIn(em, command)),
    );
  }

  private async changeStatusIn(
    em: EntityManager,
    { id, from, to }: ChangeRecommendationStatusCommand,
  ): Promise<ChangeRecommendationStatusOutcome> {
    const updated = await em.execute<QueryResult>(
      `update copilot_recommendations set status = ?, status_changed_at = now(), updated_at = now()
        where id = ? and status = ?`,
      [to, id, from],
      "run",
    );
    if (updated.affectedRows === 0) {
      // Nothing matched: a stale page or a second tab (stale), or no such recommendation.
      const rows = await em.execute<{ status: RecommendationStatus }[]>(
        "select status from copilot_recommendations where id = ?",
        [id],
      );
      const current = rows[0];
      return current ? { kind: "stale", currentStatus: current.status } : { kind: "not_found" };
    }
    const row = await em.findOne(CopilotRecommendationSchema, { id }, { refresh: true });
    // The update above matched this row inside the same transaction, so it exists.
    if (!row) throw new Error("A changed recommendation could not be read back");
    return {
      kind: "changed",
      recommendation: toRecord(row, await this.productNames(em, row.relatedProductIds)),
    };
  }

  /** Names of the products that still exist, in one query; deleted ones are simply absent. */
  private async productNames(
    em: EntityManager,
    ids: readonly string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const rows = await em.execute<{ id: string; name: string }[]>(
      `select id, name from products where id in (${unique.map(() => "?").join(", ")})`,
      unique,
    );
    return new Map(rows.map((row) => [row.id, row.name]));
  }
}
