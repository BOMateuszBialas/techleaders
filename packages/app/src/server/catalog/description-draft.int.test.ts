import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { DraftProductDescriptionUseCase, type DescriptionDraftDto } from "@commerceos/ai";
import { SEEDED_PRODUCTS, ScriptedLlmProvider } from "@commerceos/ai/evals";
import { descriptionDraftSchema, formatPriceInput } from "@commerceos/core";
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
const OWNER = { id: `int-owner-${randomUUID()}` };
const DRAFT =
  "The Vortex Wireless Mouse pairs a 26,000 DPI optical sensor with 70 hours of battery life, and five programmable buttons keep every bind in reach.";

async function cli(script: string, ...args: string[]) {
  await run(process.execPath, [tsxCli, `packages/database/src/cli/${script}`, ...args], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

/** The shared buckets this test spends; the Copilot integration test counts the daily one. */
async function clearBuckets() {
  await pool.query(
    "delete from rate_limit_buckets where key = 'copilot:llm:day' or key like 'descriptions:draft:%'",
  );
}

async function productRow(slug: string) {
  const { rows } = await pool.query<{ row: Record<string, unknown> }>(
    "select to_jsonb(p) as row from products p where slug = $1",
    [slug],
  );
  return rows[0]?.row;
}

/**
 * Description drafting against PostgreSQL through the real composition root (descriptions spec,
 * step 8): a seeded product's category resolves, a grounded draft returns, the per-owner bucket
 * and the shared daily LLM bucket both count, and the product row is untouched.
 */
describe("DraftProductDescriptionUseCase (PostgreSQL, real container)", () => {
  let container: typeof ContainerModule;

  beforeAll(async () => {
    await cli("migrate.ts", "up");
    await cli("seed.ts");
    await clearBuckets();
    process.env.DATABASE_URL = databaseUrl;
    process.env.BETTER_AUTH_SECRET ??= "integration-secret-integration-secret-1";
    container = await import("../container");
  });

  afterAll(async () => {
    await clearBuckets();
    await container?.disposeRootContainer();
    await pool.end();
  });

  it("matches the seeded catalog the glossary and the evals were built from", async () => {
    const { rows } = await pool.query<{
      slug: string;
      name: string;
      category: string;
      description: string;
    }>(
      `select p.slug, p.name, c.name as category, p.description
         from products p join categories c on c.id = p.category_id
        where p.slug = any($1::text[]) order by p.slug`,
      [SEEDED_PRODUCTS.map((product) => product.slug)],
    );
    expect(rows).toEqual(
      [...SEEDED_PRODUCTS]
        .sort((a, b) => a.slug.localeCompare(b.slug))
        .map(({ slug, name, category, description }) => ({ slug, name, category, description })),
    );
  });

  it("drafts from a seeded product's form values, counts both buckets and writes nothing", async () => {
    const before = await productRow("vortex-wireless-mouse");
    const provider = new ScriptedLlmProvider([() => ({ description: `[DEMO] ${DRAFT}` })]);
    let result: DescriptionDraftDto;
    const scope = container.createRequestScope();
    try {
      const { cradle } = scope;
      const useCase = new DraftProductDescriptionUseCase({
        llmProvider: provider,
        rateLimiter: cradle.rateLimiter,
        getCategoryUseCase: cradle.getCategoryUseCase,
        copilotLog: cradle.copilotLog,
        clock: cradle.clock,
      });
      result = await useCase.execute(
        descriptionDraftSchema.parse({
          name: before?.name,
          categoryId: before?.category_id,
          price: formatPriceInput(Number(before?.price_minor)),
          notes: before?.description,
        }),
        OWNER,
      );
    } finally {
      await scope.dispose();
    }

    expect(result).toMatchObject({ kind: "draft", text: `[DEMO] ${DRAFT}`, demoMarked: true });
    // The category's name reached the model; its id did not.
    const sent = provider.requests[0]?.messages[1]?.content ?? "";
    expect(sent).toContain('"category":"Mice"');
    expect(sent).not.toContain(String(before?.category_id));

    const { rows } = await pool.query<{ key: string; count: number }>(
      `select key, count from rate_limit_buckets
        where key = 'copilot:llm:day' or key like 'descriptions:draft:%' order by key`,
    );
    expect(rows).toEqual([
      { key: "copilot:llm:day", count: 1 },
      { key: `descriptions:draft:${OWNER.id}`, count: 1 },
    ]);
    expect(await productRow("vortex-wireless-mouse")).toEqual(before);
  });

  it("refuses an unknown category with a field error, before any call", async () => {
    const provider = new ScriptedLlmProvider([]);
    const scope = container.createRequestScope();
    try {
      const { cradle } = scope;
      const useCase = new DraftProductDescriptionUseCase({
        llmProvider: provider,
        rateLimiter: cradle.rateLimiter,
        getCategoryUseCase: cradle.getCategoryUseCase,
        copilotLog: cradle.copilotLog,
        clock: cradle.clock,
      });
      await expect(
        useCase.execute(
          descriptionDraftSchema.parse({ name: "Mouse", categoryId: randomUUID(), notes: "" }),
          OWNER,
        ),
      ).rejects.toMatchObject({
        code: "VALIDATION_FAILED",
        fieldErrors: { categoryId: ["Choose an existing category."] },
      });
    } finally {
      await scope.dispose();
    }
    expect(provider.requests).toHaveLength(0);
  });
});
