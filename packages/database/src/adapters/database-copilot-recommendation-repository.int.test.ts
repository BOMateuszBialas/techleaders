import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { isUuid, type NewCopilotAnswer, type NewCopilotRecommendation } from "@commerceos/core";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DEMO_CATALOG, seedCatalog, seedDemoStore } from "../seeders/DatabaseSeeder";
import "../testing/provided-context";
import { DatabaseCopilotRecommendationRepository } from "./database-copilot-recommendation-repository";

const MIGRATION = "Migration20261018180016_copilot_recommendations";
const periodFrom = new Date("2026-10-10T22:00:00.000Z");
const periodTo = new Date("2026-10-17T22:00:00.000Z");

function recommendation(
  title: string,
  relatedProductIds: string[] = [],
  demo = false,
): NewCopilotRecommendation {
  return {
    title,
    priority: "high",
    observation: "9 units sold in the last 7 days; 3 left in stock.",
    evidence: [
      { metric: "Units sold", value: "9", period: "Last 7 days", source: "getTopProducts" },
      ...(demo
        ? [{ metric: "Sessions", value: "120", period: "Last 7 days", source: "x", demo: true }]
        : []),
    ],
    reasoning: "It is a best seller.",
    suggestedAction: "Order a new batch.",
    relatedProductIds,
    limitations: demo ? ["Traffic figures are fictional demo data."] : [],
  };
}

function answer(overrides: Partial<NewCopilotAnswer> = {}): NewCopilotAnswer {
  return {
    intent: "focus",
    origin: "rules",
    fallbackReason: "not_configured",
    provider: null,
    model: null,
    promptVersion: null,
    periodFrom,
    periodTo,
    recommendations: [recommendation("Restock")],
    ...overrides,
  };
}

/**
 * Copilot recommendation records against PostgreSQL (Copilot spec Phase 4, steps 16–17): the
 * migration's checks, persistence of both answer origins and of demo-flagged evidence, the
 * conditional status change (stale, not found, a race between two forks) and proof that no
 * store table changes.
 */
describe("DatabaseCopilotRecommendationRepository (PostgreSQL)", () => {
  let orm: MikroORM;
  const repository = () => new DatabaseCopilotRecommendationRepository({ em: orm.em.fork() });

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  async function productId(slug: string): Promise<string> {
    const rows = await query<{ id: string }>("select id from products where slug = ?", [slug]);
    return rows[0]?.id ?? "";
  }

  /** Every store table's row count and a checksum of product stock and order statuses. */
  async function storeSnapshot() {
    const [row] = await query<Record<string, unknown>>(
      `select (select count(*) from products)::int as products,
              (select coalesce(sum(stock_quantity), 0) from products)::int as stock,
              (select string_agg(status, ',' order by id) from products) as product_statuses,
              (select count(*) from orders)::int as orders,
              (select string_agg(status, ',' order by id) from orders) as order_statuses,
              (select count(*) from order_items)::int as order_items,
              (select count(*) from stock_adjustments)::int as stock_adjustments,
              (select count(*) from categories)::int as categories`,
    );
    return row;
  }

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await seedCatalog(orm.em.fork(), DEMO_CATALOG);
    await seedDemoStore(orm.em.fork(), new Date());
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("has no schema drift after the migration", async () => {
    const diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff.trim()).toBe("");
  });

  describe("saveAnswer", () => {
    it("stores a rule-based answer's recommendations as new, grouped by answer, in order", async () => {
      const pulse = await productId("pulse-ultralight-mouse");
      const saved = await repository().saveAnswer(
        answer({
          recommendations: [recommendation("First", [pulse]), recommendation("Second")],
        }),
      );
      expect(isUuid(saved.answerId)).toBe(true);
      const rows = await query<{
        id: string;
        title: string;
        status: string;
        status_changed_at: string | null;
        origin: string;
        fallback_reason: string | null;
        related_product_ids: string[];
      }>(
        `select id, title, status, status_changed_at, origin, fallback_reason, related_product_ids
           from copilot_recommendations where answer_id = ? order by title`,
        [saved.answerId],
      );
      expect(rows.map((row) => [row.id, row.title])).toEqual([
        [saved.recommendationIds[0], "First"],
        [saved.recommendationIds[1], "Second"],
      ]);
      expect(rows[0]).toMatchObject({
        status: "new",
        status_changed_at: null,
        origin: "rules",
        fallback_reason: "not_configured",
        related_product_ids: [pulse],
      });
    });

    it("stores an LLM answer with its provider, model and prompt version, and demo evidence flags", async () => {
      const saved = await repository().saveAnswer(
        answer({
          intent: "traffic_sources",
          origin: "llm",
          fallbackReason: null,
          provider: "gemini",
          model: "gemini-flash",
          promptVersion: "copilot-2026-10-18.2",
          recommendations: [recommendation("Demo", [], true)],
        }),
      );
      const [row] = await query<{
        provider: string;
        model: string;
        prompt_version: string;
        evidence: unknown;
        limitations: unknown;
      }>(
        "select provider, model, prompt_version, evidence, limitations from copilot_recommendations where id = ?",
        [saved.recommendationIds[0]],
      );
      expect(row).toEqual({
        provider: "gemini",
        model: "gemini-flash",
        prompt_version: "copilot-2026-10-18.2",
        evidence: recommendation("Demo", [], true).evidence,
        limitations: ["Traffic figures are fictional demo data."],
      });
    });
  });

  describe("check constraints", () => {
    async function insertRaw(overrides: Record<string, string>): Promise<void> {
      const columns: Record<string, string> = {
        answer_id: "gen_random_uuid()",
        intent: "'focus'",
        origin: "'rules'",
        fallback_reason: "'not_configured'",
        provider: "null",
        model: "null",
        prompt_version: "null",
        period_from: "'2026-10-10T22:00:00Z'",
        period_to: "'2026-10-17T22:00:00Z'",
        title: "'t'",
        priority: "'high'",
        observation: "'o'",
        reasoning: "'r'",
        suggested_action: "'s'",
        evidence: "'[]'::jsonb",
        status: "'new'",
        status_changed_at: "null",
        ...overrides,
      };
      await orm.em
        .fork()
        .execute(
          `insert into copilot_recommendations (${Object.keys(columns).join(", ")}) values (${Object.values(columns).join(", ")})`,
        );
    }

    it("accepts a valid row", async () => {
      await expect(insertRaw({})).resolves.toBeUndefined();
    });

    it.each([
      [
        "status",
        { status: "'archived'", status_changed_at: "now()" },
        "copilot_recommendations_status_check",
      ],
      ["intent", { intent: "'margin'" }, "copilot_recommendations_intent_check"],
      [
        "origin",
        { origin: "'human'", fallback_reason: "null" },
        "copilot_recommendations_origin_check",
      ],
      ["fallback reason value", { fallback_reason: "'other'" }, "fallback_reason_check"],
      ["priority", { priority: "'urgent'" }, "copilot_recommendations_priority_check"],
      [
        "fallback reason on an LLM answer",
        { origin: "'llm'" },
        "copilot_recommendations_fallback_check",
      ],
      ["provider on a rule-based answer", { provider: "'gemini'" }, "provider_check"],
      [
        "an empty period",
        { period_to: "'2026-10-10T22:00:00Z'" },
        "copilot_recommendations_period_check",
      ],
      ["evidence that is not an array", { evidence: "'{}'::jsonb" }, "evidence_check"],
      ["limitations that are not an array", { limitations: "'\"x\"'::jsonb" }, "limitations_check"],
      [
        "related products that are not an array",
        { related_product_ids: "'{}'::jsonb" },
        "related_products_check",
      ],
      ["a decided status without its time", { status: "'saved'" }, "status_changed_at_check"],
      ["a time on a new recommendation", { status_changed_at: "now()" }, "status_changed_at_check"],
      ["a title over 160 characters", { title: "repeat('x', 161)" }, "value too long"],
    ])("rejects %s", async (_label, overrides, message) => {
      await expect(insertRaw(overrides)).rejects.toThrow(message);
    });
  });

  describe("changeStatus and listByStatus", () => {
    it("saves, then completes, sets the decision time, and lists only saved and completed rows", async () => {
      const before = await storeSnapshot();
      const saved = await repository().saveAnswer(
        answer({
          intent: "low_stock",
          recommendations: [
            recommendation("Keep A", [await productId("pulse-ultralight-mouse")]),
            recommendation("Drop B"),
          ],
        }),
      );
      const [keep, drop] = saved.recommendationIds as [string, string];

      const kept = await repository().changeStatus({ id: keep, from: "new", to: "saved" });
      expect(kept).toMatchObject({
        kind: "changed",
        recommendation: { id: keep, status: "saved" },
      });
      expect(kept.kind === "changed" && kept.recommendation.statusChangedAt).toBeInstanceOf(Date);
      expect(
        await repository().changeStatus({ id: drop, from: "new", to: "dismissed" }),
      ).toMatchObject({ kind: "changed", recommendation: { status: "dismissed" } });

      const page = await repository().listByStatus(["saved", "completed"], {
        offset: 0,
        limit: 20,
      });
      expect(page.rows.map((row) => row.id)).toContain(keep);
      expect(page.rows.map((row) => row.id)).not.toContain(drop);
      expect(page.rows.find((row) => row.id === keep)?.relatedProducts).toEqual([
        { id: await productId("pulse-ultralight-mouse"), name: "Pulse Ultralight Mouse" },
      ]);

      expect(
        await repository().changeStatus({ id: keep, from: "saved", to: "completed" }),
      ).toMatchObject({ kind: "changed", recommendation: { status: "completed" } });
      // Copilot never changes store data (D02, #26).
      expect(await storeSnapshot()).toEqual(before);
    });

    it("reports a stale page with the current status and writes nothing", async () => {
      const [id] = (await repository().saveAnswer(answer())).recommendationIds as [string];
      await repository().changeStatus({ id, from: "new", to: "dismissed" });
      const [before] = await query<{ status_changed_at: string }>(
        "select status_changed_at::text from copilot_recommendations where id = ?",
        [id],
      );
      expect(await repository().changeStatus({ id, from: "new", to: "saved" })).toEqual({
        kind: "stale",
        currentStatus: "dismissed",
      });
      const [after] = await query<{ status: string; status_changed_at: string }>(
        "select status, status_changed_at::text from copilot_recommendations where id = ?",
        [id],
      );
      expect(after).toEqual({ status: "dismissed", status_changed_at: before?.status_changed_at });
    });

    it("reports an unknown id as not found", async () => {
      expect(
        await repository().changeStatus({
          id: "00000000-0000-4000-8000-000000000000",
          from: "new",
          to: "saved",
        }),
      ).toEqual({ kind: "not_found" });
    });

    it("lets exactly one of two forks racing on one row win", async () => {
      const [id] = (await repository().saveAnswer(answer())).recommendationIds as [string];
      const outcomes = await Promise.all([
        repository().changeStatus({ id, from: "new", to: "saved" }),
        repository().changeStatus({ id, from: "new", to: "dismissed" }),
      ]);
      const changed = outcomes.filter((outcome) => outcome.kind === "changed");
      const stale = outcomes.filter((outcome) => outcome.kind === "stale");
      expect(changed).toHaveLength(1);
      expect(stale).toHaveLength(1);
      const [row] = await query<{ status: string }>(
        "select status from copilot_recommendations where id = ?",
        [id],
      );
      expect(stale[0]).toEqual({ kind: "stale", currentStatus: row?.status });
    });

    it("keeps a recommendation readable after its product is deleted", async () => {
      const [category] = await query<{ id: string }>("select id from categories limit 1");
      const [product] = await query<{ id: string }>(
        `insert into products (name, slug, sku, description, price_minor, currency, stock_quantity, status, category_id)
         values ('Temp product', 'temp-product', 'TEMP-1', 'd', 100, 'PLN', 1, 'draft', ?) returning id`,
        [category?.id],
      );
      const [id] = (
        await repository().saveAnswer(
          answer({ recommendations: [recommendation("Temp", [product?.id ?? ""])] }),
        )
      ).recommendationIds as [string];
      await repository().changeStatus({ id, from: "new", to: "saved" });
      await query("delete from products where id = ?", [product?.id]);

      const page = await repository().listByStatus(["saved"], { offset: 0, limit: 100 });
      expect(page.rows.find((row) => row.id === id)?.relatedProducts).toEqual([
        { id: product?.id, name: null },
      ]);
    });
  });

  // The migration is additive (BACKWARD_COMPATIBILITY §5): `down` drops only its table and
  // leaves the store data intact; `up` reapplies it with no drift. Rollback plan of the PR.
  it("reverts and reapplies the migration without touching store data", async () => {
    const tableOf = async (name: string) => {
      const [row] = await query<{ name: string | null }>("select to_regclass(?)::text as name", [
        name,
      ]);
      return row?.name ?? null;
    };
    const before = await storeSnapshot();
    await orm.migrator.down({ migrations: [MIGRATION] });
    expect(await tableOf("copilot_recommendations")).toBeNull();
    expect(await storeSnapshot()).toEqual(before);

    await orm.migrator.up();
    expect(await tableOf("copilot_recommendations")).toBe("copilot_recommendations");
    const diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff.trim()).toBe("");
  });
});
