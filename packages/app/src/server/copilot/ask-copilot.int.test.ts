import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { AskCopilotUseCase, UnconfiguredLlmProvider, type CopilotAnswerDto } from "@commerceos/ai";
import { ScriptedLlmProvider, groundedReply } from "@commerceos/ai/evals";
import { formatMoney, money, resolvePeriod } from "@commerceos/core";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type * as ContainerModule from "../container";

// Mirrors the augmentation in `@commerceos/database/testing`, which app code must not import.
declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

const run = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const tsxCli = fileURLToPath(new URL("node_modules/tsx/dist/cli.mjs", `file:///${repoRoot}`));

const databaseUrl = inject("databaseUrl");
const pool = new Pool({ connectionString: databaseUrl });
/** 11–17 Oct 2026 in Europe/Warsaw; the fixture orders are paid inside it. */
const NOW = new Date("2026-10-17T10:00:00.000Z");
const PERIOD = resolvePeriod("7d", NOW);
const OWNER = { id: `int-owner-${randomUUID()}` };
const TRAFFIC_OWNER = { id: `int-owner-${randomUUID()}` };

async function cli(script: string, ...args: string[]) {
  await run(process.execPath, [tsxCli, `packages/database/src/cli/${script}`, ...args], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

type CountedTable =
  | "orders"
  | "order_items"
  | "products"
  | "stock_adjustments"
  | "traffic_daily_stats"
  | "product_view_daily_stats";

async function count(table: CountedTable) {
  const { rows } = await pool.query<{ n: string }>(`select count(*) as n from ${table}`);
  return Number(rows[0]?.n);
}

async function insertPaidOrder(slug: string, quantity: number, paidAt: string) {
  const { rows: products } = await pool.query<{ id: string; name: string; price: number }>(
    "select id, name, price_minor as price from products where slug = $1",
    [slug],
  );
  const product = products[0];
  if (!product) throw new Error(`Seeded product ${slug} is missing`);
  const total = product.price * quantity;
  const reference = `CO-INT-COPILOT-${randomUUID().slice(0, 8)}`;
  const { rows } = await pool.query<{ id: string }>(
    `insert into orders (public_reference, idempotency_key, request_fingerprint, status,
       customer_name, customer_email, shipping_line1, shipping_city, shipping_postal_code,
       shipping_country, currency, subtotal_minor, shipping_minor, total_minor,
       payment_provider, payment_reference, paid_at, created_at)
     values ($1, $2, 'int-test', 'paid', 'Integration Test', 'int@example.test', 'ul. Testowa 1',
       'Warszawa', '00-950', 'PL', 'PLN', $3, 0, $3, 'demo', $4, $5::timestamptz, $5::timestamptz)
     returning id`,
    [reference, randomUUID(), total, `PAY-${reference}`, paidAt],
  );
  await pool.query(
    `insert into order_items (order_id, product_id, product_name, unit_price_minor, quantity,
       line_total_minor) values ($1, $2, $3, $4, $5, $6)`,
    [rows[0]?.id, product.id, product.name, product.price, quantity, total],
  );
}

/**
 * Commerce Copilot against PostgreSQL through the real composition root (Copilot spec, step 6):
 * every value an answer shows equals what the E04 metric use cases return for the same period,
 * and asking writes nothing but the rate-limit counter.
 */
describe("AskCopilotUseCase (PostgreSQL, real container)", () => {
  let container: typeof ContainerModule;
  let answer: CopilotAnswerDto;
  let funnelAnswer: CopilotAnswerDto;
  const before = { orders: 0, items: 0, products: 0, adjustments: 0, traffic: 0, views: 0 };

  beforeAll(async () => {
    await cli("migrate.ts", "up");
    await cli("seed.ts");
    await pool.query("delete from order_items");
    await pool.query("delete from orders");
    await pool.query("update products set stock_quantity = 2 where slug = 'arena-fight-stick'");
    await insertPaidOrder("arena-fight-stick", 1, "2026-10-14T10:00:00Z");
    await insertPaidOrder("vortex-wireless-mouse", 2, "2026-10-15T10:00:00Z");
    // Hand-built demo traffic inside the period (the seed's rows follow the real date).
    await pool.query("delete from product_view_daily_stats");
    await pool.query("delete from traffic_daily_stats");
    await pool.query(
      `insert into traffic_daily_stats
         (date, source, sessions, product_views, add_to_carts, checkouts_started)
       values ('2026-10-14', 'direct', 70, 60, 15, 4), ('2026-10-15', 'social', 30, 20, 5, 1)`,
    );
    await pool.query(
      `insert into product_view_daily_stats (date, product_id, views, add_to_carts)
       select '2026-10-14', id, 60, 9 from products where slug = 'arena-fight-stick'`,
    );
    before.orders = await count("orders");
    before.items = await count("order_items");
    before.products = await count("products");
    before.adjustments = await count("stock_adjustments");
    before.traffic = await count("traffic_daily_stats");
    before.views = await count("product_view_daily_stats");

    process.env.DATABASE_URL = databaseUrl;
    process.env.BETTER_AUTH_SECRET ??= "integration-secret-integration-secret-1";
    container = await import("../container");
    const scope = container.createRequestScope();
    try {
      // The container's use case with a fixed clock, so the fixture lands in the period.
      const { cradle } = scope;
      const useCase = new AskCopilotUseCase({
        getSalesSummaryTool: cradle.getSalesSummaryTool,
        getOrderSummaryTool: cradle.getOrderSummaryTool,
        getTopProductsTool: cradle.getTopProductsTool,
        getLowStockProductsTool: cradle.getLowStockProductsTool,
        getTrafficSummaryTool: cradle.getTrafficSummaryTool,
        llmProvider: new UnconfiguredLlmProvider(),
        rateLimiter: cradle.rateLimiter,
        copilotLog: cradle.copilotLog,
        clock: () => NOW,
      });
      answer = await useCase.execute({ intent: "focus" }, OWNER);
      funnelAnswer = await useCase.execute({ intent: "funnel" }, TRAFFIC_OWNER);
    } finally {
      await scope.dispose();
    }
  });

  afterAll(async () => {
    await container?.disposeRootContainer();
    await pool.end();
  });

  it("shows exactly the values the E04 metric use cases return", async () => {
    const scope = container.createRequestScope();
    try {
      const { cradle } = scope;
      const sales = await cradle.getSalesSummaryUseCase.execute({ period: PERIOD });
      const orders = await cradle.getOrderSummaryUseCase.execute({ period: PERIOD });
      const top = await cradle.getTopProductsUseCase.execute({ period: PERIOD, limit: 5 });
      const low = await cradle.getLowStockProductsUseCase.execute({ threshold: 5, limit: 10 });

      expect(sales.paidOrders).toBe(2);
      expect(answer.summary).toContain(`paid orders ${sales.paidOrders}`);
      expect(answer.summary).toContain(formatMoney(money(sales.revenueMinor, sales.currency)));
      expect(answer.summary).toContain(`orders placed ${orders.total}`);

      const arenaSold = top.rows.find((row) => row.name === "Arena Fight Stick");
      const arenaStock = low.rows.find((row) => row.name === "Arena Fight Stick");
      expect(arenaSold?.units).toBe(1);
      expect(arenaStock?.stockQuantity).toBe(2);

      const restock = answer.recommendations.find(
        (recommendation) => recommendation.title === "Restock Arena Fight Stick",
      );
      expect(restock?.relatedProductIds).toEqual([arenaStock?.id]);
      expect(restock?.evidence.map((row) => row.value)).toEqual([
        String(arenaSold?.units),
        String(arenaStock?.stockQuantity),
      ]);
      expect(answer).toMatchObject({ origin: "rules", fallbackReason: "not_configured" });
    } finally {
      await scope.dispose();
    }
  });

  it("answers the funnel question with the demo traffic the use case returns, flagged demo", async () => {
    const scope = container.createRequestScope();
    try {
      const traffic = await scope.cradle.getTrafficSummaryUseCase.execute({
        period: PERIOD,
        productLimit: 10,
      });
      expect(traffic.funnel).toEqual({
        sessions: 100,
        productViews: 80,
        addToCarts: 20,
        checkoutsStarted: 5,
        paidOrders: 2,
      });
      expect(
        traffic.products.map((product) => [product.name, product.views, product.unitsSold]),
      ).toEqual([["Arena Fight Stick", 60, 1]]);
      expect(funnelAnswer.summary).toContain(
        "sessions (demo) 100 → product views (demo) 80 → add-to-carts (demo) 20 → checkouts started (demo) 5 → paid orders 2",
      );
      const [step] = funnelAnswer.recommendations;
      expect(step?.title).toBe("Look at the add-to-cart step");
      expect(step?.evidence.every((row) => row.demo)).toBe(true);
      expect(funnelAnswer.limitations[0]).toContain("fictional demo data");
      expect(funnelAnswer).toMatchObject({ origin: "rules", fallbackReason: "not_configured" });
    } finally {
      await scope.dispose();
    }
  });

  it("shows a grounded AI answer from a scripted model, with evidence from the seeded store", async () => {
    const scope = container.createRequestScope();
    try {
      const { cradle } = scope;
      const llmProvider = new ScriptedLlmProvider([groundedReply]);
      const llmAnswer = await new AskCopilotUseCase({
        getSalesSummaryTool: cradle.getSalesSummaryTool,
        getOrderSummaryTool: cradle.getOrderSummaryTool,
        getTopProductsTool: cradle.getTopProductsTool,
        getLowStockProductsTool: cradle.getLowStockProductsTool,
        getTrafficSummaryTool: cradle.getTrafficSummaryTool,
        llmProvider,
        rateLimiter: cradle.rateLimiter,
        copilotLog: cradle.copilotLog,
        clock: () => NOW,
      }).execute({ intent: "focus" }, { id: `${OWNER.id}-llm` });

      const sales = await cradle.getSalesSummaryUseCase.execute({ period: PERIOD });
      const top = await cradle.getTopProductsUseCase.execute({ period: PERIOD, limit: 5 });
      const best = top.rows[0];
      expect(llmAnswer).toMatchObject({
        origin: "llm",
        fallbackReason: null,
        model: "scripted-model",
        summary: `Paid orders in the last 7 days: ${sales.paidOrders}.`,
      });
      expect(llmAnswer.recommendations[0]).toMatchObject({
        relatedProductIds: [best?.productId],
        evidence: [{ metric: `Units sold: ${best?.name}`, value: String(best?.units) }],
      });
      // The daily LLM cap is a store-wide counter in the same table.
      const { rows } = await pool.query<{ count: number }>(
        "select count from rate_limit_buckets where key = 'copilot:llm:day'",
      );
      expect(rows).toEqual([{ count: 1 }]);
    } finally {
      await scope.dispose();
    }
  });

  it("changes no store data and counts the question against the owner's limit", async () => {
    expect(await count("traffic_daily_stats")).toBe(before.traffic);
    expect(await count("product_view_daily_stats")).toBe(before.views);
    expect(await count("orders")).toBe(before.orders);
    expect(await count("order_items")).toBe(before.items);
    expect(await count("products")).toBe(before.products);
    expect(await count("stock_adjustments")).toBe(before.adjustments);
    const { rows } = await pool.query<{ count: number }>(
      "select count from rate_limit_buckets where key = $1",
      [`copilot:ask:${OWNER.id}`],
    );
    expect(rows).toEqual([{ count: 1 }]);
  });
});
